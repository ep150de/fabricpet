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

// --- Web Crypto helpers for nsec encryption ---

const IV_LENGTH = 12;
const FIXED_SALT_PREFIX = 'fabricpet-nsec-v2';

function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(str: string): Uint8Array {
  return new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
}

async function deriveCryptoKey(pubkey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const saltSource = encoder.encode(FIXED_SALT_PREFIX + pubkey);
  const hash = await crypto.subtle.digest('SHA-256', saltSource);
  const salt = new Uint8Array(hash).slice(0, 16);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pubkey + ':fabricpet:v2'),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptNsec(plaintext: string, pubkey: string): Promise<string> {
  const key = await deriveCryptoKey(pubkey);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const data = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data.buffer);
  const combined = new Uint8Array(IV_LENGTH + cipher.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(cipher), IV_LENGTH);
  return 'enc:' + toBase64(combined.buffer);
}

async function decryptNsec(ciphertext: string, pubkey: string): Promise<string> {
  if (!ciphertext.startsWith('enc:')) throw new Error('Not encrypted');
  const raw = fromBase64(ciphertext.slice(4));
  const iv = raw.slice(0, IV_LENGTH);
  const data = raw.slice(IV_LENGTH);
  const ab = new ArrayBuffer(data.length);
  new Uint8Array(ab).set(data);
  const key = await deriveCryptoKey(pubkey);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ab);
  return new TextDecoder().decode(plain);
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
export async function generateNewIdentity(): Promise<NostrIdentity> {
  const secretKey = generateSecretKey();
  const pubkey = getPublicKey(secretKey);
  const npub = npubEncode(pubkey);
  const nsec = nsecEncode(secretKey);

  // Encrypt and store the nsec (salt derived deterministically from pubkey)
  const encrypted = await encryptNsec(nsec, pubkey);
  localStorage.setItem('fabricpet_nsec', encrypted);
  localStorage.setItem('fabricpet_pubkey', pubkey);

  return {
    pubkey,
    npub,
    secretKey,
    isExtension: false,
  };
}

/**
 * Clear stored identity from localStorage (for recovery when key is lost).
 */
export function clearIdentity(): void {
  localStorage.removeItem('fabricpet_nsec');
  localStorage.removeItem('fabricpet_pubkey');
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

    let secretKey: Uint8Array | null = null;
    if (nsecStr) {
      if (nsecStr.startsWith('enc:')) {
        try {
          const decrypted = await decryptNsec(nsecStr, pubkey);
          secretKey = await decodeNsecAsync(decrypted);
          if (secretKey) {
            console.log('[Identity] ✅ Secret key decrypted — signing enabled');
          }
        } catch (e) {
          // Decryption failed — data may be corrupted or from a different browser profile.
          // Clear corrupted data and return null so App.tsx regenerates.
          console.warn('[Identity] ⚠️ Decryption failed — identity data corrupted or from different browser.');
          localStorage.removeItem('fabricpet_nsec');
          localStorage.removeItem('fabricpet_pubkey');
          return null;
        }
      } else {
        // Legacy plaintext nsec — decode and migrate to encrypted
        secretKey = await decodeNsecAsync(nsecStr);
        if (secretKey) {
          console.log('[Identity] ✅ Secret key decoded from plaintext — signing enabled');
          const encrypted = await encryptNsec(nsecStr, pubkey);
          localStorage.setItem('fabricpet_nsec', encrypted);
          console.log('[Identity] ✅ Migrated nsec to encrypted storage');
        }
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
