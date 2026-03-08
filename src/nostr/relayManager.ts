// ============================================
// Nostr Relay Manager — Connect and manage relay pool
// ============================================

import { SimplePool } from 'nostr-tools/pool';
import { DEFAULT_RELAYS } from '../utils/constants';

let pool: SimplePool | null = null;

/**
 * Get or create the SimplePool singleton.
 */
export function getPool(): SimplePool {
  if (!pool) {
    pool = new SimplePool();
  }
  return pool;
}

/**
 * Get the list of relay URLs to use.
 * Checks localStorage for user-configured relays, falls back to defaults.
 */
export function getRelays(): string[] {
  try {
    const stored = localStorage.getItem('fabricpet_relays');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_RELAYS;
}

/**
 * Save custom relay list to localStorage.
 */
export function setRelays(relays: string[]): void {
  localStorage.setItem('fabricpet_relays', JSON.stringify(relays));
}

/**
 * Close all relay connections.
 */
export function closePool(): void {
  if (pool) {
    pool.close(getRelays());
    pool = null;
  }
}
