// ============================================
// Zustand Store — Global application state
// ============================================

import { create } from 'zustand';
import type { Pet, WalletState, OrdinalInscription, HomeState, BattleState, AppView } from '../types';
import type { NostrIdentity } from '../nostr/identity';
import type { BehaviorAction } from '../engine/BehaviorTree';

interface AppState {
  // --- View ---
  currentView: AppView;
  setView: (view: AppView) => void;

  // --- Identity ---
  identity: NostrIdentity | null;
  setIdentity: (identity: NostrIdentity | null) => void;

  // --- Pet ---
  pet: Pet | null;
  setPet: (pet: Pet | null) => void;
  updatePet: (updates: Partial<Pet>) => void;

  // --- Wallet ---
  wallet: WalletState;
  setWallet: (wallet: Partial<WalletState>) => void;
  setInscriptions: (inscriptions: OrdinalInscription[]) => void;

  // --- Home ---
  home: HomeState;
  setHome: (home: HomeState) => void;

  // --- Battle ---
  activeBattle: BattleState | null;
  setActiveBattle: (battle: BattleState | null) => void;

  // --- UI State ---
  currentBehavior: BehaviorAction | null;
  setCurrentBehavior: (action: BehaviorAction | null) => void;
  notification: { message: string; emoji: string } | null;
  setNotification: (notification: { message: string; emoji: string } | null) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  isSaving: boolean;
  setSaving: (saving: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // --- View ---
  currentView: 'home',
  setView: (view) => set({ currentView: view }),

  // --- Identity ---
  identity: null,
  setIdentity: (identity) => set({ identity }),

  // --- Pet ---
  pet: null,
  setPet: (pet) => set({ pet }),
  updatePet: (updates) =>
    set((state) => ({
      pet: state.pet ? { ...state.pet, ...updates } : null,
    })),

  // --- Wallet ---
  wallet: {
    connected: false,
    type: 'none',
    address: null,
    inscriptions: [],
  },
  setWallet: (wallet) =>
    set((state) => ({
      wallet: { ...state.wallet, ...wallet },
    })),
  setInscriptions: (inscriptions) =>
    set((state) => ({
      wallet: { ...state.wallet, inscriptions },
    })),

  // --- Home ---
  home: {
    theme: 'room',
    furniture: [
      { id: 'bed_01', type: 'bed', position: [2, 0, 3], rotation: [0, 0, 0] },
      { id: 'food_bowl', type: 'food', position: [1, 0, 1], rotation: [0, 0, 0] },
      { id: 'toy_ball', type: 'toy', position: [3, 0, 2], rotation: [0, 0, 0] },
      { id: 'water_bowl', type: 'water', position: [0, 0, 2], rotation: [0, 0, 0] },
    ],
    unlockedThemes: ['room'],
    visitorsAllowed: true,
    spatialFabric: null,
    guestbook: [],
  },
  setHome: (home) => set({ home }),

  // --- Battle ---
  activeBattle: null,
  setActiveBattle: (battle) => set({ activeBattle: battle }),

  // --- UI State ---
  currentBehavior: null,
  setCurrentBehavior: (action) => set({ currentBehavior: action }),
  notification: null,
  setNotification: (notification) => set({ notification }),
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  isSaving: false,
  setSaving: (saving) => set({ isSaving: saving }),
}));
