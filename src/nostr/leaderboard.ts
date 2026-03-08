// ============================================
// Leaderboard — Query Nostr for FabricPet battle results
// ============================================

import { DEFAULT_RELAYS } from '../utils/constants';

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
 * Fetch leaderboard data from Nostr relays.
 * Queries NIP-78 pet state events and aggregates battle records.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { Relay } = await import('nostr-tools/relay');

  const entries = new Map<string, LeaderboardEntry>();

  for (const relayUrl of DEFAULT_RELAYS.slice(0, 2)) {
    try {
      const relay = await Relay.connect(relayUrl);

      await new Promise<void>((resolve) => {
        const sub = relay.subscribe(
          [
            {
              kinds: [30078],
              '#d': ['fabricpet-state'],
              limit: 100,
            },
          ],
          {
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
              sub.close();
              relay.close();
              resolve();
            },
          }
        );

        // Timeout after 5 seconds
        setTimeout(() => {
          try { sub.close(); relay.close(); } catch {}
          resolve();
        }, 5000);
      });
    } catch (e) {
      console.warn(`[Leaderboard] Failed to query ${relayUrl}:`, e);
    }
  }

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

  return leaderboard;
}
