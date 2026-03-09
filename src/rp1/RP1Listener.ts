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
let msfAvailable: boolean | null = null; // null = unknown, true/false = checked
let msfCheckCount = 0;

/**
 * Start polling the MSF service for proximity events.
 * When another FabricPet user is nearby in RP1, triggers callbacks.
 * Gracefully handles unavailable MSF service (no console spam).
 */
export function startRP1Listener(
  myPubkey: string,
  intervalMs: number = 10000
): void {
  if (pollInterval) return; // Already running

  console.log('[RP1Listener] Starting proximity polling...');

  pollInterval = setInterval(async () => {
    // If MSF was confirmed unavailable, skip polling (re-check every 30 cycles)
    if (msfAvailable === false) {
      msfCheckCount++;
      if (msfCheckCount < 30) return; // Skip ~5 minutes between retries
      msfCheckCount = 0;
    }

    try {
      const response = await fetch(
        `${RP1_CONFIG.msfServiceUrl}/api/proximity?pubkey=${myPubkey}&cid=${RP1_CONFIG.startCid}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        msfAvailable = true;
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
      } else {
        // 404 or other error — mark as unavailable, log once
        if (msfAvailable !== false) {
          console.log('[RP1Listener] MSF service not available (will retry periodically)');
        }
        msfAvailable = false;
      }
    } catch {
      // Network error — mark as unavailable silently
      if (msfAvailable !== false) {
        console.log('[RP1Listener] MSF service unreachable (will retry periodically)');
      }
      msfAvailable = false;
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
