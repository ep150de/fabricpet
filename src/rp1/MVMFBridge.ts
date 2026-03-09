// ============================================
// MVMF Bridge — Nostr ↔ RP1 MVMF state sync
// ============================================
// 
// Connects FabricPet to the live RP1 spatial fabric via the
// MSF Map Service running on Railway.
//
// MSF Service: https://mvserver-production-4e6c.up.railway.app
// RP1 Fabric:  https://enter.rp1.com?start_cid=104
// ============================================

import type { Pet, HomeState, SpatialFabricConfig } from '../types';
import { RP1_CONFIG } from '../utils/constants';

// --- MVMF Model Interfaces ---

export interface MVMFPetModel {
  modelType: 'com.fabricpet.pet';
  version: number;
  data: {
    name: string;
    level: number;
    stage: string;
    mood: string;
    elementalType: string;
    battleStats: Record<string, number>;
    position: [number, number, number];
    animation: string;
    equippedOrdinal: string | null;
  };
}

export interface MVMFHomeModel {
  modelType: 'com.fabricpet.home';
  version: number;
  data: {
    theme: string;
    furniture: Array<{
      id: string;
      type: string;
      position: [number, number, number];
    }>;
    visitorsAllowed: boolean;
    activeVisitors: string[];
  };
}

export interface NSOPetService {
  serviceType: 'com.fabricpet.ai';
  endpoints: {
    getBehavior: string;
    interact: string;
    battle: string;
  };
}

// --- Converters ---

export function petToMVMFModel(pet: Pet, position: [number, number, number] = [0, 0, 0]): MVMFPetModel {
  return {
    modelType: 'com.fabricpet.pet',
    version: 1,
    data: {
      name: pet.name,
      level: pet.level,
      stage: pet.stage,
      mood: pet.mood,
      elementalType: pet.elementalType,
      battleStats: {
        hp: pet.battleStats.hp,
        maxHp: pet.battleStats.maxHp,
        atk: pet.battleStats.atk,
        def: pet.battleStats.def,
        spd: pet.battleStats.spd,
        special: pet.battleStats.special,
      },
      position,
      animation: 'idle',
      equippedOrdinal: pet.equippedOrdinal,
    },
  };
}

export function homeToMVMFModel(home: HomeState): MVMFHomeModel {
  return {
    modelType: 'com.fabricpet.home',
    version: 1,
    data: {
      theme: home.theme,
      furniture: home.furniture.map(f => ({
        id: f.id,
        type: f.type,
        position: f.position,
      })),
      visitorsAllowed: home.visitorsAllowed,
      activeVisitors: [],
    },
  };
}

// --- MSF Service Communication ---

// Track MSF availability to avoid repeated 404 spam
let msfServiceAvailable: boolean | null = null; // null = unknown
let msfLastCheckTime = 0;
const MSF_RECHECK_INTERVAL = 5 * 60 * 1000; // Re-check every 5 minutes

/**
 * Check if the MSF Map Service is reachable.
 * Caches the result to avoid spamming 404s in the console.
 */
export async function checkMSFHealth(): Promise<boolean> {
  const now = Date.now();

  // If we already know it's unavailable and haven't waited long enough, skip
  if (msfServiceAvailable === false && (now - msfLastCheckTime) < MSF_RECHECK_INTERVAL) {
    return false;
  }

  try {
    const response = await fetch(`${RP1_CONFIG.msfServiceUrl}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    msfLastCheckTime = now;
    msfServiceAvailable = response.ok;
    if (!response.ok && msfServiceAvailable !== false) {
      console.log('[MVMF Bridge] MSF service not available (will retry in 5 min)');
    }
    return response.ok;
  } catch {
    if (msfServiceAvailable !== false) {
      console.log('[MVMF Bridge] MSF service unreachable (will retry in 5 min)');
    }
    msfLastCheckTime = now;
    msfServiceAvailable = false;
    return false;
  }
}

/**
 * Push pet state to the MSF Map Service.
 * Uses the MSF REST API to update the scene with pet data.
 */
export async function pushPetToMSF(
  petModel: MVMFPetModel,
  homeModel: MVMFHomeModel
): Promise<boolean> {
  try {
    const response = await fetch(`${RP1_CONFIG.msfServiceUrl}/api/scene/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cid: RP1_CONFIG.startCid,
        lat: RP1_CONFIG.lat,
        lon: RP1_CONFIG.lon,
        models: [petModel, homeModel],
        timestamp: Date.now(),
      }),
    });

    if (response.ok) {
      console.log('[MVMF Bridge] Pet state pushed to MSF service');
      return true;
    }

    // If the endpoint doesn't exist yet, that's OK — log and continue
    console.warn('[MVMF Bridge] MSF update returned:', response.status);
    return false;
  } catch (error) {
    console.warn('[MVMF Bridge] Failed to push to MSF:', error);
    return false;
  }
}

/**
 * Register the pet's home as a spatial fabric node.
 */
export async function registerSpatialNode(
  _config: SpatialFabricConfig,
  petModel: MVMFPetModel,
  homeModel: MVMFHomeModel
): Promise<boolean> {
  console.log('[MVMF Bridge] Registering spatial node...');
  console.log(`[MVMF Bridge] MSF Service: ${RP1_CONFIG.msfServiceUrl}`);
  console.log(`[MVMF Bridge] Fabric CID: ${RP1_CONFIG.startCid}`);
  console.log(`[MVMF Bridge] Coordinates: ${RP1_CONFIG.lat}, ${RP1_CONFIG.lon}`);

  const healthy = await checkMSFHealth();
  if (!healthy) {
    console.warn('[MVMF Bridge] MSF service not available — will retry later');
    return false;
  }

  return await pushPetToMSF(petModel, homeModel);
}

/**
 * Get the RP1 fabric entry URL for deep-linking.
 */
export function getRP1FabricUrl(): string {
  return RP1_CONFIG.fabricUrl;
}

/**
 * Get the pets portal URL.
 */
export function getPetsPortalUrl(): string {
  return RP1_CONFIG.petsPortalUrl;
}

/**
 * Get the NSO service definition for the pet AI.
 */
export function getNSOServiceDefinition(): NSOPetService {
  return {
    serviceType: 'com.fabricpet.ai',
    endpoints: {
      getBehavior: `${RP1_CONFIG.msfServiceUrl}/api/pet/behavior`,
      interact: `${RP1_CONFIG.msfServiceUrl}/api/pet/interact`,
      battle: `${RP1_CONFIG.msfServiceUrl}/api/pet/battle`,
    },
  };
}

/**
 * Push Scene Assembler JSON to the MSF service.
 * This updates the RP1 world scene with ordinal inscription references.
 * The RP1 browser loads 3D models directly from ordinals.com URLs.
 *
 * All fetch calls have an 8-second timeout to prevent hanging.
 */
export async function pushSceneJSON(
  sceneJSON: unknown[],
  adminKey: string = 'P0rt3rT'
): Promise<boolean> {
  // Pre-check: is MSF even reachable? (5s timeout)
  const healthy = await checkMSFHealth();
  if (!healthy) {
    console.warn('[MVMF Bridge] MSF offline — skipping push, use clipboard fallback');
    return false;
  }

  try {
    // The Scene Assembler accepts JSON via its code editor endpoint
    const response = await fetch(`${RP1_CONFIG.msfServiceUrl}/api/scene/json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey,
      },
      body: JSON.stringify({
        key: adminKey,
        fabricUrl: RP1_CONFIG.fabricUrl,
        sceneData: sceneJSON,
        timestamp: Date.now(),
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      console.log('[MVMF Bridge] Scene JSON pushed to MSF service');
      return true;
    }

    // If the endpoint doesn't exist yet, try the general update (also with timeout)
    if (response.status === 404) {
      console.log('[MVMF Bridge] /api/scene/json not found, trying /api/scene/update');
      const fallback = await fetch(`${RP1_CONFIG.msfServiceUrl}/api/scene/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
        },
        body: JSON.stringify({
          key: adminKey,
          cid: RP1_CONFIG.startCid,
          sceneData: sceneJSON,
          timestamp: Date.now(),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (fallback.ok) {
        console.log('[MVMF Bridge] Scene JSON pushed via fallback endpoint');
        return true;
      }
    }

    console.warn('[MVMF Bridge] Scene push returned:', response.status);
    return false;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      console.warn('[MVMF Bridge] Scene push timed out after 8s');
    } else {
      console.warn('[MVMF Bridge] Failed to push scene JSON:', error);
    }
    return false;
  }
}

/**
 * Copy scene JSON to clipboard for manual paste into Scene Assembler code editor.
 * Fallback when API push doesn't work.
 */
export async function copySceneJSONToClipboard(sceneJSON: unknown[]): Promise<boolean> {
  try {
    const jsonStr = JSON.stringify(sceneJSON, null, 2);
    await navigator.clipboard.writeText(jsonStr);
    console.log('[MVMF Bridge] Scene JSON copied to clipboard');
    return true;
  } catch {
    console.warn('[MVMF Bridge] Clipboard write failed');
    return false;
  }
}

/**
 * Sync MVMF model state back to Nostr.
 */
export async function syncMVMFToNostr(
  _model: MVMFPetModel | MVMFHomeModel
): Promise<void> {
  // TODO: Convert MVMF model back to Nostr NIP-78 event and publish
  console.log('[MVMF Bridge] MVMF → Nostr sync pending implementation');
}
