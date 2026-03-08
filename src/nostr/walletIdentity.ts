// ============================================
// Wallet-Derived Nostr Identity
// ============================================
// Derives a deterministic Nostr keypair from a Bitcoin wallet signature.
// Same wallet on any device → same signature → same Nostr key → same pet data.
// ============================================

import type { NostrIdentity } from './identity';

const SIGN_MESSAGE = 'FabricPet Identity Derivation v1';

/**
 * Derive a Nostr identity from a UniSat wallet signature.
 * The user signs a deterministic message; the signature is hashed to produce a private key.
 */
export async function deriveIdentityFromUnisat(): Promise<NostrIdentity> {
  if (!window.unisat) {
    throw new Error('UniSat wallet not available');
  }

  const accounts = await window.unisat.getAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error('No UniSat accounts connected');
  }

  const address = accounts[0];
  const message = `${SIGN_MESSAGE}:${address}`;

  // Sign the deterministic message
  const signature = await (window.unisat as unknown as { signMessage: (msg: string) => Promise<string> }).signMessage(message);

  // Hash the signature to get a 32-byte private key
  const secretKey = await sha256(signature);

  // Import nostr-tools to derive pubkey
  const { getPublicKey } = await import('nostr-tools/pure');
  const { npubEncode } = await import('nostr-tools/nip19');

  const pubkey = getPublicKey(secretKey);
  const npub = npubEncode(pubkey);

  console.log('[WalletIdentity] Derived Nostr identity from UniSat wallet');

  return {
    pubkey,
    npub,
    secretKey,
    isExtension: false,
  };
}

/**
 * Derive a Nostr identity from an Xverse wallet signature.
 */
export async function deriveIdentityFromXverse(): Promise<NostrIdentity> {
  try {
    const satsConnect = await import('sats-connect');
    const requestFn = satsConnect.request as (method: string, params: unknown) => Promise<{ status: string; result: unknown }>;

    // Get address first
    const accountsResponse = await requestFn('getAccounts', {
      purposes: ['ordinals'],
    });

    if (accountsResponse.status !== 'success') {
      throw new Error('Failed to get Xverse accounts');
    }

    const accounts = accountsResponse.result as Array<{ address: string }>;
    const address = accounts[0]?.address;
    if (!address) throw new Error('No Xverse address found');

    const message = `${SIGN_MESSAGE}:${address}`;

    // Sign message
    const signResponse = await requestFn('signMessage', {
      address,
      message,
    });

    if (signResponse.status !== 'success') {
      throw new Error('Xverse message signing failed');
    }

    const signature = signResponse.result as string;
    const secretKey = await sha256(signature);

    const { getPublicKey } = await import('nostr-tools/pure');
    const { npubEncode } = await import('nostr-tools/nip19');

    const pubkey = getPublicKey(secretKey);
    const npub = npubEncode(pubkey);

    console.log('[WalletIdentity] Derived Nostr identity from Xverse wallet');

    return {
      pubkey,
      npub,
      secretKey,
      isExtension: false,
    };
  } catch (error) {
    throw new Error(`Xverse identity derivation failed: ${error}`);
  }
}

/**
 * SHA-256 hash using Web Crypto API. Returns a proper Uint8Array.
 */
async function sha256(data: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded.buffer as ArrayBuffer);
  return new Uint8Array(hashBuffer);
}
