// ============================================
// Daily Challenge Engine — Daily quests and rewards
// ============================================

import type { Pet } from '../types';

export type ChallengeType = 
  | 'feed_pet' 
  | 'play_with_pet' 
  | 'win_battle' 
  | 'visit_pet' 
  | 'sign_guestbook'
  | 'breed_pet'
  | 'mint_ordinal';

export interface DailyChallenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  emoji: string;
  target: number;
  progress: number;
  reward: {
    type: 'xp' | 'accessory' | 'currency';
    amount?: number;
    itemId?: string;
  };
  expiresAt: number;
  completed: boolean;
  claimed: boolean;
}

export interface ChallengeProgress {
  type: ChallengeType;
  count: number;
  lastUpdated: number;
}

const CHALLENGE_TEMPLATES: Omit<DailyChallenge, 'id' | 'progress' | 'expiresAt' | 'completed' | 'claimed'>[] = [
  {
    type: 'feed_pet',
    title: 'Feeding Time',
    description: 'Feed your pet 3 times',
    emoji: '🍽️',
    target: 3,
    reward: { type: 'xp', amount: 50 },
  },
  {
    type: 'play_with_pet',
    title: 'Play Time',
    description: 'Play with your pet 2 times',
    emoji: '🎮',
    target: 2,
    reward: { type: 'xp', amount: 40 },
  },
  {
    type: 'win_battle',
    title: 'Battle Champion',
    description: 'Win 1 battle',
    emoji: '⚔️',
    target: 1,
    reward: { type: 'xp', amount: 100 },
  },
  {
    type: 'visit_pet',
    title: 'Social Butterfly',
    description: 'Visit 1 other pet',
    emoji: '👋',
    target: 1,
    reward: { type: 'xp', amount: 30 },
  },
  {
    type: 'sign_guestbook',
    title: 'Friendly Visitor',
    description: 'Sign 1 guestbook',
    emoji: '✍️',
    target: 1,
    reward: { type: 'xp', amount: 25 },
  },
  {
    type: 'breed_pet',
    title: 'Matchmaker',
    description: 'Breed 1 pet',
    emoji: '💕',
    target: 1,
    reward: { type: 'xp', amount: 75 },
  },
];

const STORAGE_KEY = 'fabricpet_daily_challenges';
const PROGRESS_KEY = 'fabricpet_challenge_progress';

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get the end of today (midnight)
 */
function getEndOfDay(): number {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return endOfDay.getTime();
}

/**
 * Generate daily challenges for today
 */
export function generateDailyChallenges(): DailyChallenge[] {
  const today = getTodayString();
  const seed = today.split('-').reduce((acc, val) => acc + parseInt(val), 0);
  
  // Select 3 random challenges based on seed
  const shuffled = [...CHALLENGE_TEMPLATES].sort((a, b) => {
    const hashA = (seed * a.type.charCodeAt(0)) % 100;
    const hashB = (seed * b.type.charCodeAt(0)) % 100;
    return hashA - hashB;
  });
  
  const selected = shuffled.slice(0, 3);
  
  return selected.map((template, index) => ({
    ...template,
    id: `daily-${today}-${index}`,
    progress: 0,
    expiresAt: getEndOfDay(),
    completed: false,
    claimed: false,
  }));
}

/**
 * Load today's challenges (generate if needed)
 */
export function loadDailyChallenges(): DailyChallenge[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const challenges: DailyChallenge[] = JSON.parse(stored);
      
      // Check if challenges are from today
      const today = getTodayString();
      const firstId = challenges[0]?.id || '';
      if (firstId.includes(today)) {
        // Check if any expired
        const now = Date.now();
        return challenges.map(c => ({
          ...c,
          completed: c.progress >= c.target,
          expiresAt: c.expiresAt < now ? getEndOfDay() : c.expiresAt,
        }));
      }
    }
  } catch (e) {
    console.warn('[DailyChallenges] Failed to load:', e);
  }
  
  // Generate new challenges
  const newChallenges = generateDailyChallenges();
  saveDailyChallenges(newChallenges);
  return newChallenges;
}

/**
 * Save challenges to localStorage
 */
export function saveDailyChallenges(challenges: DailyChallenge[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(challenges));
  } catch (e) {
    console.warn('[DailyChallenges] Failed to save:', e);
  }
}

/**
 * Update challenge progress
 */
export function updateChallengeProgress(type: ChallengeType, amount: number = 1): DailyChallenge[] {
  const challenges = loadDailyChallenges();
  
  const updated = challenges.map(challenge => {
    if (challenge.type === type && !challenge.completed) {
      const newProgress = Math.min(challenge.progress + amount, challenge.target);
      return {
        ...challenge,
        progress: newProgress,
        completed: newProgress >= challenge.target,
      };
    }
    return challenge;
  });
  
  saveDailyChallenges(updated);
  return updated;
}

/**
 * Claim a challenge reward
 */
export function claimChallengeReward(challengeId: string, pet: Pet): { success: boolean; pet?: Pet; error?: string } {
  const challenges = loadDailyChallenges();
  const challenge = challenges.find(c => c.id === challengeId);
  
  if (!challenge) {
    return { success: false, error: 'Challenge not found' };
  }
  
  if (!challenge.completed) {
    return { success: false, error: 'Challenge not completed' };
  }
  
  if (challenge.claimed) {
    return { success: false, error: 'Reward already claimed' };
  }
  
  // Mark as claimed
  const updated = challenges.map(c => 
    c.id === challengeId ? { ...c, claimed: true } : c
  );
  saveDailyChallenges(updated);
  
  // Apply reward
  if (challenge.reward.type === 'xp' && challenge.reward.amount) {
    const updatedPet = { ...pet, xp: pet.xp + challenge.reward.amount };
    return { success: true, pet: updatedPet };
  }
  
  return { success: true, pet };
}

/**
 * Get challenge progress stats
 */
export function getChallengeStats(): { completed: number; total: number; claimed: number } {
  const challenges = loadDailyChallenges();
  return {
    completed: challenges.filter(c => c.completed).length,
    total: challenges.length,
    claimed: challenges.filter(c => c.claimed).length,
  };
}

/**
 * Check if all daily challenges are completed
 */
export function areAllChallengesCompleted(): boolean {
  const challenges = loadDailyChallenges();
  return challenges.every(c => c.completed);
}