@echo off
echo ========================================
echo    Step 1: Upload CeeloSol to GitHub
echo ========================================
echo.
echo This will put your code on GitHub so Render can use it.
echo.

echo First, let's set up Git (one-time setup):
echo.
echo Please enter your GitHub username:
set /p GITHUB_USER=

echo Please enter your GitHub email:
set /p GITHUB_EMAIL=

echo Please enter your repository name (e.g., ceelosol-live):
set /p REPO_NAME=

echo.
echo Setting up Git...
git config --global user.name "%GITHUB_USER%"
git config --global user.email "%GITHUB_EMAIL%"

echo.
echo Preparing your code for upload...
git init
git add .
git commit -m "Initial CeeloSol deployment ready"
git branch -M main

echo.
echo ========================================
echo    IMPORTANT: Create GitHub Repository
echo ========================================
echo.
echo 1. Go to GitHub.com and login
echo 2. Click the "+" button (top right)
echo 3. Click "New repository"
echo 4. Name it: %REPO_NAME%
echo 5. Make it PUBLIC
echo 6. DO NOT add README, .gitignore, or license
echo 7. Click "Create repository"
echo.
echo After creating the repository, press any key to continue...
pause

echo.
echo Uploading to GitHub...
git remote add origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo ❌ Upload failed! 
    echo.
    echo This might happen if:
    echo 1. Repository name already exists
    echo 2. Wrong username/email
    echo 3. Repository not created yet
    echo.
    echo Please check and try again.
    pause
    exit /b 1
)

echo.
echo ========================================
echo    ✅ SUCCESS! Code uploaded to GitHub
echo ========================================
echo.
echo Your repository: https://github.com/%GITHUB_USER%/%REPO_NAME%
echo.
echo Next step: Run "2-deploy-to-render.bat"
echo.
pause
