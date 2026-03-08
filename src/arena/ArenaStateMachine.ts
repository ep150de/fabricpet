/**
 * Arena State Machine
 * 
 * Manages the lifecycle of a battle arena:
 * dormant → materializing → active → resolving → collapsing → dormant
 */

import type { ArenaStatus, ArenaData, MaterializationPhase } from '../types/arenaTypes';

export type ArenaEvent =
  | { type: 'DEPLOY'; arenaData: ArenaData }
  | { type: 'MATERIALIZATION_COMPLETE' }
  | { type: 'BATTLE_START' }
  | { type: 'BATTLE_END'; winnerId: string }
  | { type: 'RESOLVE_COMPLETE' }
  | { type: 'COLLAPSE_COMPLETE' }
  | { type: 'FORCE_COLLAPSE' }
  | { type: 'RESET' };

export interface ArenaStateMachineConfig {
  materializationDurationMs: number;
  collapseDurationMs: number;
  resolveDelayMs: number;
}

const DEFAULT_CONFIG: ArenaStateMachineConfig = {
  materializationDurationMs: 3000,
  collapseDurationMs: 2000,
  resolveDelayMs: 3000,
};

// Materialization phases with timing
const MATERIALIZATION_PHASES: Omit<MaterializationPhase, 'progress'>[] = [
  { name: 'impact', startTime: 0, endTime: 0.1 },
  { name: 'grid_formation', startTime: 0, endTime: 0.33 },
  { name: 'wall_rise', startTime: 0.17, endTime: 0.67 },
  { name: 'biome_fill', startTime: 0.33, endTime: 0.83 },
  { name: 'atmosphere', startTime: 0.5, endTime: 1.0 },
  { name: 'stabilize', startTime: 0.83, endTime: 1.0 },
];

export class ArenaStateMachine {
  private arenaData: ArenaData | null = null;
  private config: ArenaStateMachineConfig;
  private phaseStartTime: number = 0;
  private winnerId: string | null = null;
  private eventListeners: Array<(event: ArenaEvent) => void> = [];

  constructor(config?: Partial<ArenaStateMachineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current arena status
   */
  get status(): ArenaStatus {
    return this.arenaData?.status ?? 'dormant';
  }

  /**
   * Get arena data
   */
  get data(): ArenaData | null {
    return this.arenaData;
  }

  /**
   * Send an event to the state machine
   */
  send(event: ArenaEvent): void {
    const currentStatus = this.status;

    switch (event.type) {
      case 'DEPLOY':
        if (currentStatus === 'dormant') {
          this.arenaData = { ...event.arenaData, status: 'materializing' };
          this.phaseStartTime = Date.now();
        }
        break;

      case 'MATERIALIZATION_COMPLETE':
        if (currentStatus === 'materializing') {
          this.arenaData!.status = 'active';
          this.arenaData!.materializationProgress = 1;
        }
        break;

      case 'BATTLE_START':
        // Arena is already active, battle begins
        break;

      case 'BATTLE_END':
        if (currentStatus === 'active') {
          this.arenaData!.status = 'resolving';
          this.winnerId = event.winnerId;
          this.phaseStartTime = Date.now();
        }
        break;

      case 'RESOLVE_COMPLETE':
        if (currentStatus === 'resolving') {
          this.arenaData!.status = 'collapsing';
          this.phaseStartTime = Date.now();
        }
        break;

      case 'COLLAPSE_COMPLETE':
        if (currentStatus === 'collapsing') {
          this.arenaData!.status = 'dormant';
          this.arenaData!.collapseProgress = 1;
        }
        break;

      case 'FORCE_COLLAPSE':
        if (currentStatus === 'active' || currentStatus === 'resolving') {
          this.arenaData!.status = 'collapsing';
          this.phaseStartTime = Date.now();
        }
        break;

      case 'RESET':
        this.arenaData = null;
        this.winnerId = null;
        break;
    }

    this.notifyListeners(event);
  }

  /**
   * Update the state machine each frame
   * @param delta - Time delta in seconds
   */
  update(delta: number): void {
    if (!this.arenaData) return;

    switch (this.arenaData.status) {
      case 'materializing': {
        const elapsed = Date.now() - this.phaseStartTime;
        const progress = Math.min(1, elapsed / this.config.materializationDurationMs);
        this.arenaData.materializationProgress = progress;

        if (progress >= 1) {
          this.send({ type: 'MATERIALIZATION_COMPLETE' });
        }
        break;
      }

      case 'resolving': {
        const elapsed = Date.now() - this.phaseStartTime;
        if (elapsed >= this.config.resolveDelayMs) {
          this.send({ type: 'RESOLVE_COMPLETE' });
        }
        break;
      }

      case 'collapsing': {
        const elapsed = Date.now() - this.phaseStartTime;
        const progress = Math.min(1, elapsed / this.config.collapseDurationMs);
        this.arenaData.collapseProgress = progress;

        if (progress >= 1) {
          this.send({ type: 'COLLAPSE_COMPLETE' });
        }
        break;
      }
    }
  }

  /**
   * Get the current materialization phase details
   */
  getCurrentMaterializationPhase(): MaterializationPhase | null {
    if (!this.arenaData || this.arenaData.status !== 'materializing') return null;

    const overallProgress = this.arenaData.materializationProgress;

    for (const phase of MATERIALIZATION_PHASES) {
      if (overallProgress >= phase.startTime && overallProgress <= phase.endTime) {
        const phaseProgress =
          (overallProgress - phase.startTime) / (phase.endTime - phase.startTime);
        return { ...phase, progress: Math.min(1, Math.max(0, phaseProgress)) };
      }
    }

    return null;
  }

  /**
   * Get all active materialization phases (phases can overlap)
   */
  getActiveMaterializationPhases(): MaterializationPhase[] {
    if (!this.arenaData || this.arenaData.status !== 'materializing') return [];

    const overallProgress = this.arenaData.materializationProgress;
    const activePhases: MaterializationPhase[] = [];

    for (const phase of MATERIALIZATION_PHASES) {
      if (overallProgress >= phase.startTime && overallProgress <= phase.endTime) {
        const phaseProgress =
          (overallProgress - phase.startTime) / (phase.endTime - phase.startTime);
        activePhases.push({
          ...phase,
          progress: Math.min(1, Math.max(0, phaseProgress)),
        });
      }
    }

    return activePhases;
  }

  /**
   * Get the winner ID (after battle end)
   */
  getWinnerId(): string | null {
    return this.winnerId;
  }

  // ---- Event Listeners ----

  onEvent(listener: (event: ArenaEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(event: ArenaEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }
}
