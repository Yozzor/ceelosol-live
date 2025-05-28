import React from 'react';
import * as web3 from '@solana/web3.js';
import { buildApiUrl, API_CONFIG } from '../config/api';

/**
 * TreasuryMonitor - Monitors treasury wallet for activity
 * This can detect wins/losses by watching balance changes
 */
export class TreasuryMonitor {
  constructor() {
    this.connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
    this.treasuryAddress = null; // Will be fetched from backend
    this.isMonitoring = false;
    this.lastBalance = null;
    this.subscribers = [];
    this.initializeTreasuryAddress();
  }

  // Fetch the real house wallet address from backend
  async initializeTreasuryAddress() {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HOUSE_WALLET));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Handle both response formats:
        // Full backend: { success: true, houseWallet: { publicKey: "..." } }
        // Minimal server: { success: true, address: "..." }
        this.treasuryAddress = data.houseWallet?.publicKey || data.address;

        if (this.treasuryAddress) {
          console.log('🏦 Treasury address initialized:', this.treasuryAddress);
        } else {
          console.error('Failed to get house wallet address from backend:', data);
          // Fallback to DEDICATED HOUSE TREASURY (separate from user wallets)
          this.treasuryAddress = '8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS';
        }
      } else {
        console.error('Failed to get house wallet address from backend:', data);
        // Fallback to DEDICATED HOUSE TREASURY (separate from user wallets)
        this.treasuryAddress = '8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS';
      }
    } catch (error) {
      console.error('Error fetching house wallet address:', error.message || error);
      // Fallback to DEDICATED HOUSE TREASURY (separate from user wallets)
      this.treasuryAddress = '8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS';
    }
  }

  // Subscribe to treasury activity
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // Notify all subscribers of activity
  notifySubscribers(activity) {
    this.subscribers.forEach(callback => {
      try {
        callback(activity);
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }

  // Start monitoring treasury
  async startMonitoring() {
    if (this.isMonitoring) return;

    // Wait for treasury address to be initialized
    while (!this.treasuryAddress) {
      console.log('⏳ Waiting for treasury address to be initialized...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isMonitoring = true;
    console.log('🏦 Starting treasury monitoring...');

    try {
      // Get initial balance
      const treasuryPubkey = new web3.PublicKey(this.treasuryAddress);
      this.lastBalance = await this.connection.getBalance(treasuryPubkey);
      console.log('🏦 Initial treasury balance:', this.lastBalance / 1000000000, 'SOL');

      // Load recent wins from blockchain history
      await this.loadRecentWins();

      // Start polling for changes
      this.pollBalance();
    } catch (error) {
      console.error('Failed to start treasury monitoring:', error);
      this.isMonitoring = false;
    }
  }

  // Load recent wins from blockchain history
  async loadRecentWins() {
    try {
      console.log('📊 Loading recent wins from blockchain...');
      const recentWins = await this.analyzeRecentWins();

      // Add each win to the activity feed
      recentWins.forEach(win => {
        // Estimate dice result based on win amount (since we can't get game data from blockchain)
        const estimatedResult = this.estimateGameResult(win.amount);

        this.notifySubscribers({
          type: 'historical_win',
          playerAddress: win.playerAddress,
          amount: win.amount,
          dice: estimatedResult.dice,
          result: estimatedResult.message,
          timestamp: win.timestamp,
          signature: win.signature
        });
      });

      console.log(`📊 Loaded ${recentWins.length} recent wins from blockchain`);
    } catch (error) {
      console.error('Error loading recent wins:', error);
    }
  }

  // Estimate game result based on win amount (since blockchain doesn't store game data)
  estimateGameResult(amountWon) {
    // Since we can't get the actual dice from blockchain, we'll show generic win messages
    if (amountWon > 20000000) { // > 0.02 SOL
      return { dice: [6, 6, 6], message: 'Big Win!' };
    } else if (amountWon > 10000000) { // > 0.01 SOL
      return { dice: [4, 5, 6], message: 'Win!' };
    } else {
      return { dice: [3, 3, 3], message: 'Win!' };
    }
  }

  // Stop monitoring
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('🏦 Stopped treasury monitoring');
  }

  // Poll treasury balance for changes
  async pollBalance() {
    if (!this.isMonitoring || !this.treasuryAddress) return;

    try {
      const treasuryPubkey = new web3.PublicKey(this.treasuryAddress);
      const currentBalance = await this.connection.getBalance(treasuryPubkey);

      if (this.lastBalance !== null && currentBalance !== this.lastBalance) {
        const change = currentBalance - this.lastBalance;
        const changeSOL = change / 1000000000;

        console.log('🏦 Treasury balance changed:', changeSOL, 'SOL');

        // Determine if this was a win or loss
        if (change > 0) {
          // Treasury gained money - player lost
          this.notifySubscribers({
            type: 'player_loss',
            amount: Math.abs(change),
            amountSOL: Math.abs(changeSOL),
            newBalance: currentBalance,
            timestamp: new Date()
          });
        } else if (change < 0) {
          // Treasury lost money - player won
          this.notifySubscribers({
            type: 'player_win',
            amount: Math.abs(change),
            amountSOL: Math.abs(changeSOL),
            newBalance: currentBalance,
            timestamp: new Date()
          });
        }

        this.lastBalance = currentBalance;
      }
    } catch (error) {
      console.error('Error polling treasury balance:', error);
    }

    // Continue polling every 5 seconds
    if (this.isMonitoring) {
      setTimeout(() => this.pollBalance(), 5000);
    }
  }

  // Get current treasury balance
  async getCurrentBalance() {
    try {
      if (!this.treasuryAddress) {
        console.log('Treasury address not yet initialized');
        return { lamports: 0, sol: 0 };
      }

      const treasuryPubkey = new web3.PublicKey(this.treasuryAddress);
      const balance = await this.connection.getBalance(treasuryPubkey);
      return {
        lamports: balance,
        sol: balance / 1000000000
      };
    } catch (error) {
      console.error('Error getting treasury balance:', error);
      return null;
    }
  }

  // Get treasury transaction history (recent)
  async getRecentTransactions(limit = 10) {
    try {
      const treasuryPubkey = new web3.PublicKey(this.treasuryAddress);
      const signatures = await this.connection.getSignaturesForAddress(
        treasuryPubkey,
        { limit }
      );

      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await this.connection.getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0
            });
            return {
              signature: sig.signature,
              slot: sig.slot,
              blockTime: sig.blockTime,
              transaction: tx
            };
          } catch (error) {
            console.error('Error fetching transaction:', error);
            return null;
          }
        })
      );

      return transactions.filter(tx => tx !== null);
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }

  // Analyze recent transactions to detect wins
  async analyzeRecentWins() {
    try {
      const recentTxs = await this.getRecentTransactions(20);
      const treasuryPubkey = new web3.PublicKey(this.treasuryAddress);
      const wins = [];

      for (const txData of recentTxs) {
        const tx = txData.transaction;
        if (!tx || !tx.meta || tx.meta.err) continue;

        // Look for SOL transfers from treasury (indicating player wins)
        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys;

        // Find treasury account index
        const treasuryIndex = accountKeys.findIndex(key =>
          key.equals ? key.equals(treasuryPubkey) : key.toString() === this.treasuryAddress
        );

        if (treasuryIndex === -1) continue;

        const treasuryPreBalance = preBalances[treasuryIndex];
        const treasuryPostBalance = postBalances[treasuryIndex];
        const treasuryChange = treasuryPostBalance - treasuryPreBalance;

        // If treasury lost SOL, someone won
        if (treasuryChange < 0) {
          const amountWon = Math.abs(treasuryChange);

          // Find the recipient (who gained SOL)
          let winnerAddress = null;
          for (let i = 0; i < accountKeys.length; i++) {
            if (i !== treasuryIndex) {
              const change = postBalances[i] - preBalances[i];
              if (change > 0 && change === amountWon) {
                winnerAddress = accountKeys[i].toString();
                break;
              }
            }
          }

          if (winnerAddress) {
            wins.push({
              signature: txData.signature,
              playerAddress: winnerAddress,
              amount: amountWon,
              timestamp: txData.blockTime ? new Date(txData.blockTime * 1000) : new Date(),
              type: amountWon > 10000000 ? 'big_win' : 'win' // 0.01 SOL threshold
            });
          }
        }
      }

      return wins.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error analyzing recent wins:', error);
      return [];
    }
  }
}

// Create singleton instance
export const treasuryMonitor = new TreasuryMonitor();

// Hook for React components
export const useTreasuryMonitor = () => {
  const [treasuryData, setTreasuryData] = React.useState({
    balance: null,
    isMonitoring: false,
    recentActivity: []
  });

  React.useEffect(() => {
    // Make treasury monitor globally accessible
    window.treasuryMonitor = treasuryMonitor;

    // Subscribe to treasury changes
    const unsubscribe = treasuryMonitor.subscribe((activity) => {
      setTreasuryData(prev => ({
        ...prev,
        recentActivity: [activity, ...prev.recentActivity.slice(0, 19)] // Keep last 20
      }));
    });

    // Start monitoring
    treasuryMonitor.startMonitoring();

    // Get initial balance
    treasuryMonitor.getCurrentBalance().then(balance => {
      if (balance) {
        setTreasuryData(prev => ({
          ...prev,
          balance: balance.sol,
          isMonitoring: true
        }));
      }
    });

    return () => {
      unsubscribe();
      // Don't stop monitoring here as other components might be using it
    };
  }, []);

  return treasuryData;
};
