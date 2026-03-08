/**
 * Matchmaking NSO (Network Service Object)
 * 
 * Handles finding opponents via proximity detection on the
 * RP1 spatial fabric and Nostr challenge relay.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  MatchmakingRequest,
  MatchmakingResult,
  MatchmakingMode,
  SpatialCoordinate,
  BiomeId,
  MVMFModel,
  NSOEndpoint,
} from '../types/arenaTypes';

export interface MatchmakingConfig {
  proximityRadius: number;
  queueTimeout: number;
  rankTolerance: number;
  maxQueueSize: number;
}

const DEFAULT_CONFIG: MatchmakingConfig = {
  proximityRadius: 30,
  queueTimeout: 60000,
  rankTolerance: 200,
  maxQueueSize: 100,
};

export class MatchmakingNSO {
  private config: MatchmakingConfig;
  private queue: Map<string, MatchmakingRequest> = new Map();
  private activeMatches: Map<string, { player1: string; player2: string }> = new Map();

  constructor(config?: Partial<MatchmakingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getEndpoints(): NSOEndpoint[] {
    return [
      { path: '/nso/matchmaking/join', method: 'request', model: 'MatchmakingQueue' },
      { path: '/nso/matchmaking/leave', method: 'request', model: 'MatchmakingQueue' },
      { path: '/nso/matchmaking/status', method: 'subscribe', model: 'MatchmakingQueue' },
      { path: '/nso/matchmaking/challenge', method: 'request', model: 'MatchmakingQueue' },
    ];
  }

  /**
   * Join the matchmaking queue
   */
  joinQueue(request: MatchmakingRequest): MatchmakingResult {
    if (this.queue.size >= this.config.maxQueueSize) {
      return { matched: false };
    }

    // Check for immediate match
    const match = this.findMatch(request);
    if (match) {
      return match;
    }

    // Add to queue
    this.queue.set(request.userId, request);

    // Set timeout to remove from queue
    setTimeout(() => {
      this.queue.delete(request.userId);
    }, this.config.queueTimeout);

    return { matched: false };
  }

  /**
   * Leave the matchmaking queue
   */
  leaveQueue(userId: string): void {
    this.queue.delete(userId);
  }

  /**
   * Direct challenge to a specific player
   */
  challenge(
    challengerId: string,
    targetId: string,
    position: SpatialCoordinate,
    biome?: BiomeId
  ): MatchmakingResult {
    const matchId = uuidv4();
    this.activeMatches.set(matchId, {
      player1: challengerId,
      player2: targetId,
    });

    // Calculate midpoint for arena
    const arenaPosition: SpatialCoordinate = { ...position };

    return {
      matched: true,
      opponentId: targetId,
      arenaPosition,
      biome,
      matchId,
    };
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Get players in queue near a position
   */
  getNearbyPlayers(position: SpatialCoordinate): string[] {
    const nearby: string[] = [];
    for (const [userId, request] of this.queue) {
      if (request.position) {
        const dist = this.distance(position, request.position);
        if (dist <= this.config.proximityRadius) {
          nearby.push(userId);
        }
      }
    }
    return nearby;
  }

  // ---- Internal ----

  private findMatch(request: MatchmakingRequest): MatchmakingResult | null {
    for (const [userId, queued] of this.queue) {
      if (userId === request.userId) continue;

      let isMatch = false;

      switch (request.mode) {
        case 'proximity':
          if (request.position && queued.position) {
            const dist = this.distance(request.position, queued.position);
            isMatch = dist <= this.config.proximityRadius;
          }
          break;

        case 'random_queue':
          // Match by rank tolerance
          isMatch =
            Math.abs(request.arenaRank - queued.arenaRank) <=
            this.config.rankTolerance;
          break;

        case 'tournament':
          // Tournament matching handled by TournamentNSO
          break;
      }

      if (isMatch) {
        this.queue.delete(userId);
        this.queue.delete(request.userId);

        const matchId = uuidv4();
        this.activeMatches.set(matchId, {
          player1: request.userId,
          player2: userId,
        });

        // Calculate arena position (midpoint)
        const arenaPosition: SpatialCoordinate =
          request.position && queued.position
            ? {
                x: (request.position.x + queued.position.x) / 2,
                y: 0,
                z: (request.position.z + queued.position.z) / 2,
              }
            : request.position || { x: 0, y: 0, z: 0 };

        // Select biome
        const biome = request.preferredBiome || queued.preferredBiome;

        return {
          matched: true,
          opponentId: userId,
          arenaPosition,
          biome,
          matchId,
        };
      }
    }

    return null;
  }

  private distance(a: SpatialCoordinate, b: SpatialCoordinate): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
