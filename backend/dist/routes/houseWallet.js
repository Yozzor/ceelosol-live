"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.houseWalletStatusHandler = houseWalletStatusHandler;
const web3 = __importStar(require("@solana/web3.js"));
const houseWallet_1 = require("../lib/houseWallet");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * Get house wallet information and status
 */
async function houseWalletStatusHandler(req, res) {
    try {
        // Check if we have the required environment variables for full house wallet
        const bankerSecretKey = process.env.BANKER_SECRET_KEY;
        if (!bankerSecretKey || bankerSecretKey.trim() === '') {
            // Fallback to minimal server response format
            console.log('⚠️ BANKER_SECRET_KEY not found, using fallback house wallet address');
            const FALLBACK_HOUSE_WALLET = '8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS';
            res.json({
                success: true,
                houseWallet: {
                    publicKey: FALLBACK_HOUSE_WALLET,
                    balance: 0,
                    balanceInSOL: 0
                }
            });
            return;
        }
        // Create connection to Solana
        const connection = new web3.Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
        // Get house wallet manager
        const houseWallet = (0, houseWallet_1.getHouseWalletManager)(connection);
        // Get wallet info
        const walletInfo = await houseWallet.getWalletInfo();
        const balanceInSOL = await houseWallet.getBalanceInSOL();
        res.json({
            success: true,
            houseWallet: {
                publicKey: walletInfo.publicKey,
                balance: walletInfo.balance,
                balanceInSOL: balanceInSOL,
                // Only include private key in development for monitoring
                ...(process.env.NODE_ENV === 'development' && {
                    privateKey: walletInfo.secretKeyBase58
                })
            }
        });
    }
    catch (error) {
        console.error('Error getting house wallet status:', error);
        // Fallback to minimal server response format on any error
        console.log('⚠️ Error occurred, using fallback house wallet address');
        const FALLBACK_HOUSE_WALLET = '8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS';
        res.json({
            success: true,
            houseWallet: {
                publicKey: FALLBACK_HOUSE_WALLET,
                balance: 0,
                balanceInSOL: 0
            }
        });
    }
}
