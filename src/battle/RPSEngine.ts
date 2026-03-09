// ============================================
// RPS Battle Engine — Rock-Paper-Scissors style mini-game
// ============================================
// Turn-based RPS with elemental flavor:
//   🔥 Strike  beats  💨 Wind
//   💨 Wind    beats  🛡️ Shield
//   🛡️ Shield  beats  🔥 Strike
//
// Each round: both players pick → commit to Nostr → reveal → resolve damage.
// First pet to 0 HP loses.
// ============================================

import type { BattleStats, ElementalType } from '../types';
import { simpleHash } from '../utils/hash';

// --- Types ---

export type RPSChoice = 'strike' | 'wind' | 'shield';

export interface RPSRound {
  round: number;
  player1Choice: RPSChoice;
  player2Choice: RPSChoice;
  result: 'p1win' | 'p2win' | 'draw';
  p1Damage: number;
  p2Damage: number;
  message: string;
}

export interface RPSBattleState {
  id: string;
  players: [string, string]; // pubkeys
  petNames: [string, string];
  petTypes: [ElementalType, ElementalType];
  hp: [number, number];
  maxHp: [number, number];
  stats: [BattleStats, BattleStats];
  rounds: RPSRound[];
  currentRound: number;
  winner: string | null;
  status: 'waiting' | 'active' | 'finished';
}

// --- Constants ---

const RPS_EMOJI: Record<RPSChoice, string> = {
  strike: '🔥',
  wind: '💨',
  shield: '🛡️',
};

const RPS_NAMES: Record<RPSChoice, string> = {
  strike: 'Strike',
  wind: 'Wind',
  shield: 'Shield',
};

// Elemental flavor names (cosmetic only)
const ELEMENTAL_STRIKE: Record<string, string> = {
  fire: '🔥 Flame Strike', water: '💧 Hydro Slash', earth: '🌿 Vine Whip',
  air: '💨 Gale Force', light: '✨ Radiant Blow', dark: '🌑 Shadow Strike',
  neutral: '⚡ Power Strike',
};

const ELEMENTAL_WIND: Record<string, string> = {
  fire: '🔥 Heat Wave', water: '💧 Tidal Gust', earth: '🌿 Leaf Storm',
  air: '💨 Cyclone', light: '✨ Light Breeze', dark: '🌑 Dark Gale',
  neutral: '💨 Swift Wind',
};

const ELEMENTAL_SHIELD: Record<string, string> = {
  fire: '🔥 Flame Wall', water: '💧 Aqua Shield', earth: '🌿 Root Guard',
  air: '💨 Wind Barrier', light: '✨ Holy Ward', dark: '🌑 Shadow Veil',
  neutral: '🛡️ Iron Guard',
};

// --- Core Logic ---

/**
 * Determine RPS outcome.
 * strike > wind > shield > strike
 */
export function resolveRPS(p1: RPSChoice, p2: RPSChoice): 'p1win' | 'p2win' | 'draw' {
  if (p1 === p2) return 'draw';
  if (
    (p1 === 'strike' && p2 === 'wind') ||
    (p1 === 'wind' && p2 === 'shield') ||
    (p1 === 'shield' && p2 === 'strike')
  ) {
    return 'p1win';
  }
  return 'p2win';
}

/**
 * Calculate damage for a winning RPS round.
 * Winner deals damage based on their ATK vs loser's DEF.
 * Draw = both take minor chip damage.
 */
export function calculateRPSDamage(
  winnerStats: BattleStats,
  loserStats: BattleStats,
  round: number,
  seed: string
): number {
  // Base damage: ATK * 0.8 - DEF * 0.3, minimum 1
  const baseDamage = Math.max(1, Math.floor(winnerStats.atk * 0.8 - loserStats.def * 0.3));

  // Slight variance (90-110%) using deterministic seed
  const variance = 0.9 + (simpleHash(seed + `_rps_${round}`) % 21) / 100;

  return Math.max(1, Math.floor(baseDamage * variance));
}

/**
 * Calculate chip damage for a draw round.
 */
export function calculateDrawDamage(stats: BattleStats, seed: string): number {
  // Small chip damage: 10-20% of ATK
  const chip = Math.max(1, Math.floor(stats.atk * 0.15));
  const variance = 0.8 + (simpleHash(seed + '_draw') % 41) / 100;
  return Math.max(1, Math.floor(chip * variance));
}

/**
 * Create a new RPS battle.
 */
export function createRPSBattle(
  player1Pubkey: string,
  player2Pubkey: string,
  pet1: { name: string; stats: BattleStats; elementalType: ElementalType },
  pet2: { name: string; stats: BattleStats; elementalType: ElementalType }
): RPSBattleState {
  const id = `rps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    players: [player1Pubkey, player2Pubkey],
    petNames: [pet1.name, pet2.name],
    petTypes: [pet1.elementalType, pet2.elementalType],
    hp: [pet1.stats.maxHp, pet2.stats.maxHp],
    maxHp: [pet1.stats.maxHp, pet2.stats.maxHp],
    stats: [{ ...pet1.stats }, { ...pet2.stats }],
    rounds: [],
    currentRound: 1,
    winner: null,
    status: 'active',
  };
}

/**
 * Execute one round of RPS battle.
 * Both players have already committed their choices.
 */
export function executeRPSRound(
  battle: RPSBattleState,
  p1Choice: RPSChoice,
  p2Choice: RPSChoice
): RPSBattleState {
  const state = { ...battle };
  const roundNum = state.currentRound;
  const seed = `${state.id}_round_${roundNum}`;

  const result = resolveRPS(p1Choice, p2Choice);

  let p1Damage = 0;
  let p2Damage = 0;
  let message = '';

  const p1MoveName = getFlavorName(p1Choice, state.petTypes[0]);
  const p2MoveName = getFlavorName(p2Choice, state.petTypes[1]);

  if (result === 'p1win') {
    p1Damage = 0;
    p2Damage = calculateRPSDamage(state.stats[0], state.stats[1], roundNum, seed);
    message = `${state.petNames[0]} used ${p1MoveName}! ${state.petNames[1]} used ${p2MoveName}. ${RPS_EMOJI[p1Choice]} beats ${RPS_EMOJI[p2Choice]}! ${state.petNames[1]} takes ${p2Damage} damage!`;
  } else if (result === 'p2win') {
    p1Damage = calculateRPSDamage(state.stats[1], state.stats[0], roundNum, seed + '_p2');
    p2Damage = 0;
    message = `${state.petNames[0]} used ${p1MoveName}! ${state.petNames[1]} used ${p2MoveName}. ${RPS_EMOJI[p2Choice]} beats ${RPS_EMOJI[p1Choice]}! ${state.petNames[0]} takes ${p1Damage} damage!`;
  } else {
    // Draw — both take chip damage
    p1Damage = calculateDrawDamage(state.stats[1], seed + '_chip1');
    p2Damage = calculateDrawDamage(state.stats[0], seed + '_chip2');
    message = `Both used ${RPS_EMOJI[p1Choice]}! It's a draw! Both take chip damage (${p1Damage} / ${p2Damage}).`;
  }

  const newHp: [number, number] = [
    Math.max(0, state.hp[0] - p1Damage),
    Math.max(0, state.hp[1] - p2Damage),
  ];

  const round: RPSRound = {
    round: roundNum,
    player1Choice: p1Choice,
    player2Choice: p2Choice,
    result,
    p1Damage,
    p2Damage,
    message,
  };

  // Check for winner
  let winner: string | null = null;
  let status = state.status;

  if (newHp[0] <= 0 && newHp[1] <= 0) {
    // Both KO'd — whoever had more HP remaining wins (or draw)
    winner = state.hp[0] >= state.hp[1] ? state.players[0] : state.players[1];
    status = 'finished';
  } else if (newHp[0] <= 0) {
    winner = state.players[1];
    status = 'finished';
  } else if (newHp[1] <= 0) {
    winner = state.players[0];
    status = 'finished';
  }

  return {
    ...state,
    hp: newHp,
    rounds: [...state.rounds, round],
    currentRound: roundNum + 1,
    winner,
    status,
  };
}

/**
 * Get elemental flavor name for a move.
 */
export function getFlavorName(choice: RPSChoice, elementalType: ElementalType): string {
  switch (choice) {
    case 'strike': return ELEMENTAL_STRIKE[elementalType] || ELEMENTAL_STRIKE.neutral;
    case 'wind': return ELEMENTAL_WIND[elementalType] || ELEMENTAL_WIND.neutral;
    case 'shield': return ELEMENTAL_SHIELD[elementalType] || ELEMENTAL_SHIELD.neutral;
  }
}

/**
 * Get the basic emoji + name for a choice.
 */
export function getChoiceDisplay(choice: RPSChoice): { emoji: string; name: string } {
  return { emoji: RPS_EMOJI[choice], name: RPS_NAMES[choice] };
}

/**
 * CPU picks a random RPS choice (with slight bias based on difficulty).
 */
export function cpuPickRPS(
  difficulty: 'easy' | 'normal' | 'hard',
  round: number,
  seed: string
): RPSChoice {
  const choices: RPSChoice[] = ['strike', 'wind', 'shield'];
  const hash = simpleHash(seed + `_cpu_${round}`);

  if (difficulty === 'easy') {
    // Easy: slightly biased toward shield (defensive, easier to beat)
    const weights = [30, 30, 40]; // strike, wind, shield
    const roll = hash % 100;
    if (roll < weights[0]) return 'strike';
    if (roll < weights[0] + weights[1]) return 'wind';
    return 'shield';
  }

  if (difficulty === 'hard') {
    // Hard: slightly biased toward strike (aggressive)
    const weights = [40, 35, 25];
    const roll = hash % 100;
    if (roll < weights[0]) return 'strike';
    if (roll < weights[0] + weights[1]) return 'wind';
    return 'shield';
  }

  // Normal: uniform random
  return choices[hash % 3];
}

/**
 * Calculate XP from an RPS battle.
 */
export function calculateRPSXP(won: boolean, rounds: number): number {
  const baseXP = won ? 25 : 10;
  const roundBonus = Math.min(rounds * 2, 20); // More rounds = more XP
  return baseXP + roundBonus;
}

/**
 * Get RPS battle summary.
 */
export function getRPSSummary(battle: RPSBattleState): string {
  if (!battle.winner) return 'RPS Battle in progress...';

  const winnerIdx = battle.winner === battle.players[0] ? 0 : 1;
  const wins = battle.rounds.filter(r =>
    (winnerIdx === 0 && r.result === 'p1win') || (winnerIdx === 1 && r.result === 'p2win')
  ).length;
  const draws = battle.rounds.filter(r => r.result === 'draw').length;

  return `🏆 ${battle.petNames[winnerIdx]} wins! ${wins} rounds won, ${draws} draws in ${battle.rounds.length} rounds.`;
}
