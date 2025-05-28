# 🚀 CeeloSol Deployment Checklist

## Pre-Deployment Setup

### ✅ Domain & Hosting
- [ ] Namecheap domain purchased
- [ ] Namecheap shared hosting activated
- [ ] cPanel access confirmed
- [ ] SSL certificate enabled

### ✅ Accounts Setup
- [ ] GitHub account created
- [ ] Railway.app account created (sign up with GitHub)
- [ ] Repository created on GitHub

### ✅ Mainnet Preparation
- [ ] Generate new house wallet for mainnet (NEVER use devnet wallet!)
- [ ] Secure backup of house wallet private key
- [ ] Initial SOL funding ready for house wallet

---

## 🔧 Backend Deployment (Railway)

### Step 1: Code Preparation
- [ ] Push code to GitHub repository
- [ ] Verify backend builds successfully (`cd backend && npm run build`)

### Step 2: Railway Deployment
- [ ] Create new project on Railway
- [ ] Connect GitHub repository
- [ ] Wait for automatic deployment

### Step 3: Environment Variables
Set these in Railway dashboard → Variables:
- [ ] `NODE_ENV=production`
- [ ] `SOLANA_RPC_URL=https://api.mainnet-beta.solana.com`
- [ ] `BANKER_SECRET_KEY=your_mainnet_private_key`
- [ ] `HOUSE_EDGE=0.03`
- [ ] `PORT=3001`
- [ ] `ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`

### Step 4: Verification
- [ ] Railway deployment successful
- [ ] Backend URL accessible (e.g., `https://your-app.railway.app`)
- [ ] API endpoint works: `https://your-app.railway.app/api/house-wallet`

---

## 🌐 Frontend Deployment (Namecheap)

### Step 1: Configuration
- [ ] Update `.env.production` with Railway backend URL
- [ ] Verify API configuration in `src/config/api.js`

### Step 2: Build
- [ ] Run `npm run build` successfully
- [ ] Verify `build/` folder created with all files

### Step 3: Upload to Namecheap
- [ ] Login to Namecheap cPanel
- [ ] Navigate to File Manager → public_html
- [ ] Upload all files from `build/` folder
- [ ] Set correct file permissions (755 for folders, 644 for files)

### Step 4: Domain Configuration
- [ ] Point domain to Namecheap hosting
- [ ] Wait for DNS propagation (up to 24 hours)
- [ ] Verify domain loads the app

---

## 🔒 Security & Final Setup

### Security Checklist
- [ ] House wallet private key stored securely
- [ ] Environment variables set correctly
- [ ] CORS configured for your domain only
- [ ] SSL certificate active and working
- [ ] No sensitive data in frontend code

### Testing Checklist
- [ ] Website loads at your domain
- [ ] Socket connection works (lobby system)
- [ ] House wallet API returns correct address
- [ ] Can create and join lobbies
- [ ] Dice rolling works
- [ ] Taunts system works
- [ ] Radio system works

### Mainnet Checklist
- [ ] House wallet funded with initial SOL
- [ ] Treasury monitoring active
- [ ] Real SOL transactions working
- [ ] Activity feed showing real data

---

## 🎯 Go Live Process

### Final Steps
1. [ ] Announce maintenance window
2. [ ] Deploy backend to Railway
3. [ ] Deploy frontend to Namecheap
4. [ ] Update DNS if needed
5. [ ] Fund house wallet
6. [ ] Test all functionality
7. [ ] Monitor for 24 hours
8. [ ] Announce platform is live!

### Post-Launch Monitoring
- [ ] Monitor Railway logs for errors
- [ ] Check house wallet balance regularly
- [ ] Monitor user activity and feedback
- [ ] Keep backups of house wallet
- [ ] Regular security audits

---

## 🆘 Troubleshooting

### Common Issues
- **Frontend not loading**: Check DNS propagation, file permissions
- **API errors**: Verify Railway deployment, environment variables
- **Socket connection fails**: Check CORS settings, Railway URL
- **Transactions fail**: Verify mainnet configuration, house wallet funding

### Support Resources
- Railway Documentation: https://docs.railway.app
- Namecheap Support: https://www.namecheap.com/support/
- Solana Documentation: https://docs.solana.com

---

## 🎉 Success!

Once all items are checked:
- ✅ Your CeeloSol gambling platform is LIVE!
- ✅ Players can access it from anywhere
- ✅ Real SOL transactions are happening
- ✅ You're running a professional gambling platform

**Congratulations on your successful deployment!** 🎲💰
