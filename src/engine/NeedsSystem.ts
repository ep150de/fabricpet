// ============================================
// Needs System — Hunger, happiness, energy, hygiene decay & actions
// ============================================

import type { Pet, PetNeeds } from '../types';
import { NEEDS_DECAY_RATES, ACTION_EFFECTS } from '../utils/constants';
import { calculateMood } from './PetStateMachine';

/**
 * Clamp a value between 0 and 100.
 */
function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Apply time-based decay to pet needs.
 * Call this periodically (e.g., every tick or on app resume).
 */
export function decayNeeds(pet: Pet, elapsedMinutes: number): Pet {
  const needs: PetNeeds = {
    hunger: clamp(pet.needs.hunger - NEEDS_DECAY_RATES.hunger * elapsedMinutes),
    happiness: clamp(pet.needs.happiness - NEEDS_DECAY_RATES.happiness * elapsedMinutes),
    energy: clamp(pet.needs.energy - NEEDS_DECAY_RATES.energy * elapsedMinutes),
    hygiene: clamp(pet.needs.hygiene - NEEDS_DECAY_RATES.hygiene * elapsedMinutes),
  };

  return {
    ...pet,
    needs,
    mood: calculateMood(needs),
  };
}

/**
 * Apply an action to the pet (feed, play, clean, sleep, treat).
 */
export function applyAction(pet: Pet, action: keyof typeof ACTION_EFFECTS): { pet: Pet; xpGained: number } {
  const effects = ACTION_EFFECTS[action];
  if (!effects) {
    return { pet, xpGained: 0 };
  }

  const needs: PetNeeds = {
    hunger: clamp(pet.needs.hunger + effects.hunger),
    happiness: clamp(pet.needs.happiness + effects.happiness),
    energy: clamp(pet.needs.energy + effects.energy),
    hygiene: clamp(pet.needs.hygiene + effects.hygiene),
  };

  // XP gained from caring for pet
  const xpGained = 10;

  return {
    pet: {
      ...pet,
      needs,
      mood: calculateMood(needs),
      lastInteraction: Date.now(),
    },
    xpGained,
  };
}

/**
 * Calculate overall pet health as a percentage.
 */
export function getOverallHealth(needs: PetNeeds): number {
  return Math.round((needs.hunger + needs.happiness + needs.energy + needs.hygiene) / 4);
}

/**
 * Check if the pet is in critical condition (any need below 10).
 */
export function isCritical(needs: PetNeeds): boolean {
  return needs.hunger < 10 || needs.happiness < 10 || needs.energy < 10 || needs.hygiene < 10;
}

/**
 * Get the most urgent need.
 */
export function getMostUrgentNeed(needs: PetNeeds): keyof PetNeeds {
  const entries = Object.entries(needs) as [keyof PetNeeds, number][];
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

/**
 * Get a suggestion for what action to take based on needs.
 */
export function getSuggestion(needs: PetNeeds): string {
  const urgent = getMostUrgentNeed(needs);
  const suggestions: Record<keyof PetNeeds, string> = {
    hunger: '🍽️ Your pet is hungry! Try feeding them.',
    happiness: '🎮 Your pet seems bored. Play with them!',
    energy: '😴 Your pet is tired. Let them rest.',
    hygiene: '🛁 Your pet needs a bath!',
  };
  return suggestions[urgent];
}
