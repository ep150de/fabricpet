// ============================================
// Offline Sync Queue — Queue Nostr events when offline
// ============================================

import { getStorage } from '../store/storageAdapter';

const SYNC_QUEUE_KEY = 'fabricpet_sync_queue';
const OFFLINE_STATUS_KEY = 'fabricpet_offline_status';

export interface QueuedEvent {
  id: string;
  type: 'pet_state' | 'home_state' | 'battle_result' | 'breeding_offer' | 'trade_offer' | 'guestbook';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncQueue {
  events: QueuedEvent[];
  lastSyncAttempt: number;
  isOnline: boolean;
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Load the sync queue from storage
 */
export async function loadSyncQueue(): Promise<SyncQueue> {
  try {
    const storage = getStorage();
    const queue = await storage.get<SyncQueue>(SYNC_QUEUE_KEY);
    if (queue) {
      return queue;
    }
  } catch (e) {
    console.warn('[SyncQueue] Failed to load:', e);
  }
  
  return {
    events: [],
    lastSyncAttempt: 0,
    isOnline: isOnline(),
  };
}

/**
 * Save the sync queue to storage
 */
export async function saveSyncQueue(queue: SyncQueue): Promise<void> {
  try {
    const storage = getStorage();
    await storage.set(SYNC_QUEUE_KEY, queue);
  } catch (e) {
    console.warn('[SyncQueue] Failed to save:', e);
  }
}

/**
 * Add an event to the sync queue
 */
export async function queueEvent(
  type: QueuedEvent['type'],
  data: any
): Promise<void> {
  const queue = await loadSyncQueue();
  
  const event: QueuedEvent = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    data,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 5,
  };
  
  queue.events.push(event);
  await saveSyncQueue(queue);
  
  console.log('[SyncQueue] Queued event:', event.id, event.type);
}

/**
 * Process the sync queue (send queued events)
 */
export async function processSyncQueue(
  processor: (event: QueuedEvent) => Promise<boolean>
): Promise<{ processed: number; failed: number; remaining: number }> {
  const queue = await loadSyncQueue();
  
  if (!isOnline()) {
    console.log('[SyncQueue] Offline, skipping sync');
    queue.isOnline = false;
    await saveSyncQueue(queue);
    return { processed: 0, failed: 0, remaining: queue.events.length };
  }
  
  queue.isOnline = true;
  let processed = 0;
  let failed = 0;
  const remaining: QueuedEvent[] = [];
  
  for (const event of queue.events) {
    if (event.retryCount >= event.maxRetries) {
      console.warn('[SyncQueue] Max retries exceeded for:', event.id);
      failed++;
      continue;
    }
    
    try {
      const success = await processor(event);
      if (success) {
        processed++;
        console.log('[SyncQueue] Successfully synced:', event.id);
      } else {
        event.retryCount++;
        remaining.push(event);
        failed++;
      }
    } catch (error) {
      console.error('[SyncQueue] Failed to sync:', event.id, error);
      event.retryCount++;
      remaining.push(event);
      failed++;
    }
  }
  
  queue.events = remaining;
  queue.lastSyncAttempt = Date.now();
  await saveSyncQueue(queue);
  
  return { processed, failed, remaining: remaining.length };
}

/**
 * Get the number of pending events in the queue
 */
export async function getPendingCount(): Promise<number> {
  const queue = await loadSyncQueue();
  return queue.events.length;
}

/**
 * Clear the sync queue
 */
export async function clearSyncQueue(): Promise<void> {
  const queue = await loadSyncQueue();
  queue.events = [];
  await saveSyncQueue(queue);
}

/**
 * Check if there are pending events to sync
 */
export async function hasPendingEvents(): Promise<boolean> {
  const queue = await loadSyncQueue();
  return queue.events.length > 0;
}