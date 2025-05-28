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
exports.settleHandler = settleHandler;
const web3 = __importStar(require("@solana/web3.js"));
// import { getConnection } from '../../packages/shared/src/rpc';
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// House edge percentage (default 3%)
const HOUSE_EDGE = parseFloat(process.env.HOUSE_EDGE ?? "0.03");
async function settleHandler(req, res) {
    try {
        const { playerPubkey, stakeLamports, outcome } = req.body;
        if (!playerPubkey || !stakeLamports || !outcome) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: playerPubkey, stakeLamports, outcome'
            });
        }
        // Convert player public key string to PublicKey object
        const playerPublicKey = new web3.PublicKey(playerPubkey);
        // Handle winning outcome
        if (outcome === 'win') {
            // Calculate profit based on house edge
            const profit = Math.floor(stakeLamports * (1 / HOUSE_EDGE - 1));
            const totalPayout = stakeLamports + profit;
            console.log(`Player won: Stake=${stakeLamports}, Profit=${profit}, Total=${totalPayout}`);
            try {
                // Create a direct connection to the Solana network
                const connection = new web3.Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
                // In devnet, we can use airdrop to simulate payment
                // In production, this would be a real transfer from the house wallet
                const signature = await connection.requestAirdrop(playerPublicKey, totalPayout);
                // Wait for confirmation
                await connection.confirmTransaction(signature);
                return res.json({
                    success: true,
                    payout: totalPayout,
                    profit,
                    signature
                });
            }
            catch (error) {
                console.error('Error processing payout:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to process payout'
                });
            }
        }
        else {
            // Player lost, house keeps the stake
            console.log(`Player lost: Stake=${stakeLamports}`);
            return res.json({
                success: true,
                payout: 0,
                profit: -stakeLamports
            });
        }
    }
    catch (error) {
        console.error('Error in settle:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process settlement'
        });
    }
}
