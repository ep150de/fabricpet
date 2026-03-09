// ============================================
// Nostr Identity — NIP-07 key management
// ============================================

import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { npubEncode, nsecEncode } from 'nostr-tools/nip19';

// Extend Window for NIP-07 browser extension
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: Record<string, unknown>): Promise<Record<string, unknown>>;
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
    };
  }
}

export interface NostrIdentity {
  pubkey: string;
  npub: string;
  secretKey: Uint8Array | null; // null if using NIP-07 extension
  isExtension: boolean;
}

/**
 * Check if a NIP-07 browser extension (nos2x, Alby, etc.) is available.
 */
export function hasNostrExtension(): boolean {
  return typeof window !== 'undefined' && !!window.nostr;
}

/**
 * Connect via NIP-07 browser extension.
 */
export async function connectWithExtension(): Promise<NostrIdentity> {
  if (!window.nostr) {
    throw new Error('No Nostr extension found. Install nos2x or Alby.');
  }

  const pubkey = await window.nostr.getPublicKey();
  const npub = npubEncode(pubkey);

  return {
    pubkey,
    npub,
    secretKey: null,
    isExtension: true,
  };
}

/**
 * Generate a new keypair (for users without a Nostr extension).
 * Stores the secret key in localStorage (encrypted in production).
 */
export function generateNewIdentity(): NostrIdentity {
  const secretKey = generateSecretKey();
  const pubkey = getPublicKey(secretKey);
  const npub = npubEncode(pubkey);

  // Store for persistence (in a real app, encrypt this!)
  localStorage.setItem('fabricpet_nsec', nsecEncode(secretKey));
  localStorage.setItem('fabricpet_pubkey', pubkey);

  return {
    pubkey,
    npub,
    secretKey,
    isExtension: false,
  };
}

/**
 * Load existing identity from localStorage.
 * Now async to properly decode the stored nsec key for signing.
 */
export async function loadStoredIdentity(): Promise<NostrIdentity | null> {
  try {
    const pubkey = localStorage.getItem('fabricpet_pubkey');
    const nsecStr = localStorage.getItem('fabricpet_nsec');

    if (!pubkey) return null;

    // Decode nsec to get the actual secret key for signing
    let secretKey: Uint8Array | null = null;
    if (nsecStr) {
      secretKey = await decodeNsecAsync(nsecStr);
      if (secretKey) {
        console.log('[Identity] ✅ Secret key decoded from stored nsec — signing enabled');
      } else {
        console.warn('[Identity] ⚠️ Failed to decode nsec — signing will be unavailable');
      }
    }

    return {
      pubkey,
      npub: npubEncode(pubkey),
      secretKey,
      isExtension: false,
    };
  } catch {
    return null;
  }
}

/**
 * Decode an nsec string back to a Uint8Array.
 */
async function decodeNsecAsync(nsec: string): Promise<Uint8Array | null> {
  try {
    const { decode } = await import('nostr-tools/nip19');
    const result = decode(nsec);
    if (result.type === 'nsec') {
      return result.data as Uint8Array;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Sign a Nostr event using either NIP-07 extension or local key.
 */
export async function signEvent(
  identity: NostrIdentity,
  event: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (identity.isExtension && window.nostr) {
    return await window.nostr.signEvent(event);
  }

  if (identity.secretKey) {
    const { finalizeEvent } = await import('nostr-tools/pure');
    return finalizeEvent(event as Parameters<typeof finalizeEvent>[0], identity.secretKey) as unknown as Record<string, unknown>;
  }

  throw new Error('No signing method available');
}
