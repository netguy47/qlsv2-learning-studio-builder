@echo off
REM Learning Studio Builder - Production Build
REM This script builds the application for production deployment

echo.
echo ============================================================
echo   Learning Studio Builder - Production Build
echo ============================================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [ERROR] Dependencies not installed
    echo [ERROR] Please run setup.bat first
    pause
    exit /b 1
)

echo [BUILD] Building production bundle...
echo.

call npm run build

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    echo [ERROR] Check the error messages above for details
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Build Complete!
echo ============================================================
echo.
echo   Production files created in: dist\
echo.
echo   To preview the production build:
echo   - Run: npm run preview
echo   - Open: http://localhost:4173
echo.
echo   To deploy:
echo   - Upload the 'dist' folder to your web server
echo   - Ensure backend server.py is running on your server
echo ============================================================
echo.
pause
