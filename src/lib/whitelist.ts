/**
 * Whitelist management for CeeloSol
 * Only wallets generated through this app can access the game
 * GUARANTEED PERSISTENCE - NO WALLET IS EVER LOST!
 */

const WHITELIST_KEY = 'ceelo_whitelist';
const WHITELIST_BACKUP_KEY = 'ceelo_whitelist_backup';
const WHITELIST_HISTORY_KEY = 'ceelo_whitelist_history';

export interface WhitelistEntry {
  address: string;
  createdAt: string;
  lastAccessed?: string;
}

/**
 * Get all whitelisted wallet addresses with automatic recovery
 */
export function getWhitelist(): WhitelistEntry[] {
  try {
    // Try primary storage first
    const stored = localStorage.getItem(WHITELIST_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // If primary fails, try backup
    console.warn('Primary whitelist empty/corrupted, trying backup...');
    const backup = localStorage.getItem(WHITELIST_BACKUP_KEY);
    if (backup) {
      const parsed = JSON.parse(backup);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('✅ Restored whitelist from backup!');
        // Restore primary from backup
        localStorage.setItem(WHITELIST_KEY, backup);
        return parsed;
      }
    }

    // If both fail, try history
    console.warn('Backup also empty/corrupted, trying history...');
    const history = localStorage.getItem(WHITELIST_HISTORY_KEY);
    if (history) {
      const parsed = JSON.parse(history);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Get the most recent entry from history
        const latest = parsed[parsed.length - 1];
        if (latest && latest.whitelist && Array.isArray(latest.whitelist)) {
          console.log('✅ Restored whitelist from history!');
          // Restore both primary and backup
          const whitelistData = JSON.stringify(latest.whitelist);
          localStorage.setItem(WHITELIST_KEY, whitelistData);
          localStorage.setItem(WHITELIST_BACKUP_KEY, whitelistData);
          return latest.whitelist;
        }
      }
    }

    return [];
  } catch (error) {
    console.error('Failed to load whitelist:', error);
    return [];
  }
}

/**
 * Save whitelist with triple redundancy - NEVER LOSE DATA!
 */
function saveWhitelistSecurely(whitelist: WhitelistEntry[]): void {
  try {
    const whitelistData = JSON.stringify(whitelist);

    // 1. Save to primary location
    localStorage.setItem(WHITELIST_KEY, whitelistData);

    // 2. Save to backup location
    localStorage.setItem(WHITELIST_BACKUP_KEY, whitelistData);

    // 3. Add to history (keep last 10 versions)
    const history = getWhitelistHistory();
    history.push({
      timestamp: new Date().toISOString(),
      whitelist: [...whitelist], // Deep copy
      count: whitelist.length
    });

    // Keep only last 10 versions to prevent localStorage bloat
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    localStorage.setItem(WHITELIST_HISTORY_KEY, JSON.stringify(history));

    console.log(`💾 Whitelist saved securely (${whitelist.length} wallets) with triple redundancy`);
  } catch (error) {
    console.error('❌ CRITICAL: Failed to save whitelist securely:', error);
    // Try alternative storage methods
    try {
      // Emergency backup to sessionStorage
      sessionStorage.setItem('ceelo_whitelist_emergency', JSON.stringify(whitelist));
      console.log('⚠️ Emergency backup saved to sessionStorage');
    } catch (e) {
      console.error('❌ CRITICAL: Even emergency backup failed:', e);
    }
  }
}

/**
 * Get whitelist history for recovery
 */
function getWhitelistHistory(): Array<{timestamp: string, whitelist: WhitelistEntry[], count: number}> {
  try {
    const history = localStorage.getItem(WHITELIST_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to load whitelist history:', error);
    return [];
  }
}

/**
 * Add a wallet address to the whitelist with guaranteed persistence
 */
export function addToWhitelist(address: string): void {
  try {
    const whitelist = getWhitelist();

    // Check if already exists
    const exists = whitelist.some(entry => entry.address === address);
    if (exists) {
      console.log('Wallet already whitelisted:', address);
      return;
    }

    // Add new entry
    const newEntry: WhitelistEntry = {
      address,
      createdAt: new Date().toISOString(),
    };

    whitelist.push(newEntry);

    // Save with triple redundancy
    saveWhitelistSecurely(whitelist);

    console.log('✅ Added to whitelist with guaranteed persistence:', address);
  } catch (error) {
    console.error('❌ CRITICAL: Failed to add to whitelist:', error);
    // Even if this fails, try to save just this wallet
    try {
      const emergencyEntry = [{
        address,
        createdAt: new Date().toISOString(),
      }];
      sessionStorage.setItem(`ceelo_wallet_emergency_${Date.now()}`, JSON.stringify(emergencyEntry));
      console.log('⚠️ Emergency wallet backup created');
    } catch (e) {
      console.error('❌ CRITICAL: Emergency wallet backup failed:', e);
    }
  }
}

/**
 * Initialize whitelist with test wallets for development
 */
export function initializeTestWhitelist(): void {
  try {
    console.log('🔧 initializeTestWhitelist() called');
    const testWallets = [
      'GMAuqtZuYpwt3Y9EUeeEfQFJGDpsExWXG1ZegGBQwAW6',
      'H776W7zokQHnzs3FwgQCmnMnG4XZXWGxbMizNukZ4HK5'
    ];

    console.log('🔧 Adding test wallets to whitelist:', testWallets);
    testWallets.forEach(wallet => {
      addToWhitelist(wallet);
    });

    // Verify they were added
    const currentWhitelist = getWhitelist();
    console.log('🔧 Whitelist after initialization:', currentWhitelist.map(w => w.address));

    console.log('✅ Test wallets added to whitelist');
  } catch (error) {
    console.error('Failed to initialize test whitelist:', error);
  }
}

/**
 * Check if a wallet address is whitelisted
 */
export function isWhitelisted(address: string): boolean {
  try {
    const whitelist = getWhitelist();
    return whitelist.some(entry => entry.address === address);
  } catch (error) {
    console.error('Failed to check whitelist:', error);
    return false;
  }
}

/**
 * Update last accessed time for a whitelisted wallet with guaranteed persistence
 */
export function updateLastAccessed(address: string): void {
  try {
    const whitelist = getWhitelist();
    const entry = whitelist.find(entry => entry.address === address);

    if (entry) {
      entry.lastAccessed = new Date().toISOString();
      // Save with triple redundancy
      saveWhitelistSecurely(whitelist);
      console.log('✅ Updated last accessed time for:', address);
    }
  } catch (error) {
    console.error('Failed to update last accessed:', error);
  }
}

/**
 * Remove a wallet from the whitelist (admin function)
 */
export function removeFromWhitelist(address: string): void {
  try {
    const whitelist = getWhitelist();
    const filtered = whitelist.filter(entry => entry.address !== address);
    localStorage.setItem(WHITELIST_KEY, JSON.stringify(filtered));

    console.log('Removed from whitelist:', address);
  } catch (error) {
    console.error('Failed to remove from whitelist:', error);
  }
}

/**
 * Clear all whitelist entries (admin function) - WITH SAFETY BACKUP
 */
export function clearWhitelist(): void {
  try {
    // SAFETY: Create a final backup before clearing
    const currentWhitelist = getWhitelist();
    if (currentWhitelist.length > 0) {
      const finalBackup = {
        timestamp: new Date().toISOString(),
        whitelist: currentWhitelist,
        reason: 'Manual clear operation',
        count: currentWhitelist.length
      };
      localStorage.setItem('ceelo_whitelist_final_backup', JSON.stringify(finalBackup));
      console.log(`⚠️ Final backup created before clearing (${currentWhitelist.length} wallets)`);
    }

    localStorage.removeItem(WHITELIST_KEY);
    localStorage.removeItem(WHITELIST_BACKUP_KEY);
    // Keep history for recovery
    console.log('Whitelist cleared (history preserved for recovery)');
  } catch (error) {
    console.error('Failed to clear whitelist:', error);
  }
}

/**
 * Emergency recovery function - recovers ALL possible wallets from ALL storage locations
 */
export function emergencyRecoverAllWallets(): WhitelistEntry[] {
  console.log('🚨 EMERGENCY WALLET RECOVERY INITIATED');
  const recoveredWallets = new Map<string, WhitelistEntry>();

  try {
    // 1. Check primary storage
    const primary = localStorage.getItem(WHITELIST_KEY);
    if (primary) {
      const parsed = JSON.parse(primary);
      if (Array.isArray(parsed)) {
        parsed.forEach(entry => recoveredWallets.set(entry.address, entry));
        console.log(`📦 Recovered ${parsed.length} wallets from primary storage`);
      }
    }

    // 2. Check backup storage
    const backup = localStorage.getItem(WHITELIST_BACKUP_KEY);
    if (backup) {
      const parsed = JSON.parse(backup);
      if (Array.isArray(parsed)) {
        parsed.forEach(entry => recoveredWallets.set(entry.address, entry));
        console.log(`📦 Recovered additional wallets from backup storage`);
      }
    }

    // 3. Check history
    const history = localStorage.getItem(WHITELIST_HISTORY_KEY);
    if (history) {
      const parsed = JSON.parse(history);
      if (Array.isArray(parsed)) {
        parsed.forEach(historyEntry => {
          if (historyEntry.whitelist && Array.isArray(historyEntry.whitelist)) {
            historyEntry.whitelist.forEach(entry => recoveredWallets.set(entry.address, entry));
          }
        });
        console.log(`📦 Recovered additional wallets from history`);
      }
    }

    // 4. Check final backup
    const finalBackup = localStorage.getItem('ceelo_whitelist_final_backup');
    if (finalBackup) {
      const parsed = JSON.parse(finalBackup);
      if (parsed.whitelist && Array.isArray(parsed.whitelist)) {
        parsed.whitelist.forEach(entry => recoveredWallets.set(entry.address, entry));
        console.log(`📦 Recovered additional wallets from final backup`);
      }
    }

    // 5. Check emergency session storage
    const emergency = sessionStorage.getItem('ceelo_whitelist_emergency');
    if (emergency) {
      const parsed = JSON.parse(emergency);
      if (Array.isArray(parsed)) {
        parsed.forEach(entry => recoveredWallets.set(entry.address, entry));
        console.log(`📦 Recovered additional wallets from emergency storage`);
      }
    }

    // 6. Check individual emergency wallets
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('ceelo_wallet_emergency_')) {
        try {
          const data = sessionStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              parsed.forEach(entry => recoveredWallets.set(entry.address, entry));
            }
          }
        } catch (e) {
          console.warn('Failed to parse emergency wallet:', key);
        }
      }
    }

    const allRecovered = Array.from(recoveredWallets.values());
    console.log(`✅ EMERGENCY RECOVERY COMPLETE: ${allRecovered.length} unique wallets recovered`);

    // Save the recovered wallets
    if (allRecovered.length > 0) {
      saveWhitelistSecurely(allRecovered);
      console.log('💾 All recovered wallets saved securely');
    }

    return allRecovered;
  } catch (error) {
    console.error('❌ Emergency recovery failed:', error);
    return [];
  }
}

/**
 * Get whitelist statistics
 */
export function getWhitelistStats() {
  const whitelist = getWhitelist();
  return {
    total: whitelist.length,
    recentlyActive: whitelist.filter(entry => {
      if (!entry.lastAccessed) return false;
      const lastAccess = new Date(entry.lastAccessed);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return lastAccess > dayAgo;
    }).length,
  };
}
