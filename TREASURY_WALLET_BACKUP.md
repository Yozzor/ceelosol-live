# 🏦 CEELOSOL TREASURY WALLET - SECURE BACKUP

**⚠️ CRITICAL SECURITY DOCUMENT - KEEP EXTREMELY SECURE ⚠️**

## 📋 Treasury Wallet Information

### 🏦 Public Address (Treasury Address)
```
8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS
```

### 🔑 Private Key (Base58 Format - for Environment Variables)
```
EHVhPoeXMpwczeQ9JDzqzXV6njzAi4NueDBXSbZ9ttdu7Tavv2BKGHANPN7Tqw8i7To4JnRDjmxXJnXbo3f4hRr
```

### 🔑 Private Key (Array Format - for Backup)
```json
[11,116,185,133,189,84,197,34,11,252,212,84,198,58,185,221,186,226,121,211,233,28,196,230,204,122,101,155,16,83,139,174,116,55,45,237,224,153,108,28,79,225,16,255,104,3,242,63,129,18,12,112,33,221,59,65,68,145,106,171,109,3,245,217]
```

### 🔑 Private Key (Hex Format - Alternative Backup)
```
0b74b985bd54c5220bfcd454c63ab9ddbaee79d3e91cc4e6cc7a659b10538bae74372dede0996c1c4fe110ff6803f23f81120c7021dd3b41449166ab6d03f5d9
```

## 🚨 CRITICAL SECURITY NOTES

### ✅ What This Wallet IS:
- **DEDICATED HOUSE TREASURY** for CeeloSol gambling platform
- **COMPLETELY SEPARATE** from all user-generated wallets
- **ONLY ACCESSIBLE** by the backend/house system
- **COLLECTS ALL BETS** and **PAYS ALL WINNINGS**

### ❌ What This Wallet is NOT:
- NOT a user wallet
- NOT in the whitelist system
- NOT accessible by players
- NOT the old test wallet (GMAuqtZuYpwt3Y9EUeeEfQFJGDpsExWXG1ZegGBQwAW6)

## 🔒 Security Requirements

1. **NEVER** share this private key with anyone
2. **NEVER** add this wallet to the user whitelist
3. **ONLY** use this in backend environment variables
4. **BACKUP** this document in multiple secure locations
5. **MONITOR** this wallet for unauthorized access

## 📝 Environment Variable Setup

Add this to your backend environment variables:
```bash
BANKER_SECRET_KEY=EHVhPoeXMpwczeQ9JDzqzXV6njzAi4NueDBXSbZ9ttdu7Tavv2BKGHANPN7Tqw8i7To4JnRDjmxXJnXbo3f4hRr
```

## 🔄 Migration Notes

### Old (INCORRECT) Treasury Address:
```
GMAuqtZuYpwt3Y9EUeeEfQFJGDpsExWXG1ZegGBQwAW6
```
**Status:** This was a TEST USER WALLET - now remains as user wallet only

### New (CORRECT) Treasury Address:
```
8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS
```
**Status:** Dedicated house treasury wallet

## 📊 Wallet Monitoring

- **Solana Explorer:** https://explorer.solana.com/address/8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS
- **SolScan:** https://solscan.io/account/8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS

## 💰 Funding Instructions

1. Send SOL to: `8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS`
2. Start with 1-2 SOL for testing
3. Monitor balance regularly
4. Ensure sufficient funds for player payouts

## 🛡️ Recovery Instructions

If you need to recover this wallet:
1. Use the Base58 private key in any Solana wallet
2. Or use the array format programmatically
3. Verify the public address matches: `8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS`

---

**Generated:** $(date)
**Purpose:** CeeloSol House Treasury Wallet
**Security Level:** MAXIMUM
**Access Level:** Backend Only
