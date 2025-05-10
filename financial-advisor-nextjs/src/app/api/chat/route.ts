import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Configure OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Model and server configurations
const MODEL = process.env.MODEL || 'gpt-4';
const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:8001';

// Check if MCP server is available
async function checkMcpServerStatus() {
  try {
    const response = await axios.get(`${MCP_SERVER_URL}/status`, { timeout: 3000 });
    return response.status === 200;
  } catch (error) {
    console.error('MCP server connection error:', error);
    return false;
  }
}

// This function connects to the MCP server and calls a specific tool
async function callMcpTool(toolName: string, arguments_: any) {
  try {
    console.log(`Tool Call: ${toolName}`);
    console.log('Arguments:', arguments_);
    
    // Call the MCP server API endpoint
    const response = await axios.post(
      `${MCP_SERVER_URL}/call_tool`, 
      {
        tool_name: toolName,
        arguments: arguments_
      },
      { timeout: 30000 } // 30 second timeout for long-running operations
    );
    
    if (response.status !== 200) {
      throw new Error(`Failed to call MCP tool: ${response.statusText}`);
    }
    
    console.log('Tool response:', response.data.result);
    return response.data.result;
  } catch (error) {
    console.error('Error calling MCP tool:', error);
    return `Error: Unable to call the tool ${toolName}. The financial data service is currently unavailable. Please ensure the MCP server is running.`;
  }
}

// Function to fetch available tools from MCP server
async function fetchMcpTools() {
  try {
    const response = await axios.get(`${MCP_SERVER_URL}/list_tools`, { timeout: 5000 });
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch tools: ${response.statusText}`);
    }
    
    console.log('MCP tools loaded successfully');
    return response.data.tools;
  } catch (error) {
    console.error('Error fetching MCP tools:', error);
    
    // Return just a single tool so the model can inform the user about the connection issue
    return [
      {
        type: 'function',
        function: {
          name: 'notify_server_offline',
          description: 'Notify the user that the MCP server is offline',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          },
        },
      }
    ];
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request. Messages array is required.' },
        { status: 400 }
      );
    }
    
    // Check if MCP server is available
    const isMcpServerAvailable = await checkMcpServerStatus();
    
    // Create system prompt based on server availability
    let systemPromptContent = 'You are RightNow, an AI financial advisor specialized in analyzing retail transaction data from Jordan malls. You provide real-time insights, trend analysis, and actionable recommendations based on financial data.';
    
    if (!isMcpServerAvailable) {
      systemPromptContent += ' IMPORTANT: The MCP server that provides financial data is currently offline. Inform the user that they need to start the MCP server with "python mcp_server.py" to access data analysis features. Do not attempt to provide specific financial insights without the server connection.';
    }
    
    const systemPrompt = {
      role: 'system',
      content: systemPromptContent
    };
    
    const chatMessages = [systemPrompt, ...messages];
    let finalResponse = '';
    
    // Get available tools based on MCP server availability
    const tools = isMcpServerAvailable ? await fetchMcpTools() : [];
    
    // First call to potentially generate tool calls
    const initialResult = await client.chat.completions.create({
      model: MODEL,
      messages: chatMessages,
      tools: tools.length > 0 ? tools : undefined,
      temperature: 0.7,
    });
    
    const initialMessage = initialResult.choices[0].message;
    chatMessages.push(initialMessage);
    
    // Check if the model wants to call a tool
    if (initialMessage.tool_calls && initialMessage.tool_calls.length > 0) {
      for (const toolCall of initialMessage.tool_calls) {
        const functionName = toolCall.function.name;
        let functionArgs;
        
        try {
          functionArgs = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          functionArgs = {};
          console.error('Failed to parse function arguments:', e);
        }
        
        // Call the MCP tool
        const observation = await callMcpTool(functionName, functionArgs);
        
        // Add the observation to the messages
        chatMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: typeof observation === 'string' ? observation : JSON.stringify(observation),
        });
      }
      
      // Final call to generate the response with tool results
      const finalResult = await client.chat.completions.create({
        model: MODEL,
        messages: chatMessages,
        temperature: 0.7,
      });
      
      finalResponse = finalResult.choices[0].message.content as string;
    } else {
      finalResponse = initialMessage.content as string;
    }
    
    return NextResponse.json({ response: finalResponse });
  } catch (error) {
    console.error('Error in chat API:', error);
    
    let errorMessage = 'An error occurred while processing your request.';
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('MCP')) {
        errorMessage = 'The financial data service is currently unavailable. Please ensure the MCP server is running by executing "python mcp_server.py" in your terminal.';
      } else if (error.message.includes('OpenAI')) {
        errorMessage = 'Unable to connect to the AI service. Please check your OpenAI API key and try again.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 