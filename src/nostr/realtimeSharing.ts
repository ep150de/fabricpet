// ============================================
// Real-time Sharing — GPS and fabric-based pet discovery
// ============================================
// Implements real-time pet sharing via Nostr relays and GPS proximity
// Allows users to discover nearby pets and share their own pet's location
// ============================================

import { getPool, getRelays } from './relayManager';
import { signEvent } from './identity';
import { NOSTR_KIND_APP_DATA, RP1_CONFIG } from '../utils/constants';
import type { NostrIdentity } from './identity';
import type { Pet } from '../types';

// Position broadcasting event kind (custom for FabricPet)
const POSITION_EVENT_KIND = NOSTR_KIND_APP_DATA; // Using same kind with different d-tag
const POSITION_D_TAG = 'com.fabricpet.position';
const LOCATION_CACHE_KEY = 'fabricpet_location_cache';
const NEARBY_PETS_KEY = 'fabricpet_nearby_pets';

export interface PetPosition {
  petId: string;
  pubkey: string;
  petName: string;
  lat: number;
  lng: number;
  fabricCid?: number;
  timestamp: number;
  petState: {
    name: string;
    level: number;
    stage: string;
    elementalType: string;
    avatarId?: string;
    equippedOrdinal?: string;
  };
}

export interface NearbyPet extends PetPosition {
  distance?: number; // Distance in meters
}

/**
 * Get current GPS position
 */
export async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('[RealtimeSharing] Geolocation not supported');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('[RealtimeSharing] Geolocation error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  });
}

/**
 * Broadcast pet position to Nostr relays
 */
export async function broadcastPosition(
  identity: NostrIdentity,
  pet: Pet,
  position: { lat: number; lng: number },
  fabricCid?: number
): Promise<boolean> {
  try {
    const petPosition: PetPosition = {
      petId: pet.id,
      pubkey: identity.pubkey,
      petName: pet.name,
      lat: position.lat,
      lng: position.lng,
      fabricCid,
      timestamp: Date.now(),
      petState: {
        name: pet.name,
        level: pet.level,
        stage: pet.stage,
        elementalType: pet.elementalType,
        avatarId: pet.avatarId || undefined,
        equippedOrdinal: pet.equippedOrdinal || undefined,
      },
    };

    const event = {
      kind: POSITION_EVENT_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', POSITION_D_TAG],
        ['t', 'position'],
        ['t', 'fabricpet'],
        // Include geo hash for proximity search
        ['geo', `${position.lat.toFixed(4)},${position.lng.toFixed(4)}`],
      ],
      content: JSON.stringify(petPosition),
    };

    const signedEvent = await signEvent(identity, event);
    const pool = getPool();
    const relays = getRelays();

    await Promise.allSettled(
      pool.publish(relays, signedEvent as Parameters<typeof pool.publish>[1])
    );

    // Cache position locally
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(petPosition));

    console.log('[RealtimeSharing] Position broadcasted:', pet.name);
    return true;
  } catch (error) {
    console.error('[RealtimeSharing] Failed to broadcast position:', error);
    return false;
  }
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetch nearby pets from Nostr relays
 */
export async function fetchNearbyPets(
  currentPosition: { lat: number; lng: number },
  radiusMeters: number = 1000,
  timeoutMs: number = 10000
): Promise<NearbyPet[]> {
  const pool = getPool();
  const relays = getRelays();
  const nearbyPets: NearbyPet[] = [];
  const seenPubkeys = new Set<string>();

  return new Promise<NearbyPet[]>((resolve) => {
    let resolved = false;

    const done = () => {
      if (resolved) return;
      resolved = true;

      // Filter by distance and sort by proximity
      const filtered = nearbyPets
        .filter(pet => {
          const distance = calculateDistance(
            currentPosition.lat,
            currentPosition.lng,
            pet.lat,
            pet.lng
          );
          pet.distance = distance;
          return distance <= radiusMeters;
        })
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));

      console.log(`[RealtimeSharing] Found ${filtered.length} nearby pets within ${radiusMeters}m`);
      resolve(filtered);
    };

    try {
      const sub = pool.subscribeMany(relays, [
        {
          kinds: [POSITION_EVENT_KIND],
          '#d': [POSITION_D_TAG],
          since: Math.floor(Date.now() / 1000) - 3600, // Last hour
        } as Record<string, unknown>,
      ] as unknown as Parameters<typeof pool.subscribeMany>[1], {
        onevent(event) {
          try {
            const data = JSON.parse(event.content);
            if (!data.petId || !data.lat || !data.lng) return;

            // Skip own pets
            if (event.pubkey === localStorage.getItem('fabricpet_pubkey')) return;

            // Skip duplicates
            if (seenPubkeys.has(event.pubkey)) return;
            seenPubkeys.add(event.pubkey);

            const pet: NearbyPet = {
              ...data,
              distance: calculateDistance(
                currentPosition.lat,
                currentPosition.lng,
                data.lat,
                data.lng
              ),
            };

            nearbyPets.push(pet);
          } catch {
            // Skip invalid events
          }
        },
        oneose() {
          console.log(`[RealtimeSharing] EOSE received, ${nearbyPets.length} pets found`);
          done();
        },
      });

      // Timeout
      setTimeout(() => {
        if (!resolved) {
          console.log(`[RealtimeSharing] Timeout after ${timeoutMs}ms`);
          try { sub.close(); } catch {}
          done();
        }
      }, timeoutMs);
    } catch (e) {
      console.error('[RealtimeSharing] Failed to fetch nearby pets:', e);
      done();
    }
  });
}

/**
 * Check if user is in same RP1 fabric as another pet
 */
export function isInSameFabric(myPosition: { fabricCid?: number }, otherPosition: { fabricCid?: number }): boolean {
  if (!myPosition.fabricCid || !otherPosition.fabricCid) return false;
  return myPosition.fabricCid === otherPosition.fabricCid;
}

/**
 * Get pets in the same RP1 fabric
 */
export function getPetsInSameFabric(
  myPosition: { fabricCid?: number },
  allPets: PetPosition[]
): PetPosition[] {
  if (!myPosition.fabricCid) return [];
  return allPets.filter(pet => pet.fabricCid === myPosition.fabricCid);
}

/**
 * Clear cached location data
 */
export function clearLocationCache(): void {
  localStorage.removeItem(LOCATION_CACHE_KEY);
}

/**
 * Get cached position
 */
export function getCachedPosition(): { lat: number; lng: number } | null {
  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      return { lat: data.lat, lng: data.lng };
    }
  } catch {
    // Ignore
  }
  return null;
}
