/**
 * Arena Battle Manager
 * 
 * Orchestrates battles within the 3D arena context.
 * Wraps FabricPet's BattleEngine with arena visualization,
 * camera control, and spectator broadcasting.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ArenaBattleData,
  ArenaPlayerData,
  BattleTurnResult,
  ElementType,
  BiomeDefinition,
} from '../../types/arenaTypes';

/**
 * Pet data structure for battle initialization
 */
export interface PetBattleData {
  id: string;
  name: string;
  level: number;
  elementalType: ElementType;
  battleStats: {
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    spd: number;
    special: number;
  };
  moves: string[];
}

/**
 * Battle turn result from engine
 */
export interface BattleTurnExecution {
  turnNumber: number;
  attackerId: string;
  defenderId: string;
  moveId: string;
  moveName: string;
  moveType?: ElementType;
  damage: number;
  isCritical: boolean;
  effectiveness: string | number;
  statusApplied?: string;
  statusCleared?: string;
  attackerHp?: number;
  defenderHp?: number;
  attackerHpAfter: number;
  defenderHpAfter: number;
  isFainted: boolean;
  category?: 'projectile' | 'area' | 'contact' | 'buff' | 'status';
  isStatus?: boolean;
  isBuff?: boolean;
  isContact?: boolean;
  isArea?: boolean;
}

/**
 * Current battle state snapshot
 */
export interface BattleSnapshot {
  turnNumber: number;
  pet1Hp: number;
  pet2Hp: number;
  isOver: boolean;
  winner: string | null;
}

/**
 * FabricPet BattleEngine interface (expected from fabricpet dependency)
 * This mirrors the expected API surface of FabricPet's battle system.
 */
export interface FabricPetBattleEngine {
  initBattle(pet1Data: PetBattleData, pet2Data: PetBattleData): void;
  executeTurn(moveId: string): BattleTurnExecution;
  getCurrentState(): BattleSnapshot;
  isOver(): boolean;
  getWinner(): string | null;
}

export type BattleEventType =
  | 'battle_start'
  | 'turn_start'
  | 'move_selected'
  | 'move_executed'
  | 'damage_dealt'
  | 'status_applied'
  | 'status_cleared'
  | 'pet_fainted'
  | 'battle_end';

export interface BattleEvent {
  type: BattleEventType;
  data: Record<string, unknown> | null;
  timestamp: number;
}

export class ArenaBattleManager {
  private battleData: ArenaBattleData | null = null;
  private battleEngine: FabricPetBattleEngine | null = null;
  private biome: BiomeDefinition | null = null;
  private eventLog: BattleEvent[] = [];
  private eventListeners: Array<(event: BattleEvent) => void> = [];
  private turnTimeout: ReturnType<typeof setTimeout> | null = null;
  private turnTimeLimit: number;

  constructor(turnTimeLimit: number = 30000) {
    this.turnTimeLimit = turnTimeLimit;
  }

  /**
   * Initialize a new battle
   */
  initBattle(params: {
    challenger: ArenaPlayerData;
    defender: ArenaPlayerData;
    arenaId: string;
    biome: BiomeDefinition;
    battleEngine: FabricPetBattleEngine;
    challengerPetData: PetBattleData;
    defenderPetData: PetBattleData;
  }): ArenaBattleData {
    this.battleEngine = params.battleEngine;
    this.biome = params.biome;

    // Apply biome stat modifiers to pet data
    const modifiedChallenger = this.applyBiomeModifiers(
      params.challengerPetData,
      params.biome
    );
    const modifiedDefender = this.applyBiomeModifiers(
      params.defenderPetData,
      params.biome
    );

    // Initialize FabricPet's battle engine
    this.battleEngine.initBattle(modifiedChallenger, modifiedDefender);

    this.battleData = {
      id: uuidv4(),
      arenaId: params.arenaId,
      challenger: params.challenger,
      defender: params.defender,
      currentTurn: 0,
      turnPhase: 'selecting',
      startedAt: Date.now(),
    };

    this.emitEvent('battle_start', {
      battleId: this.battleData.id,
      challenger: params.challenger,
      defender: params.defender,
      biome: params.biome.id,
    });

    return this.battleData;
  }

  /**
   * Execute a turn with the selected move
   */
  async executeTurn(
    playerId: string,
    moveId: string
  ): Promise<BattleTurnResult | null> {
    if (!this.battleData || !this.battleEngine) return null;
    if (this.battleData.turnPhase !== 'selecting') return null;

    // Clear turn timer
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = null;
    }

    this.battleData.turnPhase = 'executing';
    this.battleData.currentTurn++;

    this.emitEvent('move_selected', { playerId, moveId });

    // Execute through FabricPet's engine
    const result = this.battleEngine.executeTurn(moveId);

    // Map FabricPet result to arena turn result
    const turnResult: BattleTurnResult = {
      turnNumber: this.battleData.currentTurn,
      attackerId: playerId,
      defenderId:
        playerId === this.battleData.challenger.userId
          ? this.battleData.defender.userId
          : this.battleData.challenger.userId,
      moveId: moveId,
      moveName: result.moveName || moveId,
      moveType: (result.moveType || 'fire') as ElementType,
      moveCategory: this.categorizeMoveForAnimation(result),
      damage: result.damage || 0,
      isCritical: result.isCritical || false,
      effectiveness: this.mapEffectiveness(result.effectiveness),
      statusApplied: result.statusApplied,
      statusCleared: result.statusCleared,
      attackerHpAfter: result.attackerHp || 0,
      defenderHpAfter: result.defenderHp || 0,
      isFainted: result.isFainted || false,
    };

    this.emitEvent('move_executed', turnResult as unknown as Record<string, unknown>);

    if (turnResult.damage > 0) {
      this.emitEvent('damage_dealt', {
        damage: turnResult.damage,
        isCritical: turnResult.isCritical,
        effectiveness: turnResult.effectiveness,
      });
    }

    if (turnResult.statusApplied) {
      this.emitEvent('status_applied', {
        status: turnResult.statusApplied,
        targetId: turnResult.defenderId,
      });
    }

    if (turnResult.statusCleared) {
      this.emitEvent('status_cleared', {
        status: turnResult.statusCleared,
        targetId: turnResult.defenderId,
      });
    }

    // Check for battle end
    if (this.battleEngine.isOver()) {
      const winnerId = this.battleEngine.getWinner();
      this.battleData.winner = winnerId || undefined;
      this.battleData.endedAt = Date.now();

      if (turnResult.isFainted) {
        this.emitEvent('pet_fainted', {
          faintedPetOwner: turnResult.defenderId,
        });
      }

      this.emitEvent('battle_end', {
        winnerId,
        turns: this.battleData.currentTurn,
        duration: this.battleData.endedAt - this.battleData.startedAt,
      });
    } else {
      // Prepare for next turn
      this.battleData.turnPhase = 'selecting';
      this.startTurnTimer();
      this.emitEvent('turn_start', {
        turnNumber: this.battleData.currentTurn + 1,
      });
    }

    return turnResult;
  }

  /**
   * Get current battle data
   */
  getBattleData(): ArenaBattleData | null {
    return this.battleData ? { ...this.battleData } : null;
  }

  /**
   * Get the event log
   */
  getEventLog(): BattleEvent[] {
    return [...this.eventLog];
  }

  /**
   * Check if battle is over
   */
  isOver(): boolean {
    return this.battleData?.winner !== undefined;
  }

  /**
   * Get winner ID
   */
  getWinnerId(): string | null {
    return this.battleData?.winner || null;
  }

  /**
   * Forfeit the battle
   */
  forfeit(playerId: string): void {
    if (!this.battleData) return;

    const winnerId =
      playerId === this.battleData.challenger.userId
        ? this.battleData.defender.userId
        : this.battleData.challenger.userId;

    this.battleData.winner = winnerId;
    this.battleData.endedAt = Date.now();

    this.emitEvent('battle_end', {
      winnerId,
      reason: 'forfeit',
      turns: this.battleData.currentTurn,
      duration: this.battleData.endedAt - this.battleData.startedAt,
    });
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
    }
    this.eventListeners = [];
    this.eventLog = [];
    this.battleData = null;
    this.battleEngine = null;
  }

  // ---- Internal ----

  /**
   * Apply biome stat modifiers to pet data
   */
  private applyBiomeModifiers(petData: PetBattleData, biome: BiomeDefinition): PetBattleData {
    const modified = { ...petData };
    const petElement = petData.elementalType;
    const modifier = biome.statModifiers[petElement];

    if (modifier) {
      // Apply modifier to relevant stats
      modified.battleStats = { ...modified.battleStats };
      modified.battleStats.atk = Math.floor(
        (modified.battleStats.atk || 10) * modifier
      );
      modified.battleStats.def = Math.floor(
        (modified.battleStats.def || 10) * modifier
      );
      modified.battleStats.spd = Math.floor(
        (modified.battleStats.spd || 10) * modifier
      );
    }

    return modified;
  }

  /**
   * Categorize a move for animation purposes
   */
  private categorizeMoveForAnimation(
    result: BattleTurnExecution
  ): 'projectile' | 'area' | 'contact' | 'buff' | 'status' {
    if ((result as any).category) return (result as any).category;
    if ((result as any).isStatus) return 'status';
    if ((result as any).isBuff) return 'buff';
    if ((result as any).isContact) return 'contact';
    if ((result as any).isArea) return 'area';
    return 'projectile'; // Default
  }

  /**
   * Map effectiveness from FabricPet format
   */
  private mapEffectiveness(
    effectiveness: string | number
  ): 'super_effective' | 'not_very_effective' | 'normal' {
    if (typeof effectiveness === 'number') {
      if (effectiveness > 1) return 'super_effective';
      if (effectiveness < 1) return 'not_very_effective';
      return 'normal';
    }
    if (effectiveness === 'super' || effectiveness === 'super_effective') {
      return 'super_effective';
    }
    if (effectiveness === 'not_very' || effectiveness === 'not_very_effective') {
      return 'not_very_effective';
    }
    return 'normal';
  }

  /**
   * Start turn timer
   */
  private startTurnTimer(): void {
    this.turnTimeout = setTimeout(() => {
      // Auto-select a random move on timeout
      console.warn('[ArenaBattleManager] Turn timed out');
    }, this.turnTimeLimit);
  }

  // ---- Event System ----

  onBattleEvent(listener: (event: BattleEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  private emitEvent(type: BattleEventType, data: Record<string, unknown> | null): void {
    const event: BattleEvent = { type, data, timestamp: Date.now() };
    this.eventLog.push(event);
    this.eventListeners.forEach((listener) => listener(event));
  }
}
