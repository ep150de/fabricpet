// ============================================
// Runes Manager — Bitcoin Runes Token Integration
// ============================================
// Runes are fungible tokens on Bitcoin (by Casey Rodarmor).
// This module provides types and stubs for future Runes betting.
//
// Status: STUB — Types and architecture ready, actual Runes
// transfer logic requires testnet validation before going live.
// ============================================

export interface RuneBalance {
  runeId: string;
  runeName: string;
  symbol: string;
  amount: bigint;
  divisibility: number;
}

export interface RuneTransfer {
  runeId: string;
  amount: bigint;
  fromAddress: string;
  toAddress: string;
  txId: string | null;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface RunesWalletState {
  connected: boolean;
  address: string | null;
  runes: RuneBalance[];
  pendingTransfers: RuneTransfer[];
}

/**
 * Query Runes balance from connected wallet.
 * Supports UniSat and Xverse wallets.
 */
export async function queryRunesBalance(address: string): Promise<RuneBalance[]> {
  // TODO: Implement actual Runes balance query
  // UniSat API: GET /v1/indexer/address/{address}/runes/balance-list
  // Xverse: Uses sats-connect getRunesBalance
  console.log('[RunesManager] Querying Runes balance for:', address);

  // Stub: Return empty balance
  return [];
}

/**
 * Initiate a Runes transfer via connected wallet.
 * Used for betting payouts.
 */
export async function transferRunes(
  _runeId: string,
  _amount: bigint,
  _toAddress: string
): Promise<RuneTransfer | null> {
  // TODO: Implement actual Runes transfer
  // This requires PSBT construction with Runes protocol messages
  // Must be tested on testnet first!
  console.warn('[RunesManager] Runes transfer not yet implemented — testnet validation required');
  return null;
}

/**
 * Format a Runes amount for display.
 */
export function formatRuneAmount(amount: bigint, divisibility: number): string {
  if (divisibility === 0) return amount.toString();
  const str = amount.toString().padStart(divisibility + 1, '0');
  return `${str.slice(0, -divisibility)}.${str.slice(-divisibility)}`;
}

/**
 * Check if the connected wallet supports Runes.
 */
export async function checkRunesSupport(): Promise<boolean> {
  // UniSat supports Runes natively
  if (typeof (window as any).unisat !== 'undefined') {
    return true;
  }
  // Xverse supports Runes via sats-connect
  if (typeof (window as any).XverseProviders !== 'undefined') {
    return true;
  }
  return false;
}
