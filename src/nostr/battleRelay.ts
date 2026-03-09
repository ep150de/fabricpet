// ============================================
// Battle Relay — Nostr P2P Battle System
// ============================================
// Uses Nostr events for peer-to-peer pet battles:
// - Challenge events (kind 30078, d-tag: "fabricpet-challenge")
// - Move submission events (kind 30078, d-tag: "fabricpet-move")
// - Battle result events (kind 30078, d-tag: "fabricpet-result")
// ============================================

import type { NostrIdentity } from './identity';
import { DEFAULT_RELAYS } from '../utils/constants';
import type { BattleStats, ElementalType } from '../types';

// Battle event types
export interface BattleChallenge {
  challengeId: string;
  challengerPubkey: string;
  challengerPetName: string;
  challengerPetLevel: number;
  challengerPetType: ElementalType;
  challengerStats: BattleStats;
  challengerMoves: string[];
  targetPubkey: string | null; // null = open challenge
  timestamp: number;
  status: 'open' | 'accepted' | 'declined' | 'expired';
}

export interface BattleMoveEvent {
  battleId: string;
  turn: number;
  playerPubkey: string;
  moveId: string;
  timestamp: number;
}

export interface BattleResultEvent {
  battleId: string;
  winnerPubkey: string | null;
  turns: number;
  timestamp: number;
}

/**
 * Sign a Nostr event — supports both secretKey signing and NIP-07 extension signing.
 */
async function signEvent(
  identity: NostrIdentity,
  eventTemplate: { kind: number; created_at: number; tags: string[][]; content: string }
): Promise<any> {
  // Method 1: Sign with secret key (auto-generated identities)
  if (identity.secretKey) {
    const { finalizeEvent } = await import('nostr-tools/pure');
    return finalizeEvent(eventTemplate, identity.secretKey);
  }

  // Method 2: Sign with NIP-07 browser extension (nos2x, Alby, etc.)
  if (typeof window !== 'undefined' && (window as any).nostr) {
    const unsignedEvent = {
      ...eventTemplate,
      pubkey: identity.pubkey,
    };
    const signedEvent = await (window as any).nostr.signEvent(unsignedEvent);
    return signedEvent;
  }

  throw new Error('No signing method available. Need secretKey or NIP-07 extension.');
}

/**
 * Publish a signed event to Nostr relays with retry logic.
 * Returns the number of relays that accepted the event.
 */
async function publishToRelays(signedEvent: any): Promise<number> {
  const { Relay } = await import('nostr-tools/relay');
  let successCount = 0;

  for (const relayUrl of DEFAULT_RELAYS) {
    try {
      const relay = await Promise.race([
        Relay.connect(relayUrl),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);
      await relay.publish(signedEvent);
      relay.close();
      successCount++;
      console.log(`[BattleRelay] ✅ Published to ${relayUrl}`);
    } catch (e) {
      console.warn(`[BattleRelay] ❌ Failed on ${relayUrl}:`, e);
    }
  }

  return successCount;
}

/**
 * Publish a battle challenge to Nostr relays.
 */
export async function publishChallenge(
  identity: NostrIdentity,
  petName: string,
  petLevel: number,
  petType: ElementalType,
  stats: BattleStats,
  moves: string[],
  targetPubkey?: string
): Promise<string> {
  const challengeId = `challenge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const challenge: BattleChallenge = {
    challengeId,
    challengerPubkey: identity.pubkey,
    challengerPetName: petName,
    challengerPetLevel: petLevel,
    challengerPetType: petType,
    challengerStats: stats,
    challengerMoves: moves,
    targetPubkey: targetPubkey || null,
    timestamp: Math.floor(Date.now() / 1000),
    status: 'open',
  };

  const tags: string[][] = [
    ['d', `fabricpet-challenge-${challengeId}`],
    ['t', 'fabricpet-battle'],
    ['t', 'fabricpet-challenge'],
  ];

  if (targetPubkey) {
    tags.push(['p', targetPubkey]);
  }

  const eventTemplate = {
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: JSON.stringify(challenge),
  };

  const signedEvent = await signEvent(identity, eventTemplate);
  const published = await publishToRelays(signedEvent);

  if (published === 0) {
    throw new Error('Failed to publish to any relay. Check your internet connection.');
  }

  console.log(`[BattleRelay] Challenge published to ${published}/${DEFAULT_RELAYS.length} relays:`, challengeId);
  return challengeId;
}

/**
 * Subscribe to incoming battle challenges for a given pubkey.
 */
export async function subscribeToChallenges(
  pubkey: string,
  onChallenge: (challenge: BattleChallenge) => void
): Promise<() => void> {
  const { Relay } = await import('nostr-tools/relay');

  const closeFns: (() => void)[] = [];

  for (const relayUrl of DEFAULT_RELAYS.slice(0, 2)) {
    try {
      const relay = await Promise.race([
        Relay.connect(relayUrl),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);

      const sub = relay.subscribe(
        [
          {
            kinds: [30078],
            '#t': ['fabricpet-challenge'],
            since: Math.floor(Date.now() / 1000) - 3600, // Last hour
          },
        ],
        {
          onevent(event) {
            try {
              const challenge = JSON.parse(event.content) as BattleChallenge;
              if (
                (challenge.targetPubkey === pubkey || challenge.targetPubkey === null) &&
                challenge.challengerPubkey !== pubkey &&
                challenge.status === 'open'
              ) {
                onChallenge(challenge);
              }
            } catch {
              // Invalid event
            }
          },
          oneose() {
            console.log(`[BattleRelay] Subscribed to challenges on ${relayUrl}`);
          },
        }
      );

      closeFns.push(() => {
        sub.close();
        relay.close();
      });
    } catch (e) {
      console.warn(`[BattleRelay] Failed to subscribe on ${relayUrl}:`, e);
    }
  }

  return () => closeFns.forEach(fn => fn());
}

/**
 * Accept a battle challenge by publishing an acceptance event.
 */
export async function acceptChallenge(
  identity: NostrIdentity,
  challengeId: string,
  petName: string,
  petLevel: number,
  petType: ElementalType,
  stats: BattleStats,
  moves: string[]
): Promise<string> {
  const battleId = `battle-${challengeId}-${Date.now()}`;

  const acceptance = {
    battleId,
    challengeId,
    accepterPubkey: identity.pubkey,
    accepterPetName: petName,
    accepterPetLevel: petLevel,
    accepterPetType: petType,
    accepterStats: stats,
    accepterMoves: moves,
    timestamp: Math.floor(Date.now() / 1000),
  };

  const eventTemplate = {
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', `fabricpet-accept-${battleId}`],
      ['t', 'fabricpet-battle'],
      ['t', 'fabricpet-accept'],
      ['e', challengeId],
    ],
    content: JSON.stringify(acceptance),
  };

  const signedEvent = await signEvent(identity, eventTemplate);
  const published = await publishToRelays(signedEvent);

  if (published === 0) {
    throw new Error('Failed to publish acceptance to any relay.');
  }

  console.log('[BattleRelay] Challenge accepted, battle:', battleId);
  return battleId;
}

/**
 * Submit a move for a battle turn.
 */
export async function submitMove(
  identity: NostrIdentity,
  battleId: string,
  turn: number,
  moveId: string
): Promise<void> {
  const moveEvent: BattleMoveEvent = {
    battleId,
    turn,
    playerPubkey: identity.pubkey,
    moveId,
    timestamp: Math.floor(Date.now() / 1000),
  };

  const eventTemplate = {
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', `fabricpet-move-${battleId}-${turn}-${identity.pubkey}`],
      ['t', 'fabricpet-battle'],
      ['t', 'fabricpet-move'],
      ['e', battleId],
    ],
    content: JSON.stringify(moveEvent),
  };

  const signedEvent = await signEvent(identity, eventTemplate);
  const published = await publishToRelays(signedEvent);

  if (published === 0) {
    throw new Error('Failed to publish move to any relay.');
  }

  console.log(`[BattleRelay] Move submitted: turn ${turn}, move ${moveId}`);
}

/**
 * Subscribe to moves for a specific battle.
 */
export async function subscribeToMoves(
  battleId: string,
  onMove: (move: BattleMoveEvent) => void
): Promise<() => void> {
  const { Relay } = await import('nostr-tools/relay');

  const closeFns: (() => void)[] = [];

  for (const relayUrl of DEFAULT_RELAYS.slice(0, 2)) {
    try {
      const relay = await Promise.race([
        Relay.connect(relayUrl),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);

      const sub = relay.subscribe(
        [
          {
            kinds: [30078],
            '#t': ['fabricpet-move'],
            '#e': [battleId],
            since: Math.floor(Date.now() / 1000) - 300,
          },
        ],
        {
          onevent(event) {
            try {
              const move = JSON.parse(event.content) as BattleMoveEvent;
              if (move.battleId === battleId) {
                onMove(move);
              }
            } catch {
              // Invalid event
            }
          },
          oneose() {
            console.log(`[BattleRelay] Subscribed to moves for ${battleId}`);
          },
        }
      );

      closeFns.push(() => {
        sub.close();
        relay.close();
      });
    } catch (e) {
      console.warn(`[BattleRelay] Failed to subscribe to moves on ${relayUrl}:`, e);
    }
  }

  return () => closeFns.forEach(fn => fn());
}
