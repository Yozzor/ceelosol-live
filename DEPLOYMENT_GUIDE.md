# 🚀 CeeloSol Deployment Guide

## Overview
This guide will help you deploy CeeloSol gambling platform live using:
- **Frontend**: Namecheap Shared Hosting (static files)
- **Backend**: Railway.app (free Node.js hosting)
- **Domain**: Your Namecheap domain
- **Network**: Solana Mainnet (real SOL transactions)

## 📋 Prerequisites
- [ ] Namecheap domain purchased
- [ ] Namecheap shared hosting account
- [ ] GitHub account (for Railway deployment)
- [ ] Some SOL for the house wallet on mainnet

---

## 🎯 Step 1: Prepare for Production

### 1.1 Switch to Mainnet
```bash
# Update .env file
NEXT_PUBLIC_CLUSTER=mainnet-beta
```

### 1.2 Generate Production House Wallet
```bash
# Run this in backend directory to generate new mainnet wallet
cd backend
npm run dev
# Copy the new BANKER_SECRET_KEY from console output
```

---

## 🌐 Step 2: Deploy Backend to Railway

### 2.1 Create Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your GitHub account

### 2.2 Push Code to GitHub
```bash
# Create new GitHub repository
git init
git add .
git commit -m "Initial CeeloSol deployment"
git branch -M main
git remote add origin https://github.com/yourusername/ceelosol.git
git push -u origin main
```

### 2.3 Deploy on Railway
1. Click "New Project" on Railway
2. Select "Deploy from GitHub repo"
3. Choose your CeeloSol repository
4. Railway will auto-detect Node.js and deploy

### 2.4 Configure Environment Variables on Railway
In Railway dashboard, go to Variables tab and add:
```
NODE_ENV=production
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
BANKER_SECRET_KEY=your_mainnet_house_wallet_private_key
HOUSE_EDGE=0.03
PORT=3001
```

### 2.5 Get Railway Backend URL
- Railway will provide a URL like: `https://your-app-name.railway.app`
- Save this URL - you'll need it for frontend configuration

---

## 🏠 Step 3: Deploy Frontend to Namecheap

### 3.1 Build Production Frontend
```bash
# Update frontend to point to Railway backend
# Create production environment file
echo "REACT_APP_BACKEND_URL=https://your-app-name.railway.app" > .env.production

# Build for production
npm run build
```

### 3.2 Upload to Namecheap
1. Login to Namecheap cPanel
2. Go to File Manager
3. Navigate to `public_html` folder
4. Upload all files from `build/` folder
5. Extract if needed

### 3.3 Configure Domain
1. In Namecheap dashboard, go to Domain List
2. Click "Manage" next to your domain
3. Set nameservers to Namecheap hosting
4. Wait for DNS propagation (up to 24 hours)

---

## 🔧 Step 4: Production Configuration

### 4.1 Update CORS for Production
The backend will automatically allow your domain once deployed.

### 4.2 SSL Certificate
Namecheap shared hosting usually includes free SSL. Enable it in cPanel.

### 4.3 Test the Deployment
1. Visit your domain
2. Check if frontend loads
3. Test socket connection
4. Verify house wallet API works

---

## 💰 Step 5: Fund House Wallet

### 5.1 Get House Wallet Address
Visit: `https://your-domain.com` and check the header for house wallet address

### 5.2 Send SOL to House Wallet
Send some SOL to the house wallet address for initial liquidity

---

## 🔍 Step 6: Monitoring & Maintenance

### 6.1 Monitor Railway Logs
- Check Railway dashboard for backend logs
- Monitor for any errors or issues

### 6.2 Monitor House Wallet
- Keep track of house wallet balance
- Monitor for any unusual activity

### 6.3 Backup House Wallet
- Keep the private key secure and backed up
- Consider using a hardware wallet for large amounts

---

## 🚨 Security Checklist

- [ ] House wallet private key is secure
- [ ] Environment variables are set correctly
- [ ] CORS is configured properly
- [ ] SSL certificate is active
- [ ] Regular backups of house wallet
- [ ] Monitor for suspicious activity

---

## 📞 Support

If you encounter issues:
1. Check Railway logs for backend errors
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Ensure domain DNS is properly configured

---

## 🎉 Go Live!

Once everything is configured:
1. Your gambling platform will be live at your domain
2. Players can access it from anywhere
3. Real SOL transactions will occur
4. Monitor and enjoy your live gambling platform!
