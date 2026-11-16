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
 * Validate a relay URL.
 * Only allows wss:// scheme for security.
 */
function isValidRelayUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow secure WebSocket connections
    if (parsed.protocol !== 'wss:') {
      return false;
    }
    // Block private/internal IPs
    const hostname = parsed.hostname.toLowerCase();
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^localhost$/,
      /^0\.0\.0\.0$/,
    ];
    for (const range of privateRanges) {
      if (range.test(hostname)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the list of relay URLs to use.
 * Checks localStorage for user-configured relays, falls back to defaults.
 * Validates all URLs and filters out invalid ones.
 */
export function getRelays(): string[] {
  try {
    const stored = localStorage.getItem('fabricpet_relays');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Validate and filter relay URLs
        const validRelays = parsed.filter((url: unknown) => 
          typeof url === 'string' && isValidRelayUrl(url)
        );
        if (validRelays.length > 0) {
          return validRelays;
        }
      }
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_RELAYS;
}

/**
 * Save custom relay list to localStorage.
 * Validates all URLs before saving.
 */
export function setRelays(relays: string[]): void {
  const validRelays = relays.filter(isValidRelayUrl);
  if (validRelays.length === 0) {
    console.warn('[RelayManager] No valid relay URLs provided');
    return;
  }
  localStorage.setItem('fabricpet_relays', JSON.stringify(validRelays));
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
