// ============================================
// Daily Challenge Panel — Show and track daily quests
// ============================================

import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { playSound } from '../engine/AudioManager';
import {
  loadDailyChallenges,
  claimChallengeReward,
  getChallengeStats,
  type DailyChallenge,
} from '../engine/DailyChallengeEngine';

export function DailyChallengePanel() {
  const { pet, setPet, setNotification } = useStore();
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [stats, setStats] = useState({ completed: 0, total: 0, claimed: 0 });

  useEffect(() => {
    const loaded = loadDailyChallenges();
    setChallenges(loaded);
    setStats(getChallengeStats());
  }, []);

  const handleClaim = async (challengeId: string) => {
    if (!pet) return;

    const result = claimChallengeReward(challengeId, pet);
    if (result.success && result.pet) {
      setPet(result.pet);
      playSound('achievement');
      setNotification({
        message: `Reward claimed! +${challenges.find(c => c.id === challengeId)?.reward.amount} XP`,
        emoji: '🎁',
      });
      
      // Refresh challenges
      setChallenges(loadDailyChallenges());
      setStats(getChallengeStats());
    } else if (result.error) {
      setNotification({ message: result.error, emoji: '⚠️' });
    }
  };

  const allCompleted = stats.completed === stats.total && stats.total > 0;

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">📋 Daily Challenges</h3>
        <div className="text-sm text-gray-400">
          {stats.completed}/{stats.total}
        </div>
      </div>

      {allCompleted && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 text-center">
          <div className="text-2xl mb-1">🎉</div>
          <div className="text-sm font-semibold text-green-400">All challenges completed!</div>
          <div className="text-xs text-gray-400 mt-1">Come back tomorrow for more</div>
        </div>
      )}

      <div className="space-y-3">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            className={`rounded-lg p-3 border transition-all ${
              challenge.completed
                ? challenge.claimed
                  ? 'bg-gray-800/50 border-gray-700 opacity-60'
                  : 'bg-green-500/10 border-green-500/30'
                : 'bg-[#0f0f23] border-gray-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{challenge.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">{challenge.title}</div>
                  {challenge.completed && !challenge.claimed && (
                    <button
                      onClick={() => handleClaim(challenge.id)}
                      className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg font-semibold hover:bg-green-600 transition-all"
                    >
                      Claim
                    </button>
                  )}
                  {challenge.claimed && (
                    <span className="text-xs text-green-400">✓ Claimed</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">{challenge.description}</div>
                
                {/* Progress Bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{challenge.progress}/{challenge.target}</span>
                    <span>+{challenge.reward.amount} XP</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        challenge.completed ? 'bg-green-500' : 'bg-indigo-500'
                      }`}
                      style={{
                        width: `${(challenge.progress / challenge.target) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {challenges.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm">No challenges today</p>
        </div>
      )}
    </div>
  );
}
