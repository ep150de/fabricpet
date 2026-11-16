// ============================================
// Nostr Utilities — Cryptographic helper functions
// ============================================
// Uses nostr-tools for signing, key derivation, and NIP-44 encryption (NIP-17)

import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { nip44 } from 'nostr-tools';
import { npubEncode, nsecEncode, decode } from 'nostr-tools/nip19';

/**
 * Generate a seed from a wallet's xpub and an optional pet ID.
 * Uses SHA-256 for proper cryptographic hashing.
 * SECURITY: This should include a signature from the wallet for full entropy.
 */
export async function generateSeedFromWallet(walletXpub: string, petId?: string): Promise<Uint8Array> {
  const data = walletXpub + (petId ? `:${petId}` : '');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return new Uint8Array(hashBuffer);
}

/**
 * Derive a nostr nsec (private key) from a seed.
 * Uses the full 32-byte seed as the private key.
 */
export function deriveNsecFromSeed(seed: Uint8Array): string {
  if (seed.length < 32) {
    throw new Error('Seed must be at least 32 bytes');
  }
  const secretKey = new Uint8Array(32);
  secretKey.set(seed.slice(0, 32));
  return nsecEncode(secretKey);
}


/**
 * Derive a nostr npub (public key) from an nsec.
 */
export function deriveNpubFromNsec(nsec: string): string {
  try {
    const decoded = decode(nsec);
    if (decoded.type === 'nsec') {
      const pubkey = getPublicKey(decoded.data);
      return npubEncode(pubkey);
    }
  } catch (e) {
    console.error('[nostrUtils] Failed to decode nsec:', e);
  }
  return '';
}

/**
 * Generate a new random nostr keypair.
 */
export function generateNewKeypair(): { nsec: string; npub: string } {
  const secretKey = generateSecretKey();
  const pubkey = getPublicKey(secretKey);
  return {
    nsec: nsecEncode(secretKey),
    npub: npubEncode(pubkey),
  };
}

/**
 * Sign an event with an nsec string.
 */
export async function signEventWithNsec(event: Record<string, unknown>, nsec: string): Promise<Record<string, unknown>> {
  const decoded = decode(nsec);
  if (decoded.type !== 'nsec') {
    throw new Error('Invalid nsec format');
  }
  try {
    return finalizeEvent(event as Parameters<typeof finalizeEvent>[0], decoded.data) as unknown as Record<string, unknown>;
  } catch (e) {
    console.error('[nostrUtils] Failed to sign event:', e);
    throw new Error('Failed to sign event: ' + (e instanceof Error ? e.message : String(e)));
  }
}

/**
 * Verify an event's signature.
 */
export async function verifyEvent(event: Record<string, unknown>): Promise<boolean> {
  try {
    const { verifyEvent: nostrVerify } = await import('nostr-tools/pure');
    return nostrVerify(event as Parameters<typeof nostrVerify>[0]);
  } catch {
    return false;
  }
}

/**
 * Encrypt a direct message using NIP-44 (NIP-17).
 * Uses chacha20-poly1305 with conversation key derived from ECDH.
 */
export async function encryptDirectMessage(content: string, nsec: string, recipientPubkey: string): Promise<string> {
  try {
    const decoded = decode(nsec);
    if (decoded.type === 'nsec') {
      const conversationKey = nip44.v2.utils.getConversationKey(decoded.data, recipientPubkey);
      return nip44.v2.encrypt(content, conversationKey);
    }
  } catch (e) {
    console.error('[nostrUtils] Failed to encrypt DM:', e);
  }
  return content;
}

/**
 * Decrypt a direct message using NIP-44 (NIP-17).
 */
export async function decryptDirectMessage(encrypted: string, nsec: string, senderPubkey: string): Promise<string> {
  try {
    const decoded = decode(nsec);
    if (decoded.type === 'nsec') {
      const conversationKey = nip44.v2.utils.getConversationKey(decoded.data, senderPubkey);
      return nip44.v2.decrypt(encrypted, conversationKey);
    }
  } catch (e) {
    console.error('[nostrUtils] Failed to decrypt DM:', e);
  }
  return encrypted;
}
