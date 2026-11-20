// ============================================
// Pet Trading Service — P2P pet trading via Nostr
// ============================================

import type { Pet } from '../types';
import { NOSTR_KIND_APP_DATA, NOSTR_D_TAGS } from '../utils/constants';
import { getPool, getRelays } from './relayManager';
import type { NostrIdentity } from './identity';
import { signEvent } from './identity';
import { verifyEvent } from './nostrUtils';

export type TradeStatus = 'offered' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'expired';

export interface TradeOffer {
  id: string;
  offerer: string;
  offererPetId: string;
  offererPetName: string;
  offererPetLevel: number;
  offererPetElement: string;
  responder?: string;
  responderPetId?: string;
  responderPetName?: string;
  responderPetLevel?: number;
  responderPetElement?: string;
  status: TradeStatus;
  createdAt: number;
  expiresAt: number;
}

export async function publishTradeOffer(
  identity: NostrIdentity,
  offer: Omit<TradeOffer, 'id' | 'status' | 'createdAt' | 'expiresAt' | 'responder' | 'responderPetId' | 'responderPetName' | 'responderPetLevel' | 'responderPetElement'>
): Promise<{ success: boolean; tradeId?: string; error?: string }> {
  try {
    const tradeId = `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 86400; // 24 hours

    const event = {
      kind: NOSTR_KIND_APP_DATA,
      created_at: now,
      tags: [
        ['d', `${NOSTR_D_TAGS.TRADE_OFFER}.${tradeId}`],
        ['p', offer.offerer],
        ['t', 'trade-offer'],
      ],
      content: JSON.stringify({
        type: 'trade_offer',
        tradeId,
        offerer: offer.offerer,
        offererPetId: offer.offererPetId,
        offererPetName: offer.offererPetName,
        offererPetLevel: offer.offererPetLevel,
        offererPetElement: offer.offererPetElement,
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

    return { success: true, tradeId };
  } catch (error) {
    console.error('[Trading] Failed to publish offer:', error);
    return { success: false, error: String(error) };
  }
}

export async function publishTradeResponse(
  identity: NostrIdentity,
  tradeId: string,
  offererPubkey: string,
  responderPet: Pet,
  accept: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const event = {
      kind: NOSTR_KIND_APP_DATA,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', `${NOSTR_D_TAGS.TRADE_RESPONSE}.${tradeId}`],
        ['p', offererPubkey],
        ['t', 'trade-response'],
      ],
      content: JSON.stringify({
        type: 'trade_response',
        tradeId,
        responder: identity.pubkey,
        responderPetId: responderPet.id,
        responderPetName: responderPet.name,
        responderPetLevel: responderPet.level,
        responderPetElement: responderPet.elementalType,
        accept,
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
    return { success: accepted > 0 };
  } catch (error) {
    console.error('[Trading] Failed to publish response:', error);
    return { success: false, error: String(error) };
  }
}

export function subscribeToTradeOffers(
  onOffer: (offer: TradeOffer) => void,
  onError?: (error: Error) => void
): { close: () => void } {
  const pool = getPool();
  const relays = getRelays();

  const sub = pool.subscribeMany(relays, [
    {
      kinds: [NOSTR_KIND_APP_DATA],
      '#t': ['trade-offer'],
      limit: 50,
    } as Record<string, unknown>,
  ] as unknown as Parameters<typeof pool.subscribeMany>[1], {
    async onevent(event) {
      try {
        const isValid = await verifyEvent(event as any);
        if (!isValid) return;
        const data = JSON.parse(event.content);
        if (data.type !== 'trade_offer') return;

        const now = Math.floor(Date.now() / 1000);
        if (data.expiresAt && data.expiresAt < now) return;

        const offer: TradeOffer = {
          id: data.tradeId,
          offerer: data.offerer,
          offererPetId: data.offererPetId,
          offererPetName: data.offererPetName,
          offererPetLevel: data.offererPetLevel,
          offererPetElement: data.offererPetElement,
          status: 'offered',
          createdAt: data.timestamp,
          expiresAt: data.expiresAt * 1000,
        };

        onOffer(offer);
      } catch (e) {
        console.error('[Trading] Failed to parse offer event:', e);
      }
    },
    oneose() {
      console.log('[Trading] Trade offers subscription EOSE');
    },
  });

  return {
    close: () => {
      try { sub.close(); } catch {}
    },
  };
}

export function subscribeToTradeResponses(
  tradeId: string,
  onResponse: (response: {
    tradeId: string;
    responder: string;
    responderPetId: string;
    responderPetName: string;
    responderPetLevel: number;
    responderPetElement: string;
    accept: boolean;
    timestamp: number;
  }) => void
): { close: () => void } {
  const pool = getPool();
  const relays = getRelays();

  const sub = pool.subscribeMany(relays, [
    {
      kinds: [NOSTR_KIND_APP_DATA],
      '#t': ['trade-response'],
      limit: 50,
    } as Record<string, unknown>,
  ] as unknown as Parameters<typeof pool.subscribeMany>[1], {
    async onevent(event) {
      try {
        const isValid = await verifyEvent(event as any);
        if (!isValid) return;
        const data = JSON.parse(event.content);
        if (data.type !== 'trade_response') return;
        if (data.tradeId !== tradeId) return;

        onResponse({
          tradeId: data.tradeId,
          responder: data.responder,
          responderPetId: data.responderPetId,
          responderPetName: data.responderPetName,
          responderPetLevel: data.responderPetLevel,
          responderPetElement: data.responderPetElement,
          accept: data.accept,
          timestamp: data.timestamp,
        });
      } catch (e) {
        console.error('[Trading] Failed to parse response event:', e);
      }
    },
    oneose() {
      console.log('[Trading] Trade responses subscription EOSE');
    },
  });

  return {
    close: () => {
      try { sub.close(); } catch {}
    },
  };
}