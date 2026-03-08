/**
 * Battle Camera
 * 
 * Dynamic camera system that enhances battle drama with
 * cinematic angles, tracking shots, and impact effects.
 */

import * as THREE from 'three';
import type { CameraMode, CameraState, Vector3 } from '../../types/arenaTypes';

export interface BattleCameraConfig {
  orbitSpeed: number;
  orbitDistance: number;
  orbitHeight: number;
  transitionSpeed: number;
  shakeDecay: number;
  fovDefault: number;
  fovZoomed: number;
}

const DEFAULT_CONFIG: BattleCameraConfig = {
  orbitSpeed: 0.3,
  orbitDistance: 12,
  orbitHeight: 6,
  transitionSpeed: 2.0,
  shakeDecay: 5.0,
  fovDefault: 60,
  fovZoomed: 45,
};

export class BattleCamera {
  private camera: THREE.PerspectiveCamera;
  private config: BattleCameraConfig;
  private currentState: CameraState;
  private targetState: CameraState;
  private orbitAngle: number = 0;
  private shakeOffset: THREE.Vector3 = new THREE.Vector3();
  private arenaCenter: Vector3 = { x: 0, y: 0, z: 0 };

  constructor(
    camera: THREE.PerspectiveCamera,
    config?: Partial<BattleCameraConfig>
  ) {
    this.camera = camera;
    this.config = { ...DEFAULT_CONFIG, ...config };

    const defaultState: CameraState = {
      mode: 'orbit',
      position: { x: 0, y: this.config.orbitHeight, z: this.config.orbitDistance },
      target: { x: 0, y: 1, z: 0 },
      fov: this.config.fovDefault,
      shakeIntensity: 0,
      transitionDuration: 0.5,
    };

    this.currentState = { ...defaultState };
    this.targetState = { ...defaultState };
  }

  /**
   * Set the arena center position
   */
  setArenaCenter(center: Vector3): void {
    this.arenaCenter = { ...center };
  }

  /**
   * Switch camera mode
   */
  setMode(mode: CameraMode, target?: Vector3): void {
    switch (mode) {
      case 'orbit':
        this.targetState = {
          mode: 'orbit',
          position: this.getOrbitPosition(),
          target: { ...this.arenaCenter, y: 1 },
          fov: this.config.fovDefault,
          shakeIntensity: 0,
          transitionDuration: 1.0,
        };
        break;

      case 'move_selection':
        if (target) {
          this.targetState = {
            mode: 'move_selection',
            position: {
              x: target.x + 3,
              y: target.y + 3,
              z: target.z + 3,
            },
            target: { x: target.x, y: target.y + 1, z: target.z },
            fov: this.config.fovZoomed,
            shakeIntensity: 0,
            transitionDuration: 0.5,
          };
        }
        break;

      case 'attack':
        if (target) {
          this.targetState = {
            mode: 'attack',
            position: {
              x: (this.currentState.position.x + target.x) / 2,
              y: 4,
              z: (this.currentState.position.z + target.z) / 2 + 5,
            },
            target: { x: target.x, y: target.y + 1, z: target.z },
            fov: this.config.fovDefault,
            shakeIntensity: 0,
            transitionDuration: 0.3,
          };
        }
        break;

      case 'impact':
        if (target) {
          this.targetState = {
            mode: 'impact',
            position: {
              x: target.x + 2,
              y: target.y + 2,
              z: target.z + 2,
            },
            target: { x: target.x, y: target.y + 1, z: target.z },
            fov: this.config.fovZoomed,
            shakeIntensity: 0.3,
            transitionDuration: 0.1,
          };
        }
        break;

      case 'critical':
        if (target) {
          this.targetState = {
            mode: 'critical',
            position: {
              x: target.x + 1.5,
              y: target.y + 1.5,
              z: target.z + 1.5,
            },
            target: { x: target.x, y: target.y + 1, z: target.z },
            fov: 35, // Extra zoom for critical
            shakeIntensity: 0.5,
            transitionDuration: 0.05,
          };
        }
        break;

      case 'victory':
        if (target) {
          this.targetState = {
            mode: 'victory',
            position: {
              x: target.x + 5,
              y: target.y + 4,
              z: target.z + 5,
            },
            target: { x: target.x, y: target.y + 1, z: target.z },
            fov: this.config.fovDefault,
            shakeIntensity: 0,
            transitionDuration: 2.0,
          };
        }
        break;

      case 'free':
        // Don't change target — user controls
        this.targetState.mode = 'free';
        break;
    }
  }

  /**
   * Update camera each frame
   */
  update(delta: number): void {
    // Update orbit angle
    if (
      this.targetState.mode === 'orbit' ||
      this.targetState.mode === 'victory'
    ) {
      this.orbitAngle += this.config.orbitSpeed * delta;
      if (this.targetState.mode === 'orbit') {
        this.targetState.position = this.getOrbitPosition();
      }
      if (this.targetState.mode === 'victory') {
        // Slow cinematic orbit around winner
        const victoryRadius = 5;
        this.targetState.position = {
          x: this.targetState.target.x + Math.cos(this.orbitAngle * 0.5) * victoryRadius,
          y: this.targetState.target.y + 4,
          z: this.targetState.target.z + Math.sin(this.orbitAngle * 0.5) * victoryRadius,
        };
      }
    }

    // Interpolate position
    const lerpFactor = Math.min(1, delta * this.config.transitionSpeed / this.targetState.transitionDuration);

    this.currentState.position.x = THREE.MathUtils.lerp(
      this.currentState.position.x,
      this.targetState.position.x,
      lerpFactor
    );
    this.currentState.position.y = THREE.MathUtils.lerp(
      this.currentState.position.y,
      this.targetState.position.y,
      lerpFactor
    );
    this.currentState.position.z = THREE.MathUtils.lerp(
      this.currentState.position.z,
      this.targetState.position.z,
      lerpFactor
    );

    // Interpolate target
    this.currentState.target.x = THREE.MathUtils.lerp(
      this.currentState.target.x,
      this.targetState.target.x,
      lerpFactor
    );
    this.currentState.target.y = THREE.MathUtils.lerp(
      this.currentState.target.y,
      this.targetState.target.y,
      lerpFactor
    );
    this.currentState.target.z = THREE.MathUtils.lerp(
      this.currentState.target.z,
      this.targetState.target.z,
      lerpFactor
    );

    // Interpolate FOV
    this.currentState.fov = THREE.MathUtils.lerp(
      this.currentState.fov,
      this.targetState.fov,
      lerpFactor
    );

    // Camera shake
    if (this.currentState.shakeIntensity > 0.01) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.currentState.shakeIntensity,
        (Math.random() - 0.5) * this.currentState.shakeIntensity,
        (Math.random() - 0.5) * this.currentState.shakeIntensity
      );
      this.currentState.shakeIntensity *= Math.exp(
        -this.config.shakeDecay * delta
      );
    } else {
      this.shakeOffset.set(0, 0, 0);
      this.currentState.shakeIntensity = 0;
    }

    // Apply shake from target
    if (this.targetState.shakeIntensity > 0) {
      this.currentState.shakeIntensity = Math.max(
        this.currentState.shakeIntensity,
        this.targetState.shakeIntensity
      );
      this.targetState.shakeIntensity = 0; // One-shot
    }

    // Apply to Three.js camera
    this.camera.position.set(
      this.currentState.position.x + this.shakeOffset.x,
      this.currentState.position.y + this.shakeOffset.y,
      this.currentState.position.z + this.shakeOffset.z
    );
    this.camera.lookAt(
      this.currentState.target.x,
      this.currentState.target.y,
      this.currentState.target.z
    );
    this.camera.fov = this.currentState.fov;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Get current camera state
   */
  getState(): CameraState {
    return { ...this.currentState };
  }

  // ---- Internal ----

  private getOrbitPosition(): Vector3 {
    return {
      x: this.arenaCenter.x + Math.cos(this.orbitAngle) * this.config.orbitDistance,
      y: this.arenaCenter.y + this.config.orbitHeight,
      z: this.arenaCenter.z + Math.sin(this.orbitAngle) * this.config.orbitDistance,
    };
  }
}
