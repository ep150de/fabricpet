/**
 * Holodeck Effect
 * 
 * The signature visual effect — arena materializing from nothing.
 * Manages the phased appearance of grid, walls, environment, and atmosphere.
 */

import * as THREE from 'three';
import type { MaterializationPhase, BiomeDefinition } from '../types/arenaTypes';
import type { ArenaGeometry } from './ArenaGenerator';

export interface HolodeckEffectConfig {
  gridExpansionSpeed: number;
  wallRiseSpeed: number;
  biomeFillSpeed: number;
  atmosphereFadeSpeed: number;
  impactPulseRadius: number;
  impactPulseDuration: number;
}

const DEFAULT_CONFIG: HolodeckEffectConfig = {
  gridExpansionSpeed: 1.0,
  wallRiseSpeed: 1.0,
  biomeFillSpeed: 1.0,
  atmosphereFadeSpeed: 1.0,
  impactPulseRadius: 2.0,
  impactPulseDuration: 0.3,
};

export class HolodeckEffect {
  private geometry: ArenaGeometry;
  private biome: BiomeDefinition;
  private config: HolodeckEffectConfig;
  private impactPulse: THREE.Mesh | null = null;
  private isReversed: boolean = false;

  constructor(
    geometry: ArenaGeometry,
    biome: BiomeDefinition,
    config?: Partial<HolodeckEffectConfig>
  ) {
    this.geometry = geometry;
    this.biome = biome;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Start with everything invisible
    this.setAllVisibility(0);
  }

  /**
   * Update the materialization effect based on active phases
   */
  updateMaterialization(phases: MaterializationPhase[]): void {
    this.isReversed = false;

    for (const phase of phases) {
      switch (phase.name) {
        case 'impact':
          this.renderImpact(phase.progress);
          break;
        case 'grid_formation':
          this.renderGridFormation(phase.progress);
          break;
        case 'wall_rise':
          this.renderWallRise(phase.progress);
          break;
        case 'biome_fill':
          this.renderBiomeFill(phase.progress);
          break;
        case 'atmosphere':
          this.renderAtmosphere(phase.progress);
          break;
        case 'stabilize':
          this.renderStabilize(phase.progress);
          break;
      }
    }
  }

  /**
   * Update the collapse effect (reverse materialization)
   * @param progress - 0 to 1 (0 = fully materialized, 1 = fully collapsed)
   */
  updateCollapse(progress: number): void {
    this.isReversed = true;
    const reverseProgress = 1 - progress;

    // Reverse order: atmosphere → biome → walls → grid → gone
    if (reverseProgress > 0.75) {
      // Atmosphere fading
      this.renderAtmosphere((reverseProgress - 0.75) / 0.25);
    } else {
      this.setGroupOpacity(this.geometry.atmosphere, 0);
    }

    if (reverseProgress > 0.5) {
      this.renderBiomeFill(Math.min(1, (reverseProgress - 0.5) / 0.3));
    } else {
      this.setGroupOpacity(this.geometry.environment, 0);
    }

    if (reverseProgress > 0.25) {
      this.renderWallRise(Math.min(1, (reverseProgress - 0.25) / 0.35));
    } else {
      this.setGroupOpacity(this.geometry.walls, 0);
    }

    if (reverseProgress > 0) {
      this.renderGridFormation(Math.min(1, reverseProgress / 0.4));
    } else {
      this.setGroupOpacity(this.geometry.grid, 0);
      this.setGroupOpacity(this.geometry.floor, 0);
    }
  }

  // ---- Phase Renderers ----

  /**
   * Impact: Energy pulse ripples outward from center
   */
  private renderImpact(progress: number): void {
    if (!this.impactPulse) {
      const pulseGeometry = new THREE.RingGeometry(0, 0.1, 32);
      const pulseMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.biome.colors.primary),
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
      });
      this.impactPulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
      this.impactPulse.rotation.x = -Math.PI / 2;
      this.impactPulse.position.y = 0.05;
      this.geometry.grid.add(this.impactPulse);
    }

    const radius = progress * this.config.impactPulseRadius;
    this.impactPulse.scale.setScalar(radius * 10);
    (this.impactPulse.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
  }

  /**
   * Grid Formation: Holographic grid lines race outward from center
   */
  private renderGridFormation(progress: number): void {
    this.geometry.grid.visible = true;
    this.geometry.floor.visible = true;

    // Scale grid from center outward
    const scale = this.easeOutCubic(progress);
    this.geometry.grid.scale.setScalar(scale);

    // Floor fades in
    this.setGroupOpacity(this.geometry.floor, progress * 0.9);

    // Grid lines brighten
    this.setGroupOpacity(this.geometry.grid, progress * 0.8);

    // Remove impact pulse when grid is forming
    if (progress > 0.5 && this.impactPulse) {
      this.geometry.grid.remove(this.impactPulse);
      this.impactPulse = null;
    }
  }

  /**
   * Wall Rise: Vertical energy barriers rise from grid edges
   */
  private renderWallRise(progress: number): void {
    this.geometry.walls.visible = true;

    // Walls scale up from ground
    const wallScale = this.easeOutBack(progress);
    this.geometry.walls.scale.y = wallScale;

    // Walls fade in
    this.setGroupOpacity(this.geometry.walls, progress * 0.8);
  }

  /**
   * Biome Fill: Grid cells fill with biome-specific terrain
   */
  private renderBiomeFill(progress: number): void {
    this.geometry.environment.visible = true;

    // Environment elements fade in with slight scale animation
    const envScale = 0.5 + this.easeOutCubic(progress) * 0.5;
    this.geometry.environment.scale.setScalar(envScale);
    this.setGroupOpacity(this.geometry.environment, progress);
  }

  /**
   * Atmosphere: Sky/ceiling forms, ambient particles appear
   */
  private renderAtmosphere(progress: number): void {
    this.geometry.atmosphere.visible = true;

    // Atmosphere fades in
    this.setGroupOpacity(this.geometry.atmosphere, progress * 0.8);
  }

  /**
   * Stabilize: Final shimmer, arena solidifies
   */
  private renderStabilize(progress: number): void {
    // Subtle shimmer effect — briefly increase then normalize opacity
    const shimmer = 1 + Math.sin(progress * Math.PI * 4) * 0.1 * (1 - progress);

    this.geometry.grid.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        const mat = child.material as THREE.Material;
        if ('opacity' in mat) {
          (mat as any).opacity = Math.min(1, (mat as any).opacity * shimmer);
        }
      }
    });
  }

  // ---- Utility Methods ----

  /**
   * Set visibility of all arena geometry
   */
  private setAllVisibility(opacity: number): void {
    const groups = [
      this.geometry.floor,
      this.geometry.walls,
      this.geometry.environment,
      this.geometry.atmosphere,
      this.geometry.grid,
    ];

    for (const group of groups) {
      group.visible = opacity > 0;
      this.setGroupOpacity(group, opacity);
    }
  }

  /**
   * Set opacity for all materials in a group
   */
  private setGroupOpacity(group: THREE.Group, opacity: number): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line) {
        const material = child.material;
        if (material instanceof THREE.Material) {
          material.transparent = true;
          (material as any).opacity = opacity;
          material.needsUpdate = true;
        }
      }
    });
  }

  /**
   * Make everything fully visible (skip animation)
   */
  showAll(): void {
    this.setAllVisibility(1);
    this.geometry.grid.scale.setScalar(1);
    this.geometry.walls.scale.y = 1;
    this.geometry.environment.scale.setScalar(1);
  }

  /**
   * Make everything invisible
   */
  hideAll(): void {
    this.setAllVisibility(0);
  }

  // ---- Easing Functions ----

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}
