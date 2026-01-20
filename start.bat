@echo off
REM Learning Studio Builder - Main Launcher
REM This script starts both backend and frontend servers

echo.
echo ============================================================
echo   Learning Studio Builder - Starting Application
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [SETUP] First time setup detected...
    echo [SETUP] Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Load environment variables from .env file if it exists
if exist ".env" (
    echo [CONFIG] Loading environment variables from .env file...
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        REM Skip comments and empty lines
        echo %%a | findstr /r "^#" >nul
        if errorlevel 1 (
            if not "%%a"=="" (
                set "%%a=%%b"
            )
        )
    )
) else (
    echo [CONFIG] No .env file found, using defaults...
    echo [CONFIG] To customize settings, create .env from .env.example
)

REM Load environment variables from .env.local if it exists (overrides .env for local dev)
if exist ".env.local" (
    echo [CONFIG] Loading environment variables from .env.local file...
    for /f "usebackq tokens=1,* delims==" %%a in (".env.local") do (
        REM Skip comments and empty lines
        echo %%a | findstr /r "^#" >nul
        if errorlevel 1 (
            if not "%%a"=="" (
                set "%%a=%%b"
            )
        )
    )
)

echo.
echo [START] Launching Backend Server (Flask)...
echo [START] Launching Frontend Server (Vite)...
echo.
echo ============================================================
echo   Application will open at: http://localhost:3000
echo ============================================================
echo.
echo   Backend:  http://localhost:5000 (Flask API)
echo   Frontend: http://localhost:3000 (React App)
echo.
echo   Press Ctrl+C to stop all servers
echo ============================================================
echo.

REM Start backend in a new window with explicit providers (SVG-first for consistent, readable visuals)
start "Learning Studio - Backend (Flask)" cmd /k "echo [Backend Server Starting...] && set SLIDES_IMAGE_PROVIDER=svg && set INFOGRAPHIC_MODE=svg && python server.py"

REM Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

REM Start proxy server in a new window
start "Learning Studio - Proxy Server" cmd /k "echo [Proxy Server Starting...] && cd server && npm run dev"

REM Wait 3 seconds for proxy server to initialize
timeout /t 3 /nobreak >nul

REM Start frontend in a new window and open browser
start "Learning Studio - Frontend (Vite)" cmd /k "echo [Frontend Server Starting...] && npm run dev"

REM Wait 5 seconds for frontend to initialize
timeout /t 5 /nobreak >nul

REM Open browser
echo [BROWSER] Opening application in default browser...
start http://localhost:3000

echo.
echo ============================================================
echo   Application is running!
echo ============================================================
echo.
echo   Two terminal windows have been opened:
echo   1. Backend Server (Flask) - Do not close
echo   2. Frontend Server (Vite) - Do not close
echo.
echo   To stop the application:
echo   - Close this window, OR
echo   - Press Ctrl+C in each server window
echo ============================================================
echo.
echo Press any key to keep this window open for monitoring...
pause >nul
