// ============================================
// Breeding Service — Nostr integration for breeding offers/requests
// ============================================

import type { BreedingOffer, BreedingRequest, RarityTier } from '../types';
import { NOSTR_KIND_APP_DATA, NOSTR_D_TAGS, BREEDING_CONFIG } from '../utils/constants';
import { getPool, getRelays } from './relayManager';
import type { NostrIdentity } from './identity';
import { signEvent } from './identity';

export async function publishBreedingOffer(
  identity: NostrIdentity,
  offer: Omit<BreedingOffer, 'id' | 'status' | 'createdAt' | 'expiresAt'>
): Promise<{ success: boolean; offerId?: string; error?: string }> {
  try {
    const offerId = `breeding-offer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + Math.floor(BREEDING_CONFIG.breedingOfferExpiryMs / 1000);

    const event = {
      kind: NOSTR_KIND_APP_DATA,
      created_at: now,
      tags: [
        ['d', `${NOSTR_D_TAGS.BREEDING_OFFER}.${offerId}`],
        ['p', offer.offerer],
        ['t', 'breeding-offer'],
      ],
      content: JSON.stringify({
        type: 'breeding_offer',
        offerId,
        offerer: offer.offerer,
        matriarchId: offer.matriarchId,
        patrilinealId: offer.patrilinealId,
        matriarchName: offer.matriarchName,
        patrilinealName: offer.patrilinealName,
        matriarchElement: offer.matriarchElement,
        patrilinealElement: offer.patrilinealElement,
        breedingFeeSats: offer.breedingFeeSats,
        expiresAt,
        timestamp: Date.now(),
      }),
    };

    const signedEvent = await signEvent(identity, event as any);
    const pool = getPool();
    const relays = getRelays();

    const results = await Promise.allSettled(
      pool.publish(relays, signedEvent as any)
    );

    const accepted = results.filter(r => r.status === 'fulfilled').length;
    if (accepted === 0) {
      return { success: false, error: 'Failed to publish to any relay' };
    }

    return { success: true, offerId };
  } catch (error) {
    console.error('[Breeding] Failed to publish offer:', error);
    return { success: false, error: String(error) };
  }
}

export async function publishBreedingRequest(
  identity: NostrIdentity,
  request: Omit<BreedingRequest, 'id' | 'status' | 'createdAt'>
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const requestId = `breeding-request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const event = {
      kind: NOSTR_KIND_APP_DATA,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', `${NOSTR_D_TAGS.BREEDING_REQUEST}.${requestId}`],
        ['p', request.responder],
        ['t', 'breeding-request'],
      ],
      content: JSON.stringify({
        type: 'breeding_request',
        requestId,
        requester: identity.pubkey,
        offerId: request.offerId,
        responder: request.responder,
        offeredPetId: request.offeredPetId,
        offeredPetName: request.offeredPetName,
        offeredPetElement: request.offeredPetElement,
        breedingFeeSats: request.breedingFeeSats,
        timestamp: Date.now(),
      }),
    };

    const signedEvent = await signEvent(identity, event as any);
    const pool = getPool();
    const relays = getRelays();

    const results = await Promise.allSettled(
      pool.publish(relays, signedEvent as any)
    );

    const accepted = results.filter(r => r.status === 'fulfilled').length;
    if (accepted === 0) {
      return { success: false, error: 'Failed to publish to any relay' };
    }

    return { success: true, requestId };
  } catch (error) {
    console.error('[Breeding] Failed to publish request:', error);
    return { success: false, error: String(error) };
  }
}

export async function publishBreedingResult(
  identity: NostrIdentity,
  result: {
    offspringId: string;
    offspringName: string;
    matriarchId: string;
    patrilinealId: string;
    elementalType: string;
    rarity: RarityTier;
    generation: number;
    timestamp: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const event = {
      kind: NOSTR_KIND_APP_DATA,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', `${NOSTR_D_TAGS.LINEAGE}.${result.offspringId}`],
        ['p', identity.pubkey],
        ['t', 'breeding-result'],
      ],
      content: JSON.stringify({
        type: 'breeding_result',
        offspringId: result.offspringId,
        offspringName: result.offspringName,
        matriarchId: result.matriarchId,
        patrilinealId: result.patrilinealId,
        elementalType: result.elementalType,
        rarity: result.rarity,
        generation: result.generation,
        timestamp: result.timestamp,
      }),
    };

    const signedEvent = await signEvent(identity, event as any);
    const pool = getPool();
    const relays = getRelays();

    const results = await Promise.allSettled(
      pool.publish(relays, signedEvent as any)
    );

    const accepted = results.filter(r => r.status === 'fulfilled').length;
    return { success: accepted > 0 };
  } catch (error) {
    console.error('[Breeding] Failed to publish result:', error);
    return { success: false, error: String(error) };
  }
}

export function subscribeToBreedingOffers(
  onOffer: (offer: BreedingOffer) => void,
  onError?: (error: Error) => void
): { close: () => void } {
  const pool = getPool();
  const relays = getRelays();

  const sub = pool.subscribeMany(relays, [
    {
      kinds: [NOSTR_KIND_APP_DATA],
      '#d': [`${NOSTR_D_TAGS.BREEDING_OFFER.split(':')[0]}:*`],
      limit: 50,
    } as Record<string, unknown>,
  ] as unknown as Parameters<typeof pool.subscribeMany>[1], {
    onevent(event) {
      try {
        const data = JSON.parse(event.content);
        if (data.type !== 'breeding_offer') return;

        const now = Math.floor(Date.now() / 1000);
        if (data.expiresAt && data.expiresAt < now) return;

        const offer: BreedingOffer = {
          id: data.offerId,
          offerer: data.offerer,
          matriarchId: data.matriarchId,
          patrilinealId: data.patrilinealId,
          matriarchName: data.matriarchName,
          patrilinealName: data.patrilinealName,
          matriarchElement: data.matriarchElement,
          patrilinealElement: data.patrilinealElement,
          matriarchRarity: data.matriarchRarity || 'common',
          patrilinealRarity: data.patrilinealRarity || 'common',
          status: 'offered',
          breedingFeeSats: data.breedingFeeSats || BREEDING_CONFIG.breedingFeeSats,
          createdAt: data.timestamp,
          expiresAt: data.expiresAt * 1000,
        };

        onOffer(offer);
      } catch (e) {
        console.error('[Breeding] Failed to parse offer event:', e);
      }
    },
    oneose() {
      console.log('[Breeding] Breeding offers subscription EOSE');
    },
  });

  return {
    close: () => {
      try { sub.close(); } catch {}
    },
  };
}

export async function fetchPetLineage(pubkey: string, petId: string): Promise<Record<string, unknown> | null> {
  try {
    const pool = getPool();
    const relays = getRelays();

    const event = await pool.get(relays, {
      kinds: [NOSTR_KIND_APP_DATA],
      authors: [pubkey],
      '#d': [`${NOSTR_D_TAGS.LINEAGE}.${petId}`],
    });

    if (!event) return null;

    return JSON.parse(event.content);
  } catch (error) {
    console.error('[Breeding] Failed to fetch lineage:', error);
    return null;
  }
}