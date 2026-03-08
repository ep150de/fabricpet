// ============================================
// Behavior Tree — Autonomous pet AI for spatial home
// ============================================

import type { Pet } from '../types';

export type BehaviorStatus = 'success' | 'failure' | 'running';

export interface BehaviorAction {
  name: string;
  emoji: string;
  animation: string;
  duration: number; // ms
  targetPosition?: [number, number, number];
}

/**
 * Evaluate the pet's behavior tree and return the current action.
 * The behavior tree runs in priority order:
 * 1. Critical needs (hunger < 20, energy < 15, hygiene < 20)
 * 2. Visitor interaction (if visitor detected)
 * 3. Play behavior (if happiness < 50)
 * 4. Idle behavior (wander, sit, nap)
 */
export function evaluateBehavior(
  pet: Pet,
  hasVisitor: boolean,
  _timeSinceLastAction: number
): BehaviorAction {
  // 1. Critical needs
  if (pet.needs.hunger < 20) {
    return {
      name: 'Walking to food bowl',
      emoji: '🍽️',
      animation: 'walk',
      duration: 3000,
      targetPosition: [1, 0, 1], // food bowl position
    };
  }

  if (pet.needs.energy < 15) {
    return {
      name: 'Going to bed',
      emoji: '😴',
      animation: 'walk',
      duration: 4000,
      targetPosition: [2, 0, 3], // bed position
    };
  }

  if (pet.needs.hygiene < 20) {
    return {
      name: 'Finding water to clean',
      emoji: '💧',
      animation: 'walk',
      duration: 3000,
      targetPosition: [0, 0, 2], // water bowl position
    };
  }

  // 2. Visitor interaction
  if (hasVisitor) {
    return {
      name: 'Running to greet visitor!',
      emoji: '❤️',
      animation: 'run',
      duration: 2000,
      targetPosition: [0, 0, 0], // visitor position
    };
  }

  // 3. Play behavior
  if (pet.needs.happiness < 50) {
    return {
      name: 'Playing with toy',
      emoji: '⚽',
      animation: 'play',
      duration: 5000,
      targetPosition: [3, 0, 2], // toy position
    };
  }

  // 4. Idle behaviors (random selection)
  const idleActions: BehaviorAction[] = [
    {
      name: 'Wandering around',
      emoji: '🚶',
      animation: 'walk',
      duration: 6000,
      targetPosition: [
        Math.random() * 6 - 3,
        0,
        Math.random() * 6 - 3,
      ],
    },
    {
      name: 'Sitting and looking around',
      emoji: '👀',
      animation: 'sit',
      duration: 4000,
    },
    {
      name: 'Taking a little nap',
      emoji: '💤',
      animation: 'sleep',
      duration: 8000,
    },
    {
      name: 'Stretching',
      emoji: '🙆',
      animation: 'stretch',
      duration: 3000,
    },
    {
      name: 'Exploring',
      emoji: '🔍',
      animation: 'walk',
      duration: 5000,
      targetPosition: [
        Math.random() * 4 - 2,
        0,
        Math.random() * 4 - 2,
      ],
    },
  ];

  // Pick a random idle action
  const idx = Math.floor(Math.random() * idleActions.length);
  return idleActions[idx];
}

/**
 * Get the emote/reaction for a specific event.
 */
export function getReactionEmote(event: string): { emoji: string; message: string } {
  const reactions: Record<string, { emoji: string; message: string }> = {
    fed: { emoji: '😋', message: 'Yummy! Thank you!' },
    played: { emoji: '🎉', message: 'That was fun!' },
    cleaned: { emoji: '✨', message: 'So fresh and clean!' },
    slept: { emoji: '😊', message: 'That was a great nap!' },
    visitor_arrived: { emoji: '❤️', message: 'A visitor! Hello!' },
    visitor_left: { emoji: '👋', message: 'Bye bye! Come again!' },
    level_up: { emoji: '🎊', message: 'I leveled up!' },
    evolved: { emoji: '🌟', message: 'I evolved! Look at me!' },
    battle_won: { emoji: '🏆', message: 'We won! Great teamwork!' },
    battle_lost: { emoji: '😤', message: 'We\'ll get them next time!' },
  };

  return reactions[event] || { emoji: '❓', message: '...' };
}
