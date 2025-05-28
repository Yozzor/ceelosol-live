import * as web3 from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface HouseWalletInfo {
  publicKey: string;
  secretKeyBase58: string;
  balance: number;
}

/**
 * House Wallet Manager - Handles the persistent app wallet that collects bets and pays winnings
 * This wallet NEVER gets lost and the app maintains permanent access
 */
export class HouseWalletManager {
  private keypair: web3.Keypair | null = null;
  private connection: web3.Connection;

  constructor(connection: web3.Connection) {
    this.connection = connection;
    this.initializeHouseWallet();
  }

  /**
   * Initialize the house wallet from environment variable or create a new one
   */
  private initializeHouseWallet(): void {
    const bankerSecretKey = process.env.BANKER_SECRET_KEY;

    if (bankerSecretKey && bankerSecretKey.trim() !== '') {
      try {
        // Load existing house wallet from environment
        const secretKeyBytes = bs58.decode(bankerSecretKey);
        this.keypair = web3.Keypair.fromSecretKey(secretKeyBytes);
        console.log('✅ House wallet loaded from environment');
        console.log('🏦 House wallet address:', this.keypair.publicKey.toBase58());
      } catch (error) {
        console.error('❌ Failed to load house wallet from environment:', error);
        console.log('🔄 Creating new house wallet...');
        this.createNewHouseWallet();
      }
    } else {
      console.log('🆕 No house wallet found in environment, creating new one...');
      this.createNewHouseWallet();
    }
  }

  /**
   * Create a new house wallet and display the private key for storage
   */
  private createNewHouseWallet(): void {
    this.keypair = web3.Keypair.generate();
    const secretKeyBase58 = bs58.encode(this.keypair.secretKey);

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
  public getPublicKey(): web3.PublicKey {
    if (!this.keypair) {
      throw new Error('House wallet not initialized');
    }
    return this.keypair.publicKey;
  }

  /**
   * Get the house wallet's keypair for signing transactions
   */
  public getKeypair(): web3.Keypair {
    if (!this.keypair) {
      throw new Error('House wallet not initialized');
    }
    return this.keypair;
  }

  /**
   * Get current balance of the house wallet
   */
  public async getBalance(): Promise<number> {
    if (!this.keypair) {
      throw new Error('House wallet not initialized');
    }

    try {
      const balance = await this.connection.getBalance(this.keypair.publicKey);
      return balance;
    } catch (error) {
      console.error('Failed to get house wallet balance:', error);
      return 0;
    }
  }

  /**
   * Get house wallet info including balance
   */
  public async getWalletInfo(): Promise<HouseWalletInfo> {
    if (!this.keypair) {
      throw new Error('House wallet not initialized');
    }

    const balance = await this.getBalance();
    const secretKeyBase58 = bs58.encode(this.keypair.secretKey);

    return {
      publicKey: this.keypair.publicKey.toBase58(),
      secretKeyBase58,
      balance
    };
  }

  /**
   * Check if house wallet has sufficient funds for a payout
   */
  public async hasSufficientFunds(requiredLamports: number): Promise<boolean> {
    const balance = await this.getBalance();
    return balance >= requiredLamports;
  }

  /**
   * Get house wallet balance in SOL (for display purposes)
   */
  public async getBalanceInSOL(): Promise<number> {
    const balance = await this.getBalance();
    return balance / web3.LAMPORTS_PER_SOL;
  }
}

// Singleton instance
let houseWalletManager: HouseWalletManager | null = null;

/**
 * Get the singleton house wallet manager instance
 */
export function getHouseWalletManager(connection?: web3.Connection): HouseWalletManager {
  if (!houseWalletManager) {
    if (!connection) {
      throw new Error('Connection required to initialize house wallet manager');
    }
    houseWalletManager = new HouseWalletManager(connection);
  }
  return houseWalletManager;
}
