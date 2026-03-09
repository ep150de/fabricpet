// ============================================
// Pet Factory — Create new pets for the roster
// ============================================

import type { Pet, ElementalType } from '../types';
import { BASE_STATS_BY_STAGE } from '../utils/constants';

/**
 * Create a brand new pet with the given name and elemental type.
 * Starts as an egg at level 1.
 */
export function createNewPet(name: string, elementalType: ElementalType = 'neutral'): Pet {
  const baseStats = BASE_STATS_BY_STAGE['egg'];

  return {
    id: `pet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    level: 1,
    xp: 0,
    stage: 'egg',
    needs: {
      hunger: 80,
      happiness: 80,
      energy: 100,
      hygiene: 100,
    },
    mood: 'happy',
    elementalType,
    equippedOrdinal: null,
    ordinalTraits: [],
    battleStats: {
      hp: baseStats.hp,
      maxHp: baseStats.hp,
      atk: baseStats.atk,
      def: baseStats.def,
      spd: baseStats.spd,
      special: baseStats.special,
    },
    moves: getStarterMoves(elementalType),
    battleRecord: { wins: 0, losses: 0, draws: 0 },
    avatarId: null,
    createdAt: Date.now(),
    lastInteraction: Date.now(),
  };
}

/**
 * Get starter moves based on elemental type.
 */
function getStarterMoves(elementalType: ElementalType): string[] {
  const baseMoves = ['tackle', 'rest'];

  const elementMoves: Record<ElementalType, string> = {
    fire: 'ember',
    water: 'splash',
    earth: 'vine_whip',
    air: 'gust',
    light: 'flash',
    dark: 'shadow_sneak',
    neutral: 'headbutt',
  };

  return [...baseMoves, elementMoves[elementalType]];
}
