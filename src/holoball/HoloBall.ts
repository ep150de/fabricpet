/**
 * HoloBall Entity
 * 
 * Represents a single HoloBall — a collectible container for an AI pet.
 * Each ball has a unique ID, contains a reference to a FabricPet pet,
 * and manages its own visual state and animation.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  HoloBallData,
  HoloBallState,
  HoloBallSkin,
  HoloBallThrowParams,
  Vector3,
  ElementType,
} from '../types/arenaTypes';

export class HoloBall {
  private data: HoloBallData;
  private skin: HoloBallSkin | null = null;
  private stateListeners: Array<(state: HoloBallState) => void> = [];

  constructor(params: {
    ownerId: string;
    petId: string;
    elementType: ElementType;
    skinId?: string;
  }) {
    this.data = {
      id: uuidv4(),
      ownerId: params.ownerId,
      petId: params.petId,
      skinId: params.skinId,
      elementType: params.elementType,
      state: 'idle',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      animationProgress: 0,
      createdAt: Date.now(),
    };
  }

  // ---- Getters ----

  get id(): string {
    return this.data.id;
  }

  get ownerId(): string {
    return this.data.ownerId;
  }

  get petId(): string {
    return this.data.petId;
  }

  get elementType(): ElementType {
    return this.data.elementType;
  }

  get state(): HoloBallState {
    return this.data.state;
  }

  get position(): Vector3 {
    return { ...this.data.position };
  }

  get velocity(): Vector3 {
    return { ...this.data.velocity };
  }

  get animationProgress(): number {
    return this.data.animationProgress;
  }

  get currentSkin(): HoloBallSkin | null {
    return this.skin;
  }

  // ---- State Management ----

  /**
   * Transition to a new state with validation
   */
  private transitionTo(newState: HoloBallState): void {
    const validTransitions: Record<HoloBallState, HoloBallState[]> = {
      idle: ['selected', 'empty'],
      selected: ['idle', 'thrown'],
      thrown: ['opening'],
      opening: ['deployed'],
      deployed: ['recalled'],
      recalled: ['idle'],
      empty: ['idle'], // When a new pet is assigned
    };

    const allowed = validTransitions[this.data.state];
    if (!allowed.includes(newState)) {
      console.warn(
        `HoloBall ${this.id}: Invalid transition from '${this.data.state}' to '${newState}'`
      );
      return;
    }

    this.data.state = newState;
    this.data.animationProgress = 0;
    this.notifyListeners(newState);
  }

  /**
   * Select this ball from inventory
   */
  select(): void {
    this.transitionTo('selected');
  }

  /**
   * Deselect this ball
   */
  deselect(): void {
    if (this.data.state === 'selected') {
      this.transitionTo('idle');
    }
  }

  /**
   * Throw the ball into the arena space
   */
  throw(params: HoloBallThrowParams): void {
    this.data.position = { ...params.origin };
    this.data.velocity = {
      x: params.direction.x * params.speed,
      y: params.direction.y * params.speed + params.arc * 10,
      z: params.direction.z * params.speed,
    };
    this.transitionTo('thrown');
  }

  /**
   * Ball has landed and begins opening sequence
   */
  open(landingPosition: Vector3): void {
    this.data.position = { ...landingPosition };
    this.data.velocity = { x: 0, y: 0, z: 0 };
    this.transitionTo('opening');
  }

  /**
   * Pet has fully emerged, ball is deployed
   */
  deploy(): void {
    this.transitionTo('deployed');
  }

  /**
   * Recall pet back into the ball
   */
  recall(): void {
    this.transitionTo('recalled');
  }

  /**
   * Ball has finished recall animation, return to idle
   */
  returnToIdle(): void {
    this.transitionTo('idle');
  }

  /**
   * Mark ball as empty (no pet assigned)
   */
  markEmpty(): void {
    this.transitionTo('empty');
  }

  // ---- Animation ----

  /**
   * Update animation progress (called each frame)
   * @param delta - Time delta in seconds
   * @param duration - Total duration for current state animation in ms
   */
  updateAnimation(delta: number, duration: number): void {
    if (this.data.animationProgress >= 1) return;
    this.data.animationProgress = Math.min(
      1,
      this.data.animationProgress + (delta * 1000) / duration
    );
  }

  /**
   * Update physics for thrown state
   * @param delta - Time delta in seconds
   * @param gravity - Gravity acceleration
   */
  updatePhysics(delta: number, gravity: number = -9.8): void {
    if (this.data.state !== 'thrown') return;

    // Update velocity (gravity)
    this.data.velocity.y += gravity * delta;

    // Update position
    this.data.position.x += this.data.velocity.x * delta;
    this.data.position.y += this.data.velocity.y * delta;
    this.data.position.z += this.data.velocity.z * delta;

    // Check if ball has landed (y <= 0)
    if (this.data.position.y <= 0) {
      this.data.position.y = 0;
      this.open(this.data.position);
    }
  }

  // ---- Skin ----

  /**
   * Apply an Ordinal inscription skin to this ball
   */
  applySkin(skin: HoloBallSkin): void {
    this.skin = skin;
    this.data.skinId = skin.inscriptionId;
  }

  /**
   * Remove the current skin
   */
  removeSkin(): void {
    this.skin = null;
    this.data.skinId = undefined;
  }

  // ---- Visual Properties ----

  /**
   * Get the glow color based on element type and skin
   */
  getGlowColor(): string {
    if (this.skin?.glowColor) return this.skin.glowColor;

    const elementColors: Record<ElementType, string> = {
      fire: '#ff4400',
      water: '#0066ff',
      grass: '#00ff44',
      electric: '#ffdd00',
      earth: '#aa44ff',
      light: '#ffffff',
      dark: '#8800ff',
    };
    return elementColors[this.data.elementType];
  }

  /**
   * Get the particle color for effects
   */
  getParticleColor(): string {
    if (this.skin?.particleColor) return this.skin.particleColor;
    return this.getGlowColor();
  }

  /**
   * Get the glow intensity based on current state
   */
  getGlowIntensity(): number {
    const intensities: Record<HoloBallState, number> = {
      idle: 0.4,
      selected: 0.7,
      thrown: 0.9,
      opening: 1.0,
      deployed: 0.6,
      recalled: 0.8,
      empty: 0.1,
    };
    return intensities[this.data.state];
  }

  /**
   * Get the rotation speed based on current state
   */
  getRotationSpeed(): number {
    const speeds: Record<HoloBallState, number> = {
      idle: 0.5,
      selected: 1.5,
      thrown: 8.0,
      opening: 0,
      deployed: 0.3,
      recalled: 4.0,
      empty: 0.1,
    };
    return speeds[this.data.state];
  }

  // ---- Listeners ----

  onStateChange(listener: (state: HoloBallState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(state: HoloBallState): void {
    this.stateListeners.forEach((listener) => listener(state));
  }

  // ---- Serialization ----

  toData(): HoloBallData {
    return { ...this.data };
  }

  static fromData(data: HoloBallData): HoloBall {
    const ball = new HoloBall({
      ownerId: data.ownerId,
      petId: data.petId,
      elementType: data.elementType,
      skinId: data.skinId,
    });
    ball.data = { ...data };
    return ball;
  }
}
