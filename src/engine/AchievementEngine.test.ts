// ============================================
// AchievementEngine Tests
// ============================================

import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, checkAchievementProgress } from '../engine/AchievementEngine';
import type { AchievementStats } from '../engine/AchievementEngine';

describe('AchievementEngine', () => {
  describe('ACHIEVEMENTS', () => {
    it('should have at least 10 achievements', () => {
      expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10);
    });

    it('should have unique IDs', () => {
      const ids = ACHIEVEMENTS.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have required fields', () => {
      ACHIEVEMENTS.forEach(achievement => {
        expect(achievement.id).toBeTruthy();
        expect(achievement.name).toBeTruthy();
        expect(achievement.description).toBeTruthy();
        expect(achievement.category).toBeTruthy();
        expect(achievement.icon).toBeTruthy();
        expect(achievement.condition).toBeTruthy();
      });
    });
  });

  describe('checkAchievementProgress', () => {
    const baseStats: AchievementStats = {
      level: 1,
      battlesWon: 0,
      battlesLost: 0,
      petsBred: 0,
      ordinalsMinted: 0,
      guestbookSigned: 0,
      currentStage: 'egg',
      highestRarity: 'common',
      totalXp: 0,
    };

    it('should detect level achievement when level reached', () => {
      const achievement = ACHIEVEMENTS.find(a => a.id === 'first_steps')!;
      const stats = { ...baseStats, level: 5 };
      const result = checkAchievementProgress(achievement, stats);
      expect(result.unlocked).toBe(true);
      expect(result.progress).toBe(5);
      expect(result.target).toBe(5);
    });

    it('should not unlock level achievement when level not reached', () => {
      const achievement = ACHIEVEMENTS.find(a => a.id === 'first_steps')!;
      const stats = { ...baseStats, level: 3 };
      const result = checkAchievementProgress(achievement, stats);
      expect(result.unlocked).toBe(false);
      expect(result.progress).toBe(3);
    });

    it('should detect battle win achievement', () => {
      const achievement = ACHIEVEMENTS.find(a => a.id === 'first_battle')!;
      const stats = { ...baseStats, battlesWon: 1 };
      const result = checkAchievementProgress(achievement, stats);
      expect(result.unlocked).toBe(true);
    });

    it('should track progress for partial achievements', () => {
      const achievement = ACHIEVEMENTS.find(a => a.id === 'warrior')!;
      const stats = { ...baseStats, battlesWon: 5 };
      const result = checkAchievementProgress(achievement, stats);
      expect(result.unlocked).toBe(false);
      expect(result.progress).toBe(5);
      expect(result.target).toBe(10);
    });

    it('should detect evolution achievement', () => {
      const achievement = ACHIEVEMENTS.find(a => a.id === 'evolution')!;
      const stats = { ...baseStats, currentStage: 'adult' };
      const result = checkAchievementProgress(achievement, stats);
      expect(result.unlocked).toBe(true);
    });

    it('should detect rarity achievement', () => {
      const achievement = ACHIEVEMENTS.find(a => a.id === 'rare_find')!;
      const stats = { ...baseStats, highestRarity: 'rare' };
      const result = checkAchievementProgress(achievement, stats);
      expect(result.unlocked).toBe(true);
    });
  });
});
