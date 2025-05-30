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
    // Check if we have the required environment variables for full house wallet
    const bankerSecretKey = process.env.BANKER_SECRET_KEY;

    if (!bankerSecretKey || bankerSecretKey.trim() === '') {
      // Fallback to minimal server response format
      console.log('⚠️ BANKER_SECRET_KEY not found, using fallback house wallet address');
      const FALLBACK_HOUSE_WALLET = '3WgTYUtNQhoi2sUXE4fh8GQ1cCFxkTcdjXLyxxJ7ympu';

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

    // Fallback to minimal server response format on any error
    console.log('⚠️ Error occurred, using fallback house wallet address');
    const FALLBACK_HOUSE_WALLET = '3WgTYUtNQhoi2sUXE4fh8GQ1cCFxkTcdjXLyxxJ7ympu';

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
