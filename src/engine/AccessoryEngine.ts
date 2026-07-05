// ============================================
// Accessory Engine — Pet cosmetics and stat bonuses
// ============================================

import type { Accessory, AccessorySlot, Pet, BattleStats } from '../types';

export const ACCESSORIES: Accessory[] = [
  // Head accessories
  {
    id: 'crown',
    name: 'Royal Crown',
    emoji: '👑',
    slot: 'head',
    rarity: 'legendary',
    color: '#FFD700',
    unlockLevel: 50,
    description: 'A majestic crown fit for royalty',
    statBonus: { atk: 5, def: 3, special: 5 },
  },
  {
    id: 'wizard_hat',
    name: 'Wizard Hat',
    emoji: '🎩',
    slot: 'head',
    rarity: 'rare',
    color: '#4B0082',
    unlockLevel: 25,
    description: 'A mystical hat that enhances magical abilities',
    statBonus: { special: 8 },
  },
  {
    id: 'flower_crown',
    name: 'Flower Crown',
    emoji: '🌸',
    slot: 'head',
    rarity: 'uncommon',
    color: '#FF69B4',
    unlockLevel: 10,
    description: 'A beautiful crown of flowers',
    statBonus: { hp: 10, maxHp: 10 },
  },
  {
    id: 'pirate_hat',
    name: 'Pirate Hat',
    emoji: '🏴‍☠️',
    slot: 'head',
    rarity: 'common',
    color: '#2F4F4F',
    unlockLevel: 5,
    description: 'Arr! A classic pirate hat',
    statBonus: { atk: 2 },
  },
  
  // Body accessories
  {
    id: 'cape',
    name: 'Hero Cape',
    emoji: '🦸',
    slot: 'body',
    rarity: 'epic',
    color: '#DC143C',
    unlockLevel: 30,
    description: 'A flowing cape that inspires courage',
    statBonus: { def: 5, spd: 3 },
  },
  {
    id: 'armor',
    name: 'Battle Armor',
    emoji: '🛡️',
    slot: 'body',
    rarity: 'rare',
    color: '#C0C0C0',
    unlockLevel: 20,
    description: 'Sturdy armor for protection',
    statBonus: { def: 10, hp: 20, maxHp: 20 },
  },
  {
    id: 'scarf',
    name: 'Cozy Scarf',
    emoji: '🧣',
    slot: 'body',
    rarity: 'common',
    color: '#FF6347',
    unlockLevel: 3,
    description: 'A warm and comfortable scarf',
    statBonus: { hp: 5, maxHp: 5 },
  },
  
  // Back accessories
  {
    id: 'wings',
    name: 'Angel Wings',
    emoji: '🪽',
    slot: 'back',
    rarity: 'legendary',
    color: '#FFFFFF',
    unlockLevel: 40,
    description: 'Ethereal wings that grant flight',
    statBonus: { spd: 10, def: 5 },
  },
  {
    id: 'backpack',
    name: 'Adventure Pack',
    emoji: '🎒',
    slot: 'back',
    rarity: 'uncommon',
    color: '#8B4513',
    unlockLevel: 8,
    description: 'A trusty backpack for adventures',
    statBonus: { hp: 15, maxHp: 15 },
  },
  
  // Held accessories
  {
    id: 'sword',
    name: 'Legendary Sword',
    emoji: '⚔️',
    slot: 'held',
    rarity: 'epic',
    color: '#FFD700',
    unlockLevel: 35,
    description: 'A powerful sword forged in ancient times',
    statBonus: { atk: 12 },
  },
  {
    id: 'staff',
    name: 'Magic Staff',
    emoji: '🪄',
    slot: 'held',
    rarity: 'rare',
    color: '#9370DB',
    unlockLevel: 15,
    description: 'A staff imbued with magical energy',
    statBonus: { special: 10, spd: 2 },
  },
  {
    id: 'shield',
    name: 'Iron Shield',
    emoji: '🛡️',
    slot: 'held',
    rarity: 'uncommon',
    color: '#708090',
    unlockLevel: 12,
    description: 'A sturdy shield for defense',
    statBonus: { def: 8 },
  },
  {
    id: 'torch',
    name: 'Torch',
    emoji: '🔥',
    slot: 'held',
    rarity: 'common',
    color: '#FF4500',
    unlockLevel: 1,
    description: 'A simple torch that lights the way',
    statBonus: { atk: 1 },
  },
];

/**
 * Get all accessories available for a pet at a given level
 */
export function getAvailableAccessories(petLevel: number): Accessory[] {
  return ACCESSORIES.filter(acc => acc.unlockLevel <= petLevel);
}

/**
 * Get accessories by slot
 */
export function getAccessoriesBySlot(slot: AccessorySlot): Accessory[] {
  return ACCESSORIES.filter(acc => acc.slot === slot);
}

/**
 * Get accessory by ID
 */
export function getAccessoryById(id: string): Accessory | undefined {
  return ACCESSORIES.find(acc => acc.id === id);
}

/**
 * Calculate total stat bonuses from equipped accessories
 */
export function calculateAccessoryBonuses(pet: Pet): Partial<BattleStats> {
  const bonuses: Partial<BattleStats> = {};
  
  if (!pet.accessories || pet.accessories.length === 0) {
    return bonuses;
  }
  
  for (const equipped of pet.accessories) {
    const accessory = getAccessoryById(equipped.accessoryId);
    if (accessory?.statBonus) {
      for (const [stat, value] of Object.entries(accessory.statBonus)) {
        const key = stat as keyof BattleStats;
        bonuses[key] = (bonuses[key] || 0) + (value || 0);
      }
    }
  }
  
  return bonuses;
}

/**
 * Apply accessory bonuses to base stats
 */
export function applyAccessoryBonuses(baseStats: BattleStats, pet: Pet): BattleStats {
  const bonuses = calculateAccessoryBonuses(pet);
  
  return {
    hp: baseStats.hp + (bonuses.hp || 0),
    maxHp: baseStats.maxHp + (bonuses.maxHp || 0),
    atk: baseStats.atk + (bonuses.atk || 0),
    def: baseStats.def + (bonuses.def || 0),
    spd: baseStats.spd + (bonuses.spd || 0),
    special: baseStats.special + (bonuses.special || 0),
  };
}

/**
 * Equip an accessory on a pet
 */
export function equipAccessory(pet: Pet, accessoryId: string): Pet {
  const accessory = getAccessoryById(accessoryId);
  if (!accessory) {
    console.warn(`[AccessoryEngine] Accessory not found: ${accessoryId}`);
    return pet;
  }
  
  // Check if pet has reached the unlock level
  if (pet.level < accessory.unlockLevel) {
    console.warn(`[AccessoryEngine] Pet level too low for ${accessory.name}`);
    return pet;
  }
  
  // Remove any existing accessory in the same slot
  const filteredAccessories = pet.accessories.filter(
    acc => acc.slot !== accessory.slot
  );
  
  // Add the new accessory
  const newAccessories = [
    ...filteredAccessories,
    { accessoryId, slot: accessory.slot },
  ];
  
  return {
    ...pet,
    accessories: newAccessories,
  };
}

/**
 * Unequip an accessory from a pet
 */
export function unequipAccessory(pet: Pet, slot: AccessorySlot): Pet {
  const filteredAccessories = pet.accessories.filter(acc => acc.slot !== slot);
  
  return {
    ...pet,
    accessories: filteredAccessories,
  };
}

/**
 * Get the rarity color for display
 */
export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: '#9CA3AF',
    uncommon: '#10B981',
    rare: '#3B82F6',
    epic: '#A855F7',
    legendary: '#F59E0B',
  };
  return colors[rarity] || colors.common;
}
