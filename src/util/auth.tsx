import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateWallet, WalletInfo } from '../lib/walletGen';
import { addToWhitelist } from '../lib/whitelist';
import * as web3 from '@solana/web3.js';
import { loadWalletSecurely, saveWalletSecurely, emergencyRecoverAllWalletData, WalletData } from '../lib/walletPersistence';

// Define the shape of our auth context
interface AuthContextType {
  isAuthenticated: boolean;
  publicKey: string | null;
  privateKey: string | null;
  login: () => Promise<void>;
  register: () => Promise<WalletInfo>;
  restore: (privateKeyString: string) => Promise<boolean>;
  logout: () => void;
  initializeFromSession: () => void;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  publicKey: null,
  privateKey: null,
  login: async () => {},
  register: async () => ({ publicKey: '', secretArray: [], secretBase58: '', safeWord: '' }),
  restore: async () => false,
  logout: () => {},
  initializeFromSession: () => {},
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component that wraps the app and makes auth available
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  // Initialize auth state with GUARANTEED WALLET RECOVERY
  useEffect(() => {
    console.log('🔍 Initializing auth with comprehensive wallet recovery...');

    // First, check if we have an authorized session
    const sessionWallet = sessionStorage.getItem('ceelo_authorized_wallet');
    if (sessionWallet) {
      console.log('🔑 Found authorized session wallet:', sessionWallet);

      // Try to load the full wallet data for this address
      const walletData = loadWalletSecurely();

      if (walletData && walletData.publicKey === sessionWallet) {
        console.log('✅ Session wallet matches stored wallet data');
        setIsAuthenticated(true);
        setPublicKey(walletData.publicKey);
        setPrivateKey(JSON.stringify(walletData.secretArray));
        return;
      } else {
        // Session wallet exists but no matching wallet data
        // Try to recover from localStorage components
        const storedPub = localStorage.getItem('ceelo_pub');
        const storedPrivB58 = localStorage.getItem('ceelo_priv_b58');
        const storedPrivArr = localStorage.getItem('ceelo_priv_arr');

        if (storedPub === sessionWallet && storedPrivB58 && storedPrivArr) {
          console.log('✅ Recovered wallet from localStorage components');
          setIsAuthenticated(true);
          setPublicKey(storedPub);
          setPrivateKey(storedPrivArr);

          // Rebuild the secure wallet data
          try {
            const secretArray = JSON.parse(storedPrivArr);
            const storedSafeWord = localStorage.getItem('ceelo_safe_word') || '';
            const walletData: WalletData = {
              publicKey: storedPub,
              secretBase58: storedPrivB58,
              secretArray: secretArray,
              safeWord: storedSafeWord,
              createdAt: new Date().toISOString()
            };
            saveWalletSecurely(walletData);
            console.log('💾 Rebuilt secure wallet storage');
          } catch (error) {
            console.error('Failed to rebuild wallet storage:', error);
          }
          return;
        }
      }
    }

    // Try to load wallet with automatic recovery
    const walletData = loadWalletSecurely();

    if (walletData) {
      console.log('✅ Wallet loaded successfully:', walletData.publicKey);
      setIsAuthenticated(true);
      setPublicKey(walletData.publicKey);
      setPrivateKey(JSON.stringify(walletData.secretArray));

      // Ensure session is set
      sessionStorage.setItem('ceelo_authorized_wallet', walletData.publicKey);
      return;
    }

    // If no wallet found, try emergency recovery
    console.warn('⚠️ No wallet found, attempting emergency recovery...');
    const recoveredWallets = emergencyRecoverAllWalletData();

    if (recoveredWallets.length > 0) {
      const primaryWallet = recoveredWallets[0]; // Use the first recovered wallet
      console.log('✅ Emergency recovery successful:', primaryWallet.publicKey);

      // Save the recovered wallet
      saveWalletSecurely(primaryWallet);

      setIsAuthenticated(true);
      setPublicKey(primaryWallet.publicKey);
      setPrivateKey(JSON.stringify(primaryWallet.secretArray));
      return;
    }

    console.log('ℹ️ No existing wallet found - user needs to generate or restore one');
  }, []);

  // Login function - uses existing wallet from localStorage
  const login = async () => {
    const storedPublicKey = localStorage.getItem('ceelo_pub');
    const storedPrivateKeyB58 = localStorage.getItem('ceelo_priv_b58');
    const storedPrivateKeyArr = localStorage.getItem('ceelo_priv_arr');

    if (storedPublicKey && (storedPrivateKeyB58 || storedPrivateKeyArr)) {
      setIsAuthenticated(true);
      setPublicKey(storedPublicKey);

      // Always ensure privateKey state is in JSON array format
      if (storedPrivateKeyArr) {
        setPrivateKey(storedPrivateKeyArr);
      } else if (storedPrivateKeyB58) {
        // Convert Base58 to array format
        try {
          const bs58 = await import('bs58');
          const decoded = bs58.default.decode(storedPrivateKeyB58);

          let fullSecretKey: Uint8Array;
          if (decoded.length === 32) {
            // This is a 32-byte private key, reconstruct the full 64-byte key
            const tempKeypair = web3.Keypair.fromSecretKey(decoded);
            fullSecretKey = tempKeypair.secretKey;
          } else if (decoded.length === 64) {
            // This is already a full 64-byte secret key
            fullSecretKey = decoded;
          } else {
            throw new Error(`Invalid Base58 key length: ${decoded.length} bytes`);
          }

          const secretArray = Array.from(fullSecretKey);
          const arrayFormat = JSON.stringify(secretArray);

          // Store the array format for future use
          localStorage.setItem('ceelo_priv_arr', arrayFormat);
          setPrivateKey(arrayFormat);
        } catch (e) {
          console.error('Failed to convert Base58 to array format:', e);
          // Fallback to Base58 string, components will handle it
          setPrivateKey(storedPrivateKeyB58);
        }
      }
    } else {
      console.error('No wallet found. Please register first.');
    }
  };

  // Register function - generates a new wallet
  const register = async () => {
    try {
      const wallet = await generateWallet();
      setIsAuthenticated(true);
      setPublicKey(wallet.publicKey);
      setPrivateKey(JSON.stringify(wallet.secretArray));
      return wallet;
    } catch (error) {
      console.error('Failed to generate wallet:', error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    // Clear the session storage immediately to force return to access control
    sessionStorage.removeItem('ceelo_authorized_wallet');
    // We don't remove the keys from localStorage on logout
    // This allows the user to log back in without re-registering

    // Clear auth state
    setIsAuthenticated(false);
    setPublicKey(null);
    setPrivateKey(null);

    // Force a full page reload to trigger AppAccessManager to show access control
    window.location.reload();
  };

  // Initialize from session - called when access is granted
  const initializeFromSession = () => {
    console.log('🔄 Manually initializing auth from session...');

    const sessionWallet = sessionStorage.getItem('ceelo_authorized_wallet');
    if (!sessionWallet) {
      console.warn('No session wallet found for initialization');
      return;
    }

    console.log('🔑 Found session wallet for initialization:', sessionWallet);

    // Try to load the full wallet data for this address
    const walletData = loadWalletSecurely();

    if (walletData && walletData.publicKey === sessionWallet) {
      console.log('✅ Session wallet matches stored wallet data');
      setIsAuthenticated(true);
      setPublicKey(walletData.publicKey);
      setPrivateKey(JSON.stringify(walletData.secretArray));
      return;
    } else {
      // Session wallet exists but no matching wallet data
      // Try to recover from localStorage components
      const storedPub = localStorage.getItem('ceelo_pub');
      const storedPrivB58 = localStorage.getItem('ceelo_priv_b58');
      const storedPrivArr = localStorage.getItem('ceelo_priv_arr');

      if (storedPub === sessionWallet && storedPrivB58 && storedPrivArr) {
        console.log('✅ Recovered wallet from localStorage components during manual init');
        setIsAuthenticated(true);
        setPublicKey(storedPub);
        setPrivateKey(storedPrivArr);

        // Rebuild the secure wallet data
        try {
          const secretArray = JSON.parse(storedPrivArr);
          const storedSafeWord = localStorage.getItem('ceelo_safe_word') || '';
          const walletData: WalletData = {
            publicKey: storedPub,
            secretBase58: storedPrivB58,
            secretArray: secretArray,
            safeWord: storedSafeWord,
            createdAt: new Date().toISOString()
          };
          saveWalletSecurely(walletData);
          console.log('💾 Rebuilt secure wallet storage during manual init');
        } catch (error) {
          console.error('Failed to rebuild wallet storage during manual init:', error);
        }
        return;
      }
    }

    console.warn('⚠️ Could not initialize wallet from session - wallet data not found');
  };

  // Restore function - restores a wallet from a private key (supports both Base58 and array formats)
  const restore = async (privateKeyString: string): Promise<boolean> => {
    try {
      let secretKey: Uint8Array;

      // Try to parse as Base58 first
      try {
        const bs58 = await import('bs58');
        const decoded = bs58.default.decode(privateKeyString.trim());

        // Check if it's a 32-byte private key (Phantom format) or 64-byte (CLI format)
        if (decoded.length === 32) {
          // This is a 32-byte private key from Phantom, we need to reconstruct the full 64-byte key
          const tempKeypair = web3.Keypair.fromSecretKey(decoded);
          secretKey = tempKeypair.secretKey; // This will be 64 bytes
        } else if (decoded.length === 64) {
          // This is already a full 64-byte secret key
          secretKey = decoded;
        } else {
          throw new Error(`Invalid Base58 key length: ${decoded.length} bytes. Expected 32 or 64 bytes.`);
        }
      } catch {
        // If Base58 fails, try to parse as JSON array or bracket format
        let secretKeyArray: number[];

        try {
          // First, try to parse it as a JSON array
          secretKeyArray = JSON.parse(privateKeyString);
        } catch (e) {
          // If that fails, try to parse it as a comma-separated list inside brackets
          if (privateKeyString.startsWith('[') && privateKeyString.endsWith(']')) {
            const numbersStr = privateKeyString.substring(1, privateKeyString.length - 1);
            secretKeyArray = numbersStr.split(',').map(num => parseInt(num.trim(), 10));
          } else {
            throw new Error('Invalid private key format');
          }
        }

        // Validate that we have a 64-byte array
        if (!Array.isArray(secretKeyArray) || secretKeyArray.length !== 64) {
          throw new Error('Invalid private key: must be a 64-byte array');
        }

        secretKey = new Uint8Array(secretKeyArray);
      }

      // Validate secret key length
      if (secretKey.length !== 64) {
        throw new Error('Invalid secret key length. Expected 64 bytes.');
      }

      // Create a keypair from the secret key
      const keypair = web3.Keypair.fromSecretKey(secretKey);
      const publicKey = keypair.publicKey.toBase58();

      // Import bs58 for encoding
      const bs58 = await import('bs58');
      // For Phantom wallet, encode the FULL 64-byte secret key
      const secretBase58 = bs58.default.encode(secretKey);
      const secretArray = Array.from(secretKey);

      // Create comprehensive wallet data
      const walletData: WalletData = {
        publicKey,
        secretBase58,
        secretArray,
        safeWord: '', // Restored wallets start without safe word, will need migration
        createdAt: new Date().toISOString(),
      };

      // Save with maximum redundancy
      saveWalletSecurely(walletData);

      // Add to whitelist - this restored wallet is now authorized
      addToWhitelist(publicKey);

      // Update state
      setIsAuthenticated(true);
      setPublicKey(publicKey);
      setPrivateKey(JSON.stringify(secretArray));

      return true;
    } catch (error) {
      console.error('Failed to restore wallet:', error);
      return false;
    }
  };

  // Create the value object that will be provided to consumers
  const value = {
    isAuthenticated,
    publicKey,
    privateKey,
    login,
    register,
    restore,
    logout,
    initializeFromSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
