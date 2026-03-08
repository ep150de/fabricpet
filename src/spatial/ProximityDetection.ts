/**
 * Proximity Detection
 * 
 * Detects nearby players and arenas on the RP1 spatial fabric.
 * Used for organic matchmaking and spectator discovery.
 */

import type { Vector3, SpatialCoordinate } from '../types/arenaTypes';

export interface NearbyEntity {
  id: string;
  type: 'player' | 'arena';
  position: SpatialCoordinate;
  distance: number;
  metadata?: Record<string, any>;
}

export interface ProximityConfig {
  detectionRadius: number;
  updateIntervalMs: number;
  challengeRadius: number;
  spectatorRadius: number;
}

const DEFAULT_CONFIG: ProximityConfig = {
  detectionRadius: 50,
  updateIntervalMs: 1000,
  challengeRadius: 20,
  spectatorRadius: 30,
};

export class ProximityDetection {
  private config: ProximityConfig;
  private knownEntities: Map<string, NearbyEntity> = new Map();
  private listeners: Array<(entities: NearbyEntity[]) => void> = [];
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private currentPosition: SpatialCoordinate = { x: 0, y: 0, z: 0 };

  constructor(config?: Partial<ProximityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start proximity scanning
   */
  start(): void {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      this.scan();
    }, this.config.updateIntervalMs);
  }

  /**
   * Stop proximity scanning
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update the local player's position
   */
  updatePosition(position: SpatialCoordinate): void {
    this.currentPosition = { ...position };
  }

  /**
   * Register a known entity (from spatial fabric updates)
   */
  registerEntity(entity: NearbyEntity): void {
    this.knownEntities.set(entity.id, entity);
  }

  /**
   * Remove an entity
   */
  removeEntity(id: string): void {
    this.knownEntities.delete(id);
  }

  /**
   * Get all nearby entities within detection radius
   */
  getNearbyEntities(): NearbyEntity[] {
    const nearby: NearbyEntity[] = [];

    for (const entity of this.knownEntities.values()) {
      const dist = this.distance(this.currentPosition, entity.position);
      if (dist <= this.config.detectionRadius) {
        nearby.push({ ...entity, distance: dist });
      }
    }

    return nearby.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get players within challenge range
   */
  getChallengeable(): NearbyEntity[] {
    return this.getNearbyEntities().filter(
      (e) => e.type === 'player' && e.distance <= this.config.challengeRadius
    );
  }

  /**
   * Get arenas within spectator range
   */
  getSpectatable(): NearbyEntity[] {
    return this.getNearbyEntities().filter(
      (e) => e.type === 'arena' && e.distance <= this.config.spectatorRadius
    );
  }

  /**
   * Subscribe to proximity updates
   */
  onUpdate(listener: (entities: NearbyEntity[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // ---- Internal ----

  private scan(): void {
    const nearby = this.getNearbyEntities();
    this.listeners.forEach((listener) => listener(nearby));
  }

  private distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
