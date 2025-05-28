@echo off
echo ========================================
echo    🚀 CeeloSol Production Deployment
echo ========================================
echo.
echo This will deploy your latest CeeloSol changes to production!
echo.

echo ========================================
echo    Step 1: Backend Deployment (Render)
echo ========================================
echo.
echo 1. Go to https://render.com
echo 2. Sign in to your account
echo 3. Find your CeeloSol backend service
echo 4. Click "Manual Deploy" → "Deploy latest commit"
echo 5. Wait for deployment to complete (5-10 minutes)
echo.
echo Your backend will automatically pull the latest changes from GitHub!
echo.

pause

echo.
echo ========================================
echo    Step 2: Frontend Production Build
echo ========================================
echo.

echo Please enter your Render backend URL (e.g., https://your-app.onrender.com):
set /p BACKEND_URL=

echo.
echo Creating production environment file...
echo REACT_APP_BACKEND_URL=%BACKEND_URL% > .env.production
echo REACT_APP_SOCKET_URL=%BACKEND_URL% >> .env.production
echo GENERATE_SOURCEMAP=false >> .env.production

echo.
echo Building production frontend...
call pnpm build

if %errorlevel% neq 0 (
    echo.
    echo ❌ Build failed! Please check for errors above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo    ✅ Production Build Complete!
echo ========================================
echo.
echo Your production files are in the 'build' folder.
echo.
echo Next steps:
echo 1. Upload all files from 'build' folder to your hosting provider
echo 2. Make sure to upload to the public_html or www folder
echo 3. Test your live site!
echo.
echo Backend URL: %BACKEND_URL%
echo Frontend files: Ready in 'build' folder
echo.

pause
