/**
 * HoloBall Renderer
 * 
 * Three.js rendering logic for HoloBall visual states.
 * Creates and manages the 3D representation of a HoloBall,
 * including glow effects, particle trails, and opening animations.
 */

import * as THREE from 'three';
import { HoloBall } from './HoloBall';
import type { HoloBallState, ParticleConfig } from '../types/arenaTypes';

export interface HoloBallRenderState {
  mesh: THREE.Group;
  glowMesh: THREE.Mesh;
  particleSystem: THREE.Points | null;
  beamMesh: THREE.Mesh | null;
}

export class HoloBallRenderer {
  private ball: HoloBall;
  private group: THREE.Group;
  private shellMesh: THREE.Mesh;
  private innerGlowMesh: THREE.Mesh;
  private outerGlowMesh: THREE.Mesh;
  private particleSystem: THREE.Points | null = null;
  private beamGroup: THREE.Group | null = null;
  private crackLines: THREE.LineSegments | null = null;

  // Animation state
  private rotationAngle: number = 0;
  private hoverOffset: number = 0;
  private hoverTime: number = 0;

  constructor(ball: HoloBall) {
    this.ball = ball;
    this.group = new THREE.Group();
    this.group.name = `holoball-${ball.id}`;

    // Create the ball shell (translucent sphere)
    const shellGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.5,
    });
    this.shellMesh = new THREE.Mesh(shellGeometry, shellMaterial);
    this.group.add(this.shellMesh);

    // Inner glow (element-colored core)
    const innerGlowGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(ball.getGlowColor()),
      transparent: true,
      opacity: 0.6,
    });
    this.innerGlowMesh = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    this.group.add(this.innerGlowMesh);

    // Outer glow (bloom effect placeholder)
    const outerGlowGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(ball.getGlowColor()),
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    this.outerGlowMesh = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    this.group.add(this.outerGlowMesh);
  }

  /**
   * Get the Three.js group for this ball
   */
  getObject3D(): THREE.Group {
    return this.group;
  }

  /**
   * Update rendering each frame
   * @param delta - Time delta in seconds
   */
  update(delta: number): void {
    const state = this.ball.state;
    const progress = this.ball.animationProgress;

    // Update position from ball data
    const pos = this.ball.position;
    this.group.position.set(pos.x, pos.y, pos.z);

    // State-specific rendering
    switch (state) {
      case 'idle':
        this.renderIdle(delta);
        break;
      case 'selected':
        this.renderSelected(delta);
        break;
      case 'thrown':
        this.renderThrown(delta);
        break;
      case 'opening':
        this.renderOpening(delta, progress);
        break;
      case 'deployed':
        this.renderDeployed(delta);
        break;
      case 'recalled':
        this.renderRecalled(delta, progress);
        break;
      case 'empty':
        this.renderEmpty(delta);
        break;
    }

    // Update glow intensity
    const intensity = this.ball.getGlowIntensity();
    (this.innerGlowMesh.material as THREE.MeshBasicMaterial).opacity = intensity * 0.6;
    (this.outerGlowMesh.material as THREE.MeshBasicMaterial).opacity = intensity * 0.15;
  }

  // ---- State Renderers ----

  private renderIdle(delta: number): void {
    // Gentle hover and rotation
    this.hoverTime += delta;
    this.hoverOffset = Math.sin(this.hoverTime * 1.5) * 0.1;
    this.group.position.y += this.hoverOffset;

    this.rotationAngle += this.ball.getRotationSpeed() * delta;
    this.group.rotation.y = this.rotationAngle;

    // Pulse inner glow
    const pulse = 0.5 + Math.sin(this.hoverTime * 2) * 0.1;
    this.innerGlowMesh.scale.setScalar(pulse);

    // Ensure shell is visible
    this.shellMesh.visible = true;
    this.removeParticles();
    this.removeBeam();
  }

  private renderSelected(delta: number): void {
    // Brighter, faster rotation
    this.hoverTime += delta;
    this.hoverOffset = Math.sin(this.hoverTime * 2) * 0.15;
    this.group.position.y += this.hoverOffset;

    this.rotationAngle += this.ball.getRotationSpeed() * delta;
    this.group.rotation.y = this.rotationAngle;

    // Brighter pulse
    const pulse = 0.6 + Math.sin(this.hoverTime * 3) * 0.15;
    this.innerGlowMesh.scale.setScalar(pulse);

    // Add selection particle trail
    this.ensureParticles({
      count: 20,
      color: this.ball.getParticleColor(),
      size: 0.03,
      lifetime: 1.0,
      speed: 0.5,
      spread: 0.4,
      gravity: 0,
      emissionRate: 10,
    });
  }

  private renderThrown(delta: number): void {
    // Rapid spin with energy trail
    this.rotationAngle += this.ball.getRotationSpeed() * delta;
    this.group.rotation.y = this.rotationAngle;
    this.group.rotation.x = this.rotationAngle * 0.5;

    // Energy trail particles
    this.ensureParticles({
      count: 50,
      color: this.ball.getParticleColor(),
      size: 0.05,
      lifetime: 0.5,
      speed: 1.0,
      spread: 0.2,
      gravity: -2,
      emissionRate: 30,
    });
  }

  private renderOpening(delta: number, progress: number): void {
    // Phase 1 (0-0.3): Cracks appear
    if (progress < 0.3) {
      const crackProgress = progress / 0.3;
      this.showCracks(crackProgress);
      // Intensifying glow
      this.innerGlowMesh.scale.setScalar(0.6 + crackProgress * 0.4);
    }
    // Phase 2 (0.3-0.6): Shell splits, light burst
    else if (progress < 0.6) {
      const splitProgress = (progress - 0.3) / 0.3;
      this.splitShell(splitProgress);
      // Energy burst particles
      this.ensureParticles({
        count: 200,
        color: [this.ball.getParticleColor(), '#ffffff'],
        size: 0.08,
        lifetime: 1.5,
        speed: 3.0,
        spread: Math.PI,
        gravity: -1,
        emissionRate: 100,
      });
    }
    // Phase 3 (0.6-1.0): Beam shoots up, pet emerges
    else {
      const beamProgress = (progress - 0.6) / 0.4;
      this.showBeam(beamProgress);
      this.shellMesh.visible = false;
    }
  }

  private renderDeployed(delta: number): void {
    // Shell halves orbit above arena (simplified)
    this.shellMesh.visible = false;
    this.hoverTime += delta;

    // Subtle ambient particles
    this.ensureParticles({
      count: 10,
      color: this.ball.getParticleColor(),
      size: 0.02,
      lifetime: 2.0,
      speed: 0.2,
      spread: 0.5,
      gravity: 0.5,
      emissionRate: 5,
    });
  }

  private renderRecalled(delta: number, progress: number): void {
    // Reverse of opening — beam pulls pet in, shell reforms
    if (progress < 0.4) {
      // Beam active, pulling pet
      const beamProgress = 1 - progress / 0.4;
      this.showBeam(beamProgress);
    } else if (progress < 0.7) {
      // Shell reforms
      const reformProgress = (progress - 0.4) / 0.3;
      this.shellMesh.visible = true;
      this.shellMesh.scale.setScalar(reformProgress);
      this.removeBeam();
    } else {
      // Settle
      this.shellMesh.visible = true;
      this.shellMesh.scale.setScalar(1);
      this.removeParticles();
    }
  }

  private renderEmpty(delta: number): void {
    // Dim, slow rotation
    this.hoverTime += delta;
    this.rotationAngle += 0.1 * delta;
    this.group.rotation.y = this.rotationAngle;

    this.shellMesh.visible = true;
    (this.shellMesh.material as THREE.MeshPhysicalMaterial).opacity = 0.15;
    this.innerGlowMesh.visible = false;
    this.removeParticles();
    this.removeBeam();
  }

  // ---- Effect Helpers ----

  private showCracks(_progress: number): void {
    if (!this.crackLines) {
      // Create crack line geometry (simplified)
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        0, 0.3, 0, 0.1, -0.1, 0.2,
        0, 0.3, 0, -0.15, 0, 0.25,
        0, -0.3, 0, 0.12, 0.1, -0.2,
        0, -0.3, 0, -0.1, -0.05, -0.25,
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(this.ball.getGlowColor()),
        transparent: true,
        opacity: 0.8,
        linewidth: 2,
      });

      this.crackLines = new THREE.LineSegments(geometry, material);
      this.group.add(this.crackLines);
    }
  }

  private splitShell(progress: number): void {
    // Move shell halves apart (simplified — scale down shell)
    const separation = progress * 0.5;
    this.shellMesh.scale.setScalar(1 + separation);
    (this.shellMesh.material as THREE.MeshPhysicalMaterial).opacity = 0.3 * (1 - progress);

    if (this.crackLines) {
      this.group.remove(this.crackLines);
      this.crackLines = null;
    }
  }

  private showBeam(progress: number): void {
    if (!this.beamGroup) {
      this.beamGroup = new THREE.Group();

      // Beam cylinder
      const beamGeometry = new THREE.CylinderGeometry(0.1, 0.3, 8, 16, 1, true);
      const beamMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.ball.getGlowColor()),
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.position.y = 4;
      this.beamGroup.add(beam);

      // Core beam (brighter, thinner)
      const coreGeometry = new THREE.CylinderGeometry(0.03, 0.1, 8, 8, 1, true);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.position.y = 4;
      this.beamGroup.add(core);

      this.group.add(this.beamGroup);
    }

    // Scale beam by progress
    this.beamGroup.scale.y = progress;
    this.beamGroup.visible = true;
  }

  private ensureParticles(config: ParticleConfig): void {
    // Simplified particle system — in production, use a proper particle engine
    if (!this.particleSystem) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(config.count * 3);
      for (let i = 0; i < config.count * 3; i++) {
        positions[i] = (Math.random() - 0.5) * config.spread;
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const color = Array.isArray(config.color) ? config.color[0] : config.color;
      const material = new THREE.PointsMaterial({
        color: new THREE.Color(color),
        size: config.size,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      });

      this.particleSystem = new THREE.Points(geometry, material);
      this.group.add(this.particleSystem);
    }
  }

  private removeParticles(): void {
    if (this.particleSystem) {
      this.group.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
      this.particleSystem = null;
    }
  }

  private removeBeam(): void {
    if (this.beamGroup) {
      this.beamGroup.visible = false;
    }
  }

  // ---- Cleanup ----

  dispose(): void {
    this.removeParticles();
    this.shellMesh.geometry.dispose();
    (this.shellMesh.material as THREE.Material).dispose();
    this.innerGlowMesh.geometry.dispose();
    (this.innerGlowMesh.material as THREE.Material).dispose();
    this.outerGlowMesh.geometry.dispose();
    (this.outerGlowMesh.material as THREE.Material).dispose();

    if (this.beamGroup) {
      this.beamGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    }

    if (this.crackLines) {
      this.crackLines.geometry.dispose();
      (this.crackLines.material as THREE.Material).dispose();
    }
  }
}
