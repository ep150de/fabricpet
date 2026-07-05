// ============================================
// NIP-46 Remote Signer Client
// ============================================
// Implements NIP-46 protocol for remote event signing
// Allows users to connect external signers (hardware wallets, mobile apps)
// ============================================

import { SimplePool, nip04, nip44, getPublicKey } from 'nostr-tools';
import type { Event as NostrEvent, UnsignedEvent } from 'nostr-tools/pure';

export interface NIP46Signer {
  remotePubkey: string;
  relayUrl: string;
  secret: string;
  clientSecretKey?: Uint8Array;
}

export interface NIP46Request {
  id: string;
  method: string;
  params: string[];
}

export interface NIP46Response {
  id: string;
  result?: string;
  error?: string;
}

export type NIP46Method = 
  | 'connect'
  | 'disconnect'
  | 'get_public_key'
  | 'sign_event'
  | 'nip04_encrypt'
  | 'nip04_decrypt'
  | 'nip44_encrypt'
  | 'nip44_decrypt';

/**
 * Parse a bunker:// URL into NIP-46 signer config
 * Format: bunker://<remote-pubkey>?relay=<relay-url>&secret=<secret>
 */
export function parseBunkerUrl(url: string): NIP46Signer | null {
  try {
    if (!url.startsWith('bunker://')) {
      return null;
    }

    const withoutProtocol = url.slice('bunker://'.length);
    const [pubkey, queryString] = withoutProtocol.split('?');
    
    if (!pubkey || !queryString) {
      return null;
    }

    const params = new URLSearchParams(queryString);
    const relayUrl = params.get('relay');
    const secret = params.get('secret');

    if (!relayUrl || !secret) {
      return null;
    }

    return {
      remotePubkey: pubkey,
      relayUrl,
      secret,
    };
  } catch (error) {
    console.error('[NIP-46] Failed to parse bunker URL:', error);
    return null;
  }
}

/**
 * Generate a client keypair for NIP-46 communication
 */
export function generateClientKeypair(): { secretKey: Uint8Array; pubkey: string } {
  const secretKey = new Uint8Array(32);
  crypto.getRandomValues(secretKey);
  const pubkey = getPublicKey(secretKey);
  return { secretKey, pubkey };
}

/**
 * NIP-46 Remote Signer Client
 */
export class NIP46Client {
  private signer: NIP46Signer;
  private clientSecretKey: Uint8Array;
  private clientPubkey: string;
  private pool: SimplePool;
  private requestId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();

  constructor(signer: NIP46Signer, clientSecretKey?: Uint8Array) {
    this.signer = signer;
    
    if (clientSecretKey) {
      this.clientSecretKey = clientSecretKey;
      this.clientPubkey = getPublicKey(clientSecretKey);
    } else {
      const keypair = generateClientKeypair();
      this.clientSecretKey = keypair.secretKey;
      this.clientPubkey = keypair.pubkey;
    }

    this.pool = new SimplePool();
  }

  /**
   * Connect to the remote signer
   */
  async connect(): Promise<boolean> {
    try {
      const result = await this.sendRequest('connect', [
        this.signer.remotePubkey,
        this.signer.secret,
      ]);
      return result === 'ack';
    } catch (error) {
      console.error('[NIP-46] Connection failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from the remote signer
   */
  async disconnect(): Promise<void> {
    try {
      await this.sendRequest('disconnect', []);
    } catch (error) {
      console.error('[NIP-46] Disconnect failed:', error);
    }
  }

  /**
   * Get the remote signer's public key
   */
  async getPublicKey(): Promise<string> {
    const result = await this.sendRequest('get_public_key', []);
    return result;
  }

  /**
   * Sign an event using the remote signer
   */
  async signEvent(event: UnsignedEvent): Promise<NostrEvent> {
    const eventJson = JSON.stringify(event);
    const signedJson = await this.sendRequest('sign_event', [eventJson]);
    return JSON.parse(signedJson);
  }

  /**
   * Encrypt a message using NIP-04
   */
  async nip04Encrypt(pubkey: string, plaintext: string): Promise<string> {
    const result = await this.sendRequest('nip04_encrypt', [pubkey, plaintext]);
    return result;
  }

  /**
   * Decrypt a message using NIP-04
   */
  async nip04Decrypt(pubkey: string, ciphertext: string): Promise<string> {
    const result = await this.sendRequest('nip04_decrypt', [pubkey, ciphertext]);
    return result;
  }

  /**
   * Encrypt a message using NIP-44
   */
  async nip44Encrypt(pubkey: string, plaintext: string): Promise<string> {
    const result = await this.sendRequest('nip44_encrypt', [pubkey, plaintext]);
    return result;
  }

  /**
   * Decrypt a message using NIP-44
   */
  async nip44Decrypt(pubkey: string, ciphertext: string): Promise<string> {
    const result = await this.sendRequest('nip44_decrypt', [pubkey, ciphertext]);
    return result;
  }

  /**
   * Send a request to the remote signer and wait for response
   */
  private async sendRequest(method: NIP46Method, params: string[]): Promise<string> {
    const id = String(++this.requestId);
    const request: NIP46Request = { id, method, params };

    // Encrypt the request
    const requestJson = JSON.stringify(request);
    const encryptedRequest = await nip04.encrypt(
      this.clientSecretKey,
      this.signer.remotePubkey,
      requestJson
    );

    // Create and sign the event
    const event: UnsignedEvent = {
      kind: 24133,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', this.signer.remotePubkey]],
      content: encryptedRequest,
      pubkey: this.clientPubkey,
    };

    const { finalizeEvent } = await import('nostr-tools/pure');
    const signedEvent = finalizeEvent(event, this.clientSecretKey);

    // Publish the request
    await this.pool.publish([this.signer.relayUrl], signedEvent);

    // Wait for response
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Subscribe to responses
      const sub = this.pool.subscribeMany(
        [this.signer.relayUrl],
        [
          {
            kinds: [24133],
            authors: [this.signer.remotePubkey],
            '#p': [this.clientPubkey],
            since: Math.floor(Date.now() / 1000) - 10,
          } as Record<string, unknown>,
        ] as unknown as Parameters<typeof this.pool.subscribeMany>[1],
        {
          onevent: async (event) => {
            try {
              const decrypted = await nip04.decrypt(
                this.clientSecretKey,
                this.signer.remotePubkey,
                event.content
              );
              const response: NIP46Response = JSON.parse(decrypted);

              if (response.id === id) {
                sub.close();
                const pending = this.pendingRequests.get(id);
                if (pending) {
                  this.pendingRequests.delete(id);
                  if (response.error) {
                    pending.reject(new Error(response.error));
                  } else {
                    pending.resolve(response.result || '');
                  }
                }
              }
            } catch (error) {
              console.error('[NIP-46] Failed to process response:', error);
            }
          },
        }
      );

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          sub.close();
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Get the client's public key
   */
  getClientPubkey(): string {
    return this.clientPubkey;
  }

  /**
   * Get the client's secret key
   */
  getClientSecretKey(): Uint8Array {
    return this.clientSecretKey;
  }

  /**
   * Close the connection pool
   */
  close(): void {
    this.pool.close([this.signer.relayUrl]);
  }
}

/**
 * Create a NIP-46 client from a bunker URL
 */
export function createNIP46ClientFromUrl(url: string, clientSecretKey?: Uint8Array): NIP46Client | null {
  const signer = parseBunkerUrl(url);
  if (!signer) {
    return null;
  }
  return new NIP46Client(signer, clientSecretKey);
}
