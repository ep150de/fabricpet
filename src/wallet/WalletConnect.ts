// ============================================
// Wallet Connect — UniSat + Xverse Bitcoin wallet integration
// ============================================

import type { WalletType, OrdinalInscription, OrdinalTrait } from '../types';
import { XVERSE_API_BASE, ORDINALS_CONTENT_BASE } from '../utils/constants';

// Extend Window for UniSat wallet
declare global {
  interface Window {
    unisat?: {
      requestAccounts(): Promise<string[]>;
      getAccounts(): Promise<string[]>;
      getInscriptions(cursor?: number, size?: number): Promise<{
        total: number;
        list: Array<{
          inscriptionId: string;
          inscriptionNumber: number;
          contentType: string;
          content: string;
        }>;
      }>;
      getNetwork(): Promise<string>;
      inscribe(args: {
        data: Array<{ data: string }>;
        address?: string;
        receiveAddress?: string;
      }): Promise<{ inscriptionId: string; inscriptionNumber: number }>;
    };
  }
}

/**
 * Check if UniSat wallet extension is available.
 */
export function hasUnisatWallet(): boolean {
  return typeof window !== 'undefined' && !!window.unisat;
}

/**
 * Check if Xverse wallet is available (via sats-connect).
 */
export function hasXverseWallet(): boolean {
  // Xverse injects into the page or is accessed via sats-connect
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).XverseProviders;
}

/**
 * Connect to UniSat wallet and get address.
 */
export async function connectUnisat(): Promise<{ address: string; type: WalletType }> {
  if (!window.unisat) {
    throw new Error('UniSat wallet not found. Please install the UniSat browser extension.');
  }

  const accounts = await window.unisat.requestAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found in UniSat wallet.');
  }

  return {
    address: accounts[0],
    type: 'unisat',
  };
}

/**
 * Connect to Xverse wallet via sats-connect.
 */
export async function connectXverse(): Promise<{ address: string; type: WalletType }> {
  try {
    const satsConnect = await import('sats-connect');
    const requestFn = satsConnect.request as (method: string, params: unknown) => Promise<{ status: string; result: Array<{ address: string; purpose: string }> }>;

    const response = await requestFn('getAccounts', {
      purposes: ['ordinals', 'payment'],
    });

    if (response.status === 'success' && response.result.length > 0) {
      // Find the ordinals address
      const ordinalsAccount = response.result.find(
        (a: Record<string, string>) => a.purpose === 'ordinals'
      );
      const address = ordinalsAccount?.address || response.result[0].address;

      return {
        address,
        type: 'xverse',
      };
    }

    throw new Error('Failed to connect to Xverse wallet.');
  } catch (error) {
    throw new Error(`Xverse connection failed: ${error}`);
  }
}

/**
 * Fetch inscriptions from UniSat wallet.
 */
export async function fetchUnisatInscriptions(): Promise<OrdinalInscription[]> {
  if (!window.unisat) {
    throw new Error('UniSat wallet not available');
  }

  const result = await window.unisat.getInscriptions(0, 50);
  return result.list.map((item) => ({
    id: item.inscriptionId,
    number: item.inscriptionNumber,
    contentType: item.contentType,
    contentUrl: `${ORDINALS_CONTENT_BASE}/${item.inscriptionId}`,
    traits: [], // Will be populated by trait reader
    owner: '',
  }));
}

/**
 * Fetch inscriptions for an address via Xverse API.
 */
export async function fetchXverseInscriptions(address: string): Promise<OrdinalInscription[]> {
  try {
    // Fetch ordinal UTXOs
    const response = await fetch(`${XVERSE_API_BASE}/address/${address}/ordinal-utxo`);
    if (!response.ok) throw new Error('Failed to fetch ordinal UTXOs');

    const data = await response.json();
    const inscriptions: OrdinalInscription[] = [];

    // Fetch details for each inscription
    for (const utxo of data.results || []) {
      for (const inscription of utxo.inscriptions || []) {
        try {
          const detailResponse = await fetch(
            `${XVERSE_API_BASE}/address/${address}/ordinals/inscriptions/${inscription.id}`
          );
          if (detailResponse.ok) {
            const detail = await detailResponse.json();
            inscriptions.push({
              id: inscription.id,
              number: detail.number || 0,
              contentType: detail.content_type || 'unknown',
              contentUrl: `${ORDINALS_CONTENT_BASE}/${inscription.id}`,
              traits: [],
              owner: address,
            });
          }
        } catch {
          // Skip failed individual fetches
        }
      }
    }

    return inscriptions;
  } catch (error) {
    console.error('Failed to fetch Xverse inscriptions:', error);
    return [];
  }
}

/**
 * Fetch inscription metadata/traits from ordinals content.
 * Tries to read CBOR metadata or JSON traits from the inscription.
 */
export async function fetchInscriptionTraits(inscriptionId: string): Promise<OrdinalTrait[]> {
  try {
    // Try fetching metadata from ordinals.com API
    const response = await fetch(`https://ordinals.com/inscription/${inscriptionId}`);
    if (!response.ok) return [];

    const html = await response.text();

    // Try to extract traits from metadata (simplified - in production use proper CBOR decoding)
    const traitsMatch = html.match(/attributes.*?\[(.*?)\]/s);
    if (traitsMatch) {
      try {
        const traitsJson = JSON.parse(`[${traitsMatch[1]}]`);
        return traitsJson.map((t: Record<string, string>) => ({
          trait_type: t.trait_type || 'unknown',
          value: t.value || 'unknown',
        }));
      } catch {
        // Not valid JSON traits
      }
    }

    // Fallback: generate pseudo-traits from inscription ID
    return generateFallbackTraits(inscriptionId);
  } catch {
    return generateFallbackTraits(inscriptionId);
  }
}

/**
 * Generate fallback traits from inscription ID when metadata isn't available.
 * Uses deterministic hashing to create consistent traits.
 */
function generateFallbackTraits(inscriptionId: string): OrdinalTrait[] {
  // Inline simple hash to avoid require()
  let hash = 0;
  for (let i = 0; i < inscriptionId.length; i++) {
    const char = inscriptionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  hash = Math.abs(hash);

  const backgrounds = ['Fire', 'Water', 'Forest', 'Sky', 'Dark', 'Light'];
  const rarities = ['Common', 'Common', 'Common', 'Uncommon', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  const eyes = ['Wide', 'Sleepy', 'Laser', 'Sparkle'];

  return [
    { trait_type: 'Background', value: backgrounds[hash % backgrounds.length] },
    { trait_type: 'Rarity', value: rarities[hash % rarities.length] },
    { trait_type: 'Eyes', value: eyes[hash % eyes.length] },
  ];
}
