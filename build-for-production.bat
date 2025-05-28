@echo off
echo ========================================
echo    Building CeeloSol for Production
echo ========================================
echo.

echo Please enter your backend URL (e.g., https://your-app.onrender.com or https://your-app.railway.app):
set /p BACKEND_URL=

if "%BACKEND_URL%"=="" (
    echo ❌ Backend URL is required!
    pause
    exit /b 1
)

echo.
echo Updating production configuration...
echo # Production Environment Configuration > .env.production
echo REACT_APP_BACKEND_URL=%BACKEND_URL% >> .env.production
echo REACT_APP_SOCKET_URL=%BACKEND_URL% >> .env.production
echo GENERATE_SOURCEMAP=false >> .env.production
echo REACT_APP_CLUSTER=mainnet-beta >> .env.production

echo.
echo Production environment file created:
type .env.production

echo.
echo Building frontend for production...
call pnpm run build

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
echo Frontend files are ready in the 'build' folder.
echo.
echo Next steps:
echo 1. Upload ALL files from 'build' folder to your hosting provider
echo 2. Go to File Manager → public_html (or www folder)
echo 3. Upload and extract all files
echo 4. Test your live site at your domain!
echo.
echo ⚠️  IMPORTANT: Make sure your backend is also deployed and running!
echo.
echo Backend URL configured: %BACKEND_URL%
echo Frontend build location: build/
echo.
echo 🎯 Ready for production deployment!
echo.
pause
