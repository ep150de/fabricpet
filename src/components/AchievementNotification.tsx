// ============================================
// Achievement Notification — Toast for unlocked achievements
// ============================================

import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ACHIEVEMENTS } from '../engine/AchievementEngine';

export function AchievementNotification() {
  const { pendingAchievementNotification, setPendingAchievementNotification } = useStore();

  useEffect(() => {
    if (pendingAchievementNotification) {
      const timer = setTimeout(() => {
        setPendingAchievementNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [pendingAchievementNotification, setPendingAchievementNotification]);

  if (!pendingAchievementNotification) return null;

  const achievement = ACHIEVEMENTS.find(
    (a) => a.id === pendingAchievementNotification.achievementId
  );

  if (!achievement) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-slide-down">
      <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-sm max-w-sm">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{achievement.icon}</div>
          <div className="flex-1">
            <div className="text-xs text-yellow-400 font-semibold uppercase tracking-wide">
              Achievement Unlocked!
            </div>
            <div className="text-sm font-bold text-white">{achievement.name}</div>
            <div className="text-xs text-gray-300">{achievement.description}</div>
          </div>
        </div>
        {achievement.reward && (
          <div className="mt-2 pt-2 border-t border-yellow-500/30">
            <div className="text-xs text-yellow-300">
              Reward: +{achievement.reward.amount} XP
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
