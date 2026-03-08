/**
 * Battle Visualizer
 * 
 * Maps battle events from FabricPet's BattleEngine to 3D animations.
 * Coordinates move animations, status effects, damage numbers,
 * and camera movements for dramatic battle presentation.
 */

import * as THREE from 'three';
import type { BattleTurnResult, ElementType, Vector3, CameraMode } from '../../types/arenaTypes';
import type { BattleEvent } from './ArenaBattleManager';

export interface VisualizationConfig {
  moveAnimationDurationMs: number;
  statusEffectDurationMs: number;
  hitFlashDurationMs: number;
  victoryAnimationDurationMs: number;
  xpAnimationDurationMs: number;
  damageNumberRiseSpeed: number;
  damageNumberLifetime: number;
}

const DEFAULT_CONFIG: VisualizationConfig = {
  moveAnimationDurationMs: 1200,
  statusEffectDurationMs: 800,
  hitFlashDurationMs: 200,
  victoryAnimationDurationMs: 3000,
  xpAnimationDurationMs: 1500,
  damageNumberRiseSpeed: 2.0,
  damageNumberLifetime: 1.5,
};

export interface AnimationRequest {
  type: 'move' | 'hit' | 'status' | 'faint' | 'victory' | 'damage_number';
  data: any;
  startTime: number;
  duration: number;
  isComplete: boolean;
}

export class BattleVisualizer {
  private scene: THREE.Scene;
  private config: VisualizationConfig;
  private activeAnimations: AnimationRequest[] = [];
  private petPositions: Map<string, Vector3> = new Map();
  private cameraCallback: ((mode: CameraMode, target?: Vector3) => void) | null = null;

  constructor(scene: THREE.Scene, config?: Partial<VisualizationConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set pet positions in the arena
   */
  setPetPosition(petOwnerId: string, position: Vector3): void {
    this.petPositions.set(petOwnerId, position);
  }

  /**
   * Set camera control callback
   */
  setCameraCallback(
    callback: (mode: CameraMode, target?: Vector3) => void
  ): void {
    this.cameraCallback = callback;
  }

  /**
   * Animate a battle turn result
   */
  async animateResult(result: BattleTurnResult): Promise<void> {
    const attackerPos = this.petPositions.get(result.attackerId);
    const defenderPos = this.petPositions.get(result.defenderId);

    if (!attackerPos || !defenderPos) return;

    // 1. Camera focuses on attacker
    this.requestCamera('move_selection', attackerPos);
    await this.delay(300);

    // 2. Play move animation
    await this.animateMove(
      result.moveType,
      result.moveCategory,
      attackerPos,
      defenderPos
    );

    // 3. Camera follows to impact
    if (result.isCritical) {
      this.requestCamera('critical', defenderPos);
    } else {
      this.requestCamera('impact', defenderPos);
    }

    // 4. Hit flash
    this.animateHitFlash(defenderPos, result.isCritical);
    await this.delay(this.config.hitFlashDurationMs);

    // 5. Damage number
    if (result.damage > 0) {
      this.showDamageNumber(
        defenderPos,
        result.damage,
        result.isCritical,
        result.effectiveness
      );
    }

    // 6. Status effect
    if (result.statusApplied) {
      await this.animateStatusApply(defenderPos, result.statusApplied);
    }
    if (result.statusCleared) {
      this.animateStatusClear(defenderPos, result.statusCleared);
    }

    // 7. Faint animation
    if (result.isFainted) {
      await this.animateFaint(defenderPos);
    }

    // 8. Return camera to orbit
    this.requestCamera('orbit');
  }

  /**
   * Play victory animation
   */
  async animateVictory(winnerPosition: Vector3): Promise<void> {
    this.requestCamera('victory', winnerPosition);

    // Victory particle burst
    const particles = this.createParticleBurst(
      winnerPosition,
      ['#ffdd00', '#ffffff', '#ff8800'],
      300,
      3.0
    );
    this.scene.add(particles);

    // Schedule cleanup
    this.scheduleAnimation({
      type: 'victory',
      data: { particles },
      startTime: Date.now(),
      duration: this.config.victoryAnimationDurationMs,
      isComplete: false,
    });
  }

  /**
   * Update active animations each frame
   */
  update(delta: number): void {
    const now = Date.now();

    for (const anim of this.activeAnimations) {
      if (anim.isComplete) continue;

      const elapsed = now - anim.startTime;
      const progress = Math.min(1, elapsed / anim.duration);

      switch (anim.type) {
        case 'damage_number':
          this.updateDamageNumber(anim, progress);
          break;
        case 'victory':
          this.updateVictoryAnimation(anim, progress);
          break;
      }

      if (progress >= 1) {
        anim.isComplete = true;
        this.cleanupAnimation(anim);
      }
    }

    // Remove completed animations
    this.activeAnimations = this.activeAnimations.filter((a) => !a.isComplete);
  }

  // ---- Move Animations ----

  private async animateMove(
    moveType: ElementType,
    category: string,
    from: Vector3,
    to: Vector3
  ): Promise<void> {
    const color = this.getElementColor(moveType);

    switch (category) {
      case 'projectile':
        await this.animateProjectile(from, to, color);
        break;
      case 'contact':
        await this.animateContact(from, to, color);
        break;
      case 'area':
        await this.animateArea(to, color);
        break;
      case 'buff':
        await this.animateBuff(from, color);
        break;
      case 'status':
        await this.animateStatusMove(to, color);
        break;
      default:
        await this.animateProjectile(from, to, color);
    }
  }

  private async animateProjectile(
    from: Vector3,
    to: Vector3,
    color: string
  ): Promise<void> {
    // Create projectile sphere
    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.9,
    });
    const projectile = new THREE.Mesh(geometry, material);
    projectile.position.set(from.x, from.y + 1, from.z);
    this.scene.add(projectile);

    // Animate projectile travel
    const duration = this.config.moveAnimationDurationMs;
    const startTime = Date.now();

    await new Promise<void>((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = this.easeInOutCubic(t);

        projectile.position.lerpVectors(
          new THREE.Vector3(from.x, from.y + 1, from.z),
          new THREE.Vector3(to.x, to.y + 1, to.z),
          eased
        );

        // Arc upward in the middle
        projectile.position.y += Math.sin(t * Math.PI) * 2;

        // Scale pulse
        const scale = 1 + Math.sin(t * Math.PI * 4) * 0.2;
        projectile.scale.setScalar(scale);

        if (t >= 1) {
          this.scene.remove(projectile);
          geometry.dispose();
          material.dispose();
          resolve();
        } else {
          requestAnimationFrame(animate);
        }
      };
      animate();
    });
  }

  private async animateContact(
    from: Vector3,
    to: Vector3,
    color: string
  ): Promise<void> {
    // Quick dash effect
    await this.delay(this.config.moveAnimationDurationMs * 0.3);
    // Impact at target
    this.createImpactFlash(to, color);
    await this.delay(this.config.moveAnimationDurationMs * 0.7);
  }

  private async animateArea(target: Vector3, color: string): Promise<void> {
    // Expanding ring effect at target
    const geometry = new THREE.RingGeometry(0, 0.1, 32);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.set(target.x, 0.1, target.z);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);

    const duration = this.config.moveAnimationDurationMs;
    const startTime = Date.now();

    await new Promise<void>((resolve) => {
      const animate = () => {
        const t = Math.min(1, (Date.now() - startTime) / duration);
        ring.scale.setScalar(1 + t * 5);
        material.opacity = 0.8 * (1 - t);

        if (t >= 1) {
          this.scene.remove(ring);
          geometry.dispose();
          material.dispose();
          resolve();
        } else {
          requestAnimationFrame(animate);
        }
      };
      animate();
    });
  }

  private async animateBuff(target: Vector3, color: string): Promise<void> {
    // Rising sparkle effect
    const particles = this.createParticleBurst(target, [color], 50, 2.0);
    this.scene.add(particles);
    await this.delay(this.config.moveAnimationDurationMs);
    this.scene.remove(particles);
    particles.geometry.dispose();
    (particles.material as THREE.Material).dispose();
  }

  private async animateStatusMove(
    target: Vector3,
    color: string
  ): Promise<void> {
    await this.animateArea(target, color);
  }

  // ---- Hit & Status Effects ----

  private animateHitFlash(position: Vector3, isCritical: boolean): void {
    const size = isCritical ? 1.5 : 0.8;
    const flash = this.createImpactFlash(position, isCritical ? '#ffffff' : '#ffff00');
    flash.scale.setScalar(size);
  }

  private async animateStatusApply(
    position: Vector3,
    status: string
  ): Promise<void> {
    const statusColors: Record<string, string> = {
      Sleepy: '#9999ff',
      Dizzy: '#ffff00',
      Dazzled: '#ff88ff',
      Charmed: '#ff4488',
      Pumped: '#ff8800',
    };
    const color = statusColors[status] || '#ffffff';

    // Swirling particles around target
    const particles = this.createParticleBurst(position, [color], 30, 1.5);
    this.scene.add(particles);
    await this.delay(this.config.statusEffectDurationMs);
    this.scene.remove(particles);
    particles.geometry.dispose();
    (particles.material as THREE.Material).dispose();
  }

  private animateStatusClear(position: Vector3, status: string): void {
    // Quick dissipation effect
    const particles = this.createParticleBurst(position, ['#ffffff'], 20, 1.0);
    this.scene.add(particles);
    setTimeout(() => {
      this.scene.remove(particles);
      particles.geometry.dispose();
      (particles.material as THREE.Material).dispose();
    }, 500);
  }

  private async animateFaint(position: Vector3): Promise<void> {
    // Dissolve into particles effect
    const particles = this.createParticleBurst(
      position,
      ['#888888', '#444444'],
      100,
      2.0
    );
    this.scene.add(particles);
    await this.delay(2000);
    this.scene.remove(particles);
    particles.geometry.dispose();
    (particles.material as THREE.Material).dispose();
  }

  // ---- Damage Numbers ----

  private showDamageNumber(
    position: Vector3,
    damage: number,
    isCritical: boolean,
    effectiveness: string
  ): void {
    // Create a sprite with damage text
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Style based on effectiveness
    let textColor = '#ffffff';
    let prefix = '';
    if (effectiveness === 'super_effective') {
      textColor = '#ff4444';
      prefix = '!! ';
    } else if (effectiveness === 'not_very_effective') {
      textColor = '#888888';
    }
    if (isCritical) {
      textColor = '#ffdd00';
      prefix = 'CRIT ';
    }

    ctx.font = `bold ${isCritical ? 36 : 28}px Arial`;
    ctx.fillStyle = textColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    const text = `${prefix}${damage}`;
    ctx.strokeText(text, 64, 40);
    ctx.fillText(text, 64, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(position.x, position.y + 2, position.z);
    sprite.scale.set(2, 1, 1);
    this.scene.add(sprite);

    this.scheduleAnimation({
      type: 'damage_number',
      data: { sprite, texture, startY: position.y + 2 },
      startTime: Date.now(),
      duration: this.config.damageNumberLifetime * 1000,
      isComplete: false,
    });
  }

  private updateDamageNumber(anim: AnimationRequest, progress: number): void {
    const sprite = anim.data.sprite as THREE.Sprite;
    sprite.position.y =
      anim.data.startY + progress * this.config.damageNumberRiseSpeed;
    sprite.material.opacity = 1 - progress;
  }

  private updateVictoryAnimation(
    anim: AnimationRequest,
    progress: number
  ): void {
    const particles = anim.data.particles as THREE.Points;
    if (particles) {
      // Expand and fade
      particles.scale.setScalar(1 + progress * 2);
      (particles.material as THREE.PointsMaterial).opacity = 1 - progress;
    }
  }

  // ---- Helpers ----

  private createImpactFlash(position: Vector3, color: string): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.9,
    });
    const flash = new THREE.Mesh(geometry, material);
    flash.position.set(position.x, position.y + 1, position.z);
    this.scene.add(flash);

    // Auto-remove after flash duration
    setTimeout(() => {
      this.scene.remove(flash);
      geometry.dispose();
      material.dispose();
    }, this.config.hitFlashDurationMs);

    return flash;
  }

  private createParticleBurst(
    position: Vector3,
    colors: string[],
    count: number,
    spread: number
  ): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = position.y + Math.random() * spread;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * spread;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(colors[0]),
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geometry, material);
  }

  private getElementColor(element: ElementType): string {
    const colors: Record<ElementType, string> = {
      fire: '#ff4400',
      water: '#0066ff',
      grass: '#00ff44',
      electric: '#ffdd00',
      earth: '#aa44ff',
      light: '#ffffff',
      dark: '#8800ff',
    };
    return colors[element];
  }

  private requestCamera(mode: CameraMode, target?: Vector3): void {
    if (this.cameraCallback) {
      this.cameraCallback(mode, target);
    }
  }

  private scheduleAnimation(anim: AnimationRequest): void {
    this.activeAnimations.push(anim);
  }

  private cleanupAnimation(anim: AnimationRequest): void {
    if (anim.type === 'damage_number') {
      const sprite = anim.data.sprite as THREE.Sprite;
      this.scene.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    if (anim.type === 'victory') {
      const particles = anim.data.particles as THREE.Points;
      if (particles) {
        this.scene.remove(particles);
        particles.geometry.dispose();
        (particles.material as THREE.Material).dispose();
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    for (const anim of this.activeAnimations) {
      this.cleanupAnimation(anim);
    }
    this.activeAnimations = [];
  }
}
