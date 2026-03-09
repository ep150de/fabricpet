// ============================================
// Betting Engine — Bitcoin Runes Wagering System
// ============================================
// Provides types and architecture for pet battle betting
// using Bitcoin Runes tokens.
//
// Status: STUB — Architecture ready, requires testnet
// validation and responsible gambling features before launch.
// ============================================

import type { RuneBalance } from './RunesManager';

// --- Bet Types ---

export type BetType = 'battle_wager' | 'arena_jackpot' | 'tournament_entry';
export type BetStatus = 'proposed' | 'accepted' | 'locked' | 'resolved' | 'refunded' | 'expired';

export interface BetProposal {
  betId: string;
  type: BetType;
  proposerPubkey: string;
  proposerAddress: string;
  runeId: string;
  runeName: string;
  amount: bigint;
  targetPubkey: string | null; // null = open bet
  battleId: string | null;
  createdAt: number;
  expiresAt: number;
  status: BetStatus;
}

export interface BetAcceptance {
  betId: string;
  accepterPubkey: string;
  accepterAddress: string;
  amount: bigint;
  timestamp: number;
}

export interface BetResolution {
  betId: string;
  winnerPubkey: string;
  winnerAddress: string;
  totalPot: bigint;
  txId: string | null; // Bitcoin transaction ID for payout
  resolvedAt: number;
}

// --- Betting Limits (Responsible Gambling) ---

export interface BettingLimits {
  minBetAmount: bigint;
  maxBetAmount: bigint;
  dailyLimit: bigint;
  cooldownMinutes: number;
  maxActiveBets: number;
}

export const DEFAULT_LIMITS: BettingLimits = {
  minBetAmount: BigInt(1),
  maxBetAmount: BigInt(1000),
  dailyLimit: BigInt(5000),
  cooldownMinutes: 5,
  maxActiveBets: 3,
};

// --- Betting Engine ---

/**
 * Create a bet proposal for a battle wager.
 */
export function createBetProposal(
  proposerPubkey: string,
  proposerAddress: string,
  runeId: string,
  runeName: string,
  amount: bigint,
  type: BetType = 'battle_wager',
  targetPubkey?: string,
  expiresInMinutes: number = 30
): BetProposal {
  return {
    betId: `bet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    proposerPubkey,
    proposerAddress,
    runeId,
    runeName,
    amount,
    targetPubkey: targetPubkey || null,
    battleId: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresInMinutes * 60 * 1000,
    status: 'proposed',
  };
}

/**
 * Validate a bet against limits.
 */
export function validateBet(
  amount: bigint,
  runeBalance: RuneBalance,
  activeBets: BetProposal[],
  limits: BettingLimits = DEFAULT_LIMITS
): { valid: boolean; error?: string } {
  if (amount < limits.minBetAmount) {
    return { valid: false, error: `Minimum bet is ${limits.minBetAmount}` };
  }
  if (amount > limits.maxBetAmount) {
    return { valid: false, error: `Maximum bet is ${limits.maxBetAmount}` };
  }
  if (amount > runeBalance.amount) {
    return { valid: false, error: 'Insufficient Runes balance' };
  }
  if (activeBets.length >= limits.maxActiveBets) {
    return { valid: false, error: `Maximum ${limits.maxActiveBets} active bets allowed` };
  }

  // Check daily limit
  const today = new Date().setHours(0, 0, 0, 0);
  const todayBets = activeBets.filter(b => b.createdAt >= today);
  const todayTotal = todayBets.reduce((sum, b) => sum + b.amount, BigInt(0));
  if (todayTotal + amount > limits.dailyLimit) {
    return { valid: false, error: `Daily betting limit of ${limits.dailyLimit} reached` };
  }

  return { valid: true };
}

/**
 * Calculate payout for a resolved bet.
 * Takes a small platform fee (2%) for prize pool sustainability.
 */
export function calculatePayout(totalPot: bigint, platformFeePercent: number = 2): {
  winnerPayout: bigint;
  platformFee: bigint;
} {
  const fee = (totalPot * BigInt(platformFeePercent)) / BigInt(100);
  return {
    winnerPayout: totalPot - fee,
    platformFee: fee,
  };
}

/**
 * Check if a bet has expired.
 */
export function isBetExpired(bet: BetProposal): boolean {
  return Date.now() > bet.expiresAt && bet.status === 'proposed';
}
