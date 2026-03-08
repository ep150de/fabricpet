/**
 * HoloBall State Machine
 * 
 * Manages the lifecycle of a HoloBall deployment sequence:
 * idle → selected → thrown → opening → deployed → recalled → idle
 * 
 * Each state has entry/exit actions and timed transitions.
 */

import type { HoloBallState, HoloBallThrowParams, Vector3 } from '../types/arenaTypes';
import { HoloBall } from './HoloBall';

// Import arena config defaults
const DEFAULT_CONFIG = {
  throwSpeed: 20,
  throwArc: 0.6,
  openingDurationMs: 1500,
  beamHeight: 8,
  beamDurationMs: 2000,
  recallDurationMs: 1000,
};

export interface HoloBallStateMachineConfig {
  throwSpeed: number;
  throwArc: number;
  openingDurationMs: number;
  beamHeight: number;
  beamDurationMs: number;
  recallDurationMs: number;
}

export type HoloBallEvent =
  | { type: 'SELECT' }
  | { type: 'DESELECT' }
  | { type: 'THROW'; params: HoloBallThrowParams }
  | { type: 'LAND'; position: Vector3 }
  | { type: 'PET_EMERGED' }
  | { type: 'RECALL' }
  | { type: 'RECALL_COMPLETE' }
  | { type: 'RESET' };

export interface HoloBallPhaseInfo {
  state: HoloBallState;
  progress: number;
  elapsedMs: number;
  durationMs: number;
}

export class HoloBallStateMachine {
  private ball: HoloBall;
  private config: HoloBallStateMachineConfig;
  private phaseStartTime: number = 0;
  private currentPhaseDuration: number = 0;
  private eventListeners: Array<(event: HoloBallEvent, ball: HoloBall) => void> = [];

  constructor(ball: HoloBall, config?: Partial<HoloBallStateMachineConfig>) {
    this.ball = ball;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send an event to the state machine
   */
  send(event: HoloBallEvent): void {
    const currentState = this.ball.state;

    switch (event.type) {
      case 'SELECT':
        if (currentState === 'idle') {
          this.ball.select();
          this.startPhase(0); // No timed phase for selected
        }
        break;

      case 'DESELECT':
        if (currentState === 'selected') {
          this.ball.deselect();
        }
        break;

      case 'THROW':
        if (currentState === 'selected') {
          this.ball.throw(event.params);
          this.startPhase(0); // Physics-driven, no fixed duration
        }
        break;

      case 'LAND':
        if (currentState === 'thrown') {
          this.ball.open(event.position);
          this.startPhase(this.config.openingDurationMs);
        }
        break;

      case 'PET_EMERGED':
        if (currentState === 'opening') {
          this.ball.deploy();
          this.startPhase(0); // Deployed until recalled
        }
        break;

      case 'RECALL':
        if (currentState === 'deployed') {
          this.ball.recall();
          this.startPhase(this.config.recallDurationMs);
        }
        break;

      case 'RECALL_COMPLETE':
        if (currentState === 'recalled') {
          this.ball.returnToIdle();
        }
        break;

      case 'RESET':
        this.ball.returnToIdle();
        break;
    }

    this.notifyListeners(event);
  }

  /**
   * Update the state machine each frame
   * @param delta - Time delta in seconds
   */
  update(delta: number): void {
    const state = this.ball.state;

    switch (state) {
      case 'thrown':
        // Physics update — ball follows arc trajectory
        this.ball.updatePhysics(delta);
        break;

      case 'opening':
        // Timed animation — opening sequence
        this.ball.updateAnimation(delta, this.config.openingDurationMs);
        if (this.ball.animationProgress >= 1) {
          this.send({ type: 'PET_EMERGED' });
        }
        break;

      case 'recalled':
        // Timed animation — recall sequence
        this.ball.updateAnimation(delta, this.config.recallDurationMs);
        if (this.ball.animationProgress >= 1) {
          this.send({ type: 'RECALL_COMPLETE' });
        }
        break;
    }
  }

  /**
   * Get current phase information
   */
  getPhaseInfo(): HoloBallPhaseInfo {
    const elapsed = Date.now() - this.phaseStartTime;
    return {
      state: this.ball.state,
      progress: this.ball.animationProgress,
      elapsedMs: elapsed,
      durationMs: this.currentPhaseDuration,
    };
  }

  /**
   * Get the ball entity
   */
  getBall(): HoloBall {
    return this.ball;
  }

  /**
   * Get config
   */
  getConfig(): HoloBallStateMachineConfig {
    return { ...this.config };
  }

  // ---- Internal ----

  private startPhase(durationMs: number): void {
    this.phaseStartTime = Date.now();
    this.currentPhaseDuration = durationMs;
  }

  // ---- Event Listeners ----

  onEvent(listener: (event: HoloBallEvent, ball: HoloBall) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(event: HoloBallEvent): void {
    this.eventListeners.forEach((listener) => listener(event, this.ball));
  }
}
