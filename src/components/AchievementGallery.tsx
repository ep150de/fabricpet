// ============================================
// Achievement Gallery — Display unlocked achievements
// ============================================

import { useStore } from '../store/useStore';
import { ACHIEVEMENTS, checkAchievementProgress, type AchievementStats } from '../engine/AchievementEngine';

export function AchievementGallery() {
  const { pet, unlockedAchievements } = useStore();

  const stats: AchievementStats = {
    level: pet?.level || 0,
    battlesWon: pet?.battleRecord.wins || 0,
    battlesLost: pet?.battleRecord.losses || 0,
    petsBred: 0, // TODO: Track from breeding history
    ordinalsMinted: pet?.equippedOrdinal ? 1 : 0,
    guestbookSigned: 0, // TODO: Track from social interactions
    currentStage: pet?.stage || 'egg',
    highestRarity: 'common', // TODO: Track from breeding
    totalXp: pet?.xp || 0,
  };

  const achievementsWithProgress = ACHIEVEMENTS.map((achievement) => {
    const unlocked = unlockedAchievements.find(
      (a) => a.achievementId === achievement.id
    );
    const progress = checkAchievementProgress(achievement, stats);
    return { achievement, unlocked, progress };
  });

  const unlockedCount = achievementsWithProgress.filter((a) => a.unlocked).length;
  const totalCount = achievementsWithProgress.filter((a) => !a.achievement.hidden || a.unlocked).length;

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">🏆 Achievements</h3>
        <div className="text-sm text-gray-400">
          {unlockedCount}/{totalCount}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {achievementsWithProgress
          .filter((a) => !a.achievement.hidden || a.unlocked)
          .map(({ achievement, unlocked, progress }) => (
            <div
              key={achievement.id}
              className={`rounded-lg p-3 border transition-all ${
                unlocked
                  ? 'bg-yellow-500/10 border-yellow-500/50'
                  : 'bg-[#0f0f23] border-gray-700 opacity-60'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {achievement.name}
                  </div>
                  <div className="text-xs text-gray-400 line-clamp-2">
                    {achievement.description}
                  </div>
                  {!unlocked && progress.target > 1 && (
                    <div className="mt-1">
                      <div className="text-xs text-gray-500">
                        {progress.progress}/{progress.target}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                        <div
                          className="bg-indigo-500 h-1 rounded-full transition-all"
                          style={{
                            width: `${(progress.progress / progress.target) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {unlocked && achievement.reward && (
                    <div className="text-xs text-yellow-400 mt-1">
                      +{achievement.reward.amount} XP
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
