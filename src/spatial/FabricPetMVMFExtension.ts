/**
 * FabricPet MVMF Extension
 * 
 * Extends FabricPet's MVMFBridge with arena-specific MVMF models.
 * This is the primary integration point between HoloBall Arena
 * and FabricPet's RP1 connectivity.
 */

import type {
  ArenaData,
  ArenaBattleData,
  SpectatorSessionData,
  MVMFModel,
  Vector3,
} from '../types/arenaTypes';

/**
 * Interface matching FabricPet's MVMFBridge
 * In production, import directly from fabricpet
 */
export interface FabricPetMVMFBridge {
  formatPetState(petData: any): any;
  formatHomeState(homeData: any): any;
  broadcast(model: any): void;
}

export class FabricPetMVMFExtension {
  private baseBridge: FabricPetMVMFBridge | null = null;

  /**
   * Connect to FabricPet's MVMF Bridge
   */
  connectBridge(bridge: FabricPetMVMFBridge): void {
    this.baseBridge = bridge;
  }

  /**
   * Format arena state as MVMF model
   */
  formatArenaState(arena: ArenaData): MVMFModel {
    return {
      modelName: 'ArenaState',
      modelType: 'realtime',
      data: {
        arenaId: arena.id,
        status: arena.status,
        biomeId: arena.biome?.id,
        position: arena.position,
        radius: arena.radius,
        wallHeight: arena.wallHeight,
        materializationProgress: arena.materializationProgress,
        collapseProgress: arena.collapseProgress,
        battleId: arena.battleId,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Format battle state as MVMF model
   */
  formatBattleState(battle: ArenaBattleData): MVMFModel {
    return {
      modelName: 'BattleState',
      modelType: 'realtime',
      data: {
        battleId: battle.id,
        arenaId: battle.arenaId,
        challenger: {
          userId: battle.challenger.userId,
          petId: battle.challenger.petId,
          isReady: battle.challenger.isReady,
        },
        defender: {
          userId: battle.defender.userId,
          petId: battle.defender.petId,
          isReady: battle.defender.isReady,
        },
        currentTurn: battle.currentTurn,
        turnPhase: battle.turnPhase,
        winner: battle.winner,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Format spectator state as MVMF model
   */
  formatSpectatorState(session: SpectatorSessionData): MVMFModel {
    return {
      modelName: 'SpectatorState',
      modelType: 'realtime',
      data: {
        arenaId: session.arenaId,
        spectatorCount: session.spectators.length,
        maxSpectators: session.maxSpectators,
        spectators: session.spectators.map((s) => ({
          userId: s.userId,
          cameraMode: s.cameraMode,
        })),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Format pet data for arena context (extends FabricPet's pet model)
   */
  formatPetForArena(
    petData: any,
    arenaPosition: Vector3,
    battlePosition: Vector3
  ): MVMFModel {
    // Get base pet model from FabricPet if available
    const basePetModel = this.baseBridge?.formatPetState(petData);

    return {
      modelName: 'ArenaPet',
      modelType: 'realtime',
      data: {
        ...(basePetModel || {}),
        petId: petData.id,
        arenaPosition,
        battlePosition,
        isInBattle: true,
        elementType: petData.elementType,
        currentHp: petData.currentHp,
        maxHp: petData.maxHp,
        statusEffects: petData.statusEffects || [],
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Broadcast an MVMF model
   */
  broadcast(model: MVMFModel): void {
    if (this.baseBridge) {
      this.baseBridge.broadcast(model);
    } else {
      // Fallback: log for development
      console.log('[MVMF Broadcast]', model.modelName, model.data);
    }
  }

  /**
   * Broadcast arena state
   */
  broadcastArenaState(arena: ArenaData): void {
    this.broadcast(this.formatArenaState(arena));
  }

  /**
   * Broadcast battle state
   */
  broadcastBattleState(battle: ArenaBattleData): void {
    this.broadcast(this.formatBattleState(battle));
  }

  /**
   * Broadcast spectator state
   */
  broadcastSpectatorState(session: SpectatorSessionData): void {
    this.broadcast(this.formatSpectatorState(session));
  }
}
