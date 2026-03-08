/**
 * Arena Store
 * 
 * Zustand store slice for arena state management.
 * Extends FabricPet's store with arena-specific state.
 */

import { create } from 'zustand';
import type {
  ArenaData,
  ArenaStatus,
  ArenaBattleData,
  BiomeId,
  BiomeDefinition,
  BattleTurnResult,
  SpatialCoordinate,
  CameraMode,
} from '../types/arenaTypes';

export interface ArenaStoreState {
  // Arena state
  activeArena: ArenaData | null;
  arenaStatus: ArenaStatus;
  materializationProgress: number;
  collapseProgress: number;
  selectedBiome: BiomeId | null;

  // Battle state
  activeBattle: ArenaBattleData | null;
  currentTurnResult: BattleTurnResult | null;
  battleLog: BattleTurnResult[];
  isMyTurn: boolean;

  // Camera
  cameraMode: CameraMode;

  // Connection
  isConnectedToFabric: boolean;

  // Actions
  setActiveArena: (arena: ArenaData | null) => void;
  setArenaStatus: (status: ArenaStatus) => void;
  setMaterializationProgress: (progress: number) => void;
  setCollapseProgress: (progress: number) => void;
  setSelectedBiome: (biome: BiomeId | null) => void;
  setActiveBattle: (battle: ArenaBattleData | null) => void;
  addTurnResult: (result: BattleTurnResult) => void;
  setIsMyTurn: (isMyTurn: boolean) => void;
  setCameraMode: (mode: CameraMode) => void;
  setConnectedToFabric: (connected: boolean) => void;
  resetArena: () => void;
}

export const useArenaStore = create<ArenaStoreState>((set, get) => ({
  // Initial state
  activeArena: null,
  arenaStatus: 'dormant',
  materializationProgress: 0,
  collapseProgress: 0,
  selectedBiome: null,
  activeBattle: null,
  currentTurnResult: null,
  battleLog: [],
  isMyTurn: false,
  cameraMode: 'orbit',
  isConnectedToFabric: false,

  // Actions
  setActiveArena: (arena) => set({ activeArena: arena, arenaStatus: arena?.status || 'dormant' }),
  setArenaStatus: (status) => set({ arenaStatus: status }),
  setMaterializationProgress: (progress) => set({ materializationProgress: progress }),
  setCollapseProgress: (progress) => set({ collapseProgress: progress }),
  setSelectedBiome: (biome) => set({ selectedBiome: biome }),
  setActiveBattle: (battle) => set({ activeBattle: battle }),
  addTurnResult: (result) =>
    set((state) => ({
      currentTurnResult: result,
      battleLog: [...state.battleLog, result],
    })),
  setIsMyTurn: (isMyTurn) => set({ isMyTurn }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setConnectedToFabric: (connected) => set({ isConnectedToFabric: connected }),
  resetArena: () =>
    set({
      activeArena: null,
      arenaStatus: 'dormant',
      materializationProgress: 0,
      collapseProgress: 0,
      activeBattle: null,
      currentTurnResult: null,
      battleLog: [],
      isMyTurn: false,
      cameraMode: 'orbit',
    }),
}));
