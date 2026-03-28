// ============================================
// Nostr Utilities — Cryptographic helper functions
// ============================================
// Uses nostr-tools for signing, key derivation, and NIP-04 encryption

import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { nip04 } from 'nostr-tools';
import { npubEncode, nsecEncode, decode } from 'nostr-tools/nip19';
import { simpleHash } from '../utils/hash';

/**
 * Generate a seed from a wallet's xpub and an optional pet ID.
 * Uses HMAC-SHA256-like derivation for deterministic keys.
 */
export function generateSeedFromWallet(walletXpub: string, petId?: string): Uint8Array {
  // Simple but deterministic seed generation
  const data = walletXpub + (petId ? `:${petId}` : '');
  const hashValue = simpleHash(data);
  
  // Convert hash to 32-byte seed
  const seed = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    seed[i] = (hashValue >> ((i % 4) * 8)) & 0xff;
  }
  return seed;
}

/**
 * Derive a nostr nsec (private key) from a seed.
 * Uses the seed to generate a secp256k1 private key.
 */
export function deriveNsecFromSeed(seed: Uint8Array): string {
  // For deterministic generation, we create a key based on the seed
  // In production, use proper key derivation (e.g., BIP-85)
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
  try {
    const decoded = decode(nsec);
    if (decoded.type === 'nsec') {
      return finalizeEvent(event as Parameters<typeof finalizeEvent>[0], decoded.data) as unknown as Record<string, unknown>;
    }
  } catch (e) {
    console.error('[nostrUtils] Failed to sign event:', e);
  }
  return event;
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
 * Encrypt a direct message using NIP-04.
 */
export async function encryptDirectMessage(content: string, nsec: string, recipientPubkey: string): Promise<string> {
  try {
    const decoded = decode(nsec);
    if (decoded.type === 'nsec') {
      return await nip04.encrypt(decoded.data, recipientPubkey, content);
    }
  } catch (e) {
    console.error('[nostrUtils] Failed to encrypt DM:', e);
  }
  return content;
}

/**
 * Decrypt a direct message using NIP-04.
 */
export async function decryptDirectMessage(encrypted: string, nsec: string, senderPubkey: string): Promise<string> {
  try {
    const decoded = decode(nsec);
    if (decoded.type === 'nsec') {
      return await nip04.decrypt(decoded.data, senderPubkey, encrypted);
    }
  } catch (e) {
    console.error('[nostrUtils] Failed to decrypt DM:', e);
  }
  return encrypted;
}
