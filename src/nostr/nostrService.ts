// ============================================
// Nostr Service — Core Nostr integration for FabricPet
// ============================================
// Handles identity derivation, event publishing, and fetching from relays.
// Uses Bitcoin wallet as the root of identity (via BIP-85-like derivation or hash).
// Implements NIP-01 (metadata), NIP-17 (encrypted DMs with NIP-44), and custom kinds for pet state, battles, leaderboard, guestbook.

import type { Pet, PetNeeds, PetMood, PetStage, ElementalType, BattleState, BattleStats, Move } from '../types';
import { DEFAULT_RELAYS, NOSTR_KIND_APP_DATA, NOSTR_D_TAGS } from '../utils/constants';
import { generateSeedFromWallet, deriveNsecFromSeed, deriveNpubFromNsec, signEventWithNsec, encryptDirectMessage, decryptDirectMessage } from './nostrUtils';
import { getPool } from './relayManager';

// In a real implementation, we would use a nostr library like nostr-tools or nostr-mini.
// For this example, we'll assume we have helper functions in nostrUtils.ts.

/**
 * Generate a deterministic npub/nsec pair from a Bitcoin wallet's xpub and a pet ID (or wallet ID for the main identity).
 * This is a simplified BIP-85-like derivation: seed = HMAC-SHA512(xpub, "FabricPet"+walletID||petID)
 * Then derive the nsec from the seed.
 * We'll leave the actual implementation to nostrUtils.ts for brevity.
 */
export function getIdentity(walletXpub: string, petId?: string): { npub: string; nsec: string } {
  // In practice, we would call nostrUtils.deriveIdentity(walletXpub, petId)
  // For now, we'll return a placeholder.
  return {
    npub: 'npub1placeholder',
    nsec: 'nsec1placeholder'
  };
}

/**
 * Publish pet state to Nostr (kind 30078, d-tag: pet:<petId>)
 * @param pet The pet object to publish
 * @param walletXpub The user's wallet xpub (for identity)
 */
export async function publishPetState(pet: Pet, walletXpub: string): Promise<void> {
  const identity = getIdentity(walletXpub, pet.id);
  const event = {
    kind: NOSTR_KIND_APP_DATA,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', `pet:${pet.id}`],
      ['t', 'pet'],
      ['t', pet.stage],
      ['t', pet.elementalType]
    ],
    content: JSON.stringify({
      name: pet.name,
      level: pet.level,
      xp: pet.xp,
      stage: pet.stage,
      mood: pet.mood,
      elementalType: pet.elementalType,
      equippedOrdinal: pet.equippedOrdinal,
      battleStats: pet.battleStats,
      battleRecord: pet.battleRecord,
      needs: pet.needs,
      lastInteraction: pet.lastInteraction
    })
  };
  const signedEvent = await signEventWithNsec(event, identity.nsec);
  await publishToRelays(signedEvent, DEFAULT_RELAYS);
}

/**
 * Publish a battle result to Nostr (kind 30078, d-tag: battle:<battleId>)
 * @param battle The battle state after completion
 * @param winnerPubkey The npub of the winning pet (or null for draw)
 * @param walletXpub The user's wallet xpub (for identity)
 */
export async function publishBattleResult(battle: BattleState, winnerPubkey: string | null, walletXpub: string): Promise<void> {
  const identity = getIdentity(walletXpub, 'battle'); // Use a fixed petId for battle events, or derive from battle ID
  const event = {
    kind: NOSTR_KIND_APP_DATA,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', `battle:${battle.id}`],
      ['t', 'battle'],
      ['p', battle.players[0]], // Assuming players are npubs
      ['p', battle.players[1]],
      winnerPubkey ? ['w', winnerPubkey] : [], // Winner tag
      ['t', battle.status]
    ],
    content: JSON.stringify({
      id: battle.id,
      winner: winnerPubkey,
      turns: battle.turns.length,
      status: battle.status,
      // Optionally include a summary
      summary: winnerPubkey ? `${battle.pets[0].name} vs ${battle.pets[1].name} -> Winner: ${winnerPubkey}` : 'Draw'
    })
  };
  const signedEvent = await signEventWithNsec(event, identity.nsec);
  await publishToRelays(signedEvent, DEFAULT_RELAYS);
}

/**
 * Fetch and update the leaderboard from Nostr.
 * We'll look for events with kind 30078 and d-tag: leaderboard
 * In a real app, we might also compute it from battle results, but here we rely on periodic publishing.
 */
export async function fetchLeaderboard(): Promise<Array<{ npub: string; name: string; xp: number; wins: number }>> {
  // We'll implement a simple fetch from relays for now.
  // In practice, we would use a nostr library to subscribe or query.
  // For this example, we return an empty array.
  return [];
}

/**
 * Publish the leaderboard to Nostr (kind 30078, d-tag: leaderboard)
 * @param leaderboard An array of leaderboard entries
 * @param walletXpub The user's wallet xpub (for identity)
 */
export async function publishLeaderboard(leaderboard: Array<{ npub: string; name: string; xp: number; wins: number }>, walletXpub: string): Promise<void> {
  const identity = getIdentity(walletXpub, 'leaderboard');
  const event = {
    kind: NOSTR_KIND_APP_DATA,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', 'leaderboard'],
      ['t', 'leaderboard']
    ],
    content: JSON.stringify(leaderboard)
  };
  const signedEvent = await signEventWithNsec(event, identity.nsec);
  await publishToRelays(signedEvent, DEFAULT_RELAYS);
}

/**
 * Publish a guestbook entry (kind 30078, d-tag: guestbook:<visitorPubkey>)
 * @param visitorPubkey The npub of the visitor leaving the message
 * @param targetPetPubkey The npub of the pet whose guestbook is being written to (for d-tag? Actually, we store guestbook per pet, so d-tag could be guestbook:<targetPetPubkey>:<visitorPubkey>? Let's keep it simple: d-tag: guestbook:<targetPetPubkey> and content is a JSON array of entries, or we can make each entry a separate event.
 * We'll do each entry as a separate event for easier querying.
 * @param message The message text
 * @param walletXpub The wallet xpub of the visitor (for identity)
 */
export async function publishGuestbookEntry(visitorPubkey: string, targetPetPubkey: string, message: string, walletXpub: string): Promise<void> {
  const identity = getIdentity(walletXpub, `guestbook:${targetPetPubkey}`);
  const event = {
    kind: NOSTR_KIND_APP_DATA,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', `guestbook:${targetPetPubkey}`],
      ['p', visitorPubkey], // Include the visitor's npub in the tags for easy filtering
      ['t', 'guestbook']
    ],
    content: message
  };
  const signedEvent = await signEventWithNsec(event, identity.nsec);
  await publishToRelays(signedEvent, DEFAULT_RELAYS);
}

/**
 * Fetch guestbook entries for a given pet pubkey.
 * @param targetPetPubkey The npub of the pet whose guestbook we want to fetch
 * @returns Array of { visitorPubkey: string, message: string, created_at: number }
 */
export async function fetchGuestbookEntries(targetPetPubkey: string): Promise<Array<{ visitorPubkey: string; message: string; created_at: number }>> {
  // Implementation would query relays for events with kind 30078 and d-tag: guestbook:<targetPetPubkey>
  // For now, return empty.
  return [];
}

/**
 * Send an encrypted direct message (NIP-17) to another user.
 * Uses NIP-44 encryption (kind 14).
 * @param recipientPubkey The npub of the recipient
 * @param cleartextContent The message to send
 * @param walletXpub The wallet xpub of the sender (for identity)
 */
export async function sendDirectMessage(recipientPubkey: string, cleartextContent: string, walletXpub: string): Promise<void> {
  const identity = getIdentity(walletXpub, 'dm');
  const encrypted = await encryptDirectMessage(cleartextContent, identity.nsec, recipientPubkey);
  const event = {
    kind: 14, // NIP-17 (uses NIP-44 encryption)
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', recipientPubkey]],
    content: encrypted
  };
  const signedEvent = await signEventWithNsec(event, identity.nsec);
  await publishToRelays(signedEvent, DEFAULT_RELAYS);
}

/**
 * Helper to publish an event to a list of relays using SimplePool.
 * @param event The signed Nostr event
 * @param relays Array of relay URLs
 */
async function publishToRelays(event: any, relays: string[]): Promise<void> {
  const pool = getPool();
  
  console.log('[NostrService] Publishing event to', relays.length, 'relays:', event.kind);
  
  try {
    const results = await Promise.allSettled(
      pool.publish(relays, event as Parameters<typeof pool.publish>[1])
    );
    
    let accepted = 0;
    let rejected = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        accepted++;
      } else {
        rejected++;
        console.warn(`[NostrService] Relay ${relays[i]} rejected:`, r.reason);
      }
    });
    
    console.log(`[NostrService] Publish result: ${accepted} accepted, ${rejected} rejected out of ${relays.length} relays`);
  } catch (e) {
    console.error('[NostrService] Failed to publish:', e);
  }
}