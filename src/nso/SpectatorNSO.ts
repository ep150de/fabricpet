/**
 * Spectator NSO (Network Service Object)
 * 
 * Manages spectator sessions for arena battles.
 * Handles spectator positions, camera feeds, and emote broadcasting.
 */

import type {
  SpectatorData,
  SpectatorSessionData,
  Vector3,
  MVMFModel,
  NSOEndpoint,
} from '../types/arenaTypes';

export interface SpectatorNSOConfig {
  maxSpectatorsPerArena: number;
  spectatorDetectionRadius: number;
}

const DEFAULT_CONFIG: SpectatorNSOConfig = {
  maxSpectatorsPerArena: 100,
  spectatorDetectionRadius: 50,
};

export class SpectatorNSO {
  private config: SpectatorNSOConfig;
  private sessions: Map<string, SpectatorSessionData> = new Map();
  private subscribers: Map<string, Array<(model: MVMFModel) => void>> = new Map();

  constructor(config?: Partial<SpectatorNSOConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getEndpoints(): NSOEndpoint[] {
    return [
      { path: '/nso/spectator/join', method: 'request', model: 'SpectatorState' },
      { path: '/nso/spectator/leave', method: 'request', model: 'SpectatorState' },
      { path: '/nso/spectator/state', method: 'subscribe', model: 'SpectatorState' },
      { path: '/nso/spectator/emote', method: 'publish', model: 'SpectatorState' },
    ];
  }

  /**
   * Create a spectator session for an arena
   */
  createSession(arenaId: string): SpectatorSessionData {
    const session: SpectatorSessionData = {
      arenaId,
      spectators: [],
      maxSpectators: this.config.maxSpectatorsPerArena,
    };
    this.sessions.set(arenaId, session);
    return session;
  }

  /**
   * Add a spectator to an arena session
   */
  joinAsSpectator(
    arenaId: string,
    userId: string,
    position: Vector3
  ): boolean {
    let session = this.sessions.get(arenaId);
    if (!session) {
      session = this.createSession(arenaId);
    }

    if (session.spectators.length >= session.maxSpectators) {
      return false;
    }

    // Check if already spectating
    if (session.spectators.find((s) => s.userId === userId)) {
      return true;
    }

    session.spectators.push({
      userId,
      position,
      cameraMode: 'auto',
      joinedAt: Date.now(),
    });

    this.broadcastState(arenaId);
    return true;
  }

  /**
   * Remove a spectator from an arena session
   */
  leaveSpectator(arenaId: string, userId: string): void {
    const session = this.sessions.get(arenaId);
    if (!session) return;

    session.spectators = session.spectators.filter(
      (s) => s.userId !== userId
    );

    this.broadcastState(arenaId);

    // Clean up empty sessions
    if (session.spectators.length === 0) {
      this.sessions.delete(arenaId);
    }
  }

  /**
   * Update spectator position
   */
  updateSpectatorPosition(
    arenaId: string,
    userId: string,
    position: Vector3
  ): void {
    const session = this.sessions.get(arenaId);
    if (!session) return;

    const spectator = session.spectators.find((s) => s.userId === userId);
    if (spectator) {
      spectator.position = position;
    }
  }

  /**
   * Set spectator camera mode
   */
  setSpectatorCameraMode(
    arenaId: string,
    userId: string,
    mode: 'free' | 'auto'
  ): void {
    const session = this.sessions.get(arenaId);
    if (!session) return;

    const spectator = session.spectators.find((s) => s.userId === userId);
    if (spectator) {
      spectator.cameraMode = mode;
    }
  }

  /**
   * Get spectator count for an arena
   */
  getSpectatorCount(arenaId: string): number {
    return this.sessions.get(arenaId)?.spectators.length || 0;
  }

  /**
   * Get session data
   */
  getSession(arenaId: string): SpectatorSessionData | undefined {
    return this.sessions.get(arenaId);
  }

  /**
   * Remove session when arena collapses
   */
  removeSession(arenaId: string): void {
    this.sessions.delete(arenaId);
    this.subscribers.delete(arenaId);
  }

  /**
   * Subscribe to spectator state updates
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

  private broadcastState(arenaId: string): void {
    const session = this.sessions.get(arenaId);
    if (!session) return;

    const model: MVMFModel = {
      modelName: 'SpectatorState',
      modelType: 'realtime',
      data: {
        arenaId,
        spectatorCount: session.spectators.length,
        spectators: session.spectators.map((s) => ({
          userId: s.userId,
          cameraMode: s.cameraMode,
        })),
      },
      timestamp: Date.now(),
    };

    const subs = this.subscribers.get(arenaId);
    if (subs) {
      subs.forEach((cb) => cb(model));
    }
  }
}
