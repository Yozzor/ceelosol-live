import { Request, Response } from 'express';
import * as web3 from '@solana/web3.js';
import { getHouseWalletManager } from '../lib/houseWallet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Get house wallet information and status
 */
export async function houseWalletStatusHandler(req: Request, res: Response) {
  try {
    // Create connection to Solana
    const connection = new web3.Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    // Get house wallet manager
    const houseWallet = getHouseWalletManager(connection);

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
  } catch (error) {
    console.error('Error getting house wallet status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get house wallet status'
    });
  }
}
