// ============================================
// Leaderboard — Query Nostr for FabricPet pet state
// ============================================

import { getPool, getRelays } from './relayManager';
import { NOSTR_KIND_APP_DATA, NOSTR_D_TAGS } from '../utils/constants';

export interface LeaderboardEntry {
  pubkey: string;
  petName: string;
  petLevel: number;
  petXP: number;
  elementalType: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  score: number;
  lastSeen: number;
  createdAt: number;
}

// --- Local Leaderboard Cache ---

const LOCAL_LEADERBOARD_KEY = 'fabricpet_leaderboard';

/**
 * Save leaderboard entries to localStorage cache.
 */
export function saveLocalLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Load cached leaderboard entries from localStorage.
 */
export function loadLocalLeaderboard(): LeaderboardEntry[] {
  try {
    const stored = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Calculate a score for ranking based on pet stats.
 * Score breakdown:
 *   - Level: 0-100 points (2 per level)
 *   - XP bonus: 0-50 points
 *   - Longevity: 0-30 points (1 per day active)
 *   - Win rate: 0-20 points (based on wins / total battles including draws)
 */
function calculateScore(entry: LeaderboardEntry): number {
  let score = 0;

  // Level is most important (0-100 points, 2 points per level)
  score += entry.petLevel * 2;

  // XP bonus (0-50 points)
  score += Math.min(entry.petXP / 100, 50);

  // Longevity bonus (0-30 points, 1 point per day)
  // Guard against invalid timestamps (0, negative, or far-future)
  if (entry.createdAt > 0 && entry.createdAt <= Date.now()) {
    const daysSinceCreation = (Date.now() - entry.createdAt) / (1000 * 60 * 60 * 24);
    score += Math.min(Math.max(daysSinceCreation, 0), 30);
  }

  // Win rate bonus (0-20 points)
  // Use total battles INCLUDING draws for a fair win rate
  const totalBattles = entry.wins + entry.losses + entry.draws;
  if (totalBattles > 0) {
    score += (entry.wins / totalBattles) * 20;
  }

  return Math.round(score);
}

/**
 * Calculate win rate consistently (includes draws in total).
 */
function calculateWinRate(wins: number, losses: number, draws: number): number {
  const total = wins + losses + draws;
  return total > 0 ? wins / total : 0;
}

/**
 * Build a finalized leaderboard entry with computed score and winRate.
 */
function finalizeEntry(entry: LeaderboardEntry): LeaderboardEntry {
  const winRate = calculateWinRate(entry.wins, entry.losses, entry.draws);
  const withWinRate = { ...entry, winRate };
  return { ...withWinRate, score: calculateScore(withWinRate) };
}

/**
 * Try to parse a pet from an event and add it to the entries map.
 * Returns true if a valid pet was found.
 */
function tryParseEvent(
  event: { pubkey: string; content: string; created_at: number },
  entries: Map<string, LeaderboardEntry>
): boolean {
  try {
    const data = JSON.parse(event.content);
    const pet = data.pet;
    if (!pet || !pet.name) return false;

    const existing = entries.get(event.pubkey);
    const eventTime = event.created_at * 1000;

    // Keep the most recent entry per pubkey
    if (!existing || eventTime > existing.lastSeen) {
      entries.set(event.pubkey, {
        pubkey: event.pubkey,
        petName: pet.name,
        petLevel: pet.level || 1,
        petXP: pet.xp || 0,
        elementalType: pet.elementalType || 'neutral',
        wins: pet.battleRecord?.wins || 0,
        losses: pet.battleRecord?.losses || 0,
        draws: pet.battleRecord?.draws || 0,
        winRate: 0,  // Computed in finalizeEntry()
        score: 0,    // Computed in finalizeEntry()
        lastSeen: eventTime,
        createdAt: pet.createdAt || eventTime,
      });
      return true;
    }
  } catch { /* skip invalid */ }
  return false;
}

/**
 * Fetch leaderboard data from Nostr relays using SimplePool.
 *
 * Uses two query strategies in parallel for maximum compatibility:
 *   1. Query by #t tag ('fabricpet') — works on most relays for global discovery
 *   2. Query by #d tag (pet state d-tags) — catches legacy events without #t tag
 *
 * Results are cached locally for offline/fallback use.
 */
export async function fetchLeaderboard(timeoutMs: number = 12000): Promise<LeaderboardEntry[]> {
  const pool = getPool();
  const leaderboardRelays = getRelays();
  const entries = new Map<string, LeaderboardEntry>();

  // Query events from the last 90 days to help relays scope the query
  const since = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;

  return new Promise<LeaderboardEntry[]>((resolve) => {
    let resolved = false;
    let eoseCount = 0;
    const totalSubs = 2; // We run 2 parallel subscriptions
    const subs: Array<{ close: () => void }> = [];

    const done = () => {
      if (resolved) return;
      resolved = true;

      // Close all subs
      for (const sub of subs) {
        try { sub.close(); } catch {}
      }

      // Finalize scores and win rates for all entries
      const leaderboard = Array.from(entries.values()).map(finalizeEntry);

      // Sort by score, then by level, then by XP
      leaderboard.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.petLevel !== a.petLevel) return b.petLevel - a.petLevel;
        return b.petXP - a.petXP;
      });

      // Cache results locally for fallback
      if (leaderboard.length > 0) {
        saveLocalLeaderboard(leaderboard);
      }

      console.log(`[Leaderboard] Found ${leaderboard.length} players`);
      resolve(leaderboard);
    };

    const onEose = () => {
      eoseCount++;
      console.log(`[Leaderboard] EOSE ${eoseCount}/${totalSubs}, ${entries.size} entries so far`);
      // Resolve once all subscriptions have sent EOSE
      if (eoseCount >= totalSubs) {
        done();
      }
    };

    try {
      // Strategy 1: Query by #t tag 'fabricpet' — best for global discovery.
      // Relays index t-tags efficiently for broad queries without authors.
      const sub1 = pool.subscribeMany(leaderboardRelays, [
        {
          kinds: [NOSTR_KIND_APP_DATA],
          '#t': ['fabricpet'],
          since,
          limit: 200,
        } as Record<string, unknown>,
      ] as unknown as Parameters<typeof pool.subscribeMany>[1], {
        onevent(event) {
          tryParseEvent(event, entries);
        },
        oneose: onEose,
      });
      subs.push(sub1);

      // Strategy 2: Query by #d tag — catches legacy events without #t tag.
      // Use only the current d-tag to keep the query simple and reduce relay load.
      const petStateTags = [NOSTR_D_TAGS.PET_STATE, 'com.fabricpet.pet.state', 'fabricpet-state'];
      const sub2 = pool.subscribeMany(leaderboardRelays, [
        {
          kinds: [NOSTR_KIND_APP_DATA],
          '#d': petStateTags,
          since,
          limit: 200,
        } as Record<string, unknown>,
      ] as unknown as Parameters<typeof pool.subscribeMany>[1], {
        onevent(event) {
          tryParseEvent(event, entries);
        },
        oneose: onEose,
      });
      subs.push(sub2);

      // Timeout — resolve with whatever we have
      setTimeout(() => {
        if (!resolved) {
          console.log(`[Leaderboard] Timeout after ${timeoutMs}ms, returning ${entries.size} entries`);
          done();
        }
      }, timeoutMs);
    } catch (e) {
      console.error('[Leaderboard] Query failed:', e);
      done();
    }
  });
}

/**
 * Build a LeaderboardEntry from a local pet and pubkey.
 * Used to inject the current user's pet into the leaderboard if not already present.
 */
export function buildLocalEntry(
  pubkey: string,
  pet: { name: string; level: number; xp: number; elementalType: string; battleRecord: { wins: number; losses: number; draws: number }; createdAt: number }
): LeaderboardEntry {
  const raw: LeaderboardEntry = {
    pubkey,
    petName: pet.name,
    petLevel: pet.level || 1,
    petXP: pet.xp || 0,
    elementalType: pet.elementalType || 'neutral',
    wins: pet.battleRecord?.wins || 0,
    losses: pet.battleRecord?.losses || 0,
    draws: pet.battleRecord?.draws || 0,
    winRate: 0,
    score: 0,
    lastSeen: Date.now(),
    createdAt: pet.createdAt || Date.now(),
  };
  return finalizeEntry(raw);
}
