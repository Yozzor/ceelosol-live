/**
 * Whitelist Migration Utilities
 * Helps migrate whitelist data from port 3000 to the new port
 */

import { getWhitelist, addToWhitelist } from './whitelist';

/**
 * Check if we need to migrate whitelist from the original port
 */
export function needsMigration(): boolean {
  const currentWhitelist = getWhitelist();
  return currentWhitelist.length === 0;
}

/**
 * Attempt automatic migration by checking if user came from port 3000
 */
export function attemptAutoMigration(): boolean {
  try {
    // Check if we already have wallets
    if (!needsMigration()) {
      return true; // Already have wallets, no migration needed
    }

    // Check if the user has the original port open in another tab
    // We can't directly access localStorage from another port, but we can guide them
    return false;
  } catch (error) {
    console.error('Auto migration failed:', error);
    return false;
  }
}

/**
 * Manual migration with user-provided data
 */
export function migrateWhitelistData(whitelistJson: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(whitelistJson);
    
    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, error: 'Invalid format: expected an array' };
    }

    let migratedCount = 0;
    for (const entry of parsed) {
      if (entry && entry.address && typeof entry.address === 'string') {
        addToWhitelist(entry.address);
        migratedCount++;
      }
    }

    return { success: true, count: migratedCount };
  } catch (error) {
    return { success: false, count: 0, error: 'Invalid JSON format' };
  }
}

/**
 * Get migration instructions for the user
 */
export function getMigrationInstructions(): string {
  return `
🔄 Whitelist Migration Instructions

To migrate your wallets from the previous version:

1. Open http://localhost:3000 in a new browser tab
2. Open browser console (F12 → Console tab)
3. Run this command: localStorage.getItem('ceelo_whitelist')
4. Copy the entire result (including quotes)
5. Come back here and paste it in the migration dialog

The result should look like:
[{"address":"ABC123...","createdAt":"2024-..."}]

If you get 'null', you don't have any wallets to migrate.
  `.trim();
}

/**
 * Create a simple migration dialog
 */
export function showMigrationDialog(): Promise<boolean> {
  return new Promise((resolve) => {
    const instructions = getMigrationInstructions();
    const userInput = prompt(instructions + '\n\nPaste your whitelist data here:');
    
    if (!userInput || userInput.trim() === '' || userInput === 'null') {
      resolve(false);
      return;
    }

    const result = migrateWhitelistData(userInput);
    
    if (result.success) {
      alert(`✅ Successfully migrated ${result.count} wallet(s)!`);
      resolve(true);
    } else {
      alert(`❌ Migration failed: ${result.error}`);
      resolve(false);
    }
  });
}
