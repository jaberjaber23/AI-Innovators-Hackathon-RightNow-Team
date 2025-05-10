import asyncio
from contextlib import AsyncExitStack
from mcp import ClientSession
from mcp.client.sse import sse_client
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import streamlit as st
import anyio
import sys
from datetime import datetime
import base64
import time

# Load .env
load_dotenv()

client = OpenAI()
model = os.environ.get("MODEL", "gpt-4.1-nano")

class ConnectionManager:
    def __init__(self, sse_server_map):
        self.sse_server_map = sse_server_map
        self.sessions = {}
        self.exit_stack = AsyncExitStack()
        self.is_connected = False

    async def initialize(self):
        try:
            for server_name, url in self.sse_server_map.items():
                try:
                    sse_transport = await self.exit_stack.enter_async_context(sse_client(url=url))
                    read, write = sse_transport
                    session = await self.exit_stack.enter_async_context(ClientSession(read, write))
                    await session.initialize()
                    self.sessions[server_name] = session
                    self.is_connected = True
                    print(f"Connected to MCP server at {url}")
                except Exception as e:
                    print(f"Error connecting to MCP server at {url}: {str(e)}")
                    continue
        except Exception as e:
            print(f"Error initializing connection manager: {str(e)}")
            self.is_connected = False

    async def list_tools(self):
        if not self.is_connected:
            return {}, []
            
        tool_map = {}
        consolidated_tools = []
        for server_name, session in self.sessions.items():
            try:
                tools = await session.list_tools()
                tool_map.update({tool.name: server_name for tool in tools.tools})
                consolidated_tools.extend(tools.tools)
            except Exception as e:
                print(f"Error listing tools from {server_name}: {str(e)}")
        return tool_map, consolidated_tools

    async def call_tool(self, tool_name, arguments, tool_map):
        server_name = tool_map.get(tool_name)
        if not server_name:
            print(f"Tool '{tool_name}' not found.")
            return "Tool not found."

        session = self.sessions.get(server_name)
        if session:
            try:
                result = await session.call_tool(tool_name, arguments=arguments)
                return result.content[0].text
            except Exception as e:
                print(f"Error calling tool {tool_name}: {str(e)}")
                return f"Error calling tool: {str(e)}"
        return "Server not available."

    async def close(self):
        if hasattr(self, 'exit_stack'):
            await self.exit_stack.aclose()


# Chat function with OpenAI and tool calling
async def chat(input_messages, tool_map, tools, max_turns=3, connection_manager=None):
    chat_messages = input_messages[:]

    for _ in range(max_turns):
        result = client.chat.completions.create(
            model=model,
            messages=chat_messages,
            tools=tools,
        )

        if result.choices[0].finish_reason == "tool_calls":
            chat_messages.append(result.choices[0].message)

            for tool_call in result.choices[0].message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)
                server_name = tool_map.get(tool_name, "")

                print(f"\n Tool Call: `{tool_name}` from `{server_name}`")
                print("Arguments:")
                print(json.dumps(tool_args, indent=2))

                observation = await connection_manager.call_tool(
                    tool_name, tool_args, tool_map
                )

                print("\n Tool Observation:")
                print(json.dumps(observation, indent=2))

                chat_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(observation),
                })
        else:
            print("\n Assistant:")
            print(result.choices[0].message.content)
            return result.choices[0].message.content

    # Final response
    result = client.chat.completions.create(
        model=model,
        messages=chat_messages,
    )
    print("\n Final Assistant Response:")
    return str(result.choices[0].message.content)

# Helper function for background images
def add_bg_from_local(image_file):
    with open(image_file, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode()
    return f"""
    <style>
    .stApp {{
        background-image: url(data:image/png;base64,{encoded_string});
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
    }}
    </style>
    """

# Function to get time-based greeting
def get_greeting():
    hour = datetime.now().hour
    if 5 <= hour < 12:
        return "Good morning"
    elif 12 <= hour < 18:
        return "Good afternoon"
    else:
        return "Good evening"

# Set page configuration
st.set_page_config(
    layout="wide", 
    page_title="Smart Financial Advisor", 
    page_icon="📊",
    initial_sidebar_state="expanded"
)

# Apply custom CSS
st.markdown(
    """
    <style>
        /* Main application styling */
        .stApp {
            background-color: #f5f7ff;
        }
        
        /* Chat container styling */
        .chat-container {
            background-color: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 100, 0.1);
            margin: 10px 0;
        }
        
        /* Sidebar styling */
        [data-testid="stSidebar"] {
            background-color: #00294F !important;
            background-image: linear-gradient(180deg, #00294F 0%, #004080 100%);
        }
        
        [data-testid="stSidebar"] * {
            color: white !important;
        }
        
        /* Header styling */
        h1, h2, h3 {
            font-family: 'Arial', sans-serif;
            color: #003366;
        }
        
        /* Logo container styling */
        .logo-container {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding: 10px;
            background-color: rgba(255, 255, 255, 0.9);
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        /* Chat message styling */
        [data-testid="stChatMessage"] {
            border-radius: 15px !important;
            margin: 10px 0 !important;
            padding: 10px 15px !important;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05) !important;
        }
        
        /* User message styling */
        [data-testid="stChatMessage"][data-testid="user"] {
            background-color: #e6f3ff !important;
        }
        
        /* Assistant message styling */
        [data-testid="stChatMessage"][data-testid="assistant"] {
            background-color: #f0f7ff !important;
        }
        
        /* Input box styling */
        [data-testid="stChatInput"] {
            border-radius: 30px !important;
            padding: 10px 20px !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1) !important;
            border: 1px solid #0063B2 !important;
        }
        
        /* Button styling */
        [data-testid="stButton"] button {
            background-color: #0063B2 !important;
            color: white !important;
            border-radius: 10px !important;
            padding: 10px 20px !important;
            font-size: 16px !important;
            transition: all 0.3s ease !important;
            border: none !important;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2) !important;
        }
        
        [data-testid="stButton"] button:hover {
            background-color: #004a8c !important;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
            transform: translateY(-2px) !important;
        }
        
        /* Status indicators */
        .status-connected {
            color: #4CAF50 !important;
            font-weight: bold;
        }
        
        .status-disconnected {
            color: #F44336 !important;
            font-weight: bold;
        }
        
        /* Warning messages */
        .stAlert {
            border-radius: 10px !important;
            margin: 15px 0 !important;
        }
        
        /* Progress/spinner */
        .stSpinner {
            border-color: #0063B2 !important;
        }
        
        /* Feature list styling */
        .feature-item {
            display: flex;
            align-items: center;
            margin: 10px 0;
            padding: 10px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        
        .feature-item:hover {
            background-color: rgba(255, 255, 255, 0.2);
            transform: translateX(5px);
        }
        
        /* Footer styling */
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background-color: rgba(0, 41, 79, 0.9);
            color: white;
            text-align: center;
            padding: 10px;
            font-size: 14px;
        }
    </style>
    """,
    unsafe_allow_html=True
)

# Sidebar content
with st.sidebar:
    st.image(os.path.join(os.getcwd(), "images/adv.png"), width=200)
    st.title("📊 Smart Financial Advisor")
    
    # Connection status indicator
    if "is_connected" in st.session_state:
        if st.session_state.is_connected:
            st.markdown("<p class='status-connected'>● Connected to MCP Server</p>", unsafe_allow_html=True)
        else:
            st.markdown("<p class='status-disconnected'>● Disconnected</p>", unsafe_allow_html=True)
    
    st.divider()
    
    st.subheader("💼 Features")
    features = [
        ("📈", "Retail Transaction Analysis"),
        ("💬", "Natural Language Financial Queries"),
        ("🔍", "Transaction Pattern Detection"),
        ("📋", "Report Generation"),
        ("📧", "Email Report Capabilities"),
        ("📊", "Data-Driven Financial Insights")
    ]
    
    for icon, feature in features:
        st.markdown(f"""
        <div class='feature-item'>
            <span style='font-size: 20px; margin-right: 10px;'>{icon}</span>
            <span>{feature}</span>
        </div>
        """, unsafe_allow_html=True)
    
    st.divider()
    
    # Clear chat button
    if st.button("🗑️ Clear Conversation"):
        st.session_state.messages = []
        st.experimental_rerun()
    
    # Model information
    st.subheader("ℹ️ Model Information")
    st.info(f"Using: {model}")
    
    # Add custom footer
    st.markdown(
        """
        <div class='footer'>
            © 2023 Smart Financial Advisor - Jordan Retail Analysis
        </div>
        """,
        unsafe_allow_html=True
    )

# Main content area
st.markdown(
    f"""
    <div class='logo-container'>
        <div style='margin-left: 20px;'>
            <h1 style='color: #0063B2; margin-bottom: 0;'>Smart Financial Advisor</h1>
            <p style='color: #666; margin-top: 0;'>Jordan Retail Transactions Analyzer</p>
        </div>
    </div>
    """,
    unsafe_allow_html=True
)

# Main entry
if __name__ == "__main__":
    sse_server_map = {
        "MCP_SERVER": "http://localhost:8000/sse",
    }

    async def main():
        # Initialize session state
        st.session_state.setdefault("messages", [])
        
        connection_manager = ConnectionManager(sse_server_map)
        
        try:
            # Add a progress bar for connection
            with st.status("Connecting to MCP server...") as status:
                await connection_manager.initialize()
                
                if connection_manager.is_connected:
                    status.update(label="✅ Connected to MCP server!", state="complete")
                    time.sleep(1)  # Give user time to see the success message
                else:
                    status.update(label="❌ Failed to connect to MCP server", state="error")
            
            # Store connection status in session state
            st.session_state.is_connected = connection_manager.is_connected
            
            if not connection_manager.is_connected:
                st.error("Failed to connect to MCP server. Please make sure it's running with `python mcp_server.py`")
                for message in st.session_state.messages:
                    with st.chat_message(message["role"]):
                        st.markdown(message["content"])
                
                question = st.chat_input("Type your question here...", disabled=not connection_manager.is_connected)
                if question:
                    st.session_state.messages.append({"role": "user", "content": question})
                    st.experimental_rerun()
                
                return
            
            tool_map, tool_objects = await connection_manager.list_tools()
            
            if not tool_objects:
                st.warning("No tools were found on the MCP server. Make sure the server is properly configured.")

            tools_json = [
                {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.inputSchema,
                    },
                }
                for tool in tool_objects
            ]
            
            # Display chat container
            chat_container = st.container()
            with chat_container:
                # Welcome message if no messages yet
                if not st.session_state.messages:
                    st.markdown(f"""
                    <div style='text-align: center; padding: 40px; background-color: #f9f9f9; border-radius: 15px; margin: 20px 0;'>
                        <h2>{get_greeting()}, I'm your Financial Advisor Assistant!</h2>
                        <p style='font-size: 18px;'>Ask me about retail transaction data from Jordan malls. I can help with:</p>
                        <div style='display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; margin-top: 20px;'>
                            <div style='background-color: white; padding: 15px; border-radius: 10px; width: 200px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);'>
                                <p style='font-weight: bold; color: #0063B2;'>Sales Analysis</p>
                                <p style='font-size: 14px;'>Track performance trends across different periods</p>
                            </div>
                            <div style='background-color: white; padding: 15px; border-radius: 10px; width: 200px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);'>
                                <p style='font-weight: bold; color: #0063B2;'>Customer Insights</p>
                                <p style='font-size: 14px;'>Understand customer behavior and preferences</p>
                            </div>
                            <div style='background-color: white; padding: 15px; border-radius: 10px; width: 200px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);'>
                                <p style='font-weight: bold; color: #0063B2;'>Business Recommendations</p>
                                <p style='font-size: 14px;'>Get actionable insights to grow your business</p>
                            </div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
                
                # Display chat history
                for message in st.session_state.messages:
                    icon = "🧑‍💼" if message["role"] == "user" else "🤖"
                    with st.chat_message(message["role"], avatar=icon):
                        st.markdown(message["content"])
            
            # Chat input
            question = st.chat_input("Ask about your retail transaction data...", key="chat_input")
            if question:
                # Add user message to chat history
                st.session_state.messages.append({"role": "user", "content": question})
                with st.chat_message("user", avatar="🧑‍💼"):
                    st.markdown(question)

                with st.chat_message("assistant", avatar="🤖"):
                    message_placeholder = st.empty()
                    message_placeholder.markdown("Analyzing your data...")
                    
                    with st.spinner("Processing your request..."):
                        input_messages = [
                            {"role": "system", "content": "You are a Smart Financial Advisor specialized in analyzing retail transaction data from Jordan malls. You can analyze sales performance, identify patterns, and generate insights from transaction data. You should respond with specific data and insights, and suggest actionable business recommendations when appropriate."},
                            {"role": "user", "content": question},
                        ]

                        response = await chat(
                            input_messages,
                            tool_map,
                            tools=tools_json,
                            connection_manager=connection_manager,
                        )
                    
                        # Replace placeholder with actual response
                        message_placeholder.markdown(response)
                        # Add assistant response to chat history
                        st.session_state.messages.append({"role": "assistant", "content": response})
        
        except Exception as e:
            st.error(f"An error occurred: {str(e)}")
            import traceback
            st.error(f"Traceback: {traceback.format_exc()}")
        finally:
            await connection_manager.close()

    asyncio.run(main())