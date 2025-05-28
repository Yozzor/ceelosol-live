# 🚀 CeeloSol Production Deployment Checklist

## ✅ **Pre-Deployment Verification**

- [x] **Latest code pushed to GitHub** ✅ (Just completed!)
- [x] **Treasury wallet configured** ✅ (`8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS`)
- [x] **Environment variables ready** ✅
- [x] **All features tested locally** ✅

---

## 🌐 **Step 1: Backend Deployment (Render.com)**

### 1.1 Deploy Latest Changes
1. **Go to**: [Render.com Dashboard](https://render.com)
2. **Find**: Your CeeloSol backend service
3. **Click**: "Manual Deploy" → "Deploy latest commit"
4. **Wait**: 5-10 minutes for deployment
5. **Verify**: Service shows "Live" status

### 1.2 Environment Variables Check
Ensure these are set in Render dashboard:
```
NODE_ENV=production
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
BANKER_SECRET_KEY=EHVhPoeXMpwczeQ9JDzqzXV6njzAi4NueDBXSbZ9ttdu7Tavv2BKGHANPN7Tqw8i7To4JnRDjmxXJnXbo3f4hRr
HOUSE_EDGE=0.03
PORT=3001
```

### 1.3 Test Backend
- **URL**: `https://your-app.onrender.com/api/health`
- **Expected**: `{"status":"OK","timestamp":"...","service":"CeeloSol Backend"}`

---

## 🏠 **Step 2: Frontend Deployment**

### 2.1 Build Production Frontend
1. **Run**: `deploy-to-production.bat`
2. **Enter**: Your Render backend URL when prompted
3. **Wait**: For build to complete
4. **Result**: Production files in `build/` folder

### 2.2 Upload to Hosting Provider
1. **Login**: To your hosting control panel
2. **Navigate**: To File Manager
3. **Go to**: `public_html` or `www` folder
4. **Upload**: ALL files from `build/` folder
5. **Extract**: If uploaded as ZIP

### 2.3 Test Frontend
- **URL**: Your domain (e.g., `https://yourdomain.com`)
- **Check**: Site loads correctly
- **Verify**: No console errors

---

## 🔧 **Step 3: Production Configuration**

### 3.1 Network Settings
- **Solana Network**: Mainnet-beta ✅
- **RPC Endpoints**: Premium endpoints configured ✅
- **Treasury Wallet**: Dedicated production wallet ✅

### 3.2 Security Settings
- **CORS**: Configured for your domain
- **SSL**: Enabled on hosting provider
- **Environment Variables**: Secure and not exposed

---

## 💰 **Step 4: House Wallet Setup**

### 4.1 Treasury Wallet Info
- **Address**: `8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS`
- **Network**: Solana Mainnet
- **Purpose**: House treasury for game operations

### 4.2 Funding (IMPORTANT!)
⚠️ **BEFORE GOING LIVE**: Fund the house wallet with SOL
- **Minimum**: 1-2 SOL for initial operations
- **Recommended**: 5-10 SOL for smooth operations
- **Monitor**: Keep track of balance regularly

---

## 🧪 **Step 5: Production Testing**

### 5.1 Basic Functionality
- [ ] Website loads at your domain
- [ ] Wallet generation works
- [ ] Game interface displays correctly
- [ ] Dice animations work

### 5.2 Game Operations
- [ ] Can create game lobbies
- [ ] Dice rolling functions
- [ ] Win/loss detection works
- [ ] Treasury balance updates

### 5.3 Real Money Testing
⚠️ **Start with small amounts!**
- [ ] Test with 0.001 SOL bets
- [ ] Verify real SOL transactions
- [ ] Check treasury receives/pays correctly
- [ ] Monitor on Solana Explorer

---

## 📊 **Step 6: Monitoring Setup**

### 6.1 Backend Monitoring
- **Render Logs**: Check for any errors
- **Uptime**: Monitor service availability
- **Performance**: Watch response times

### 6.2 Treasury Monitoring
- **Balance**: Regular balance checks
- **Transactions**: Monitor on Solana Explorer
- **Security**: Watch for unauthorized access

### 6.3 Frontend Monitoring
- **Domain**: Ensure site stays accessible
- **SSL**: Keep certificate valid
- **Performance**: Monitor loading times

---

## 🚨 **Emergency Procedures**

### If Backend Goes Down:
1. Check Render dashboard for errors
2. Review recent deployments
3. Check environment variables
4. Redeploy if necessary

### If Frontend Issues:
1. Check hosting provider status
2. Verify file uploads completed
3. Check domain/DNS settings
4. Re-upload files if needed

### If Treasury Issues:
1. Check wallet balance immediately
2. Review recent transactions
3. Verify private key security
4. Contact support if needed

---

## 🎉 **Go Live Checklist**

- [ ] Backend deployed and running
- [ ] Frontend uploaded and accessible
- [ ] Treasury wallet funded
- [ ] All tests passing
- [ ] Monitoring in place
- [ ] Emergency procedures ready

**🎲 Your CeeloSol gambling platform is ready for production! 🚀**

---

## 📞 **Support Resources**

- **Render Support**: [Render.com Help](https://render.com/docs)
- **Solana Explorer**: [explorer.solana.com](https://explorer.solana.com)
- **Treasury Wallet**: `8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS`
