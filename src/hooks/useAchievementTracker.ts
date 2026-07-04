// ============================================
// Achievement Tracker Hook — Check and unlock achievements
// ============================================

import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ACHIEVEMENTS, checkAchievementProgress, type AchievementStats } from '../engine/AchievementEngine';

export function useAchievementTracker() {
  const { pet, unlockedAchievements, unlockAchievement } = useStore();

  useEffect(() => {
    if (!pet) return;

    const stats: AchievementStats = {
      level: pet.level,
      battlesWon: pet.battleRecord.wins,
      battlesLost: pet.battleRecord.losses,
      petsBred: 0,
      ordinalsMinted: pet.equippedOrdinal ? 1 : 0,
      guestbookSigned: 0,
      currentStage: pet.stage,
      highestRarity: 'common',
      totalXp: pet.xp,
    };

    ACHIEVEMENTS.forEach((achievement) => {
      const alreadyUnlocked = unlockedAchievements.find(
        (a) => a.achievementId === achievement.id
      );

      if (!alreadyUnlocked) {
        const progress = checkAchievementProgress(achievement, stats);
        if (progress.unlocked) {
          unlockAchievement({
            achievementId: achievement.id,
            unlockedAt: Date.now(),
            progress: progress.progress,
            target: progress.target,
          });
        }
      }
    });
  }, [pet?.level, pet?.battleRecord.wins, pet?.stage, pet?.equippedOrdinal, unlockedAchievements, unlockAchievement]);
}
