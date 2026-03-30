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

/**
 * Calculate a score for ranking based on pet stats
 */
function calculateScore(entry: LeaderboardEntry): number {
  let score = 0;
  
  // Level is most important (0-100 points, 2 points per level)
  score += entry.petLevel * 2;
  
  // XP bonus (0-50 points)
  score += Math.min(entry.petXP / 100, 50);
  
  // Longevity bonus (0-30 points, 1 point per day)
  const daysSinceCreation = (Date.now() - entry.createdAt) / (1000 * 60 * 60 * 24);
  score += Math.min(daysSinceCreation, 30);
  
  // Win rate bonus (0-20 points)
  const totalBattles = entry.wins + entry.losses;
  if (totalBattles > 0) {
    score += (entry.wins / totalBattles) * 20;
  }
  
  return Math.round(score);
}

/**
 * Fetch leaderboard data from Nostr relays using SimplePool.
 * Queries NIP-78 pet state events and aggregates pet stats.
 * 
 * Simplified to focus on pet level, XP, and longevity.
 */
export async function fetchLeaderboard(timeoutMs: number = 12000): Promise<LeaderboardEntry[]> {
  const pool = getPool();
  const leaderboardRelays = getRelays();
  const entries = new Map<string, LeaderboardEntry>();

  return new Promise<LeaderboardEntry[]>((resolve) => {
    let resolved = false;
    let firstEventReceived = false;
    let postEventTimeout: ReturnType<typeof setTimeout> | null = null;

    const done = () => {
      if (resolved) return;
      resolved = true;
      if (postEventTimeout) clearTimeout(postEventTimeout);

      // Calculate scores and sort
      const leaderboard = Array.from(entries.values()).map((entry) => {
        const total = entry.wins + entry.losses + entry.draws;
        return {
          ...entry,
          winRate: total > 0 ? entry.wins / total : 0,
          score: calculateScore(entry),
        };
      });

      // Sort by score, then by level, then by XP
      leaderboard.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.petLevel !== a.petLevel) return b.petLevel - a.petLevel;
        return b.petXP - a.petXP;
      });

      console.log(`[Leaderboard] Found ${leaderboard.length} players`);
      resolve(leaderboard);
    };

    try {
      const petStateTags = [NOSTR_D_TAGS.PET_STATE, 'com.fabricpet.pet.state', 'fabricpet-state'];

      const sub = pool.subscribeMany(leaderboardRelays, [
        {
          kinds: [NOSTR_KIND_APP_DATA],
          '#d': petStateTags,
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
                petXP: pet.xp || 0,
                elementalType: pet.elementalType || 'neutral',
                wins: pet.battleRecord?.wins || 0,
                losses: pet.battleRecord?.losses || 0,
                draws: pet.battleRecord?.draws || 0,
                winRate: 0,
                score: 0,
                lastSeen: eventTime,
                createdAt: pet.createdAt || eventTime,
              });
            }

            // On first event, resolve after 2s to allow more events to arrive
            if (!firstEventReceived) {
              firstEventReceived = true;
              postEventTimeout = setTimeout(() => {
                try { sub.close(); } catch {}
                done();
              }, 2000);
            }
          } catch { /* skip invalid */ }
        },
        oneose() {
          console.log(`[Leaderboard] EOSE, ${entries.size} entries found`);
          // Resolve on first EOSE (events from fast relays already received)
          try { sub.close(); } catch {}
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
