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

/**
 * Check if the MSF Map Service is reachable.
 */
export async function checkMSFHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${RP1_CONFIG.msfServiceUrl}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    console.warn('[MVMF Bridge] MSF service not reachable');
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
 * Sync MVMF model state back to Nostr.
 */
export async function syncMVMFToNostr(
  _model: MVMFPetModel | MVMFHomeModel
): Promise<void> {
  // TODO: Convert MVMF model back to Nostr NIP-78 event and publish
  console.log('[MVMF Bridge] MVMF → Nostr sync pending implementation');
}
