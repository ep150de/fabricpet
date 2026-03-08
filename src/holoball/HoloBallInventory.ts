/**
 * HoloBall Inventory
 * 
 * Manages a player's collection of HoloBalls.
 * Integrates with FabricPet's pet data and Nostr identity.
 */

import { HoloBall } from './HoloBall';
import type { HoloBallData, HoloBallSkin, ElementType } from '../types/arenaTypes';

export class HoloBallInventory {
  private balls: Map<string, HoloBall> = new Map();
  private ownerId: string;
  private maxBalls: number;

  constructor(ownerId: string, maxBalls: number = 6) {
    this.ownerId = ownerId;
    this.maxBalls = maxBalls;
  }

  /**
   * Create a new HoloBall for a pet
   */
  createBall(petId: string, elementType: ElementType, skinId?: string): HoloBall {
    if (this.balls.size >= this.maxBalls) {
      throw new Error(`Inventory full: max ${this.maxBalls} HoloBalls`);
    }

    const ball = new HoloBall({
      ownerId: this.ownerId,
      petId,
      elementType,
      skinId,
    });

    this.balls.set(ball.id, ball);
    return ball;
  }

  /**
   * Get a ball by ID
   */
  getBall(ballId: string): HoloBall | undefined {
    return this.balls.get(ballId);
  }

  /**
   * Get a ball by pet ID
   */
  getBallByPetId(petId: string): HoloBall | undefined {
    for (const ball of this.balls.values()) {
      if (ball.petId === petId) return ball;
    }
    return undefined;
  }

  /**
   * Get all balls
   */
  getAllBalls(): HoloBall[] {
    return Array.from(this.balls.values());
  }

  /**
   * Get balls that are available for battle (idle state)
   */
  getAvailableBalls(): HoloBall[] {
    return this.getAllBalls().filter(
      (ball) => ball.state === 'idle' || ball.state === 'selected'
    );
  }

  /**
   * Get the currently deployed ball
   */
  getDeployedBall(): HoloBall | undefined {
    return this.getAllBalls().find((ball) => ball.state === 'deployed');
  }

  /**
   * Remove a ball from inventory
   */
  removeBall(ballId: string): boolean {
    return this.balls.delete(ballId);
  }

  /**
   * Apply a skin to a ball
   */
  applySkin(ballId: string, skin: HoloBallSkin): void {
    const ball = this.balls.get(ballId);
    if (!ball) throw new Error(`Ball not found: ${ballId}`);
    ball.applySkin(skin);
  }

  /**
   * Get inventory size
   */
  get size(): number {
    return this.balls.size;
  }

  /**
   * Check if inventory is full
   */
  get isFull(): boolean {
    return this.balls.size >= this.maxBalls;
  }

  // ---- Serialization ----

  toData(): HoloBallData[] {
    return this.getAllBalls().map((ball) => ball.toData());
  }

  static fromData(ownerId: string, data: HoloBallData[]): HoloBallInventory {
    const inventory = new HoloBallInventory(ownerId);
    for (const ballData of data) {
      const ball = HoloBall.fromData(ballData);
      inventory.balls.set(ball.id, ball);
    }
    return inventory;
  }
}
