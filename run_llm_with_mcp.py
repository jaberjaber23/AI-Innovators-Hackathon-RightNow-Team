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

# Load .env
load_dotenv()

client = OpenAI()
model = os.environ.get("MODEL", "gpt-4")

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

st.set_page_config(layout="wide", page_title="Chat Application")
col1, col2 = st.columns(2)
with col1:
    st.image(os.path.join(os.getcwd(), "images/adv.png"), width=300)

with col2:
    st.title("""
    :blue[Smart Financial Advisor]
            Jordan Retail Transactions Analyzer
            How can I help you today?
    """)

st.markdown(
    """
    <style>
        /* Change sidebar background color */
        [data-testid="stSidebar"] {
            background-color: #00294F !important; /* Deep blue */
        }

        /* Change all text color inside the sidebar */
        [data-testid="stSidebar"] * {
            color: white !important;
        }

        /* Specifically change sidebar title and subheader color */
        [data-testid="stSidebar"] h1, 
        [data-testid="stSidebar"] h2 {
            color: white !important;
        }

        /* Change all buttons background color */
        [data-testid="stButton"] button {
            background-color: #0063B2 !important; /* Blue background */
            color: white !important; /* White text */
            border-radius: 10px !important; /* Rounded corners */
            padding: 10px 20px !important; /* Adjust padding */
            font-size: 16px !important; /* Adjust font size */
        }

        [data-testid="stButton"] button p {
            color: white !important;  /* Ensure text inside button is white */
        }
    </style>
    """,
    unsafe_allow_html=True
)

with st.sidebar:
    st.title("📊 Smart Financial Advisor")
    st.subheader("Features:")
    st.write("- 📈 Retail Transaction Analysis from Jordan Malls")
    st.write("- 💬 Natural Language Financial Queries")
    st.write("- 🔍 Transaction Pattern Detection")
    st.write("- 📋 Report Generation Through Conversation")
    st.write("- 📧 Email Report Capabilities")
    st.write("- 📊 Data-Driven Financial Insights")

# Main entry
if __name__ == "__main__":
    sse_server_map = {
        "MCP_SERVER": "http://localhost:8000/sse",
    }

    async def main():
        st.session_state.setdefault("messages", [])
        
        # Display warning if server not running
        st.warning("**Important**: Make sure the MCP server is running with `python mcp_server.py` before asking questions.", icon="⚠️")
        
        connection_manager = ConnectionManager(sse_server_map)
        
        try:
            await connection_manager.initialize()
            
            if not connection_manager.is_connected:
                st.error("Failed to connect to MCP server. Please make sure it's running with `python mcp_server.py`")
                for message in st.session_state.messages:
                    with st.chat_message(message["role"]):
                        st.write(message["content"])
                
                question = st.chat_input(disabled=not connection_manager.is_connected)
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
            
            # Display chat history
            for message in st.session_state.messages:
                with st.chat_message(message["role"]):
                    st.write(message["content"])
            
            # Chat input
            question = st.chat_input()
            if question:
                # Add user message to chat history
                st.session_state.messages.append({"role": "user", "content": question})
                with st.chat_message("user"):
                    st.write(question)

                with st.chat_message("assistant"):
                    with st.spinner("Thinking..."):
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
                
                        st.write(response)
                        # Add assistant response to chat history
                        st.session_state.messages.append({"role": "assistant", "content": response})
        
        except Exception as e:
            st.error(f"An error occurred: {str(e)}")
            import traceback
            st.error(f"Traceback: {traceback.format_exc()}")
        finally:
            await connection_manager.close()

    asyncio.run(main())
