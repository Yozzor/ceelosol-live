# CeeloSol User Testing Guide

## 🚀 **Quick Start Testing**

### Prerequisites
- Node.js 20+ installed
- Both frontend and backend running

### Step 1: Start the Application
```bash
# Terminal 1 - Frontend
pnpm dev

# Terminal 2 - Backend  
cd backend
node dist/server.js
```

### Step 2: Access the Application
1. Open http://localhost:3000 in your browser
2. You should see the CeeloSol interface with GTA-style theming

### Step 3: Generate a Wallet
1. Click "Generate New Wallet" 
2. **IMPORTANT**: Save the private key shown in the modal
3. The wallet is automatically added to the whitelist
4. You're now logged in and can see the game interface

### Step 4: Fund Your Wallet (Devnet Only)
Since this is on devnet, you can get free SOL:
1. Copy your wallet address from the interface
2. Visit https://faucet.solana.com/
3. Paste your address and request 1-2 SOL
4. Wait a few seconds for the transaction to confirm

### Step 5: Test the Game
1. Set a bet amount (minimum 0.001 SOL)
2. Click "Roll Dice" to start the game
3. Watch the 3D dice animation
4. See the result and any SOL transfers

## 🎲 **Game Rules to Test**

### Winning Combinations (You get 2x your bet):
- **4-5-6**: Automatic win
- **Any Triple**: 1-1-1, 2-2-2, 3-3-3, 4-4-4, 5-5-5, 6-6-6

### Losing Combinations (You lose your bet):
- **1-2-3**: Automatic loss

### Point System (No money changes hands):
- **Any Pair**: The third die becomes your "point"
- Keep rolling until you get your point again (win) or 1-2-3 (lose)

### Reroll (No money changes hands):
- **No Pairs**: Roll again

## 🧪 **What to Test**

### ✅ **Wallet Functionality**
- [ ] Generate new wallet
- [ ] Save and restore wallet using private key
- [ ] Check wallet balance updates
- [ ] Verify wallet address format

### ✅ **Game Mechanics**
- [ ] Place minimum bet (0.001 SOL)
- [ ] Place larger bets
- [ ] Test winning scenarios (if you get lucky!)
- [ ] Test losing scenarios
- [ ] Test point/reroll scenarios
- [ ] Verify dice animations work smoothly

### ✅ **Blockchain Integration**
- [ ] Confirm transactions appear on Solana explorer
- [ ] Check balance changes after wins/losses
- [ ] Test with insufficient funds
- [ ] Verify transaction confirmations

### ✅ **Error Handling**
- [ ] Try betting more SOL than you have
- [ ] Test with no internet connection
- [ ] Try invalid wallet restoration

## 🔗 **Useful Links for Testing**

### Solana Devnet Tools:
- **Faucet**: https://faucet.solana.com/
- **Explorer**: https://explorer.solana.com/?cluster=devnet
- **RPC Status**: https://status.solana.com/

### Check Your Transactions:
1. After each game, check the browser console for transaction signatures
2. Copy the signature and paste it into Solana Explorer
3. Add `?cluster=devnet` to view devnet transactions

## 🎯 **Expected Behavior**

### Successful Game Flow:
1. **Bet Placed**: SOL amount is validated
2. **Dice Roll**: 3D animation plays
3. **Result Calculated**: Game rules applied
4. **Transaction**: SOL transfer occurs (if win/loss)
5. **Confirmation**: Blockchain confirms transaction
6. **Balance Update**: Wallet balance reflects changes

### Transaction Examples:
- **Win**: Treasury sends you 2x your bet
- **Loss**: You send your bet to treasury
- **Point/Reroll**: No transaction occurs

## 🐛 **Common Issues & Solutions**

### "Insufficient Balance" Error:
- **Solution**: Get more SOL from the faucet or reduce bet amount

### "Transaction Failed" Error:
- **Solution**: Check internet connection, try again in a few seconds

### Dice Not Rolling:
- **Solution**: Ensure bet amount is at least 0.001 SOL

### Wallet Not Loading:
- **Solution**: Clear browser cache and regenerate wallet

## 📊 **Testing Checklist**

### Basic Functionality:
- [ ] App loads without errors
- [ ] Wallet generation works
- [ ] Game interface is responsive
- [ ] Dice animations play smoothly

### Blockchain Integration:
- [ ] Real SOL transactions occur
- [ ] Balances update correctly
- [ ] Transactions confirm on blockchain
- [ ] Error handling works properly

### Game Logic:
- [ ] All winning combinations work
- [ ] Losing combinations work
- [ ] Point system functions correctly
- [ ] Payouts are accurate (2x for wins)

## 🎉 **Success Indicators**

You'll know everything is working when:
1. ✅ You can generate and restore wallets
2. ✅ You can fund your wallet with devnet SOL
3. ✅ Dice roll with smooth 3D animations
4. ✅ Game results are calculated correctly
5. ✅ Real SOL transfers occur on wins/losses
6. ✅ Transactions appear on Solana Explorer
7. ✅ Balances update in real-time

## 🔧 **Advanced Testing**

### Test Multiple Wallets:
1. Generate wallet A, fund it, play games
2. Generate wallet B, fund it, play games
3. Verify each wallet maintains separate balances

### Test Wallet Import:
1. Generate wallet in CeeloSol
2. Copy the Base58 private key
3. Import into Phantom wallet
4. Verify same address and balance

### Test Treasury Operations:
1. Check treasury wallet balance before/after games
2. Verify treasury receives losing bets
3. Verify treasury pays out winning bets

This comprehensive testing will confirm that CeeloSol is fully functional and ready for use!
