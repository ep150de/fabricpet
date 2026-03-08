// ============================================
// Local Storage Persistence — Reliable pet state backup
// ============================================
// localStorage is the PRIMARY store (instant, reliable).
// Nostr relays are the SECONDARY store (cross-device sync).
// On load: check both, use whichever is newer.
// ============================================

import type { Pet, HomeState } from '../types';

const KEYS = {
  PET: 'fabricpet_pet_state',
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

/** Get the last saved timestamp. */
export function getLastSavedTimestamp(): number {
  const raw = localStorage.getItem(KEYS.LAST_SAVED);
  return raw ? parseInt(raw, 10) : 0;
}
