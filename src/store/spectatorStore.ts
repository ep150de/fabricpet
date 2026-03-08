/**
 * Spectator Store
 * 
 * Zustand store slice for spectator mode state.
 */

import { create } from 'zustand';
import type { SpectatorData, BattleTurnResult } from '../types/arenaTypes';

export interface SpectatorStoreState {
  isSpectating: boolean;
  spectatingArenaId: string | null;
  spectatorCount: number;
  cameraMode: 'free' | 'auto';
  battleLog: BattleTurnResult[];

  // Actions
  startSpectating: (arenaId: string) => void;
  stopSpectating: () => void;
  setSpectatorCount: (count: number) => void;
  setCameraMode: (mode: 'free' | 'auto') => void;
  addBattleLogEntry: (entry: BattleTurnResult) => void;
  clearBattleLog: () => void;
}

export const useSpectatorStore = create<SpectatorStoreState>((set) => ({
  isSpectating: false,
  spectatingArenaId: null,
  spectatorCount: 0,
  cameraMode: 'auto',
  battleLog: [],

  startSpectating: (arenaId) =>
    set({ isSpectating: true, spectatingArenaId: arenaId, battleLog: [] }),
  stopSpectating: () =>
    set({ isSpectating: false, spectatingArenaId: null, battleLog: [] }),
  setSpectatorCount: (count) => set({ spectatorCount: count }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  addBattleLogEntry: (entry) =>
    set((s) => ({ battleLog: [...s.battleLog, entry] })),
  clearBattleLog: () => set({ battleLog: [] }),
}));
