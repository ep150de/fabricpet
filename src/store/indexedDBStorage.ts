// ============================================
// IndexedDB Persistence — Primary storage for pet state
// ============================================
// IndexedDB is the PRIMARY store (larger capacity, better performance).
// Nostr relays are the SECONDARY store (cross-device sync).
// On load: check both, use whichever is newer.
// ============================================

import type { Pet, PetRoster, HomeState } from '../types';
import { getStorage } from './storageAdapter';

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

/** Save pet to IndexedDB. */
export async function saveLocalPet(pet: Pet): Promise<void> {
  try {
    const storage = getStorage();
    const stored: StoredData<Pet> = {
      data: pet,
      timestamp: Date.now(),
      version: 1,
    };
    await storage.set(KEYS.PET, stored);
    await storage.set(KEYS.LAST_SAVED, Date.now());
  } catch (e) {
    console.warn('[IndexedDB] Failed to save pet:', e);
  }
}

/** Load pet from IndexedDB. Returns { pet, timestamp } or null. */
export async function loadLocalPet(): Promise<{ pet: Pet; timestamp: number } | null> {
  try {
    const storage = getStorage();
    const stored = await storage.get<StoredData<Pet>>(KEYS.PET);
    if (!stored || !stored.data || !stored.data.name) return null;
    return { pet: stored.data, timestamp: stored.timestamp };
  } catch {
    return null;
  }
}

/** Save home state to IndexedDB. */
export async function saveLocalHome(home: HomeState): Promise<void> {
  try {
    const storage = getStorage();
    const stored: StoredData<HomeState> = {
      data: home,
      timestamp: Date.now(),
      version: 1,
    };
    await storage.set(KEYS.HOME, stored);
  } catch (e) {
    console.warn('[IndexedDB] Failed to save home:', e);
  }
}

/** Load home state from IndexedDB. */
export async function loadLocalHome(): Promise<{ home: HomeState; timestamp: number } | null> {
  try {
    const storage = getStorage();
    const stored = await storage.get<StoredData<HomeState>>(KEYS.HOME);
    if (!stored || !stored.data) return null;
    return { home: stored.data, timestamp: stored.timestamp };
  } catch {
    return null;
  }
}

/** Save roster to IndexedDB. */
export async function saveLocalRoster(roster: PetRoster): Promise<void> {
  try {
    const storage = getStorage();
    const stored: StoredData<PetRoster> = {
      data: roster,
      timestamp: Date.now(),
      version: 1,
    };
    await storage.set(KEYS.ROSTER, stored);
  } catch (e) {
    console.warn('[IndexedDB] Failed to save roster:', e);
  }
}

/** Load roster from IndexedDB. Migrates single-pet to roster if needed. */
export async function loadLocalRoster(): Promise<{ roster: PetRoster; timestamp: number } | null> {
  try {
    const storage = getStorage();
    
    // Try loading roster first
    const stored = await storage.get<StoredData<PetRoster>>(KEYS.ROSTER);
    if (stored && stored.data && stored.data.pets && stored.data.pets.length > 0) {
      return { roster: stored.data, timestamp: stored.timestamp };
    }

    // Migration: if no roster but single pet exists, create roster from it
    const singlePet = await loadLocalPet();
    if (singlePet) {
      const roster: PetRoster = {
        pets: [singlePet.pet],
        activePetId: singlePet.pet.id,
        maxSlots: 1,
      };
      console.log('[IndexedDB] Migrated single pet to roster');
      await saveLocalRoster(roster);
      return { roster, timestamp: singlePet.timestamp };
    }

    return null;
  } catch {
    return null;
  }
}

/** Get the last saved timestamp. */
export async function getLastSavedTimestamp(): Promise<number> {
  try {
    const storage = getStorage();
    const timestamp = await storage.get<number>(KEYS.LAST_SAVED);
    return timestamp || 0;
  } catch {
    return 0;
  }
}
