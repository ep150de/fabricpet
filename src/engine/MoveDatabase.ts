// ============================================
// Move Database — All available pet battle moves
// ============================================

import type { Move } from '../types';

export const MOVES: Record<string, Move> = {
  // --- Basic Moves ---
  tackle: {
    id: 'tackle',
    name: 'Tackle',
    emoji: '💫',
    category: 'attack',
    power: 8,
    accuracy: 95,
    description: 'A basic charge attack.',
    elementalType: 'neutral',
  },
  rest: {
    id: 'rest',
    name: 'Rest',
    emoji: '💤',
    category: 'support',
    power: 0,
    accuracy: 100,
    description: 'Take a quick nap to restore HP.',
    elementalType: 'neutral',
    healAmount: 15,
  },
  shield: {
    id: 'shield',
    name: 'Shield',
    emoji: '🛡️',
    category: 'defense',
    power: 0,
    accuracy: 100,
    description: 'Raise a protective shield. DEF +3 for this turn.',
    elementalType: 'neutral',
    statBoost: { def: 3 },
  },
  spark: {
    id: 'spark',
    name: 'Spark',
    emoji: '⚡',
    category: 'special',
    power: 10,
    accuracy: 90,
    description: 'A small burst of energy.',
    elementalType: 'neutral',
  },

  // --- Intermediate Moves ---
  pounce: {
    id: 'pounce',
    name: 'Pounce',
    emoji: '🐾',
    category: 'attack',
    power: 14,
    accuracy: 85,
    description: 'Leap at the opponent with full force!',
    elementalType: 'neutral',
  },
  heal: {
    id: 'heal',
    name: 'Heal',
    emoji: '💚',
    category: 'support',
    power: 0,
    accuracy: 100,
    description: 'Channel healing energy to restore HP.',
    elementalType: 'light',
    healAmount: 25,
  },
  power_strike: {
    id: 'power_strike',
    name: 'Power Strike',
    emoji: '💥',
    category: 'attack',
    power: 20,
    accuracy: 80,
    description: 'A devastating powerful blow!',
    elementalType: 'neutral',
  },
  elemental_burst: {
    id: 'elemental_burst',
    name: 'Elemental Burst',
    emoji: '🌟',
    category: 'special',
    power: 18,
    accuracy: 85,
    description: 'Unleash a burst of elemental energy.',
    elementalType: 'neutral',
  },

  // --- Status Moves ---
  dazzle: {
    id: 'dazzle',
    name: 'Dazzle',
    emoji: '✨',
    category: 'status',
    power: 0,
    accuracy: 80,
    description: 'A dazzling display that reduces accuracy.',
    elementalType: 'light',
    statusEffect: 'dazzled',
    statusChance: 70,
  },
  lullaby: {
    id: 'lullaby',
    name: 'Lullaby',
    emoji: '🎵',
    category: 'status',
    power: 0,
    accuracy: 75,
    description: 'Sing a soothing song that makes the opponent sleepy.',
    elementalType: 'neutral',
    statusEffect: 'sleepy',
    statusChance: 60,
  },
  tickle: {
    id: 'tickle',
    name: 'Tickle',
    emoji: '🤗',
    category: 'status',
    power: 0,
    accuracy: 90,
    description: 'Tickle the opponent so they can\'t stop laughing!',
    elementalType: 'neutral',
    statusEffect: 'charmed',
    statusChance: 50,
  },
  pump_up: {
    id: 'pump_up',
    name: 'Pump Up',
    emoji: '💪',
    category: 'defense',
    power: 0,
    accuracy: 100,
    description: 'Get pumped! ATK +4 for this turn.',
    elementalType: 'neutral',
    statBoost: { atk: 4 },
    statusEffect: 'pumped',
    statusChance: 100,
  },

  // --- Elemental Moves ---
  flame_burst: {
    id: 'flame_burst',
    name: 'Flame Burst',
    emoji: '🔥',
    category: 'special',
    power: 22,
    accuracy: 85,
    description: 'Unleash a burst of flames!',
    elementalType: 'fire',
  },
  tidal_wave: {
    id: 'tidal_wave',
    name: 'Tidal Wave',
    emoji: '🌊',
    category: 'special',
    power: 22,
    accuracy: 85,
    description: 'Summon a massive wave!',
    elementalType: 'water',
  },
  earthquake: {
    id: 'earthquake',
    name: 'Earthquake',
    emoji: '🌍',
    category: 'special',
    power: 22,
    accuracy: 85,
    description: 'Shake the ground beneath your opponent!',
    elementalType: 'earth',
  },
  gust: {
    id: 'gust',
    name: 'Gust',
    emoji: '🌪️',
    category: 'special',
    power: 22,
    accuracy: 85,
    description: 'Summon a powerful gust of wind!',
    elementalType: 'air',
  },
  radiance: {
    id: 'radiance',
    name: 'Radiance',
    emoji: '☀️',
    category: 'special',
    power: 22,
    accuracy: 85,
    description: 'Blast with brilliant light!',
    elementalType: 'light',
  },
  shadow_strike: {
    id: 'shadow_strike',
    name: 'Shadow Strike',
    emoji: '🌑',
    category: 'special',
    power: 22,
    accuracy: 85,
    description: 'Strike from the shadows!',
    elementalType: 'dark',
  },
};

/**
 * Get a move by its ID.
 */
export function getMove(moveId: string): Move | undefined {
  return MOVES[moveId];
}

/**
 * Get all moves as an array.
 */
export function getAllMoves(): Move[] {
  return Object.values(MOVES);
}

/**
 * Get moves available for a specific elemental type.
 */
export function getMovesForType(elementalType: string): Move[] {
  return Object.values(MOVES).filter(
    m => m.elementalType === elementalType || m.elementalType === 'neutral'
  );
}
