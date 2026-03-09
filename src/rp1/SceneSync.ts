// ============================================
// Scene Sync — Auto-push scene to RP1 when wallet changes
// ============================================

import type { Pet, OrdinalInscription } from '../types';
import { generateSceneJSON } from './SceneJSONGenerator';
import { pushSceneJSON } from './MVMFBridge';

let lastSyncHash = '';
let syncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Generate a simple hash of the current wallet state for change detection.
 */
function walletHash(inscriptions: OrdinalInscription[], equippedOrdinal: string | null): string {
  const ids = inscriptions.map(i => i.id).sort().join(',');
  return `${equippedOrdinal || 'none'}:${ids}`;
}

/**
 * Check if wallet state has changed and auto-sync to RP1 if needed.
 * Debounced to avoid rapid-fire pushes.
 */
export function scheduleSceneSync(
  pet: Pet,
  inscriptions: OrdinalInscription[],
  onSyncStart?: () => void,
  onSyncComplete?: (success: boolean) => void
): void {
  const hash = walletHash(inscriptions, pet.equippedOrdinal);

  // No change
  if (hash === lastSyncHash) return;

  // Debounce — wait 3 seconds after last change
  if (syncTimer) clearTimeout(syncTimer);

  syncTimer = setTimeout(async () => {
    lastSyncHash = hash;

    if (inscriptions.length === 0 && !pet.equippedOrdinal) {
      // Nothing to sync
      return;
    }

    onSyncStart?.();

    try {
      const sceneJSON = generateSceneJSON(pet, inscriptions, { includeImages: true });
      const success = await pushSceneJSON(sceneJSON);
      onSyncComplete?.(success);

      if (success) {
        console.log('[SceneSync] Auto-pushed scene to RP1');
      } else {
        console.log('[SceneSync] Push failed, scene available for manual copy');
      }
    } catch (e) {
      console.warn('[SceneSync] Auto-sync failed:', e);
      onSyncComplete?.(false);
    }
  }, 3000);
}

/**
 * Force an immediate sync.
 */
export async function forceSyncScene(
  pet: Pet,
  inscriptions: OrdinalInscription[]
): Promise<boolean> {
  if (inscriptions.length === 0 && !pet.equippedOrdinal) return false;

  const sceneJSON = generateSceneJSON(pet, inscriptions, { includeImages: true });
  const success = await pushSceneJSON(sceneJSON);
  lastSyncHash = walletHash(inscriptions, pet.equippedOrdinal);
  return success;
}

/**
 * Reset sync state (e.g., on wallet disconnect).
 */
export function resetSyncState(): void {
  lastSyncHash = '';
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}
