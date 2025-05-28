import React from 'react';
import './DiceTable.css';
import { CeeLoGame } from './CeeLoGame';
import * as web3 from '@solana/web3.js';
import { useAuth } from '../util/auth';
import { useActivityFeed } from './ActivityFeed';

/**
 * DiceTable component - REAL Solana blockchain integration
 */
export function DiceTable({ stakeLamports, onResult, userBalance }) {
  const { publicKey, privateKey, isAuthenticated } = useAuth();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { addWin } = useActivityFeed();

  // TREASURY WALLET - This is where all bets go and winnings come from
  const TREASURY_PRIVATE_KEY = "vFj/mjPXxWxMoVxwBpRfHKufaxK0RYy3Gd2rAmKlveF7oiinGDnsXlRSbXieC5x6prka4aQGE8tFRz17zLl38w==";

  // Handle game result and process REAL Solana transactions
  const handleGameResult = async (gameResult) => {
    console.log('🎲 Processing REAL Solana game result:', gameResult);

    if (isProcessing) {
      console.log('⏳ Transaction already in progress, ignoring duplicate request');
      return;
    }

    setIsProcessing(true);
    let finalResult = { ...gameResult };

    try {
      if (!isAuthenticated || !publicKey || !privateKey) {
        throw new Error('Player not authenticated. Please login first.');
      }

      // Create Solana connection
      const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

      // Create player keypair from stored private key
      const playerKeypair = web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(privateKey)));

      // Create treasury keypair
      const treasuryKeypair = web3.Keypair.fromSecretKey(Buffer.from(TREASURY_PRIVATE_KEY, "base64"));

      console.log('👤 Player wallet:', playerKeypair.publicKey.toBase58());
      console.log('🏦 Treasury wallet:', treasuryKeypair.publicKey.toBase58());
      console.log('💰 Stake amount:', stakeLamports, 'lamports (', stakeLamports / web3.LAMPORTS_PER_SOL, 'SOL)');

      // CRITICAL: Double-check player balance in real-time before transaction
      const playerBalance = await connection.getBalance(playerKeypair.publicKey);
      console.log('👤 Real-time player balance check:', playerBalance, 'lamports (', playerBalance / web3.LAMPORTS_PER_SOL, 'SOL)');

      if (playerBalance < stakeLamports) {
        throw new Error(`❌ INSUFFICIENT BALANCE! You have ${(playerBalance / web3.LAMPORTS_PER_SOL).toFixed(6)} SOL but need ${(stakeLamports / web3.LAMPORTS_PER_SOL).toFixed(6)} SOL to play. Please refresh your balance or add more SOL to your wallet.`);
      }

      // Additional safety check: Ensure minimum balance for transaction fees
      const minBalanceForFees = 5000; // 0.000005 SOL for transaction fees
      if (playerBalance < stakeLamports + minBalanceForFees) {
        console.warn('⚠️ Player balance is very low, may not cover transaction fees');
      }

      let transaction;
      let payout = 0;
      let profit = 0;
      let signature;

      if (gameResult.outcome === 'win') {
        // PLAYER WINS: Treasury pays player 2x the stake
        payout = stakeLamports * 2;
        profit = stakeLamports;

        console.log('🎉 PLAYER WINS! Treasury paying:', payout, 'lamports');

        // Check treasury balance
        const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey);
        console.log('🏦 Treasury balance:', treasuryBalance, 'lamports');

        if (treasuryBalance < payout) {
          throw new Error(`Treasury insufficient funds! Cannot pay ${(payout / web3.LAMPORTS_PER_SOL).toFixed(6)} SOL`);
        }

        // Treasury sends winnings to player
        transaction = new web3.Transaction().add(
          web3.SystemProgram.transfer({
            fromPubkey: treasuryKeypair.publicKey,
            toPubkey: playerKeypair.publicKey,
            lamports: payout,
          })
        );

        // Get recent blockhash and sign with treasury
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = treasuryKeypair.publicKey;
        transaction.sign(treasuryKeypair);

        // Send transaction
        signature = await connection.sendRawTransaction(transaction.serialize());

      } else if (gameResult.outcome === 'lose') {
        // PLAYER LOSES: Player pays treasury the stake
        payout = 0;
        profit = -stakeLamports;

        console.log('😞 PLAYER LOSES! Player paying treasury:', stakeLamports, 'lamports');

        // Player sends stake to treasury
        transaction = new web3.Transaction().add(
          web3.SystemProgram.transfer({
            fromPubkey: playerKeypair.publicKey,
            toPubkey: treasuryKeypair.publicKey,
            lamports: stakeLamports,
          })
        );

        // Get recent blockhash and sign with player
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = playerKeypair.publicKey;
        transaction.sign(playerKeypair);

        // Send transaction
        signature = await connection.sendRawTransaction(transaction.serialize());

      } else {
        // Point or reroll - no money changes hands
        console.log('🎯 Point/Reroll - no transaction needed');
        finalResult.payout = 0;
        finalResult.profit = 0;
        finalResult.signature = null;

        if (onResult) {
          onResult(finalResult);
        }
        return;
      }

      // Wait for confirmation
      console.log('⏳ Waiting for transaction confirmation...');
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('✅ Transaction confirmed:', signature);
      console.log('🔗 View on explorer: https://explorer.solana.com/tx/' + signature + '?cluster=devnet');

      // Update final result
      finalResult.payout = payout;
      finalResult.profit = profit;
      finalResult.signature = signature;
      finalResult.verified = true;

      // Store game result in backend and add to activity feed if player won
      if (gameResult.outcome === 'win') {
        const resultMessage = gameResult.dice && gameResult.dice.length === 3
          ? (() => {
              const sorted = [...gameResult.dice].sort();
              if (sorted[0] === 4 && sorted[1] === 5 && sorted[2] === 6) return '4-5-6!';
              if (sorted[0] === sorted[1] && sorted[1] === sorted[2]) return `Triple ${sorted[0]}s!`;
              return 'Win!';
            })()
          : 'Win!';

        // Store in backend for activity tracking
        try {
          await fetch('/api/activity/store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signature,
              playerAddress: publicKey,
              dice: gameResult.dice,
              outcome: gameResult.outcome,
              amount: payout,
              result: resultMessage
            })
          });
        } catch (error) {
          console.error('Failed to store game result:', error);
        }

        // Add to local activity feed
        addWin(publicKey, payout, gameResult.dice, resultMessage);
      }

    } catch (error) {
      console.error('❌ Solana transaction failed:', error);

      // Show user-friendly error
      alert('Transaction failed: ' + error.message);

      // Still return the game result but mark as unverified
      finalResult.payout = 0;
      finalResult.profit = 0;
      finalResult.signature = null;
      finalResult.verified = false;
      finalResult.error = error.message;
    } finally {
      // Always reset processing state
      setIsProcessing(false);
    }

    // Call the parent onResult callback
    if (onResult) {
      onResult(finalResult);
    }
  };

  // Validate bet amount and user balance before allowing game
  const minBetLamports = 1000000; // Minimum 0.001 SOL in lamports
  const safeUserBalance = userBalance || 0; // Default to 0 if undefined
  const userBalanceLamports = safeUserBalance * 1000000000; // Convert SOL to lamports

  const isValidBet = stakeLamports >= minBetLamports;
  const hasSufficientBalance = userBalanceLamports >= stakeLamports;
  const canPlay = isValidBet && hasSufficientBalance && isAuthenticated && !isBalanceLoading;

  // Check if balance is still loading
  const isBalanceLoading = userBalance === undefined || userBalance === null;

  // Determine disabled reason for better UX
  let disabledReason = 'ROLL DICE';
  if (!isAuthenticated) {
    disabledReason = 'CONNECT WALLET FIRST';
  } else if (isBalanceLoading) {
    disabledReason = 'LOADING BALANCE...';
  } else if (!isValidBet) {
    disabledReason = 'SET VALID BET AMOUNT';
  } else if (!hasSufficientBalance) {
    disabledReason = 'INSUFFICIENT BALANCE';
  }

  return (
    <div>
      {/* Validation Messages */}
      {!isValidBet && (
        <div className="alert text-center mb-3" style={{
          background: 'linear-gradient(135deg, rgba(107, 91, 47, 0.3), rgba(74, 74, 58, 0.3))',
          border: '2px solid #6b5b2f',
          borderRadius: '8px',
          color: '#e1e1e1',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
        }}>
          <strong>⚠️ Please set a valid bet amount above to start playing!</strong>
          <br />
          <small>Minimum bet: 0.001 SOL</small>
        </div>
      )}

      {isValidBet && !hasSufficientBalance && (
        <div className="alert text-center mb-3" style={{
          background: 'linear-gradient(135deg, rgba(114, 47, 55, 0.3), rgba(139, 69, 19, 0.3))',
          border: '2px solid #722f37',
          borderRadius: '8px',
          color: '#e1e1e1',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
        }}>
          <strong>❌ Insufficient Balance!</strong>
          <br />
          <small>
            You need {(stakeLamports / 1000000000).toFixed(6)} SOL but only have {safeUserBalance.toFixed(6)} SOL
          </small>
        </div>
      )}

      {!isAuthenticated && (
        <div className="alert text-center mb-3" style={{
          background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.3), rgba(74, 74, 58, 0.3))',
          border: '2px solid #2a2a2a',
          borderRadius: '8px',
          color: '#e1e1e1',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
        }}>
          <strong>🔐 Please connect your wallet to play!</strong>
        </div>
      )}

      {isAuthenticated && isBalanceLoading && (
        <div className="alert text-center mb-3" style={{
          background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.3), rgba(74, 74, 58, 0.3))',
          border: '2px solid #2a2a2a',
          borderRadius: '8px',
          color: '#e1e1e1',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
        }}>
          <strong>⏳ Loading wallet balance...</strong>
          <br />
          <small>Please wait while we fetch your current balance</small>
        </div>
      )}

      <CeeLoGame
        stakeLamports={stakeLamports}
        onResult={handleGameResult}
        disabled={!canPlay || isProcessing}
        disabledReason={isProcessing ? 'PROCESSING...' : disabledReason}
      />
    </div>
  );
}
