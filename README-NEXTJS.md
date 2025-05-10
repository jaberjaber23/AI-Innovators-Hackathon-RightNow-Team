# Smart Financial Advisor - Next.js Edition

This is a Next.js version of the Smart Financial Advisor chatbot, which leverages the existing MCP-based tools while providing a modern, responsive UI built with Next.js and Tailwind CSS.

## System Architecture

The system consists of three main components:

1. **Original MCP Server**: The existing Python-based MCP server that provides the tools and functionality for the financial advisor.
2. **Next.js MCP Bridge**: A FastAPI server that connects the Next.js frontend to the original MCP server.
3. **Next.js Frontend**: A modern UI built with Next.js and Tailwind CSS.

## Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn
- OpenAI API key

## Setup and Installation

### 1. Set Up the Original MCP Server

```bash
# Make sure you have the required Python packages installed
pip install -r requirements.txt

# Start the original MCP server
python mcp_server.py
```

This server runs on port 8000 by default and contains all the original MCP tools for the financial advisor.

### 2. Set Up the Next.js MCP Bridge

```bash
# Start the Next.js MCP bridge server
python next_mcp_server.py
```

This server runs on port 8001 by default and connects to the original MCP server at http://localhost:8000/sse.

### 3. Set Up the Next.js Frontend

```bash
# Navigate to the Next.js project directory
cd financial-advisor-nextjs

# Install dependencies
npm install
# or
yarn install

# Create a .env.local file with your OpenAI API key
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env.local
echo "MODEL=gpt-4.1-nano" >> .env.local
echo "NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:8001" >> .env.local

# Start the development server
npm run dev
# or
yarn dev
```

## Running the System

To run the complete system, you need to start all three components in the following order:

1. Start the original MCP server:
   ```bash
   python mcp_server.py
   ```
   Make sure this is running first before starting the bridge server.

2. Start the Next.js MCP bridge:
   ```bash
   python next_mcp_server.py
   ```
   This bridge server should connect to the original MCP server.

3. Start the Next.js frontend:
   ```bash
   cd financial-advisor-nextjs
   npm run dev
   ```

4. Open your browser and navigate to http://localhost:3000

## Troubleshooting

- **MCP Server Not Connected**: Make sure the original MCP server is running on port 8000.
- **Next.js MCP Bridge Not Connected**: Make sure the bridge server is running on port 8001 and can connect to the original MCP server.
- **OpenAI API Key Issues**: Ensure your OpenAI API key is valid and has the necessary permissions.
- **Port Conflicts**: If you have port conflicts, you can change the ports by setting environment variables:
  - For the original MCP server: This uses port 8000 by default (not configurable via env)
  - For the Next.js MCP bridge: Set `NEXTJS_MCP_SERVER_PORT` environment variable
  - For the Next.js frontend: Set `PORT` environment variable

## Development

### Customizing the UI

The Next.js frontend uses Tailwind CSS for styling. You can customize the look and feel by:

1. Modifying the `tailwind.config.js` file to change colors, fonts, etc.
2. Editing the components in the `src/components` directory.
3. Updating the layout in `src/app/page.tsx`.

### Adding New MCP Tools

To add new tools to the financial advisor:

1. Add the new tools to the original MCP server (`mcp_server.py`).
2. The Next.js MCP bridge will automatically discover and expose these tools to the frontend.

## Deployment

### Deploying the Next.js Frontend

The Next.js frontend can be deployed to Vercel, Netlify, or any other Next.js-compatible hosting platform.

```bash
# Build the Next.js app for production
npm run build

# Start the production server
npm start
```

### Deploying the MCP Servers

The MCP servers (original and bridge) can be deployed as Python services on any server that supports Python and FastAPI.

## Credits

This project combines the power of the original MCP-based Smart Financial Advisor with the modern UI capabilities of Next.js and Tailwind CSS. 