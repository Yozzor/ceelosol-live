import { Request, Response } from 'express';
import * as web3 from '@solana/web3.js';
// import { getConnection } from '../../packages/shared/src/rpc';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// House edge percentage (default 3%)
const HOUSE_EDGE = parseFloat(process.env.HOUSE_EDGE ?? "0.03");

export async function settleHandler(req: Request, res: Response) {
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
      const profit = Math.floor(stakeLamports * (1/HOUSE_EDGE - 1));
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
      } catch (error) {
        console.error('Error processing payout:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to process payout'
        });
      }
    } else {
      // Player lost, house keeps the stake
      console.log(`Player lost: Stake=${stakeLamports}`);

      return res.json({
        success: true,
        payout: 0,
        profit: -stakeLamports
      });
    }
  } catch (error) {
    console.error('Error in settle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process settlement'
    });
  }
}
