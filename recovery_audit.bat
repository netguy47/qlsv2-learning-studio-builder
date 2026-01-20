@echo off
title Studio Recovery & Health Audit
echo 🔄 [STEP 1] Shutting down services...
call stop.bat

echo 🚀 [STEP 2] Starting Backend Services...
:: Using 'start' to run the backend in a separate window so the audit can proceed
start /B start.bat

echo ⏳ [STEP 3] Waiting for server warm-up (10s)...
timeout /t 10 /nobreak > nul

echo 🧪 [STEP 4] Running Ecosystem Audit...
python audit.py

echo.
echo 🖥️  Studio is ready. Press any key to open the dashboard...
pause > nul
start http://localhost:5173
