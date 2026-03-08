/**
 * HoloBall Store
 * 
 * Zustand store slice for HoloBall inventory and deployment state.
 */

import { create } from 'zustand';
import type { HoloBallData, HoloBallState, HoloBallSkin, ElementType } from '../types/arenaTypes';

export interface HoloBallStoreState {
  // Inventory
  holoBalls: HoloBallData[];
  selectedBallId: string | null;
  deployedBallId: string | null;

  // Skins
  availableSkins: HoloBallSkin[];

  // Actions
  setHoloBalls: (balls: HoloBallData[]) => void;
  addHoloBall: (ball: HoloBallData) => void;
  removeHoloBall: (ballId: string) => void;
  selectBall: (ballId: string | null) => void;
  setDeployedBall: (ballId: string | null) => void;
  updateBallState: (ballId: string, state: HoloBallState) => void;
  setAvailableSkins: (skins: HoloBallSkin[]) => void;
  applySkinToBall: (ballId: string, skin: HoloBallSkin) => void;
}

export const useHoloBallStore = create<HoloBallStoreState>((set, get) => ({
  holoBalls: [],
  selectedBallId: null,
  deployedBallId: null,
  availableSkins: [],

  setHoloBalls: (balls) => set({ holoBalls: balls }),
  addHoloBall: (ball) => set((s) => ({ holoBalls: [...s.holoBalls, ball] })),
  removeHoloBall: (ballId) =>
    set((s) => ({ holoBalls: s.holoBalls.filter((b) => b.id !== ballId) })),
  selectBall: (ballId) => set({ selectedBallId: ballId }),
  setDeployedBall: (ballId) => set({ deployedBallId: ballId }),
  updateBallState: (ballId, state) =>
    set((s) => ({
      holoBalls: s.holoBalls.map((b) =>
        b.id === ballId ? { ...b, state } : b
      ),
    })),
  setAvailableSkins: (skins) => set({ availableSkins: skins }),
  applySkinToBall: (ballId, skin) =>
    set((s) => ({
      holoBalls: s.holoBalls.map((b) =>
        b.id === ballId ? { ...b, skinId: skin.inscriptionId } : b
      ),
    })),
}));
