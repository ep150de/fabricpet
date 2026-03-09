// ============================================
// Local Storage Persistence — Reliable pet state backup
// ============================================
// localStorage is the PRIMARY store (instant, reliable).
// Nostr relays are the SECONDARY store (cross-device sync).
// On load: check both, use whichever is newer.
// ============================================

import type { Pet, PetRoster, HomeState } from '../types';

const KEYS = {
  PET: 'fabricpet_pet_state',
  ROSTER: 'fabricpet_roster',
  HOME: 'fabricpet_home_state',
  LAST_SAVED: 'fabricpet_last_saved',
} as const;

interface StoredData<T> {
  data: T;
  timestamp: number;
  version: number;
}

/** Save pet to localStorage. */
export function saveLocalPet(pet: Pet): void {
  try {
    const stored: StoredData<Pet> = {
      data: pet,
      timestamp: Date.now(),
      version: 1,
    };
    localStorage.setItem(KEYS.PET, JSON.stringify(stored));
    localStorage.setItem(KEYS.LAST_SAVED, String(Date.now()));
  } catch (e) {
    console.warn('[LocalStorage] Failed to save pet:', e);
  }
}

/** Load pet from localStorage. Returns { pet, timestamp } or null. */
export function loadLocalPet(): { pet: Pet; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(KEYS.PET);
    if (!raw) return null;
    const stored: StoredData<Pet> = JSON.parse(raw);
    if (!stored.data || !stored.data.name) return null;
    return { pet: stored.data, timestamp: stored.timestamp };
  } catch {
    return null;
  }
}

/** Save home state to localStorage. */
export function saveLocalHome(home: HomeState): void {
  try {
    const stored: StoredData<HomeState> = {
      data: home,
      timestamp: Date.now(),
      version: 1,
    };
    localStorage.setItem(KEYS.HOME, JSON.stringify(stored));
  } catch (e) {
    console.warn('[LocalStorage] Failed to save home:', e);
  }
}

/** Load home state from localStorage. */
export function loadLocalHome(): { home: HomeState; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(KEYS.HOME);
    if (!raw) return null;
    const stored: StoredData<HomeState> = JSON.parse(raw);
    if (!stored.data) return null;
    return { home: stored.data, timestamp: stored.timestamp };
  } catch {
    return null;
  }
}

/** Save roster to localStorage. */
export function saveLocalRoster(roster: PetRoster): void {
  try {
    const stored: StoredData<PetRoster> = {
      data: roster,
      timestamp: Date.now(),
      version: 1,
    };
    localStorage.setItem(KEYS.ROSTER, JSON.stringify(stored));
  } catch (e) {
    console.warn('[LocalStorage] Failed to save roster:', e);
  }
}

/** Load roster from localStorage. Migrates single-pet to roster if needed. */
export function loadLocalRoster(): { roster: PetRoster; timestamp: number } | null {
  try {
    // Try loading roster first
    const raw = localStorage.getItem(KEYS.ROSTER);
    if (raw) {
      const stored: StoredData<PetRoster> = JSON.parse(raw);
      if (stored.data && stored.data.pets && stored.data.pets.length > 0) {
        return { roster: stored.data, timestamp: stored.timestamp };
      }
    }

    // Migration: if no roster but single pet exists, create roster from it
    const singlePet = loadLocalPet();
    if (singlePet) {
      const roster: PetRoster = {
        pets: [singlePet.pet],
        activePetId: singlePet.pet.id,
        maxSlots: 1,
      };
      console.log('[LocalStorage] Migrated single pet to roster');
      saveLocalRoster(roster);
      return { roster, timestamp: singlePet.timestamp };
    }

    return null;
  } catch {
    return null;
  }
}

/** Get the last saved timestamp. */
export function getLastSavedTimestamp(): number {
  const raw = localStorage.getItem(KEYS.LAST_SAVED);
  return raw ? parseInt(raw, 10) : 0;
}
