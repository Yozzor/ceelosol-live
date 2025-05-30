/**
 * SAFE WORD AUTHENTICATION SYSTEM - Frontend Version
 * Provides secure two-factor authentication using wallet address + safe word
 * Prevents unauthorized access even if wallet addresses are discovered on-chain
 */

import { validateSafeWord, normalizeSafeWord } from './safeWordGenerator';

export interface AuthenticationResult {
  success: boolean;
  walletData?: {
    publicKey: string;
    secretBase58: string;
    secretArray: number[];
    safeWord: string;
  };
  requiresMigration?: boolean;
  error?: string;
}

export interface SafeWordValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Authenticate user with wallet address and safe word (frontend version)
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

    // Load wallet data from localStorage
    const storedPublicKey = localStorage.getItem('ceelo_pub');
    const storedPrivateKeyB58 = localStorage.getItem('ceelo_priv_b58');
    const storedPrivateKeyArr = localStorage.getItem('ceelo_priv_arr');
    const storedSafeWord = localStorage.getItem('ceelo_safe_word');

    // Check if wallet data exists
    if (!storedPublicKey || !storedPrivateKeyB58 || !storedPrivateKeyArr) {
      return {
        success: false,
        error: 'No wallet found. Please generate a new wallet.'
      };
    }

    // Check if wallet address matches
    if (storedPublicKey !== walletAddress.trim()) {
      return {
        success: false,
        error: 'Wallet address does not match stored wallet.'
      };
    }

    // Check if wallet needs safe word migration (legacy wallet)
    if (!storedSafeWord || storedSafeWord.trim().length === 0) {
      console.warn('⚠️ Legacy wallet requires safe word migration');
      return {
        success: false,
        requiresMigration: true,
        error: 'This wallet was created before safe word protection. Please set up a safe word to continue.'
      };
    }

    // Validate safe word
    const normalizedInput = normalizeSafeWord(safeWord);
    const normalizedStored = normalizeSafeWord(storedSafeWord);
    
    if (normalizedInput !== normalizedStored) {
      console.warn('❌ Safe word validation failed');
      return {
        success: false,
        error: 'Incorrect safe word. Please check your safe word and try again.'
      };
    }

    // Parse secret array
    let secretArray: number[];
    try {
      secretArray = JSON.parse(storedPrivateKeyArr);
    } catch (e) {
      return {
        success: false,
        error: 'Invalid wallet data format.'
      };
    }

    console.log('✅ Authentication successful with safe word protection');
    return {
      success: true,
      walletData: {
        publicKey: storedPublicKey,
        secretBase58: storedPrivateKeyB58,
        secretArray,
        safeWord: storedSafeWord
      }
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

    const storedPublicKey = localStorage.getItem('ceelo_pub');
    const storedSafeWord = localStorage.getItem('ceelo_safe_word');

    // Check if wallet matches and has safe word
    return storedPublicKey === walletAddress.trim() && 
           storedSafeWord && 
           storedSafeWord.trim().length > 0;

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
  hasWalletData: boolean;
  requiresSafeWord: boolean;
  requiresMigration: boolean;
} {
  try {
    const trimmedAddress = walletAddress?.trim() || '';
    
    if (!trimmedAddress) {
      return {
        hasWalletData: false,
        requiresSafeWord: false,
        requiresMigration: false
      };
    }

    const storedPublicKey = localStorage.getItem('ceelo_pub');
    const storedSafeWord = localStorage.getItem('ceelo_safe_word');
    
    const hasMatchingWallet = storedPublicKey === trimmedAddress;
    const needsMigration = hasMatchingWallet && (!storedSafeWord || storedSafeWord.trim().length === 0);
    const requiresSafeWordAuth = hasMatchingWallet && !needsMigration;

    return {
      hasWalletData: hasMatchingWallet,
      requiresSafeWord: requiresSafeWordAuth,
      requiresMigration: needsMigration
    };

  } catch (error) {
    console.error('Error getting authentication status:', error);
    return {
      hasWalletData: false,
      requiresSafeWord: false,
      requiresMigration: false
    };
  }
}

/**
 * Set safe word for legacy wallet migration
 * @param safeWord The safe word to set
 * @returns boolean indicating success
 */
export function setSafeWordForMigration(safeWord: string): boolean {
  try {
    const validation = validateSafeWordFormat(safeWord);
    if (!validation.isValid) {
      console.error('Invalid safe word format:', validation.error);
      return false;
    }

    localStorage.setItem('ceelo_safe_word', safeWord.trim());
    console.log('✅ Safe word set for wallet migration');
    return true;

  } catch (error) {
    console.error('Error setting safe word:', error);
    return false;
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
