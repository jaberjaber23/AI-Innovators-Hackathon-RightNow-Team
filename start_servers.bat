@echo off
echo ===================================
echo RightNow Financial Analytics Startup
echo ===================================
echo.

echo Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python 3.8 or later.
    goto :error
)

echo Checking Node.js installation...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js 16 or later.
    goto :error
)

echo.
echo Starting MCP server (in a new window)...
start cmd /k "python mcp_server.py"

echo Waiting for MCP server to initialize...
timeout /t 5 /nobreak >nul

echo.
echo Starting Next.js Bridge server (in a new window)...
start cmd /k "python next_mcp_server.py"

echo Waiting for Next.js Bridge to initialize...
timeout /t 5 /nobreak >nul

echo.
echo Starting Next.js Frontend...
cd financial-advisor-nextjs
echo.
echo ===================================
echo RightNow Financial Analytics is starting!
echo.
echo The application will be available at:
echo http://localhost:3000
echo.
echo Make sure all three components are running:
echo 1. MCP Server (port 8000)
echo 2. Next.js Bridge (port 8001)
echo 3. Next.js Frontend (port 3000)
echo ===================================
echo.
npm run dev

goto :end

:error
echo.
echo Failed to start servers. Please check the requirements.
echo.
pause

:end 