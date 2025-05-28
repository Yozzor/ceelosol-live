# 🚨 EMERGENCY RESTORATION GUIDE

## 🏆 RESTORE TO GOLDEN WORKING STATE

If anything breaks, follow these steps to restore the fully working system:

### Step 1: Stop Everything
```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Or manually close terminal windows
```

### Step 2: Restore Backend Server File
```bash
# Copy the working server.ts back
copy BACKUP\backend-server.ts.backup backend\src\server.ts
```

### Step 3: Restore Package Files
```bash
# Restore backend package.json
copy BACKUP\backend-package.json.backup backend\package.json

# Restore frontend package.json  
copy BACKUP\frontend-package.json.backup package.json
```

### Step 4: Restore Environment
```bash
# Restore backend .env
copy BACKUP\backend-env.backup backend\.env
```

### Step 5: Clean Install
```bash
# Backend
cd backend
rm -rf node_modules/
rm -rf dist/
pnpm install
pnpm build

# Frontend (from root)
cd ..
rm -rf node_modules/
pnpm install
```

### Step 6: Test Restoration
```bash
# Start backend (should work)
cd backend; pnpm build; node dist/server.js
```

**Expected Output:**
```
Server running on port 3001
Socket.io enabled for PVP lobbies
🎮 Setting up lobby handlers...
```

### Step 7: Start Frontend
```bash
# In new terminal, from root
pnpm dev
```

### Step 8: Verify Game Works
- Go to http://localhost:3000
- Should load without errors
- Socket.IO should connect
- All features should work

## 🔧 ALTERNATIVE QUICK RESTORE

If the above doesn't work, use the minimal server:

```bash
cd backend
node minimal-server.js
```

This provides basic API functionality while you debug the main server.

## 📞 EMERGENCY CONTACTS

- **Working Backend Command:** `cd backend; pnpm build; node dist/server.js`
- **Working Frontend Command:** `pnpm dev`
- **Test URLs:** 
  - Frontend: http://localhost:3000
  - Backend API: http://localhost:3001/api/house-wallet

## 🎯 SUCCESS INDICATORS

✅ Backend working: "Server running on port 3001"
✅ Frontend working: "Compiled successfully!"
✅ Game working: No console errors, wallet loads
✅ Socket.IO working: Real-time features work

---

**⚠️ IMPORTANT: This backup was created when EVERYTHING was working perfectly. Use it as the gold standard!**
