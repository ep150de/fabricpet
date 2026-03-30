// ============================================
// Breeding Engine — Generate offspring from parent pets
// ============================================

import type { Pet, ElementalType, RarityTier, BattleStats } from '../types';
import { ELEMENTAL_COMBINATIONS, MOVES_BY_ELEMENT, RARITY_STATS, BREEDING_CONFIG } from '../utils/constants';

export interface BreedingParents {
  matriarch: Pet;
  patrilineal: Pet;
}

export interface OffspringResult {
  pet: Pet;
  matriarchId: string;
  patrilinealId: string;
  generation: number;
  rarity: RarityTier;
}

function generatePetId(): string {
  return `pet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getRarityFromParents(matriarch: Pet, patrilineal: Pet): RarityTier {
  const matriarchRarity = (matriarch as any).rarity as RarityTier || 'common';
  const patrilinealRarity = (patrilineal as any).rarity as RarityTier || 'common';

  const rarityOrder: RarityTier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const matriarchIndex = rarityOrder.indexOf(matriarchRarity);
  const patrilinealIndex = rarityOrder.indexOf(patrilinealRarity);

  const higherIndex = Math.max(matriarchIndex, patrilinealIndex);
  const mutationChance = RARITY_STATS[rarityOrder[higherIndex]]?.mutationChance || 0.05;

  if (Math.random() < mutationChance && higherIndex < rarityOrder.length - 1) {
    return rarityOrder[higherIndex + 1];
  }

  return rarityOrder[higherIndex];
}

function combineElementalTypes(matrilineal: ElementalType, patrilineal: ElementalType): ElementalType {
  const key1 = `${matrilineal}+${patrilineal}`;
  const key2 = `${patrilineal}+${matrilineal}`;

  if (ELEMENTAL_COMBINATIONS[key1]) return ELEMENTAL_COMBINATIONS[key1] as ElementalType;
  if (ELEMENTAL_COMBINATIONS[key2]) return ELEMENTAL_COMBINATIONS[key2] as ElementalType;

  return Math.random() > 0.5 ? matrilineal : patrilineal;
}

function calculateInheritedStat(
  matriarchStat: number,
  patrilinealStat: number,
  rarity: RarityTier
): number {
  const weight = BREEDING_CONFIG.statInheritanceWeight;
  const variance = BREEDING_CONFIG.varianceWeight;

  const parentAvg = (matriarchStat + patrilinealStat) / 2;
  const inheritedValue = parentAvg * weight;

  const maxVariance = parentAvg * RARITY_STATS[rarity].varianceMultiplier;
  const randomVariance = (Math.random() * 2 - 1) * maxVariance;

  const finalValue = inheritedValue + randomVariance * variance;
  return Math.max(1, Math.round(finalValue));
}

function selectMovesFromParents(matriarch: Pet, patrilineal: Pet, offspringElement: ElementalType): string[] {
  const allParentMoves = [...new Set([...matriarch.moves, ...patrilineal.moves])];

  const compatibleMoves = allParentMoves.filter(move => {
    const elementMoves = MOVES_BY_ELEMENT[offspringElement] || [];
    return elementMoves.includes(move) || move === 'tackle' || move === 'rest';
  });

  const numInheritedMoves = Math.min(
    Math.floor(Math.random() * 2) + 2,
    compatibleMoves.length
  );

  const selectedMoves = compatibleMoves.slice(0, numInheritedMoves);

  const elementMoves = MOVES_BY_ELEMENT[offspringElement] || [];
  if (elementMoves.length > 0 && !selectedMoves.some(m => elementMoves.includes(m))) {
    selectedMoves.push(elementMoves[Math.floor(Math.random() * elementMoves.length)]);
  }

  if (!selectedMoves.includes('tackle')) {
    selectedMoves.push('tackle');
  }

  return selectedMoves.slice(0, 4);
}

function calculateGeneration(matrilineal: Pet, patrilineal: Pet): number {
  const matriarchGen = (matrilineal as any).lineage?.generation || 1;
  const patrilinealGen = (patrilineal as any).lineage?.generation || 1;
  return Math.max(matriarchGen, patrilinealGen) + 1;
}

export function createOffspring(parents: BreedingParents, name: string): OffspringResult {
  const { matriarch, patrilineal } = parents;

  if (matriarch.level < BREEDING_CONFIG.minParentLevel || patrilineal.level < BREEDING_CONFIG.minParentLevel) {
    throw new Error(`Both parents must be at least level ${BREEDING_CONFIG.minParentLevel} to breed`);
  }

  const offspringElement = combineElementalTypes(matriarch.elementalType, patrilineal.elementalType);
  const rarity = getRarityFromParents(matriarch, patrilineal);
  const generation = calculateGeneration(matriarch, patrilineal);

  const baseStats = { hp: 10, atk: 1, def: 1, spd: 1, special: 1 };

  const battleStats: BattleStats = {
    hp: calculateInheritedStat(matriarch.battleStats.hp, patrilineal.battleStats.hp, rarity),
    maxHp: calculateInheritedStat(matriarch.battleStats.maxHp, patrilineal.battleStats.maxHp, rarity),
    atk: calculateInheritedStat(matriarch.battleStats.atk, patrilineal.battleStats.atk, rarity),
    def: calculateInheritedStat(matriarch.battleStats.def, patrilineal.battleStats.def, rarity),
    spd: calculateInheritedStat(matriarch.battleStats.spd, patrilineal.battleStats.spd, rarity),
    special: calculateInheritedStat(matriarch.battleStats.special, patrilineal.battleStats.special, rarity),
  };

  const offspringPet: Pet = {
    id: generatePetId(),
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
    elementalType: offspringElement,
    equippedOrdinal: null,
    ordinalTraits: [],
    battleStats,
    moves: selectMovesFromParents(matriarch, patrilineal, offspringElement),
    battleRecord: { wins: 0, losses: 0, draws: 0 },
    avatarId: null,
    createdAt: Date.now(),
    lastInteraction: Date.now(),
  };

  (offspringPet as any).lineage = {
    parentIds: [patrilineal.id, matriarch.id],
    generation,
    rarity,
    bloodline: [
      ...((patrilineal as any).lineage?.bloodline || []),
      patrilineal.id,
      matriarch.id,
      ...((matriarch as any).lineage?.bloodline || []),
    ],
  };

  return {
    pet: offspringPet,
    matriarchId: matriarch.id,
    patrilinealId: patrilineal.id,
    generation,
    rarity,
  };
}

export function validateBreedingEligibility(pet: Pet): { eligible: boolean; reason?: string } {
  if (pet.level < BREEDING_CONFIG.minParentLevel) {
    return {
      eligible: false,
      reason: `Pet must be at least level ${BREEDING_CONFIG.minParentLevel} to breed`,
    };
  }

  if (pet.stage === 'egg') {
    return { eligible: false, reason: 'Eggs cannot breed' };
  }

  if (pet.stage === 'baby') {
    return { eligible: false, reason: 'Baby pets cannot breed yet' };
  }

  return { eligible: true };
}