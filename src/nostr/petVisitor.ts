// ============================================
// Pet Visitor — Load and visit other players' pets via Nostr
// ============================================

import { DEFAULT_RELAYS, NOSTR_D_TAGS } from '../utils/constants';
import type { Pet, GuestbookEntry } from '../types';
import type { NostrIdentity } from './identity';
import { getPool } from './relayManager';

export interface VisitedPet {
  pubkey: string;
  pet: Pet;
  guestbook: GuestbookEntry[];
  lastUpdated: number;
}

/**
 * Load another player's pet state from Nostr by pubkey.
 * Uses SimplePool for reliable multi-relay querying.
 * Queries BOTH the correct d-tag AND legacy d-tag for backward compatibility.
 */
export async function loadPetByPubkey(pubkey: string): Promise<VisitedPet | null> {
  const pool = getPool();

  try {
    const event = await Promise.race([
      pool.get(DEFAULT_RELAYS, {
        kinds: [30078],
        authors: [pubkey],
        '#d': [NOSTR_D_TAGS.PET_STATE],
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
    ]);

    // If not found with correct tag, try legacy tag
    let foundEvent = event;
    if (!foundEvent) {
      console.log('[PetVisitor] Trying legacy d-tag...');
      foundEvent = await Promise.race([
        pool.get(DEFAULT_RELAYS, {
          kinds: [30078],
          authors: [pubkey],
          '#d': ['fabricpet-state'],
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);
    }

    if (foundEvent) {
      try {
        const data = JSON.parse(foundEvent.content);
        if (data.pet) {
          const guestbook = await loadGuestbook(pubkey);
          return {
            pubkey: foundEvent.pubkey,
            pet: data.pet,
            guestbook,
            lastUpdated: foundEvent.created_at * 1000,
          };
        }
      } catch { /* skip malformed */ }
    }

    console.log(`[PetVisitor] No pet found for ${pubkey.slice(0, 12)}...`);
    return null;
  } catch (e) {
    console.error('[PetVisitor] Failed to load pet:', e);
    return null;
  }
}

/**
 * Load guestbook entries for a pet owner.
 */
async function loadGuestbook(ownerPubkey: string): Promise<GuestbookEntry[]> {
  const { Relay } = await import('nostr-tools/relay');
  const entries: GuestbookEntry[] = [];

  for (const relayUrl of DEFAULT_RELAYS.slice(0, 2)) {
    try {
      const relay = await Relay.connect(relayUrl);

      await new Promise<void>((resolve) => {
        const sub = relay.subscribe(
          [
            {
              kinds: [30078],
              '#d': [`fabricpet-guestbook-${ownerPubkey}`],
              limit: 50,
            },
          ],
          {
            onevent(event) {
              try {
                const data = JSON.parse(event.content);
                if (data.message) {
                  entries.push({
                    visitor: event.pubkey,
                    message: data.message,
                    timestamp: event.created_at * 1000,
                  });
                }
              } catch { /* skip */ }
            },
            oneose() {
              sub.close();
              relay.close();
              resolve();
            },
          }
        );

        setTimeout(() => {
          try { sub.close(); relay.close(); } catch {}
          resolve();
        }, 3000);
      });
    } catch { /* skip */ }
  }

  // Sort by newest first
  entries.sort((a, b) => b.timestamp - a.timestamp);
  return entries;
}

/**
 * Sign a guestbook for another player's pet.
 */
export async function signGuestbook(
  identity: NostrIdentity,
  ownerPubkey: string,
  message: string
): Promise<boolean> {
  const { Relay } = await import('nostr-tools/relay');
  const { finalizeEvent } = await import('nostr-tools/pure');

  const eventTemplate = {
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', `fabricpet-guestbook-${ownerPubkey}`],
      ['t', 'fabricpet-guestbook'],
      ['p', ownerPubkey],
    ],
    content: JSON.stringify({
      message,
      visitorPetName: null,
      timestamp: Date.now(),
    }),
  };

  let signedEvent: any;
  if (identity.isExtension && window.nostr) {
    signedEvent = await window.nostr.signEvent(eventTemplate);
  } else if (identity.secretKey) {
    const { finalizeEvent } = await import('nostr-tools/pure');
    signedEvent = finalizeEvent(eventTemplate, identity.secretKey);
  } else {
    throw new Error('No signing method available');
  }

  let published = false;
  for (const relayUrl of DEFAULT_RELAYS) {
    try {
      const relay = await Relay.connect(relayUrl);
      await relay.publish(signedEvent);
      relay.close();
      published = true;
    } catch (e) {
      console.warn(`[Guestbook] Failed to publish to ${relayUrl}:`, e);
    }
  }

  return published;
}

/**
 * Resolve an npub to a hex pubkey.
 */
export async function npubToHex(npubOrHex: string): Promise<string | null> {
  // If it's already hex (64 chars)
  if (/^[0-9a-f]{64}$/i.test(npubOrHex)) return npubOrHex;

  // If it's an npub
  if (npubOrHex.startsWith('npub1')) {
    try {
      const { decode } = await import('nostr-tools/nip19');
      const result = decode(npubOrHex);
      if (result.type === 'npub') return result.data as string;
    } catch { /* invalid npub */ }
  }

  return null;
}
