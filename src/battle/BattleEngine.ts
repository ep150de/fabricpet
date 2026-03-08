// ============================================
// Battle Engine — Deterministic turn-based combat
// ============================================

import type { BattleState, BattleStats, BattleTurn, StatusEffect, ElementalType, Move } from '../types';
import { getMove } from '../engine/MoveDatabase';
import { TYPE_EFFECTIVENESS } from '../utils/constants';
import { generateBattleId, simpleHash } from '../utils/hash';

/**
 * Create a new battle between two players.
 */
export function createBattle(
  player1Pubkey: string,
  player2Pubkey: string,
  pet1: { name: string; stats: BattleStats; moves: string[]; elementalType: ElementalType },
  pet2: { name: string; stats: BattleStats; moves: string[]; elementalType: ElementalType }
): BattleState {
  const now = Date.now();
  return {
    id: generateBattleId(player1Pubkey, player2Pubkey, now),
    players: [player1Pubkey, player2Pubkey],
    pets: [
      { ...pet1.stats, name: pet1.name, moves: pet1.moves, elementalType: pet1.elementalType },
      { ...pet2.stats, name: pet2.name, moves: pet2.moves, elementalType: pet2.elementalType },
    ],
    currentTurn: 1,
    turns: [],
    activeEffects: ['none', 'none'],
    winner: null,
    status: 'active',
  };
}

/**
 * Calculate damage for an attack move.
 * Formula: ((2 * power * (atk/def)) / 5 + 2) * typeMultiplier * randomVariance
 */
function calculateDamage(
  move: Move,
  attackerStats: BattleStats,
  defenderStats: BattleStats,
  attackerType: ElementalType,
  defenderType: ElementalType,
  seed: string
): number {
  if (move.power === 0) return 0;

  const isSpecial = move.category === 'special';
  const atkStat = isSpecial ? attackerStats.special : attackerStats.atk;
  const defStat = isSpecial ? defenderStats.special : defenderStats.def;

  // Base damage calculation
  let damage = ((2 * move.power * (atkStat / Math.max(defStat, 1))) / 5) + 2;

  // Type effectiveness
  const moveType = move.elementalType;
  const effectiveness = TYPE_EFFECTIVENESS[moveType]?.[defenderType] ?? 1;
  damage *= effectiveness;

  // STAB (Same Type Attack Bonus) - 1.5x if move type matches attacker type
  if (moveType === attackerType && moveType !== 'neutral') {
    damage *= 1.5;
  }

  // Deterministic "random" variance (85-100%) based on seed
  const variance = 0.85 + (simpleHash(seed) % 16) / 100;
  damage *= variance;

  return Math.max(1, Math.floor(damage));
}

/**
 * Check if a move hits based on accuracy.
 * Uses deterministic randomness from seed.
 */
function doesMoveHit(accuracy: number, seed: string): boolean {
  const roll = simpleHash(seed) % 100;
  return roll < accuracy;
}

/**
 * Check if a status effect is applied.
 */
function doesStatusApply(chance: number, seed: string): boolean {
  const roll = simpleHash(seed) % 100;
  return roll < chance;
}

/**
 * Process a status effect at the start of a turn.
 * Returns whether the pet can act this turn.
 */
function processStatusEffect(effect: StatusEffect, seed: string): { canAct: boolean; message: string } {
  switch (effect) {
    case 'sleepy': {
      // 50% chance to wake up each turn
      const wakes = simpleHash(seed + 'wake') % 2 === 0;
      if (wakes) {
        return { canAct: true, message: 'woke up!' };
      }
      return { canAct: false, message: 'is still sleeping... 😴' };
    }
    case 'dizzy': {
      // 50% chance to miss
      const misses = simpleHash(seed + 'dizzy') % 2 === 0;
      if (misses) {
        return { canAct: false, message: 'is too dizzy to attack! 😵‍💫' };
      }
      return { canAct: true, message: 'shook off the dizziness!' };
    }
    case 'charmed': {
      return { canAct: false, message: 'is charmed and can\'t attack! 🤗' };
    }
    case 'dazzled': {
      return { canAct: true, message: 'is dazzled! Accuracy reduced. ✨' };
    }
    case 'pumped': {
      return { canAct: true, message: 'is pumped up! 💪' };
    }
    default:
      return { canAct: true, message: '' };
  }
}

/**
 * Execute a single turn of battle.
 * Both players submit moves, resolved by speed priority.
 */
export function executeTurn(
  battle: BattleState,
  move1Id: string,
  move2Id: string
): BattleState {
  const state = { ...battle };
  const turnNum = state.currentTurn;
  const seed = `${state.id}_turn_${turnNum}`;

  const move1 = getMove(move1Id);
  const move2 = getMove(move2Id);
  if (!move1 || !move2) return state;

  // Determine turn order by speed
  const p1GoesFirst = state.pets[0].spd >= state.pets[1].spd;
  const order = p1GoesFirst ? [0, 1] as const : [1, 0] as const;

  const moves = [move1, move2];
  const newTurns: BattleTurn[] = [];
  const newEffects: [StatusEffect, StatusEffect] = [...state.activeEffects];
  const petsCopy = [{ ...state.pets[0] }, { ...state.pets[1] }];

  for (const attackerIdx of order) {
    const defenderIdx = attackerIdx === 0 ? 1 : 0;
    const move = moves[attackerIdx];
    const attacker = petsCopy[attackerIdx];
    const defender = petsCopy[defenderIdx];

    // Check if battle is already over
    if (attacker.hp <= 0 || defender.hp <= 0) break;

    // Process status effects
    const statusResult = processStatusEffect(
      newEffects[attackerIdx],
      seed + `_status_${attackerIdx}`
    );

    // Clear one-turn effects
    if (newEffects[attackerIdx] === 'charmed' || newEffects[attackerIdx] === 'pumped') {
      newEffects[attackerIdx] = 'none';
    }

    if (!statusResult.canAct) {
      newTurns.push({
        turn: turnNum,
        attacker: state.players[attackerIdx],
        move: move.id,
        damage: 0,
        effect: null,
        healing: 0,
        message: `${attacker.name} ${statusResult.message}`,
      });
      continue;
    }

    // Check accuracy (dazzled reduces by 20%)
    let accuracy = move.accuracy;
    if (newEffects[attackerIdx] === 'dazzled') {
      accuracy -= 20;
      newEffects[attackerIdx] = 'none'; // Clear after one turn
    }

    const hits = doesMoveHit(accuracy, seed + `_hit_${attackerIdx}`);
    if (!hits) {
      newTurns.push({
        turn: turnNum,
        attacker: state.players[attackerIdx],
        move: move.id,
        damage: 0,
        effect: null,
        healing: 0,
        message: `${attacker.name} used ${move.emoji} ${move.name} but missed!`,
      });
      continue;
    }

    let damage = 0;
    let healing = 0;
    let appliedEffect: StatusEffect | null = null;

    // Calculate damage
    if (move.power > 0) {
      damage = calculateDamage(
        move,
        attacker,
        defender,
        attacker.elementalType,
        defender.elementalType,
        seed + `_dmg_${attackerIdx}`
      );
      petsCopy[defenderIdx] = { ...defender, hp: Math.max(0, defender.hp - damage) };
    }

    // Apply healing
    if (move.healAmount) {
      healing = move.healAmount;
      petsCopy[attackerIdx] = {
        ...attacker,
        hp: Math.min(attacker.maxHp, attacker.hp + healing),
      };
    }

    // Apply stat boosts
    if (move.statBoost) {
      for (const [stat, boost] of Object.entries(move.statBoost)) {
        (petsCopy[attackerIdx] as unknown as Record<string, number>)[stat] += boost as number;
      }
    }

    // Apply status effects
    if (move.statusEffect && move.statusChance) {
      if (doesStatusApply(move.statusChance, seed + `_effect_${attackerIdx}`)) {
        // Status moves apply to defender, self-buffs apply to self
        if (move.category === 'status') {
          newEffects[defenderIdx] = move.statusEffect;
        } else {
          newEffects[attackerIdx] = move.statusEffect;
        }
        appliedEffect = move.statusEffect;
      }
    }

    // Build message
    let message = `${attacker.name} used ${move.emoji} ${move.name}!`;
    if (damage > 0) message += ` Dealt ${damage} damage!`;
    if (healing > 0) message += ` Healed ${healing} HP!`;
    if (appliedEffect) {
      const effectEmojis: Record<StatusEffect, string> = {
        sleepy: '😴', dizzy: '😵‍💫', dazzled: '✨',
        charmed: '🤗', pumped: '💪', none: '',
      };
      message += ` ${effectEmojis[appliedEffect]} Applied ${appliedEffect}!`;
    }

    newTurns.push({
      turn: turnNum,
      attacker: state.players[attackerIdx],
      move: move.id,
      damage,
      effect: appliedEffect,
      healing,
      message,
    });
  }

  // Check for winner (pet is "tired" when HP reaches 0)
  let winner: string | null = null;
  let status = state.status;

  if (petsCopy[0].hp <= 0) {
    winner = state.players[1];
    status = 'finished';
  } else if (petsCopy[1].hp <= 0) {
    winner = state.players[0];
    status = 'finished';
  }

  return {
    ...state,
    pets: [petsCopy[0] as BattleState['pets'][0], petsCopy[1] as BattleState['pets'][1]],
    currentTurn: turnNum + 1,
    turns: [...state.turns, ...newTurns],
    activeEffects: newEffects,
    winner,
    status,
  };
}

/**
 * Calculate XP rewards from a battle.
 */
export function calculateBattleXP(
  won: boolean,
  opponentLevel: number
): number {
  const baseXP = won ? 30 : 15;
  const levelBonus = Math.floor(opponentLevel * 0.5);
  return baseXP + levelBonus;
}

/**
 * Get a battle summary message.
 */
export function getBattleSummary(battle: BattleState): string {
  if (!battle.winner) return 'Battle in progress...';

  const winnerIdx = battle.winner === battle.players[0] ? 0 : 1;
  const winnerPet = battle.pets[winnerIdx];
  const loserPet = battle.pets[winnerIdx === 0 ? 1 : 0];

  return `🏆 ${winnerPet.name} defeated ${loserPet.name}! Great battle!`;
}
