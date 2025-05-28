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
exports.HouseWalletManager = void 0;
exports.getHouseWalletManager = getHouseWalletManager;
const web3 = __importStar(require("@solana/web3.js"));
const bs58_1 = __importDefault(require("bs58"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * House Wallet Manager - Handles the persistent app wallet that collects bets and pays winnings
 * This wallet NEVER gets lost and the app maintains permanent access
 */
class HouseWalletManager {
    keypair = null;
    connection;
    constructor(connection) {
        this.connection = connection;
        this.initializeHouseWallet();
    }
    /**
     * Initialize the house wallet from environment variable or create a new one
     */
    initializeHouseWallet() {
        const bankerSecretKey = process.env.BANKER_SECRET_KEY;
        if (bankerSecretKey && bankerSecretKey.trim() !== '') {
            try {
                // Load existing house wallet from environment
                const secretKeyBytes = bs58_1.default.decode(bankerSecretKey);
                this.keypair = web3.Keypair.fromSecretKey(secretKeyBytes);
                console.log('✅ House wallet loaded from environment');
                console.log('🏦 House wallet address:', this.keypair.publicKey.toBase58());
            }
            catch (error) {
                console.error('❌ Failed to load house wallet from environment:', error);
                console.log('🔄 Creating new house wallet...');
                this.createNewHouseWallet();
            }
        }
        else {
            console.log('🆕 No house wallet found in environment, creating new one...');
            this.createNewHouseWallet();
        }
    }
    /**
     * Create a new house wallet and display the private key for storage
     */
    createNewHouseWallet() {
        this.keypair = web3.Keypair.generate();
        const secretKeyBase58 = bs58_1.default.encode(this.keypair.secretKey);
        console.log('\n🏦 NEW HOUSE WALLET CREATED');
        console.log('=====================================');
        console.log('🔑 Public Key:', this.keypair.publicKey.toBase58());
        console.log('🔐 Private Key (Base58):', secretKeyBase58);
        console.log('=====================================');
        console.log('⚠️  IMPORTANT: Add this to your .env file:');
        console.log(`BANKER_SECRET_KEY=${secretKeyBase58}`);
        console.log('=====================================\n');
    }
    /**
     * Get the house wallet's public key
     */
    getPublicKey() {
        if (!this.keypair) {
            throw new Error('House wallet not initialized');
        }
        return this.keypair.publicKey;
    }
    /**
     * Get the house wallet's keypair for signing transactions
     */
    getKeypair() {
        if (!this.keypair) {
            throw new Error('House wallet not initialized');
        }
        return this.keypair;
    }
    /**
     * Get current balance of the house wallet
     */
    async getBalance() {
        if (!this.keypair) {
            throw new Error('House wallet not initialized');
        }
        try {
            const balance = await this.connection.getBalance(this.keypair.publicKey);
            return balance;
        }
        catch (error) {
            console.error('Failed to get house wallet balance:', error);
            return 0;
        }
    }
    /**
     * Get house wallet info including balance
     */
    async getWalletInfo() {
        if (!this.keypair) {
            throw new Error('House wallet not initialized');
        }
        const balance = await this.getBalance();
        const secretKeyBase58 = bs58_1.default.encode(this.keypair.secretKey);
        return {
            publicKey: this.keypair.publicKey.toBase58(),
            secretKeyBase58,
            balance
        };
    }
    /**
     * Check if house wallet has sufficient funds for a payout
     */
    async hasSufficientFunds(requiredLamports) {
        const balance = await this.getBalance();
        return balance >= requiredLamports;
    }
    /**
     * Get house wallet balance in SOL (for display purposes)
     */
    async getBalanceInSOL() {
        const balance = await this.getBalance();
        return balance / web3.LAMPORTS_PER_SOL;
    }
}
exports.HouseWalletManager = HouseWalletManager;
// Singleton instance
let houseWalletManager = null;
/**
 * Get the singleton house wallet manager instance
 */
function getHouseWalletManager(connection) {
    if (!houseWalletManager) {
        if (!connection) {
            throw new Error('Connection required to initialize house wallet manager');
        }
        houseWalletManager = new HouseWalletManager(connection);
    }
    return houseWalletManager;
}
