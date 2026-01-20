@echo off
REM Learning Studio Builder - Development Mode (Combined Window)
REM This script starts both servers in a single terminal window

echo.
echo ============================================================
echo   Learning Studio Builder - Development Mode
echo ============================================================
echo.
echo   Starting both backend and frontend in this window...
echo   Press Ctrl+C to stop all servers
echo.
echo ============================================================
echo.

REM Load environment variables from .env file if it exists
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        echo %%a | findstr /r "^#" >nul
        if errorlevel 1 (
            if not "%%a"=="" set "%%a=%%b"
        )
    )
)

REM Start backend in background
start /B python server.py

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend (this will block and show output)
npm run dev

REM If frontend exits, try to clean up backend
taskkill /F /IM python.exe /FI "MEMUSAGE gt 10000" >nul 2>&1
