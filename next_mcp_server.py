import asyncio
import json
import os
import sys
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from mcp import ClientSession
from mcp.client.sse import sse_client
from contextlib import AsyncExitStack
from dotenv import load_dotenv
import uvicorn
import time

# Load .env file
load_dotenv()

app = FastAPI(title="MCP API Server for Next.js")

# Add CORS middleware to allow requests from the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, specify your Next.js app's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MCP server configuration
mcp_server_url = "http://localhost:8000/sse"
exit_stack = AsyncExitStack()
session = None
is_connected = False
tool_map = {}
tool_objects = []

@app.on_event("startup")
async def startup_event():
    global session, is_connected, tool_map, tool_objects
    
    # Try to connect to the MCP server, with up to 3 retries
    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"Connecting to MCP server at {mcp_server_url} (attempt {attempt+1}/{max_retries})...")
            sse_transport = await exit_stack.enter_async_context(sse_client(url=mcp_server_url))
            read, write = sse_transport
            session = await exit_stack.enter_async_context(ClientSession(read, write))
            await session.initialize()
            
            # Get available tools
            tools_result = await session.list_tools()
            tool_map = {tool.name: "MCP_SERVER" for tool in tools_result.tools}
            tool_objects = tools_result.tools
            
            print(f"✅ Connected to MCP server. Found {len(tool_objects)} tools.")
            is_connected = True
            break
        except Exception as e:
            print(f"❌ Error connecting to MCP server: {str(e)}")
            if attempt < max_retries - 1:
                wait_time = 2 * (attempt + 1)  # Exponential backoff
                print(f"Retrying in {wait_time} seconds...")
                await asyncio.sleep(wait_time)
            else:
                print("Failed to connect after multiple attempts.")
                print("Please make sure the original MCP server is running with: python mcp_server.py")
                is_connected = False

@app.on_event("shutdown")
async def shutdown_event():
    # Close the MCP connection
    if hasattr(exit_stack, 'aclose'):
        await exit_stack.aclose()

@app.get("/status")
async def get_status():
    if is_connected:
        return {"status": "connected", "tools_count": len(tool_objects)}
    else:
        raise HTTPException(status_code=503, detail="MCP server is not connected")

@app.get("/list_tools")
async def list_tools():
    if not is_connected:
        raise HTTPException(status_code=503, detail="MCP server is not connected")
    
    # Format tools for OpenAI's tool calling format
    formatted_tools = []
    for tool in tool_objects:
        formatted_tools.append({
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.inputSchema,
            }
        })
    
    return {"tools": formatted_tools}

@app.post("/call_tool")
async def call_tool(request: Request):
    if not is_connected:
        raise HTTPException(status_code=503, detail="MCP server is not connected")
    
    data = await request.json()
    tool_name = data.get("tool_name")
    arguments = data.get("arguments", {})
    
    if not tool_name:
        raise HTTPException(status_code=400, detail="Tool name is required")
    
    if tool_name not in tool_map:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")
    
    try:
        # Call the tool via MCP
        result = await session.call_tool(tool_name, arguments=arguments)
        return {"result": result.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling tool: {str(e)}")

# SSE endpoint for compatibility with original MCP server
@app.get("/sse")
async def sse():
    async def event_generator():
        while True:
            yield f"data: {json.dumps({'event': 'heartbeat'})}\n\n"
            await asyncio.sleep(5)
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    # Run the FastAPI server with Uvicorn
    port = int(os.environ.get("NEXTJS_MCP_SERVER_PORT", 8001))
    print(f"Starting MCP API server for Next.js on port {port}...")
    print(f"Connecting to original MCP server at {mcp_server_url}")
    print("Make sure the original MCP server is running with: python mcp_server.py")
    uvicorn.run(app, host="0.0.0.0", port=port) 