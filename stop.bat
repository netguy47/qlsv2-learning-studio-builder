@echo off
REM Learning Studio Builder - Stop All Servers
REM This script stops all running backend and frontend processes

echo.
echo ============================================================
echo   Learning Studio Builder - Stopping Application
echo ============================================================
echo.

echo [STOP] Stopping Flask backend servers...
taskkill /F /FI "WindowTitle eq Learning Studio - Backend*" >nul 2>&1
taskkill /F /IM python.exe /FI "MEMUSAGE gt 10000" >nul 2>&1

echo [STOP] Stopping Proxy server...
taskkill /F /FI "WindowTitle eq Learning Studio - Proxy*" >nul 2>&1

echo [STOP] Stopping Vite frontend servers...
taskkill /F /FI "WindowTitle eq Learning Studio - Frontend*" >nul 2>&1
taskkill /F /IM node.exe /FI "MEMUSAGE gt 30000" >nul 2>&1

echo.
echo ============================================================
echo   All servers stopped successfully!
echo ============================================================
echo.
pause
