// ============================================
// RP1 Listener — Poll MSF for proximity and visitor events
// ============================================

import { RP1_CONFIG } from '../utils/constants';

export interface ProximityEvent {
  type: 'visitor' | 'battle_request' | 'spectate';
  pubkey: string;
  petName: string;
  distance: number;
  timestamp: number;
}

export type ProximityCallback = (event: ProximityEvent) => void;

let pollInterval: ReturnType<typeof setInterval> | null = null;
let listeners: ProximityCallback[] = [];

/**
 * Start polling the MSF service for proximity events.
 * When another FabricPet user is nearby in RP1, triggers callbacks.
 */
export function startRP1Listener(
  myPubkey: string,
  intervalMs: number = 10000
): void {
  if (pollInterval) return; // Already running

  console.log('[RP1Listener] Starting proximity polling...');

  pollInterval = setInterval(async () => {
    try {
      const response = await fetch(
        `${RP1_CONFIG.msfServiceUrl}/api/proximity?pubkey=${myPubkey}&cid=${RP1_CONFIG.startCid}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.events && Array.isArray(data.events)) {
          for (const event of data.events) {
            const proximityEvent: ProximityEvent = {
              type: event.type || 'visitor',
              pubkey: event.pubkey,
              petName: event.petName || 'Unknown',
              distance: event.distance || 0,
              timestamp: event.timestamp || Date.now(),
            };
            listeners.forEach(cb => cb(proximityEvent));
          }
        }
      }
    } catch {
      // MSF service not available — silent fail
    }
  }, intervalMs);
}

/**
 * Stop polling.
 */
export function stopRP1Listener(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  listeners = [];
  console.log('[RP1Listener] Stopped proximity polling');
}

/**
 * Register a callback for proximity events.
 */
export function onProximityEvent(callback: ProximityCallback): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

/**
 * Check current sync status with RP1.
 */
export async function checkRP1SyncStatus(): Promise<'online' | 'syncing' | 'offline'> {
  try {
    const response = await fetch(`${RP1_CONFIG.msfServiceUrl}/`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? 'online' : 'offline';
  } catch {
    return 'offline';
  }
}

/**
 * Get the RP1 entry URL for the current scene.
 */
export function getRP1EntryUrl(): string {
  return RP1_CONFIG.fabricUrl;
}
