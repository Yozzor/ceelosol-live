@echo off
echo 🔧 Starting CeeloSol Backend Server Only...
echo.

REM Get the current directory
set "PROJECT_DIR=%~dp0"

echo 📁 Project Directory: %PROJECT_DIR%
echo.

REM Check if backend is already running
echo 🔍 Checking if backend is already running...
netstat -ano | findstr :3001 >nul
if %errorlevel% == 0 (
    echo ❌ Backend is already running on port 3001
    echo 💡 If you need to restart it, kill the existing process first:
    echo    netstat -ano | findstr :3001
    echo    taskkill /F /PID [PID_NUMBER]
    pause
    exit /b 1
)

echo 🔧 Building and starting backend server...
cd /d "%PROJECT_DIR%backend"

echo 📦 Building TypeScript...
pnpm build
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo ✅ Build successful!
echo 🚀 Starting server on port 3001...
echo.
echo 💡 Press Ctrl+C to stop the server
echo.

node dist/server.js
