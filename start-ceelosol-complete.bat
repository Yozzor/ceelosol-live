@echo off
echo ========================================
echo    Starting CeeloSol Gambling Platform
echo ========================================
echo.

echo [1/3] Starting Backend Server (Port 3001)...
start "CeeloSol Backend" cmd /k "cd backend && npm run dev"

echo [2/3] Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo [3/3] Starting Frontend Server (Port 3000)...
start "CeeloSol Frontend" cmd /k "pnpm dev"

echo.
echo ========================================
echo    CeeloSol Platform Starting...
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo.
echo Both servers are starting in separate windows.
echo Close this window when both servers are running.
echo.
pause
