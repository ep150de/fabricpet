// ============================================
// Leaderboard — Query Nostr for FabricPet battle results
// ============================================

import { getPool, getRelays } from './relayManager';
import { NOSTR_KIND_APP_DATA, NOSTR_D_TAGS } from '../utils/constants';

export interface LeaderboardEntry {
  pubkey: string;
  petName: string;
  petLevel: number;
  elementalType: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  lastSeen: number;
}

/**
 * Fetch leaderboard data from Nostr relays using SimplePool.
 * Queries NIP-78 pet state events and aggregates battle records.
 * 
 * Uses the same SimplePool as petStorage for reliable connections.
 */
export async function fetchLeaderboard(timeoutMs: number = 8000): Promise<LeaderboardEntry[]> {
  const pool = getPool();
  const relays = getRelays();
  const entries = new Map<string, LeaderboardEntry>();

  return new Promise<LeaderboardEntry[]>((resolve) => {
    let resolved = false;

    const done = () => {
      if (resolved) return;
      resolved = true;

      // Calculate win rates and sort
      const leaderboard = Array.from(entries.values()).map((entry) => {
        const total = entry.wins + entry.losses + entry.draws;
        return {
          ...entry,
          winRate: total > 0 ? entry.wins / total : 0,
        };
      });

      // Sort by wins, then win rate, then level
      leaderboard.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.petLevel - a.petLevel;
      });

      console.log(`[Leaderboard] Found ${leaderboard.length} players`);
      resolve(leaderboard);
    };

    try {
      const sub = pool.subscribeMany(relays, [
        {
          kinds: [NOSTR_KIND_APP_DATA],
          '#d': [NOSTR_D_TAGS.PET_STATE],
          limit: 100,
        } as Record<string, unknown>,
      ] as unknown as Parameters<typeof pool.subscribeMany>[1], {
        onevent(event) {
          try {
            const data = JSON.parse(event.content);
            const pet = data.pet;
            if (!pet || !pet.name) return;

            const existing = entries.get(event.pubkey);
            const eventTime = event.created_at * 1000;

            // Keep the most recent entry per pubkey
            if (!existing || eventTime > existing.lastSeen) {
              entries.set(event.pubkey, {
                pubkey: event.pubkey,
                petName: pet.name,
                petLevel: pet.level || 1,
                elementalType: pet.elementalType || 'neutral',
                wins: pet.battleRecord?.wins || 0,
                losses: pet.battleRecord?.losses || 0,
                draws: pet.battleRecord?.draws || 0,
                winRate: 0,
                lastSeen: eventTime,
              });
            }
          } catch { /* skip invalid */ }
        },
        oneose() {
          // All relays have sent their stored events
          console.log('[Leaderboard] EOSE received');
          sub.close();
          done();
        },
      });

      // Timeout — resolve with whatever we have
      setTimeout(() => {
        if (!resolved) {
          console.log(`[Leaderboard] Timeout after ${timeoutMs}ms, returning ${entries.size} entries`);
          try { sub.close(); } catch {}
          done();
        }
      }, timeoutMs);
    } catch (e) {
      console.error('[Leaderboard] Query failed:', e);
      done();
    }
  });
}
