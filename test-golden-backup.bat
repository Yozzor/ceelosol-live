@echo off
echo 🧪 Testing Golden Backup State...
echo.

echo 📁 Checking backup files exist...
if exist "BACKUP\backend-server.ts.backup" (
    echo ✅ Backend server backup found
) else (
    echo ❌ Backend server backup MISSING!
    pause
    exit /b 1
)

if exist "BACKUP\backend-package.json.backup" (
    echo ✅ Backend package.json backup found
) else (
    echo ❌ Backend package.json backup MISSING!
    pause
    exit /b 1
)

if exist "BACKUP\frontend-package.json.backup" (
    echo ✅ Frontend package.json backup found
) else (
    echo ❌ Frontend package.json backup MISSING!
    pause
    exit /b 1
)

if exist "BACKUP\backend-env.backup" (
    echo ✅ Backend .env backup found
) else (
    echo ❌ Backend .env backup MISSING!
    pause
    exit /b 1
)

echo.
echo 🔍 Checking current working state...

echo 📦 Testing backend build...
cd backend
pnpm build >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Backend builds successfully
) else (
    echo ❌ Backend build FAILED!
    cd ..
    pause
    exit /b 1
)

echo 🌐 Testing if ports are available...
netstat -ano | findstr :3001 >nul
if %errorlevel% == 0 (
    echo ⚠️  Port 3001 is in use (backend might be running)
) else (
    echo ✅ Port 3001 is available
)

netstat -ano | findstr :3000 >nul
if %errorlevel% == 0 (
    echo ⚠️  Port 3000 is in use (frontend might be running)
) else (
    echo ✅ Port 3000 is available
)

cd ..

echo.
echo 🏆 GOLDEN BACKUP VERIFICATION COMPLETE!
echo.
echo 📋 Status Summary:
echo   - All backup files present: ✅
echo   - Backend builds correctly: ✅
echo   - Ready for restoration: ✅
echo.
echo 💡 To start the working system:
echo   1. cd backend; pnpm build; node dist/server.js
echo   2. In new terminal: pnpm dev
echo   3. Open: http://localhost:3000
echo.
pause
