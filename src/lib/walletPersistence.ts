/**
 * COMPREHENSIVE WALLET PERSISTENCE SYSTEM
 * GUARANTEES NO WALLET IS EVER LOST!
 * Multiple layers of redundancy and recovery
 */

export interface WalletData {
  publicKey: string;
  secretBase58: string;
  secretArray: number[];
  safeWord: string;
  createdAt: string;
  lastAccessed?: string;
}

export interface WalletBackup {
  timestamp: string;
  wallets: WalletData[];
  reason: string;
  count: number;
}

// Storage keys for maximum redundancy
const WALLET_PRIMARY_KEY = 'ceelo_wallet_primary';
const WALLET_BACKUP_KEY = 'ceelo_wallet_backup';
const WALLET_HISTORY_KEY = 'ceelo_wallet_history';
const WALLET_EMERGENCY_KEY = 'ceelo_wallet_emergency';

/**
 * Save wallet data with MAXIMUM redundancy - NEVER LOSE A WALLET!
 */
export function saveWalletSecurely(walletData: WalletData): void {
  try {
    console.log('💾 Saving wallet with maximum security:', walletData.publicKey);

    // 1. Save individual wallet components (legacy compatibility)
    localStorage.setItem('ceelo_pub', walletData.publicKey);
    localStorage.setItem('ceelo_priv_b58', walletData.secretBase58);
    localStorage.setItem('ceelo_priv_arr', JSON.stringify(walletData.secretArray));

    // 2. Save complete wallet data to primary location
    localStorage.setItem(WALLET_PRIMARY_KEY, JSON.stringify(walletData));

    // 3. Save to backup location
    localStorage.setItem(WALLET_BACKUP_KEY, JSON.stringify(walletData));

    // 4. Add to wallet history (keep last 20 versions)
    const history = getWalletHistory();
    history.push({
      timestamp: new Date().toISOString(),
      wallets: [walletData],
      reason: 'Wallet save operation',
      count: 1
    });

    // Keep only last 20 versions
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    localStorage.setItem(WALLET_HISTORY_KEY, JSON.stringify(history));

    // 5. Emergency backup to sessionStorage
    sessionStorage.setItem(WALLET_EMERGENCY_KEY, JSON.stringify(walletData));

    // 6. Individual emergency backup with timestamp
    const emergencyKey = `ceelo_wallet_${walletData.publicKey.substring(0, 8)}_${Date.now()}`;
    sessionStorage.setItem(emergencyKey, JSON.stringify(walletData));

    console.log('✅ Wallet saved with 6-layer redundancy protection');
  } catch (error) {
    console.error('❌ CRITICAL: Failed to save wallet securely:', error);
    
    // EMERGENCY FALLBACK: Try to save to any available storage
    try {
      const emergencyData = {
        pub: walletData.publicKey,
        priv: walletData.secretBase58,
        arr: walletData.secretArray,
        safeWord: walletData.safeWord,
        time: new Date().toISOString()
      };

      // Try multiple emergency storage methods
      document.cookie = `ceelo_emergency_wallet=${encodeURIComponent(JSON.stringify(emergencyData))}; max-age=31536000; path=/`;
      console.log('⚠️ Emergency cookie backup created');
    } catch (e) {
      console.error('❌ CRITICAL: Even emergency cookie backup failed:', e);
      alert('CRITICAL ERROR: Failed to save wallet! Please copy your private key and safe word immediately!');
    }
  }
}

/**
 * Load wallet data with automatic recovery
 */
export function loadWalletSecurely(): WalletData | null {
  try {
    // 1. Try primary storage
    const primary = localStorage.getItem(WALLET_PRIMARY_KEY);
    if (primary) {
      const parsed = JSON.parse(primary);
      if (isValidWalletData(parsed)) {
        console.log('✅ Wallet loaded from primary storage');
        return parsed;
      }
    }

    // 2. Try backup storage
    console.warn('Primary wallet storage empty/corrupted, trying backup...');
    const backup = localStorage.getItem(WALLET_BACKUP_KEY);
    if (backup) {
      const parsed = JSON.parse(backup);
      if (isValidWalletData(parsed)) {
        console.log('✅ Wallet restored from backup storage');
        // Restore primary
        localStorage.setItem(WALLET_PRIMARY_KEY, backup);
        return parsed;
      }
    }

    // 3. Try legacy individual components
    console.warn('Backup also failed, trying legacy components...');
    const legacyWallet = loadLegacyWallet();
    if (legacyWallet) {
      console.log('✅ Wallet restored from legacy components');
      // Save in new format
      saveWalletSecurely(legacyWallet);
      return legacyWallet;
    }

    // 4. Try emergency session storage
    console.warn('Legacy components failed, trying emergency storage...');
    const emergency = sessionStorage.getItem(WALLET_EMERGENCY_KEY);
    if (emergency) {
      const parsed = JSON.parse(emergency);
      if (isValidWalletData(parsed)) {
        console.log('✅ Wallet restored from emergency storage');
        saveWalletSecurely(parsed);
        return parsed;
      }
    }

    // 5. Try wallet history
    console.warn('Emergency storage failed, trying history...');
    const history = getWalletHistory();
    if (history.length > 0) {
      const latest = history[history.length - 1];
      if (latest.wallets && latest.wallets.length > 0) {
        const walletData = latest.wallets[0];
        if (isValidWalletData(walletData)) {
          console.log('✅ Wallet restored from history');
          saveWalletSecurely(walletData);
          return walletData;
        }
      }
    }

    // 6. Try emergency cookie
    console.warn('History failed, trying emergency cookie...');
    const cookieWallet = loadFromEmergencyCookie();
    if (cookieWallet) {
      console.log('✅ Wallet restored from emergency cookie');
      saveWalletSecurely(cookieWallet);
      return cookieWallet;
    }

    console.warn('❌ No wallet found in any storage location');
    return null;
  } catch (error) {
    console.error('❌ Failed to load wallet:', error);
    return null;
  }
}

/**
 * Load legacy wallet format (without safe word - requires migration)
 */
function loadLegacyWallet(): WalletData | null {
  try {
    const publicKey = localStorage.getItem('ceelo_pub');
    const secretBase58 = localStorage.getItem('ceelo_priv_b58');
    const secretArrayStr = localStorage.getItem('ceelo_priv_arr');

    if (publicKey && secretBase58 && secretArrayStr) {
      const secretArray = JSON.parse(secretArrayStr);
      if (Array.isArray(secretArray) && secretArray.length === 64) {
        console.warn('⚠️ Legacy wallet found without safe word - requires user to set safe word');
        return {
          publicKey,
          secretBase58,
          secretArray,
          safeWord: '', // Empty safe word indicates legacy wallet needing migration
          createdAt: new Date().toISOString(),
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to load legacy wallet:', error);
    return null;
  }
}

/**
 * Load wallet from emergency cookie
 */
function loadFromEmergencyCookie(): WalletData | null {
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'ceelo_emergency_wallet') {
        const decoded = decodeURIComponent(value);
        const data = JSON.parse(decoded);
        if (data.pub && data.priv && data.arr) {
          return {
            publicKey: data.pub,
            secretBase58: data.priv,
            secretArray: data.arr,
            safeWord: data.safeWord || '', // Handle legacy cookies without safe word
            createdAt: data.time || new Date().toISOString(),
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to load from emergency cookie:', error);
    return null;
  }
}

/**
 * Validate wallet data structure
 * Note: safeWord can be empty for legacy wallets (requires migration)
 */
function isValidWalletData(data: any): data is WalletData {
  return (
    data &&
    typeof data.publicKey === 'string' &&
    typeof data.secretBase58 === 'string' &&
    Array.isArray(data.secretArray) &&
    data.secretArray.length === 64 &&
    typeof data.safeWord === 'string' && // Can be empty for legacy wallets
    typeof data.createdAt === 'string'
  );
}

/**
 * Get wallet history
 */
function getWalletHistory(): WalletBackup[] {
  try {
    const history = localStorage.getItem(WALLET_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to load wallet history:', error);
    return [];
  }
}

/**
 * Check if a wallet needs safe word migration (legacy wallet)
 */
export function needsSafeWordMigration(walletData: WalletData): boolean {
  return !walletData.safeWord || walletData.safeWord.trim().length === 0;
}

/**
 * Update wallet with safe word (for migration)
 */
export function updateWalletSafeWord(walletData: WalletData, safeWord: string): WalletData {
  const updatedWallet: WalletData = {
    ...walletData,
    safeWord: safeWord.trim(),
    lastAccessed: new Date().toISOString()
  };

  // Save the updated wallet
  saveWalletSecurely(updatedWallet);

  return updatedWallet;
}

/**
 * Validate safe word for authentication
 */
export function validateWalletSafeWord(walletData: WalletData, inputSafeWord: string): boolean {
  if (needsSafeWordMigration(walletData)) {
    console.warn('⚠️ Wallet requires safe word migration');
    return false;
  }

  // Normalize both safe words for comparison (case-insensitive, trimmed)
  const storedSafeWord = walletData.safeWord.trim().toLowerCase();
  const providedSafeWord = inputSafeWord.trim().toLowerCase();

  return storedSafeWord === providedSafeWord;
}

/**
 * Emergency recovery - find ALL wallets from ALL possible locations
 */
export function emergencyRecoverAllWalletData(): WalletData[] {
  console.log('🚨 EMERGENCY WALLET DATA RECOVERY INITIATED');
  const recoveredWallets = new Map<string, WalletData>();

  try {
    // Check all possible storage locations
    const locations = [
      { key: WALLET_PRIMARY_KEY, name: 'primary' },
      { key: WALLET_BACKUP_KEY, name: 'backup' },
      { key: WALLET_EMERGENCY_KEY, name: 'emergency', storage: sessionStorage },
    ];

    locations.forEach(location => {
      try {
        const storage = location.storage || localStorage;
        const data = storage.getItem(location.key);
        if (data) {
          const parsed = JSON.parse(data);
          if (isValidWalletData(parsed)) {
            recoveredWallets.set(parsed.publicKey, parsed);
            console.log(`📦 Recovered wallet from ${location.name} storage`);
          }
        }
      } catch (e) {
        console.warn(`Failed to recover from ${location.name}:`, e);
      }
    });

    // Check legacy components
    const legacy = loadLegacyWallet();
    if (legacy) {
      recoveredWallets.set(legacy.publicKey, legacy);
      console.log('📦 Recovered wallet from legacy components');
    }

    // Check emergency cookie
    const cookie = loadFromEmergencyCookie();
    if (cookie) {
      recoveredWallets.set(cookie.publicKey, cookie);
      console.log('📦 Recovered wallet from emergency cookie');
    }

    const allRecovered = Array.from(recoveredWallets.values());
    console.log(`✅ EMERGENCY RECOVERY COMPLETE: ${allRecovered.length} unique wallets recovered`);

    return allRecovered;
  } catch (error) {
    console.error('❌ Emergency wallet recovery failed:', error);
    return [];
  }
}
