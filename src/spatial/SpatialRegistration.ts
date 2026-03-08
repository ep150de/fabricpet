/**
 * Spatial Registration
 * 
 * Registers and manages arena presence on the RP1 spatial fabric.
 * Handles arena discovery, spatial anchoring, and fabric connectivity.
 */

import type { ArenaData, SpatialCoordinate, Vector3 } from '../types/arenaTypes';

export interface SpatialRegistrationEntry {
  serviceId: string;
  arenaId: string;
  position: SpatialCoordinate;
  radius: number;
  metadata: {
    biome: string;
    status: string;
    playerCount: number;
    spectatorCount: number;
  };
  registeredAt: number;
}

export interface SpatialFabricConnection {
  isConnected: boolean;
  fabricUrl: string;
  serviceId: string;
}

export class SpatialRegistration {
  private registrations: Map<string, SpatialRegistrationEntry> = new Map();
  private connection: SpatialFabricConnection;

  constructor(fabricUrl: string = 'rp1.com/fabric') {
    this.connection = {
      isConnected: false,
      fabricUrl,
      serviceId: 'holoball-arena',
    };
  }

  /**
   * Connect to the RP1 spatial fabric
   */
  async connect(): Promise<boolean> {
    try {
      // In production, establish WebSocket/MVMF connection to RP1 fabric
      console.log(
        `[SpatialRegistration] Connecting to fabric: ${this.connection.fabricUrl}`
      );
      this.connection.isConnected = true;
      return true;
    } catch (error) {
      console.error('[SpatialRegistration] Connection failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from the spatial fabric
   */
  async disconnect(): Promise<void> {
    // Deregister all arenas
    for (const arenaId of this.registrations.keys()) {
      await this.deregisterArena(arenaId);
    }
    this.connection.isConnected = false;
  }

  /**
   * Register an arena on the spatial fabric
   */
  async registerArena(arena: ArenaData, spectatorCount: number = 0): Promise<boolean> {
    if (!this.connection.isConnected) {
      console.warn('[SpatialRegistration] Not connected to fabric');
      return false;
    }

    const entry: SpatialRegistrationEntry = {
      serviceId: this.connection.serviceId,
      arenaId: arena.id,
      position: arena.position as SpatialCoordinate,
      radius: arena.radius,
      metadata: {
        biome: arena.biome?.id || 'unknown',
        status: arena.status,
        playerCount: arena.battleId ? 2 : 0,
        spectatorCount,
      },
      registeredAt: Date.now(),
    };

    this.registrations.set(arena.id, entry);

    // In production, send registration to RP1 spatial fabric
    console.log(
      `[SpatialRegistration] Registered arena ${arena.id} at (${arena.position.x}, ${arena.position.y}, ${arena.position.z})`
    );

    return true;
  }

  /**
   * Update arena registration metadata
   */
  async updateArena(
    arenaId: string,
    updates: Partial<SpatialRegistrationEntry['metadata']>
  ): Promise<void> {
    const entry = this.registrations.get(arenaId);
    if (!entry) return;

    entry.metadata = { ...entry.metadata, ...updates };

    // In production, push update to RP1 spatial fabric
  }

  /**
   * Deregister an arena from the spatial fabric
   */
  async deregisterArena(arenaId: string): Promise<void> {
    this.registrations.delete(arenaId);

    // In production, send deregistration to RP1 spatial fabric
    console.log(`[SpatialRegistration] Deregistered arena ${arenaId}`);
  }

  /**
   * Get all registered arenas
   */
  getRegisteredArenas(): SpatialRegistrationEntry[] {
    return Array.from(this.registrations.values());
  }

  /**
   * Check if connected to fabric
   */
  isConnected(): boolean {
    return this.connection.isConnected;
  }
}
