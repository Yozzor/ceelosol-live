@echo off
echo 🚀 Deploying Solana version fixes...

echo ✅ Adding files...
"C:\Program Files\Git\bin\git.exe" add .

echo ✅ Committing changes...
"C:\Program Files\Git\bin\git.exe" commit -m "Fix Solana web3.js version conflicts - update to 1.95.5 and replace Account with Keypair"

echo ✅ Pushing to GitHub...
"C:\Program Files\Git\bin\git.exe" push origin main

echo 🎯 Deploy complete! Check Render for new build...
pause
