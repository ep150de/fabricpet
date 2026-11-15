// ============================================
// AccessoryEngine Tests
// ============================================

import { describe, it, expect } from 'vitest';
import {
  ACCESSORIES,
  getAvailableAccessories,
  getAccessoriesBySlot,
  getAccessoryById,
  calculateAccessoryBonuses,
  applyAccessoryBonuses,
  equipAccessory,
  unequipAccessory,
  getRarityColor,
} from '../engine/AccessoryEngine';
import type { Pet } from '../types';

describe('AccessoryEngine', () => {
  const mockPet: Pet = {
    id: 'test-pet-1',
    name: 'Test Pet',
    level: 10,
    xp: 100,
    stage: 'teen',
    needs: { hunger: 80, happiness: 80, energy: 100, hygiene: 100 },
    mood: 'happy',
    elementalType: 'fire',
    equippedOrdinal: null,
    ordinalTraits: [],
    battleStats: { hp: 50, maxHp: 50, atk: 10, def: 5, spd: 8, special: 7 },
    moves: ['tackle', 'ember'],
    battleRecord: { wins: 0, losses: 0, draws: 0 },
    avatarId: null,
    accessories: [],
    createdAt: Date.now(),
    lastInteraction: Date.now(),
  };

  describe('ACCESSORIES', () => {
    it('should have at least 10 accessories', () => {
      expect(ACCESSORIES.length).toBeGreaterThanOrEqual(10);
    });

    it('should have unique IDs', () => {
      const ids = ACCESSORIES.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have required fields', () => {
      ACCESSORIES.forEach(acc => {
        expect(acc.id).toBeTruthy();
        expect(acc.name).toBeTruthy();
        expect(acc.slot).toBeTruthy();
        expect(acc.rarity).toBeTruthy();
        expect(acc.unlockLevel).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('getAvailableAccessories', () => {
    it('should return accessories unlocked at level', () => {
      const available = getAvailableAccessories(10);
      expect(available.length).toBeGreaterThan(0);
      available.forEach(acc => {
        expect(acc.unlockLevel).toBeLessThanOrEqual(10);
      });
    });

    it('should return fewer accessories for lower levels', () => {
      const low = getAvailableAccessories(1);
      const high = getAvailableAccessories(50);
      expect(high.length).toBeGreaterThan(low.length);
    });
  });

  describe('getAccessoriesBySlot', () => {
    it('should filter by slot', () => {
      const head = getAccessoriesBySlot('head');
      head.forEach(acc => {
        expect(acc.slot).toBe('head');
      });
    });
  });

  describe('getAccessoryById', () => {
    it('should find accessory by ID', () => {
      const acc = getAccessoryById('crown');
      expect(acc).toBeDefined();
      expect(acc?.name).toBe('Royal Crown');
    });

    it('should return undefined for unknown ID', () => {
      const acc = getAccessoryById('nonexistent');
      expect(acc).toBeUndefined();
    });
  });

  describe('equipAccessory', () => {
    it('should equip an accessory', () => {
      const updated = equipAccessory(mockPet, 'torch');
      expect(updated.accessories.length).toBe(1);
      expect(updated.accessories[0].accessoryId).toBe('torch');
    });

    it('should not equip locked accessory', () => {
      const updated = equipAccessory(mockPet, 'crown'); // Level 50 required
      expect(updated.accessories.length).toBe(0);
    });

    it('should replace accessory in same slot', () => {
      const petWithTorch = equipAccessory(mockPet, 'torch');
      const petWithShield = equipAccessory(petWithTorch, 'shield');
      // torch is held, shield is held - should replace
      const heldAccessories = petWithShield.accessories.filter(a => a.slot === 'held');
      expect(heldAccessories.length).toBe(1);
    });
  });

  describe('unequipAccessory', () => {
    it('should remove accessory from slot', () => {
      const petWithTorch = equipAccessory(mockPet, 'torch');
      const updated = unequipAccessory(petWithTorch, 'held');
      expect(updated.accessories.length).toBe(0);
    });
  });

  describe('calculateAccessoryBonuses', () => {
    it('should return empty bonuses for no accessories', () => {
      const bonuses = calculateAccessoryBonuses(mockPet);
      expect(Object.keys(bonuses).length).toBe(0);
    });

    it('should calculate bonuses for equipped accessories', () => {
      const petWithTorch = equipAccessory(mockPet, 'torch');
      const bonuses = calculateAccessoryBonuses(petWithTorch);
      expect(bonuses.atk).toBe(1);
    });
  });

  describe('applyAccessoryBonuses', () => {
    it('should apply bonuses to base stats', () => {
      const petWithTorch = equipAccessory(mockPet, 'torch');
      const updatedStats = applyAccessoryBonuses(mockPet.battleStats, petWithTorch);
      expect(updatedStats.atk).toBe(mockPet.battleStats.atk + 1);
    });
  });

  describe('getRarityColor', () => {
    it('should return color for known rarity', () => {
      const color = getRarityColor('legendary');
      expect(color).toBe('#F59E0B');
    });

    it('should return default for unknown rarity', () => {
      const color = getRarityColor('unknown');
      expect(color).toBeTruthy();
    });
  });
});
