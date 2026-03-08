// ============================================
// Pet State Machine — Core pet simulation
// ============================================

import type { Pet, PetStage, PetMood, PetNeeds, BattleStats, ElementalType } from '../types';
import { EVOLUTION_LEVELS, XP_PER_LEVEL, BASE_STATS_BY_STAGE } from '../utils/constants';
import { simpleHash } from '../utils/hash';

/**
 * Create a new pet with default values.
 */
export function createNewPet(name: string, id?: string): Pet {
  const now = Date.now();
  const petId = id || `pet_${simpleHash(name + now.toString()).toString(16)}`;

  return {
    id: petId,
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
    mood: 'content',
    elementalType: 'neutral',
    equippedOrdinal: null,
    ordinalTraits: [],
    battleStats: {
      ...BASE_STATS_BY_STAGE.egg,
      maxHp: BASE_STATS_BY_STAGE.egg.hp,
    },
    moves: ['tackle', 'rest'],
    battleRecord: { wins: 0, losses: 0, draws: 0 },
    avatarId: null,
    createdAt: now,
    lastInteraction: now,
  };
}

/**
 * Calculate the pet's current mood based on needs.
 */
export function calculateMood(needs: PetNeeds): PetMood {
  const avg = (needs.hunger + needs.happiness + needs.energy + needs.hygiene) / 4;

  if (needs.hunger < 15) return 'hungry';
  if (needs.energy < 15) return 'tired';
  if (needs.hygiene < 15) return 'sick';
  if (avg < 30) return 'sad';
  if (needs.happiness > 80 && needs.energy > 60) return 'excited';
  if (needs.happiness > 60) return 'playful';
  if (avg > 70) return 'happy';
  return 'content';
}

/**
 * Get the mood emoji for display.
 */
export function getMoodEmoji(mood: PetMood): string {
  const emojis: Record<PetMood, string> = {
    happy: '😊',
    playful: '🤪',
    content: '😌',
    hungry: '🍽️',
    tired: '😴',
    sad: '😢',
    sick: '🤒',
    excited: '🤩',
  };
  return emojis[mood];
}

/**
 * Determine the pet's evolution stage based on level.
 */
export function getStageForLevel(level: number): PetStage {
  if (level >= EVOLUTION_LEVELS.elder) return 'elder';
  if (level >= EVOLUTION_LEVELS.adult) return 'adult';
  if (level >= EVOLUTION_LEVELS.teen) return 'teen';
  if (level >= EVOLUTION_LEVELS.baby) return 'baby';
  return 'egg';
}

/**
 * Get the stage emoji for display.
 */
export function getStageEmoji(stage: PetStage): string {
  const emojis: Record<PetStage, string> = {
    egg: '🥚',
    baby: '🐣',
    teen: '🐥',
    adult: '🐾',
    elder: '👑',
  };
  return emojis[stage];
}

/**
 * Calculate XP needed for next level.
 */
export function xpForNextLevel(currentLevel: number): number {
  return currentLevel * XP_PER_LEVEL;
}

/**
 * Add XP to pet and handle level-ups and evolution.
 * Returns the updated pet and whether evolution occurred.
 */
export function addXP(pet: Pet, amount: number): { pet: Pet; leveledUp: boolean; evolved: boolean } {
  let xp = pet.xp + amount;
  let level = pet.level;
  let leveledUp = false;
  let evolved = false;

  // Check for level ups
  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level);
    level++;
    leveledUp = true;
  }

  // Check for evolution
  const newStage = getStageForLevel(level);
  if (newStage !== pet.stage) {
    evolved = true;
  }

  // Recalculate battle stats based on new level/stage
  const baseStats = BASE_STATS_BY_STAGE[newStage];
  const levelBonus = Math.floor(level * 0.5);

  const updatedPet: Pet = {
    ...pet,
    xp,
    level,
    stage: newStage,
    battleStats: {
      hp: baseStats.hp + levelBonus,
      maxHp: baseStats.hp + levelBonus,
      atk: baseStats.atk + levelBonus,
      def: baseStats.def + levelBonus,
      spd: baseStats.spd + levelBonus,
      special: baseStats.special + levelBonus,
    },
  };

  // Learn new moves on evolution
  if (evolved) {
    updatedPet.moves = getMovesForStage(newStage, pet.elementalType);
  }

  return { pet: updatedPet, leveledUp, evolved };
}

/**
 * Get available moves for a given evolution stage and elemental type.
 */
export function getMovesForStage(stage: PetStage, elementalType: ElementalType): string[] {
  const baseMoves: Record<PetStage, string[]> = {
    egg: ['tackle', 'rest'],
    baby: ['tackle', 'rest', 'shield', 'spark'],
    teen: ['pounce', 'heal', 'shield', 'spark'],
    adult: ['pounce', 'heal', 'power_strike', 'elemental_burst'],
    elder: ['pounce', 'heal', 'power_strike', 'elemental_burst'],
  };

  const moves = [...baseMoves[stage]];

  // Replace elemental moves based on type
  const elementalMoves: Record<ElementalType, string> = {
    fire: 'flame_burst',
    water: 'tidal_wave',
    earth: 'earthquake',
    air: 'gust',
    light: 'radiance',
    dark: 'shadow_strike',
    neutral: 'elemental_burst',
  };

  if (stage !== 'egg' && stage !== 'baby') {
    const idx = moves.indexOf('elemental_burst');
    if (idx !== -1 && elementalType !== 'neutral') {
      moves[idx] = elementalMoves[elementalType];
    }
  }

  return moves.slice(0, 4); // Max 4 moves
}

/**
 * Calculate the elemental type from ordinal traits.
 */
export function calculateElementalType(traits: { trait_type: string; value: string }[]): ElementalType {
  const typeKeywords: Record<ElementalType, string[]> = {
    fire: ['fire', 'flame', 'red', 'hot', 'lava', 'burn', 'inferno'],
    water: ['water', 'ocean', 'blue', 'sea', 'rain', 'aqua', 'ice'],
    earth: ['earth', 'ground', 'green', 'forest', 'nature', 'rock', 'mountain'],
    air: ['air', 'wind', 'sky', 'cloud', 'white', 'flying', 'storm'],
    light: ['light', 'gold', 'sun', 'holy', 'divine', 'bright', 'yellow'],
    dark: ['dark', 'shadow', 'black', 'night', 'void', 'purple', 'mystery'],
    neutral: [],
  };

  const scores: Record<ElementalType, number> = {
    fire: 0, water: 0, earth: 0, air: 0, light: 0, dark: 0, neutral: 0,
  };

  for (const trait of traits) {
    const combined = `${trait.trait_type} ${trait.value}`.toLowerCase();
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      for (const keyword of keywords) {
        if (combined.includes(keyword)) {
          scores[type as ElementalType] += 1;
        }
      }
    }
  }

  // Find highest scoring type
  let maxType: ElementalType = 'neutral';
  let maxScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxType = type as ElementalType;
    }
  }

  return maxType;
}

/**
 * Recalculate battle stats with ordinal trait bonuses applied.
 */
export function applyTraitBonuses(
  baseStats: BattleStats,
  traits: { trait_type: string; value: string }[]
): BattleStats {
  const stats = { ...baseStats };

  // Known trait mappings
  const rarityMultipliers: Record<string, number> = {
    'common': 1.0,
    'uncommon': 1.15,
    'rare': 1.3,
    'epic': 1.5,
    'legendary': 1.8,
  };

  const backgroundBonuses: Record<string, Partial<BattleStats>> = {
    'fire': { atk: 5, special: 3 },
    'water': { def: 5, hp: 3, maxHp: 3 },
    'forest': { spd: 5, hp: 3, maxHp: 3 },
    'sky': { spd: 5, special: 3 },
    'dark': { atk: 3, special: 5 },
    'light': { def: 3, special: 5 },
  };

  let multiplier = 1.0;

  for (const trait of traits) {
    const traitType = trait.trait_type.toLowerCase();
    const value = trait.value.toLowerCase();

    // Rarity multiplier
    if (traitType === 'rarity' && rarityMultipliers[value]) {
      multiplier = rarityMultipliers[value];
      continue;
    }

    // Background bonuses
    if (traitType === 'background' && backgroundBonuses[value]) {
      const bonus = backgroundBonuses[value];
      for (const [key, val] of Object.entries(bonus)) {
        stats[key as keyof BattleStats] += val as number;
      }
      continue;
    }

    // Fallback: hash unknown traits to stat bonuses
    const hash = simpleHash(trait.trait_type + trait.value);
    const statKeys: (keyof BattleStats)[] = ['hp', 'atk', 'def', 'spd', 'special'];
    const statKey = statKeys[hash % statKeys.length];
    const bonus = (hash % 5) + 1;
    stats[statKey] += bonus;
    if (statKey === 'hp') {
      stats.maxHp += bonus;
    }
  }

  // Apply rarity multiplier
  if (multiplier !== 1.0) {
    stats.hp = Math.floor(stats.hp * multiplier);
    stats.maxHp = Math.floor(stats.maxHp * multiplier);
    stats.atk = Math.floor(stats.atk * multiplier);
    stats.def = Math.floor(stats.def * multiplier);
    stats.spd = Math.floor(stats.spd * multiplier);
    stats.special = Math.floor(stats.special * multiplier);
  }

  return stats;
}
