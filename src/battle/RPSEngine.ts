// ============================================
// RPSSL Battle Engine — Rock-Paper-Scissors-Spock-Lizard
// ============================================
// Turn-based RPSSL with elemental flavor (5 choices):
//   ✊ Strike  crushes  ✂️ Slash  &  🦎 Venom
//   📜 Guard   covers   ✊ Strike &  disproves  🖖 Arcane
//   ✂️ Slash   cuts     📜 Guard  &  decapitates 🦎 Venom
//   🦎 Venom   poisons  🖖 Arcane &  eats       📜 Guard
//   🖖 Arcane  smashes  ✂️ Slash  &  vaporizes  ✊ Strike
//
// Each round: both players pick → commit to Nostr → reveal → resolve damage.
// First pet to 0 HP loses.
// ============================================

import type { BattleStats, ElementalType } from '../types';
import { simpleHash } from '../utils/hash';

// --- Types ---

export type RPSChoice = 'strike' | 'guard' | 'slash' | 'venom' | 'arcane';

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
  strike: '✊',
  guard: '📜',
  slash: '✂️',
  venom: '🦎',
  arcane: '🖖',
};

const RPS_NAMES: Record<RPSChoice, string> = {
  strike: 'Strike',
  guard: 'Guard',
  slash: 'Slash',
  venom: 'Venom',
  arcane: 'Arcane',
};

/**
 * RPSSL win table — each choice beats exactly 2 others.
 * strike  crushes slash & venom
 * guard   covers strike & disproves arcane
 * slash   cuts guard & decapitates venom
 * venom   poisons arcane & eats guard
 * arcane  smashes slash & vaporizes strike
 */
const WINS_AGAINST: Record<RPSChoice, RPSChoice[]> = {
  strike: ['slash', 'venom'],
  guard:  ['strike', 'arcane'],
  slash:  ['guard', 'venom'],
  venom:  ['arcane', 'guard'],
  arcane: ['slash', 'strike'],
};

/** Win verb descriptions for battle messages */
const WIN_VERBS: Record<string, string> = {
  'strike>slash': 'crushes',
  'strike>venom': 'crushes',
  'guard>strike': 'covers',
  'guard>arcane': 'disproves',
  'slash>guard': 'cuts',
  'slash>venom': 'decapitates',
  'venom>arcane': 'poisons',
  'venom>guard': 'eats',
  'arcane>slash': 'smashes',
  'arcane>strike': 'vaporizes',
};

/** Legend data for UI display */
export const RPSSL_LEGEND: Array<{ choice: RPSChoice; emoji: string; name: string; beats: string }> = [
  { choice: 'strike', emoji: '✊', name: 'Strike', beats: 'crushes ✂️ Slash & 🦎 Venom' },
  { choice: 'guard',  emoji: '📜', name: 'Guard',  beats: 'covers ✊ Strike & disproves 🖖 Arcane' },
  { choice: 'slash',  emoji: '✂️', name: 'Slash',  beats: 'cuts 📜 Guard & decapitates 🦎 Venom' },
  { choice: 'venom',  emoji: '🦎', name: 'Venom',  beats: 'poisons 🖖 Arcane & eats 📜 Guard' },
  { choice: 'arcane', emoji: '🖖', name: 'Arcane', beats: 'smashes ✂️ Slash & vaporizes ✊ Strike' },
];

// Elemental flavor names (cosmetic only)
const ELEMENTAL_STRIKE: Record<string, string> = {
  fire: '🔥 Flame Strike', water: '💧 Hydro Slam', earth: '🌿 Vine Crush',
  air: '💨 Gale Fist', light: '✨ Radiant Blow', dark: '🌑 Shadow Punch',
  neutral: '⚡ Power Strike',
};

const ELEMENTAL_GUARD: Record<string, string> = {
  fire: '🔥 Flame Wall', water: '💧 Aqua Shield', earth: '🌿 Root Guard',
  air: '💨 Wind Barrier', light: '✨ Holy Ward', dark: '🌑 Shadow Veil',
  neutral: '📜 Iron Guard',
};

const ELEMENTAL_SLASH: Record<string, string> = {
  fire: '🔥 Fire Slash', water: '💧 Hydro Blade', earth: '🌿 Leaf Cutter',
  air: '💨 Wind Slash', light: '✨ Light Saber', dark: '🌑 Dark Cleave',
  neutral: '✂️ Swift Slash',
};

const ELEMENTAL_VENOM: Record<string, string> = {
  fire: '🔥 Magma Spit', water: '💧 Toxic Spray', earth: '🌿 Spore Cloud',
  air: '💨 Poison Mist', light: '✨ Blinding Venom', dark: '🌑 Necrotic Bite',
  neutral: '🦎 Venom Strike',
};

const ELEMENTAL_ARCANE: Record<string, string> = {
  fire: '🔥 Inferno Pulse', water: '💧 Tidal Logic', earth: '🌿 Gaia Mind',
  air: '💨 Aether Blast', light: '✨ Cosmic Ray', dark: '🌑 Void Warp',
  neutral: '🖖 Arcane Blast',
};

// --- Core Logic ---

/**
 * Determine RPSSL outcome using the WINS_AGAINST table.
 * Each choice beats exactly 2 others and loses to 2 others.
 */
export function resolveRPS(p1: RPSChoice, p2: RPSChoice): 'p1win' | 'p2win' | 'draw' {
  if (p1 === p2) return 'draw';
  if (WINS_AGAINST[p1].includes(p2)) return 'p1win';
  return 'p2win';
}

/**
 * Get the win verb for a matchup (e.g., "crushes", "vaporizes").
 */
export function getWinVerb(winner: RPSChoice, loser: RPSChoice): string {
  return WIN_VERBS[`${winner}>${loser}`] || 'beats';
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
    case 'guard': return ELEMENTAL_GUARD[elementalType] || ELEMENTAL_GUARD.neutral;
    case 'slash': return ELEMENTAL_SLASH[elementalType] || ELEMENTAL_SLASH.neutral;
    case 'venom': return ELEMENTAL_VENOM[elementalType] || ELEMENTAL_VENOM.neutral;
    case 'arcane': return ELEMENTAL_ARCANE[elementalType] || ELEMENTAL_ARCANE.neutral;
  }
}

/**
 * Get the basic emoji + name for a choice.
 */
export function getChoiceDisplay(choice: RPSChoice): { emoji: string; name: string } {
  return { emoji: RPS_EMOJI[choice], name: RPS_NAMES[choice] };
}

/**
 * CPU picks a random RPSSL choice (with slight bias based on difficulty).
 */
export function cpuPickRPS(
  difficulty: 'easy' | 'normal' | 'hard',
  round: number,
  seed: string
): RPSChoice {
  const choices: RPSChoice[] = ['strike', 'guard', 'slash', 'venom', 'arcane'];
  const hash = simpleHash(seed + `_cpu_${round}`);

  if (difficulty === 'easy') {
    // Easy: biased toward guard (defensive, easier to beat with slash/venom)
    const weights = [15, 30, 15, 20, 20]; // strike, guard, slash, venom, arcane
    const roll = hash % 100;
    let cumulative = 0;
    for (let i = 0; i < choices.length; i++) {
      cumulative += weights[i];
      if (roll < cumulative) return choices[i];
    }
    return 'guard';
  }

  if (difficulty === 'hard') {
    // Hard: biased toward strike and arcane (aggressive)
    const weights = [25, 15, 20, 15, 25];
    const roll = hash % 100;
    let cumulative = 0;
    for (let i = 0; i < choices.length; i++) {
      cumulative += weights[i];
      if (roll < cumulative) return choices[i];
    }
    return 'strike';
  }

  // Normal: uniform random across 5 choices
  return choices[hash % 5];
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
