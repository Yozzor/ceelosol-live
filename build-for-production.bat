@echo off
echo ========================================
echo    Building CeeloSol for Production
echo ========================================
echo.

echo Please enter your Railway backend URL (e.g., https://your-app.railway.app):
set /p BACKEND_URL=

echo.
echo Updating production configuration...
echo REACT_APP_BACKEND_URL=%BACKEND_URL% > .env.production.local

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
echo 1. Upload all files from 'build' folder to your Namecheap cPanel
echo 2. Go to File Manager → public_html
echo 3. Upload and extract all files
echo 4. Your site will be live at your domain!
echo.
echo Backend URL configured: %BACKEND_URL%
echo.
pause
