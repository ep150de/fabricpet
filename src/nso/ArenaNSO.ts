/**
 * Arena NSO (Network Service Object)
 * 
 * RP1 service that manages the complete arena lifecycle.
 * Communicates via MVMF protocol for real-time state sync.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ArenaData,
  BiomeId,
  Vector3,
  SpatialCoordinate,
  MVMFModel,
  NSOEndpoint,
  ArenaStatus,
} from '../types/arenaTypes';

export interface ArenaNSOConfig {
  maxConcurrentArenas: number;
  arenaFootprintRadius: number;
  defaultBattleTimeout: number;
}

const DEFAULT_CONFIG: ArenaNSOConfig = {
  maxConcurrentArenas: 50,
  arenaFootprintRadius: 15,
  defaultBattleTimeout: 300000,
};

export class ArenaNSO {
  private config: ArenaNSOConfig;
  private activeArenas: Map<string, ArenaData> = new Map();
  private subscribers: Map<string, Array<(model: MVMFModel) => void>> = new Map();

  constructor(config?: Partial<ArenaNSOConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get NSO endpoint definitions
   */
  getEndpoints(): NSOEndpoint[] {
    return [
      { path: '/nso/arena/create', method: 'request', model: 'ArenaState' },
      { path: '/nso/arena/state', method: 'subscribe', model: 'ArenaState' },
      { path: '/nso/arena/update', method: 'publish', model: 'ArenaState' },
      { path: '/nso/arena/collapse', method: 'request', model: 'ArenaState' },
      { path: '/nso/arena/list', method: 'request', model: 'ArenaState' },
    ];
  }

  /**
   * Create a new arena at the specified position
   */
  createArena(params: {
    biomeId: BiomeId;
    position: SpatialCoordinate;
    radius?: number;
    creatorId: string;
  }): ArenaData | null {
    if (this.activeArenas.size >= this.config.maxConcurrentArenas) {
      console.warn('[ArenaNSO] Max concurrent arenas reached');
      return null;
    }

    // Check for overlapping arenas
    const radius = params.radius || this.config.arenaFootprintRadius;
    for (const arena of this.activeArenas.values()) {
      const dist = this.distance(arena.position, params.position);
      if (dist < arena.radius + radius) {
        console.warn('[ArenaNSO] Arena would overlap with existing arena');
        return null;
      }
    }

    const arenaData: ArenaData = {
      id: uuidv4(),
      status: 'dormant',
      biome: null as any, // Will be set by ArenaGenerator
      position: { ...params.position },
      radius,
      wallHeight: 10,
      materializationProgress: 0,
      collapseProgress: 0,
      createdAt: Date.now(),
    };

    this.activeArenas.set(arenaData.id, arenaData);
    this.broadcastState(arenaData);

    return arenaData;
  }

  /**
   * Update arena status
   */
  updateArenaStatus(arenaId: string, status: ArenaStatus): void {
    const arena = this.activeArenas.get(arenaId);
    if (!arena) return;

    arena.status = status;
    this.broadcastState(arena);
  }

  /**
   * Update arena materialization progress
   */
  updateMaterializationProgress(arenaId: string, progress: number): void {
    const arena = this.activeArenas.get(arenaId);
    if (!arena) return;

    arena.materializationProgress = progress;
    this.broadcastState(arena);
  }

  /**
   * Collapse an arena
   */
  collapseArena(arenaId: string): void {
    const arena = this.activeArenas.get(arenaId);
    if (!arena) return;

    arena.status = 'collapsing';
    this.broadcastState(arena);
  }

  /**
   * Remove a collapsed arena
   */
  removeArena(arenaId: string): void {
    this.activeArenas.delete(arenaId);
    this.subscribers.delete(arenaId);
  }

  /**
   * Get an arena by ID
   */
  getArena(arenaId: string): ArenaData | undefined {
    return this.activeArenas.get(arenaId);
  }

  /**
   * Get all active arenas
   */
  getActiveArenas(): ArenaData[] {
    return Array.from(this.activeArenas.values());
  }

  /**
   * Get arenas near a position
   */
  getArenasNear(position: Vector3, maxDistance: number): ArenaData[] {
    return this.getActiveArenas().filter(
      (arena) => this.distance(arena.position, position) <= maxDistance
    );
  }

  /**
   * Subscribe to arena state updates
   */
  subscribe(
    arenaId: string,
    callback: (model: MVMFModel) => void
  ): () => void {
    if (!this.subscribers.has(arenaId)) {
      this.subscribers.set(arenaId, []);
    }
    this.subscribers.get(arenaId)!.push(callback);

    return () => {
      const subs = this.subscribers.get(arenaId);
      if (subs) {
        const idx = subs.indexOf(callback);
        if (idx >= 0) subs.splice(idx, 1);
      }
    };
  }

  /**
   * Format arena state as MVMF model
   */
  formatMVMFModel(arena: ArenaData): MVMFModel {
    return {
      modelName: 'ArenaState',
      modelType: 'realtime',
      data: {
        arenaId: arena.id,
        status: arena.status,
        biomeId: arena.biome?.id,
        position: arena.position,
        radius: arena.radius,
        materializationProgress: arena.materializationProgress,
        collapseProgress: arena.collapseProgress,
        battleId: arena.battleId,
      },
      timestamp: Date.now(),
    };
  }

  // ---- Internal ----

  private broadcastState(arena: ArenaData): void {
    const model = this.formatMVMFModel(arena);
    const subs = this.subscribers.get(arena.id);
    if (subs) {
      subs.forEach((cb) => cb(model));
    }
  }

  private distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
