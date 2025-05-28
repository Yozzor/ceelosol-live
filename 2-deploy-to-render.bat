@echo off
echo ========================================
echo    Step 2: Deploy Backend to Render
echo ========================================
echo.
echo This step will guide you through deploying to Render.com
echo.

echo ========================================
echo    RENDER.COM SETUP INSTRUCTIONS
echo ========================================
echo.
echo 1. Go to https://render.com
echo 2. Click "Get Started for Free"
echo 3. Sign up with GitHub (easier!)
echo 4. Click "New +" then "Web Service"
echo 5. Connect your GitHub account
echo 6. Choose your CeeloSol repository
echo 7. Use these settings:
echo.
echo    Name: ceelosol-backend
echo    Environment: Node
echo    Build Command: cd backend && npm install && npm run build
echo    Start Command: cd backend && npm start
echo    Instance Type: Free
echo.
echo 8. Click "Create Web Service"
echo 9. Wait 5-10 minutes for deployment
echo.

echo Press any key when your Render deployment is complete...
pause

echo.
echo ========================================
echo    ENVIRONMENT VARIABLES SETUP
echo ========================================
echo.
echo In your Render dashboard:
echo 1. Go to "Environment" tab
echo 2. Add these variables (click "Add Environment Variable"):
echo.
echo    NODE_ENV = production
echo    SOLANA_RPC_URL = https://api.mainnet-beta.solana.com
echo    HOUSE_EDGE = 0.03
echo    PORT = 3001
echo.
echo 3. For BANKER_SECRET_KEY, run "3-generate-wallet.bat" first
echo.

echo Press any key when environment variables are set...
pause

echo.
echo Please enter your Render app URL (e.g., https://your-app.onrender.com):
set /p RENDER_URL=

echo.
echo Saving your Render URL for next steps...
echo %RENDER_URL% > render-url.txt

echo.
echo ========================================
echo    ✅ Backend Deployment Complete!
echo ========================================
echo.
echo Your backend is live at: %RENDER_URL%
echo.
echo Next steps:
echo 1. Run "3-generate-wallet.bat" to create house wallet
echo 2. Add BANKER_SECRET_KEY to Render environment variables
echo 3. Run "4-build-frontend.bat" to prepare website files
echo.
pause
