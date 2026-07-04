// ============================================
// Achievement Engine — Track and award achievements
// ============================================

export type AchievementCategory = 'pet' | 'battle' | 'social' | 'breeding' | 'exploration';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  condition: AchievementCondition;
  reward?: AchievementReward;
  hidden?: boolean;
}

export type AchievementCondition =
  | { type: 'level_reached'; level: number }
  | { type: 'battles_won'; count: number }
  | { type: 'battles_lost'; count: number }
  | { type: 'pets_bred'; count: number }
  | { type: 'ordinals_minted'; count: number }
  | { type: 'guestbook_signed'; count: number }
  | { type: 'pet_evolved'; stage: string }
  | { type: 'element_unlocked'; element: string }
  | { type: 'rarity_reached'; rarity: string }
  | { type: 'xp_earned'; amount: number };

export interface AchievementReward {
  type: 'xp' | 'currency' | 'cosmetic';
  amount?: number;
  itemId?: string;
}

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: number;
  progress: number;
  target: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Reach level 5 with your pet',
    category: 'pet',
    icon: '👣',
    condition: { type: 'level_reached', level: 5 },
    reward: { type: 'xp', amount: 50 },
  },
  {
    id: 'growing_strong',
    name: 'Growing Strong',
    description: 'Reach level 10',
    category: 'pet',
    icon: '💪',
    condition: { type: 'level_reached', level: 10 },
    reward: { type: 'xp', amount: 100 },
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Reach level 25',
    category: 'pet',
    icon: '🎖️',
    condition: { type: 'level_reached', level: 25 },
    reward: { type: 'xp', amount: 250 },
  },
  {
    id: 'first_battle',
    name: 'First Battle',
    description: 'Win your first battle',
    category: 'battle',
    icon: '⚔️',
    condition: { type: 'battles_won', count: 1 },
    reward: { type: 'xp', amount: 30 },
  },
  {
    id: 'warrior',
    name: 'Warrior',
    description: 'Win 10 battles',
    category: 'battle',
    icon: '🛡️',
    condition: { type: 'battles_won', count: 10 },
    reward: { type: 'xp', amount: 150 },
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'Win 50 battles',
    category: 'battle',
    icon: '🏆',
    condition: { type: 'battles_won', count: 50 },
    reward: { type: 'xp', amount: 500 },
  },
  {
    id: 'first_breed',
    name: 'Matchmaker',
    description: 'Breed your first pet',
    category: 'breeding',
    icon: '💕',
    condition: { type: 'pets_bred', count: 1 },
    reward: { type: 'xp', amount: 100 },
  },
  {
    id: 'breeder',
    name: 'Master Breeder',
    description: 'Breed 5 pets',
    category: 'breeding',
    icon: '🧬',
    condition: { type: 'pets_bred', count: 5 },
    reward: { type: 'xp', amount: 300 },
  },
  {
    id: 'ordinal_pioneer',
    name: 'Ordinal Pioneer',
    description: 'Mint your first ordinal',
    category: 'exploration',
    icon: '₿',
    condition: { type: 'ordinals_minted', count: 1 },
    reward: { type: 'xp', amount: 200 },
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Sign 5 guestbooks',
    category: 'social',
    icon: '🦋',
    condition: { type: 'guestbook_signed', count: 5 },
    reward: { type: 'xp', amount: 75 },
  },
  {
    id: 'evolution',
    name: 'Evolution',
    description: 'Evolve your pet to adult stage',
    category: 'pet',
    icon: '🌟',
    condition: { type: 'pet_evolved', stage: 'adult' },
    reward: { type: 'xp', amount: 200 },
  },
  {
    id: 'rare_find',
    name: 'Rare Find',
    description: 'Obtain a rare pet through breeding',
    category: 'breeding',
    icon: '💎',
    condition: { type: 'rarity_reached', rarity: 'rare' },
    reward: { type: 'xp', amount: 150 },
  },
  {
    id: 'legendary_bloodline',
    name: 'Legendary Bloodline',
    description: 'Breed a legendary pet',
    category: 'breeding',
    icon: '👑',
    condition: { type: 'rarity_reached', rarity: 'legendary' },
    reward: { type: 'xp', amount: 1000 },
    hidden: true,
  },
];

export function checkAchievementProgress(
  achievement: Achievement,
  stats: AchievementStats
): { unlocked: boolean; progress: number; target: number } {
  const condition = achievement.condition;

  switch (condition.type) {
    case 'level_reached':
      return {
        unlocked: stats.level >= condition.level,
        progress: Math.min(stats.level, condition.level),
        target: condition.level,
      };
    case 'battles_won':
      return {
        unlocked: stats.battlesWon >= condition.count,
        progress: Math.min(stats.battlesWon, condition.count),
        target: condition.count,
      };
    case 'battles_lost':
      return {
        unlocked: stats.battlesLost >= condition.count,
        progress: Math.min(stats.battlesLost, condition.count),
        target: condition.count,
      };
    case 'pets_bred':
      return {
        unlocked: stats.petsBred >= condition.count,
        progress: Math.min(stats.petsBred, condition.count),
        target: condition.count,
      };
    case 'ordinals_minted':
      return {
        unlocked: stats.ordinalsMinted >= condition.count,
        progress: Math.min(stats.ordinalsMinted, condition.count),
        target: condition.count,
      };
    case 'guestbook_signed':
      return {
        unlocked: stats.guestbookSigned >= condition.count,
        progress: Math.min(stats.guestbookSigned, condition.count),
        target: condition.count,
      };
    case 'pet_evolved':
      return {
        unlocked: stats.currentStage === condition.stage,
        progress: stats.currentStage === condition.stage ? 1 : 0,
        target: 1,
      };
    case 'rarity_reached':
      return {
        unlocked: stats.highestRarity === condition.rarity,
        progress: stats.highestRarity === condition.rarity ? 1 : 0,
        target: 1,
      };
    case 'xp_earned':
      return {
        unlocked: stats.totalXp >= condition.amount,
        progress: Math.min(stats.totalXp, condition.amount),
        target: condition.amount,
      };
    default:
      return { unlocked: false, progress: 0, target: 1 };
  }
}

export interface AchievementStats {
  level: number;
  battlesWon: number;
  battlesLost: number;
  petsBred: number;
  ordinalsMinted: number;
  guestbookSigned: number;
  currentStage: string;
  highestRarity: string;
  totalXp: number;
}
