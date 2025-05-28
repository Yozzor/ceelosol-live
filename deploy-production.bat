@echo off
echo ========================================
echo    CeeloSol Production Deployment
echo ========================================
echo.

echo [1/4] Building Backend...
cd backend
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Backend build failed!
    pause
    exit /b 1
)
cd ..

echo [2/4] Installing Frontend Dependencies...
call pnpm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend dependencies installation failed!
    pause
    exit /b 1
)

echo [3/4] Building Frontend for Production...
call pnpm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)

echo [4/4] Creating Deployment Package...
if not exist "deployment" mkdir deployment
if not exist "deployment\frontend" mkdir deployment\frontend
if not exist "deployment\backend" mkdir deployment\backend

echo Copying frontend build files...
xcopy "build\*" "deployment\frontend\" /E /I /Y

echo Copying backend files...
xcopy "backend\dist\*" "deployment\backend\dist\" /E /I /Y
xcopy "backend\package.json" "deployment\backend\" /Y
xcopy "backend\node_modules\*" "deployment\backend\node_modules\" /E /I /Y

echo.
echo ========================================
echo    Deployment Package Ready!
echo ========================================
echo.
echo Frontend files: deployment\frontend\
echo Backend files: deployment\backend\
echo.
echo Next Steps:
echo 1. Upload frontend files to Namecheap cPanel
echo 2. Deploy backend to Railway.app
echo 3. Update environment variables
echo.
pause
