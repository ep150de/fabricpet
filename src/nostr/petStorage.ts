// ============================================
// Pet Storage — Save/load pet state via Nostr NIP-78
// ============================================

import type { Pet, HomeState } from '../types';
import { getPool, getRelays } from './relayManager';
import { NOSTR_KIND_APP_DATA, NOSTR_D_TAGS } from '../utils/constants';
import type { NostrIdentity } from './identity';
import { signEvent } from './identity';

/**
 * Save pet state to Nostr relays via NIP-78 (kind 30078).
 */
export async function savePetState(identity: NostrIdentity, pet: Pet): Promise<boolean> {
  try {
    const event = {
      kind: NOSTR_KIND_APP_DATA,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['d', NOSTR_D_TAGS.PET_STATE]],
      content: JSON.stringify({
        pet,
        lastSaved: Date.now(),
        version: 1,
      }),
    };

    const signedEvent = await signEvent(identity, event);
    const pool = getPool();
    const relays = getRelays();

    console.log('[PetStorage] Publishing pet state to', relays.length, 'relays...');
    const results = await Promise.allSettled(
      pool.publish(relays, signedEvent as Parameters<typeof pool.publish>[1])
    );

    // Log per-relay results for debugging
    let accepted = 0;
    let rejected = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        accepted++;
      } else {
        rejected++;
        console.warn(`[PetStorage] Relay ${relays[i]} rejected:`, r.reason);
      }
    });
    console.log(`[PetStorage] Save result: ${accepted} accepted, ${rejected} rejected out of ${relays.length} relays`);

    return accepted > 0;
  } catch (error) {
    console.error('[PetStorage] Failed to save pet state to Nostr:', error);
    return false;
  }
}

/**
 * Load pet state from Nostr relays.
 */
export async function loadPetState(pubkey: string): Promise<Pet | null> {
  try {
    const pool = getPool();
    const relays = getRelays();

    const event = await pool.get(relays, {
      kinds: [NOSTR_KIND_APP_DATA],
      authors: [pubkey],
      '#d': [NOSTR_D_TAGS.PET_STATE],
    });

    if (!event) return null;

    const data = JSON.parse(event.content);
    return data.pet as Pet;
  } catch (error) {
    console.error('Failed to load pet state from Nostr:', error);
    return null;
  }
}

/**
 * Save home state to Nostr relays.
 */
export async function saveHomeState(identity: NostrIdentity, home: HomeState): Promise<boolean> {
  try {
    const event = {
      kind: NOSTR_KIND_APP_DATA,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['d', NOSTR_D_TAGS.HOME_STATE]],
      content: JSON.stringify({
        home,
        lastSaved: Date.now(),
        version: 1,
      }),
    };

    const signedEvent = await signEvent(identity, event);
    const pool = getPool();
    const relays = getRelays();

    await Promise.allSettled(
      pool.publish(relays, signedEvent as Parameters<typeof pool.publish>[1])
    );

    return true;
  } catch (error) {
    console.error('Failed to save home state to Nostr:', error);
    return false;
  }
}

/**
 * Load home state from Nostr relays.
 */
export async function loadHomeState(pubkey: string): Promise<HomeState | null> {
  try {
    const pool = getPool();
    const relays = getRelays();

    const event = await pool.get(relays, {
      kinds: [NOSTR_KIND_APP_DATA],
      authors: [pubkey],
      '#d': [NOSTR_D_TAGS.HOME_STATE],
    });

    if (!event) return null;

    const data = JSON.parse(event.content);
    return data.home as HomeState;
  } catch (error) {
    console.error('Failed to load home state from Nostr:', error);
    return null;
  }
}

/**
 * Save a battle challenge to Nostr.
 */
export async function publishBattleChallenge(
  identity: NostrIdentity,
  opponentPubkey: string,
  petSnapshot: Pet
): Promise<boolean> {
  try {
    const event = {
      kind: NOSTR_KIND_APP_DATA,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', `${NOSTR_D_TAGS.BATTLE_CHALLENGE}.${opponentPubkey}`],
        ['p', opponentPubkey],
      ],
      content: JSON.stringify({
        type: 'battle_challenge',
        challenger: identity.pubkey,
        petSnapshot: {
          name: petSnapshot.name,
          level: petSnapshot.level,
          stage: petSnapshot.stage,
          battleStats: petSnapshot.battleStats,
          moves: petSnapshot.moves,
          elementalType: petSnapshot.elementalType,
          equippedOrdinal: petSnapshot.equippedOrdinal,
        },
        timestamp: Date.now(),
      }),
    };

    const signedEvent = await signEvent(identity, event);
    const pool = getPool();
    const relays = getRelays();

    await Promise.allSettled(
      pool.publish(relays, signedEvent as Parameters<typeof pool.publish>[1])
    );

    return true;
  } catch (error) {
    console.error('Failed to publish battle challenge:', error);
    return false;
  }
}

/**
 * Subscribe to incoming battle challenges.
 */
export function subscribeToChallenges(
  pubkey: string,
  onChallenge: (challenge: Record<string, unknown>) => void
): { close: () => void } {
  const pool = getPool();
  const relays = getRelays();

  const sub = pool.subscribeMany(relays, [
    {
      kinds: [NOSTR_KIND_APP_DATA],
      '#p': [pubkey],
      '#d': [`${NOSTR_D_TAGS.BATTLE_CHALLENGE}.${pubkey}`],
    } as Record<string, unknown>,
  ] as unknown as Parameters<typeof pool.subscribeMany>[1], {
    onevent(event) {
      try {
        const data = JSON.parse(event.content);
        if (data.type === 'battle_challenge') {
          onChallenge(data);
        }
      } catch {
        // ignore malformed events
      }
    },
  });

  return { close: () => sub.close() };
}
