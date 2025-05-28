@echo off
echo 🎮 Starting CeeloSol Game Servers...
echo.

REM Get the current directory
set "PROJECT_DIR=%~dp0"

echo 📁 Project Directory: %PROJECT_DIR%
echo.

REM Check if frontend is already running
echo 🔍 Checking if frontend is already running...
netstat -ano | findstr :3000 >nul
if %errorlevel% == 0 (
    echo ✅ Frontend is already running on port 3000
) else (
    echo 🎨 Starting Frontend Server (Port 3000)...
    start "CeeloSol Frontend" cmd /k "cd /d %PROJECT_DIR% && echo 🚀 Starting frontend development server... && pnpm dev"
    timeout /t 3 /nobreak >nul
)

REM Check if backend is already running
echo 🔍 Checking if backend is already running...
netstat -ano | findstr :3001 >nul
if %errorlevel% == 0 (
    echo ✅ Backend is already running on port 3001
) else (
    echo 🔧 Starting Backend Server (Port 3001)...
    start "CeeloSol Backend" cmd /k "cd /d %PROJECT_DIR%backend && pnpm build && echo ✅ Backend built successfully! && node dist/server.js"
    timeout /t 5 /nobreak >nul
)

echo.
echo ✅ Both servers should now be running!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:3001
echo.
echo 📋 Instructions:
echo   - Wait for both terminal windows to show "running" messages
echo   - Open your browser to http://localhost:3000
echo   - Use Ctrl+C in each terminal window to stop servers
echo.
echo 🎲 Ready to play CeeloSol!
pause
