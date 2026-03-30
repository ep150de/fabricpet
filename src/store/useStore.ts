// ============================================
// Zustand Store — Global application state
// ============================================

import { create } from 'zustand';
import type { Pet, PetRoster, WalletState, OrdinalInscription, HomeState, BattleState, AppView, DirectMessage, Conversation } from '../types';
import type { NostrIdentity } from '../nostr/identity';
import type { BehaviorAction } from '../engine/BehaviorTree';

interface AppState {
  // --- View ---
  currentView: AppView;
  setView: (view: AppView) => void;
  deepLinkParams: Record<string, string>;
  setDeepLinkParams: (params: Record<string, string>) => void;

  // --- Identity ---
  identity: NostrIdentity | null;
  setIdentity: (identity: NostrIdentity | null) => void;

  // --- Pet (active pet — backward compatible) ---
  pet: Pet | null;
  setPet: (pet: Pet | null) => void;
  updatePet: (updates: Partial<Pet>) => void;
  updatePetFn: (fn: (prev: Pet) => Pet) => void;

  // --- Multi-Pet Roster ---
  roster: PetRoster;
  setRoster: (roster: PetRoster) => void;
  addPet: (pet: Pet) => void;
  removePet: (petId: string) => void;
  switchActivePet: (petId: string) => void;
  getMaxPetSlots: () => number;

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

  // --- Direct Messages (NIP-17) ---
  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  messages: Record<string, DirectMessage[]>;
  addMessage: (pubkey: string, message: DirectMessage) => void;
  markMessagesRead: (pubkey: string) => void;
  getUnreadCount: () => number;
}

export const useStore = create<AppState>((set) => ({
  // --- View ---
  currentView: 'home',
  setView: (view) => set({ currentView: view }),
  deepLinkParams: {},
  setDeepLinkParams: (params) => set({ deepLinkParams: params }),

  // --- Identity ---
  identity: null,
  setIdentity: (identity) => set({ identity }),

  // --- Pet (active pet) ---
  pet: null,
  setPet: (pet) => set((state) => {
    // Also update the pet in the roster
    if (pet && state.roster.pets.length > 0) {
      const updatedPets = state.roster.pets.map(p => p.id === pet.id ? pet : p);
      // If pet isn't in roster yet, add it
      if (!updatedPets.find(p => p.id === pet.id)) {
        updatedPets.push(pet);
      }
      return { pet, roster: { ...state.roster, pets: updatedPets, activePetId: pet.id } };
    }
    return { pet };
  }),
  updatePet: (updates) =>
    set((state) => {
      const updated = state.pet ? { ...state.pet, ...updates } : null;
      if (updated && state.roster.pets.length > 0) {
        const updatedPets = state.roster.pets.map(p => p.id === updated.id ? updated : p);
        return { pet: updated, roster: { ...state.roster, pets: updatedPets } };
      }
      return { pet: updated };
    }),
  updatePetFn: (fn) =>
    set((state) => {
      const updated = state.pet ? fn(state.pet) : null;
      if (updated && state.roster.pets.length > 0) {
        const updatedPets = state.roster.pets.map(p => p.id === updated.id ? updated : p);
        return { pet: updated, roster: { ...state.roster, pets: updatedPets } };
      }
      return { pet: updated };
    }),

  // --- Multi-Pet Roster ---
  roster: { pets: [], activePetId: '', maxSlots: 1 },
  setRoster: (roster) => set({ roster }),
  addPet: (pet) =>
    set((state) => {
      const maxSlots = Math.max(1, state.wallet.inscriptions.length);
      if (state.roster.pets.length >= maxSlots) return state; // At capacity
      const newPets = [...state.roster.pets, pet];
      return {
        roster: { ...state.roster, pets: newPets, maxSlots },
        // If no active pet, make this one active
        pet: state.pet || pet,
      };
    }),
  removePet: (petId) =>
    set((state) => {
      const newPets = state.roster.pets.filter(p => p.id !== petId);
      const wasActive = state.roster.activePetId === petId;
      const newActivePetId = wasActive ? (newPets[0]?.id || '') : state.roster.activePetId;
      const newActivePet = wasActive ? (newPets[0] || null) : state.pet;
      return {
        roster: { ...state.roster, pets: newPets, activePetId: newActivePetId },
        pet: newActivePet,
      };
    }),
  switchActivePet: (petId) =>
    set((state) => {
      const targetPet = state.roster.pets.find(p => p.id === petId);
      if (!targetPet) return state;
      return {
        pet: targetPet,
        roster: { ...state.roster, activePetId: petId },
      };
    }),
  getMaxPetSlots: (): number => {
    return Math.max(1, (useStore as any).getState().wallet.inscriptions.length);
  },

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

  // --- Direct Messages (NIP-17) ---
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) =>
    set((state) => {
      const exists = state.conversations.find((c) => c.pubkey === conversation.pubkey);
      if (exists) {
        return {
          conversations: state.conversations.map((c) =>
            c.pubkey === conversation.pubkey ? conversation : c
          ),
        };
      }
      return { conversations: [...state.conversations, conversation] };
    }),
  messages: {},
  addMessage: (pubkey, message) =>
    set((state) => {
      const existing = state.messages[pubkey] || [];
      return {
        messages: { ...state.messages, [pubkey]: [...existing, message] },
      };
    }),
  markMessagesRead: (pubkey) =>
    set((state) => {
      const existing = state.messages[pubkey] || [];
      return {
        messages: {
          ...state.messages,
          [pubkey]: existing.map((m) => (m.recipient === pubkey ? { ...m, read: true } : m)),
        },
        conversations: state.conversations.map((c) =>
          c.pubkey === pubkey ? { ...c, unreadCount: 0 } : c
        ),
      };
    }),
  getUnreadCount: () => {
    let count = 0;
    useStore.getState().conversations.forEach((c) => {
      count += c.unreadCount;
    });
    return count;
  },
}));
