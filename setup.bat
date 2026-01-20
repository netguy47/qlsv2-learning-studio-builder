@echo off
REM Learning Studio Builder - First Time Setup
REM This script installs all dependencies and creates configuration files

echo.
echo ============================================================
echo   Learning Studio Builder - First Time Setup
echo ============================================================
echo.

REM Check if Python is installed
echo [CHECK] Verifying Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo.
    echo Please install Python from: https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
) else (
    python --version
)

echo.

REM Check if Node.js is installed
echo [CHECK] Verifying Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
) else (
    node --version
    npm --version
)

echo.
echo ============================================================
echo   Installing Dependencies
echo ============================================================
echo.

REM Install Python dependencies
echo [SETUP] Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies
    pause
    exit /b 1
)

echo.

REM Install Node.js dependencies
echo [SETUP] Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Configuration Setup
echo ============================================================
echo.

REM Create .env file if it doesn't exist
if not exist ".env" (
    if exist ".env.example" (
        echo [SETUP] Creating .env configuration file...
        copy .env.example .env >nul
        echo [SETUP] .env file created from .env.example
        echo.
        echo [INFO] Please edit .env file to add your API keys:
        echo        - GEMINI_API_KEY (recommended for full functionality)
        echo        - OPENAI_API_KEY (optional, for DALL-E images)
        echo.
    ) else (
        echo [INFO] No .env.example found. Using default configuration.
    )
) else (
    echo [INFO] .env file already exists, skipping creation
)

echo.
echo ============================================================
echo   Testing Build Process
echo ============================================================
echo.

echo [TEST] Running production build test...
call npm run build
if errorlevel 1 (
    echo [WARNING] Build test failed, but you can still use development mode
) else (
    echo [SUCCESS] Build test passed!
)

echo.
echo ============================================================
echo   Setup Complete!
echo ============================================================
echo.
echo   Next steps:
echo   1. (Optional) Edit .env file to add API keys
echo   2. Run start.bat to launch the application
echo   3. Open http://localhost:3000 in your browser
echo.
echo   Quick Commands:
echo   - start.bat  : Start the application
echo   - stop.bat   : Stop all servers
echo   - build.bat  : Build for production
echo ============================================================
echo.
pause
