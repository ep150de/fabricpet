// ============================================
// Deterministic hashing utilities
// ============================================

/**
 * Simple deterministic hash function for strings.
 * Used to map unknown ordinal traits to stat bonuses.
 */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a deterministic pseudo-random number from a seed string.
 * Returns a number between 0 and max (exclusive).
 */
export function seededRandom(seed: string, max: number): number {
  return simpleHash(seed) % max;
}

/**
 * Generate a unique battle ID from two pubkeys and a timestamp.
 */
export function generateBattleId(pubkey1: string, pubkey2: string, timestamp: number): string {
  const sorted = [pubkey1, pubkey2].sort();
  return `battle_${simpleHash(sorted[0] + sorted[1] + timestamp.toString()).toString(16)}`;
}
