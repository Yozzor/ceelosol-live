# 🎮 CeeloSol Startup Guide

## ❌ Problem: "This site can't be reached - localhost refused to connect"

This happens when the **frontend server** isn't running. You need to start BOTH the backend AND frontend servers.

## ✅ Solution: Start Both Servers

### **Step 1: Start Backend Server**

Open **Terminal 1** (PowerShell/Command Prompt):

```bash
# Navigate to backend directory
cd C:\Users\Dragos\Documents\augment-projects\CeeloSol\backend

# Build TypeScript
pnpm build

# Start backend server
node dist/server.js
```

**Expected Output:**
```
🎮 Setting up lobby handlers...
Server running on port 3001
Socket.io enabled for PVP lobbies
✅ House wallet loaded from environment
🏦 House wallet address: [wallet address]
```

### **Step 2: Start Frontend Server**

Open **Terminal 2** (NEW PowerShell/Command Prompt window):

```bash
# Navigate to ROOT directory (NOT backend!)
cd C:\Users\Dragos\Documents\augment-projects\CeeloSol

# Install dependencies (if needed)
pnpm install

# Start frontend development server
pnpm dev
```

**Expected Output:**
```
Compiled successfully!

You can now view ceelosol in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

Note that the development build is not optimized.
To create a production build, use pnpm build.
```

### **Step 3: Access the Game**

Open your browser and go to: **http://localhost:3000**

## 🔧 Alternative: Quick Start Scripts

### **Option A: Using Package Manager**

**Terminal 1 (Backend):**
```bash
cd backend
pnpm build && node dist/server.js
```

**Terminal 2 (Frontend):**
```bash
# From root directory
pnpm dev
```

### **Option B: Using npm (if pnpm doesn't work)**

**Terminal 1 (Backend):**
```bash
cd backend
npm run build && npm start
```

**Terminal 2 (Frontend):**
```bash
# From root directory
npm start
```

## 🚨 Troubleshooting

### **Port Already in Use**
If you get "EADDRINUSE" errors:

```bash
# Kill processes on Windows
netstat -ano | findstr :3000
taskkill /F /PID [PID_NUMBER]

netstat -ano | findstr :3001
taskkill /F /PID [PID_NUMBER]
```

### **Dependencies Issues**
```bash
# Reinstall dependencies
pnpm install --force

# Or with npm
npm install --force
```

### **TypeScript Compilation Errors**
```bash
cd backend
rm -rf dist/
pnpm build
```

## 📋 Quick Checklist

- [ ] Backend server running on port 3001
- [ ] Frontend server running on port 3000
- [ ] Both terminals showing successful startup messages
- [ ] Browser can access http://localhost:3000
- [ ] No "refused to connect" errors

## 🎯 Expected Result

When both servers are running correctly:

1. **Backend Terminal** shows: `Server running on port 3001`
2. **Frontend Terminal** shows: `Compiled successfully!`
3. **Browser** loads the CeeloSol game at http://localhost:3000
4. **Game** displays wallet generation/login screen

## 💡 Pro Tips

- Keep both terminal windows open while developing
- Backend changes require restart (`Ctrl+C` then `node dist/server.js`)
- Frontend changes auto-reload in the browser
- Use `Ctrl+C` to stop servers gracefully

---

**🎲 Ready to play CeeloSol!** Both servers should now be running and the game accessible at http://localhost:3000
