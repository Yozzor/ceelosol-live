/**
 * SAFE WORD AUTHENTICATION SYSTEM
 * Provides secure two-factor authentication using wallet address + safe word
 * Prevents unauthorized access even if wallet addresses are discovered on-chain
 */

import { loadWalletSecurely, validateWalletSafeWord, needsSafeWordMigration, WalletData } from './walletPersistence';
import { isWhitelisted } from './whitelist';
import { validateSafeWord, normalizeSafeWord } from './safeWordGenerator';

export interface AuthenticationResult {
  success: boolean;
  walletData?: WalletData;
  requiresMigration?: boolean;
  error?: string;
}

export interface SafeWordValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Authenticate user with wallet address and safe word
 * @param walletAddress The wallet address to authenticate
 * @param safeWord The safe word provided by the user
 * @returns AuthenticationResult with success status and wallet data
 */
export async function authenticateWithSafeWord(
  walletAddress: string,
  safeWord: string
): Promise<AuthenticationResult> {
  try {
    console.log('🔐 Authenticating with safe word protection...');

    // Validate inputs
    if (!walletAddress || !walletAddress.trim()) {
      return {
        success: false,
        error: 'Wallet address is required'
      };
    }

    if (!safeWord || !safeWord.trim()) {
      return {
        success: false,
        error: 'Safe word is required'
      };
    }

    // Validate safe word format (must be valid BIP39 words)
    const safeWordValidation = validateSafeWordFormat(safeWord);
    if (!safeWordValidation.isValid) {
      return {
        success: false,
        error: safeWordValidation.error || 'Invalid safe word format'
      };
    }

    // Check if wallet is whitelisted
    if (!isWhitelisted(walletAddress.trim())) {
      console.warn('❌ Wallet not whitelisted:', walletAddress);
      return {
        success: false,
        error: 'Wallet address not authorized. Please generate a new wallet or contact support.'
      };
    }

    // Load wallet data
    const walletData = loadWalletSecurely();
    if (!walletData) {
      console.warn('❌ No wallet data found');
      return {
        success: false,
        error: 'No wallet found. Please generate a new wallet.'
      };
    }

    // Check if wallet address matches
    if (walletData.publicKey !== walletAddress.trim()) {
      console.warn('❌ Wallet address mismatch');
      return {
        success: false,
        error: 'Wallet address does not match stored wallet.'
      };
    }

    // Check if wallet needs safe word migration (legacy wallet)
    if (needsSafeWordMigration(walletData)) {
      console.warn('⚠️ Legacy wallet requires safe word migration');
      return {
        success: false,
        requiresMigration: true,
        walletData,
        error: 'This wallet was created before safe word protection. Please set up a safe word to continue.'
      };
    }

    // Validate safe word
    const safeWordMatch = validateWalletSafeWord(walletData, safeWord);
    if (!safeWordMatch) {
      console.warn('❌ Safe word validation failed');
      return {
        success: false,
        error: 'Incorrect safe word. Please check your safe word and try again.'
      };
    }

    console.log('✅ Authentication successful with safe word protection');
    return {
      success: true,
      walletData
    };

  } catch (error) {
    console.error('❌ Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed due to an unexpected error. Please try again.'
    };
  }
}

/**
 * Validate safe word format (must be valid BIP39 words)
 * @param safeWord The safe word to validate
 * @returns SafeWordValidationResult with validation status
 */
export function validateSafeWordFormat(safeWord: string): SafeWordValidationResult {
  try {
    if (!safeWord || typeof safeWord !== 'string') {
      return {
        isValid: false,
        error: 'Safe word is required'
      };
    }

    const trimmed = safeWord.trim();
    if (trimmed.length === 0) {
      return {
        isValid: false,
        error: 'Safe word cannot be empty'
      };
    }

    // Check if all words are valid BIP39 words
    if (!validateSafeWord(trimmed)) {
      return {
        isValid: false,
        error: 'Safe word contains invalid words. Please use only BIP39 words.'
      };
    }

    // Check word count (should be 3-6 words)
    const words = trimmed.split(/\s+/);
    if (words.length < 3 || words.length > 6) {
      return {
        isValid: false,
        error: 'Safe word must contain 3-6 words'
      };
    }

    return {
      isValid: true
    };

  } catch (error) {
    console.error('Safe word validation error:', error);
    return {
      isValid: false,
      error: 'Failed to validate safe word format'
    };
  }
}

/**
 * Check if a wallet address requires safe word authentication
 * @param walletAddress The wallet address to check
 * @returns boolean indicating if safe word is required
 */
export function requiresSafeWordAuth(walletAddress: string): boolean {
  try {
    if (!walletAddress || !walletAddress.trim()) {
      return false;
    }

    // Check if wallet is whitelisted (basic requirement)
    if (!isWhitelisted(walletAddress.trim())) {
      return false;
    }

    // Load wallet data to check if it has safe word protection
    const walletData = loadWalletSecurely();
    if (!walletData || walletData.publicKey !== walletAddress.trim()) {
      return false;
    }

    // If wallet exists and has safe word, require authentication
    return !needsSafeWordMigration(walletData);

  } catch (error) {
    console.error('Error checking safe word requirement:', error);
    return false;
  }
}

/**
 * Get authentication status for a wallet address
 * @param walletAddress The wallet address to check
 * @returns Object with authentication requirements and status
 */
export function getAuthenticationStatus(walletAddress: string): {
  isWhitelisted: boolean;
  requiresSafeWord: boolean;
  requiresMigration: boolean;
  hasWalletData: boolean;
} {
  try {
    const trimmedAddress = walletAddress?.trim() || '';

    if (!trimmedAddress) {
      return {
        isWhitelisted: false,
        requiresSafeWord: false,
        requiresMigration: false,
        hasWalletData: false
      };
    }

    const isWalletWhitelisted = isWhitelisted(trimmedAddress);
    const walletData = loadWalletSecurely();
    const hasMatchingWallet = walletData && walletData.publicKey === trimmedAddress;
    const needsMigration = hasMatchingWallet && needsSafeWordMigration(walletData);
    const requiresSafeWordAuth = hasMatchingWallet && !needsMigration;

    return {
      isWhitelisted: isWalletWhitelisted,
      requiresSafeWord: !!requiresSafeWordAuth,
      requiresMigration: !!needsMigration,
      hasWalletData: !!hasMatchingWallet
    };

  } catch (error) {
    console.error('Error getting authentication status:', error);
    return {
      isWhitelisted: false,
      requiresSafeWord: false,
      requiresMigration: false,
      hasWalletData: false
    };
  }
}

/**
 * Normalize safe word input for consistent processing
 * @param safeWord The safe word to normalize
 * @returns Normalized safe word
 */
export function normalizeSafeWordInput(safeWord: string): string {
  return normalizeSafeWord(safeWord);
}
