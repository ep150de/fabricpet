// ============================================
// Migration Script — Move localStorage to IndexedDB
// ============================================
// Migrates existing localStorage data to IndexedDB
// Runs once on app load, then marks migration as complete
// ============================================

import { getStorage } from './storageAdapter';

const MIGRATION_KEY = 'fabricpet_indexeddb_migrated';

const STORAGE_KEYS = [
  'fabricpet_pet_state',
  'fabricpet_roster',
  'fabricpet_home_state',
  'fabricpet_last_saved',
  'fabricpet_pubkey',
  'fabricpet_nsec',
  'fabricpet_remote_signer',
  'fabricpet_relays',
  'fabricpet_local_leaderboard',
  'fabricpet_location_cache',
  'fabricpet_llm_config',
  'fabricpet_chat_history',
];

/**
 * Check if migration has already been completed
 */
function isMigrationComplete(): boolean {
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark migration as complete
 */
function markMigrationComplete(): void {
  try {
    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch (e) {
    console.warn('[Migration] Failed to mark migration complete:', e);
  }
}

/**
 * Migrate a single key from localStorage to IndexedDB
 */
async function migrateKey(key: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;

    const storage = getStorage();
    
    // Try to parse as JSON, otherwise store as string
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }

    await storage.set(key, value);
    console.log(`[Migration] Migrated: ${key}`);
    return true;
  } catch (e) {
    console.warn(`[Migration] Failed to migrate ${key}:`, e);
    return false;
  }
}

/**
 * Run the migration from localStorage to IndexedDB
 */
export async function migrateLocalStorageToIndexedDB(): Promise<void> {
  if (isMigrationComplete()) {
    console.log('[Migration] Already completed, skipping');
    return;
  }

  console.log('[Migration] Starting localStorage to IndexedDB migration...');
  
  let migratedCount = 0;
  let failedCount = 0;

  for (const key of STORAGE_KEYS) {
    const success = await migrateKey(key);
    if (success) {
      migratedCount++;
    } else if (localStorage.getItem(key)) {
      failedCount++;
    }
  }

  console.log(`[Migration] Complete: ${migratedCount} migrated, ${failedCount} failed`);
  
  if (failedCount === 0) {
    markMigrationComplete();
    console.log('[Migration] Marked as complete');
  } else {
    console.warn('[Migration] Some keys failed to migrate, will retry on next load');
  }
}

/**
 * Clear localStorage after successful migration (optional)
 * Only call this if you're confident the migration was successful
 */
export function clearLocalStorageAfterMigration(): void {
  if (!isMigrationComplete()) {
    console.warn('[Migration] Cannot clear - migration not marked complete');
    return;
  }

  console.log('[Migration] Clearing localStorage...');
  
  for (const key of STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[Migration] Failed to remove ${key}:`, e);
    }
  }

  console.log('[Migration] localStorage cleared');
}
