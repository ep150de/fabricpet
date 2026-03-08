// ============================================
// FabricPet — Main Application
// ============================================

import { useEffect, useCallback } from 'react';
import { useStore } from './store/useStore';
import { loadStoredIdentity, hasNostrExtension, connectWithExtension, generateNewIdentity } from './nostr/identity';
import { loadPetState, savePetState } from './nostr/petStorage';
import { decayNeeds } from './engine/NeedsSystem';
import { saveLocalPet, loadLocalPet } from './store/localStorage';
import { Navigation } from './components/Navigation';
import { PetView } from './components/PetView';
import { BattleScreen } from './components/BattleScreen';
import { WalletView } from './components/WalletView';
import { HomeView } from './components/HomeView';
import { SetupScreen } from './components/SetupScreen';
import { Notification } from './components/Notification';

export default function App() {
  const { identity, setIdentity, pet, setPet, currentView, isLoading, setLoading, notification } = useStore();

  // Initialize identity and load pet state
  const initialize = useCallback(async () => {
    setLoading(true);

    try {
      // Try to load stored identity
      let id = loadStoredIdentity();

      // If no stored identity, try NIP-07 extension
      if (!id && hasNostrExtension()) {
        try {
          id = await connectWithExtension();
        } catch {
          // Extension denied or not available
        }
      }

      // If still no identity, generate a new one
      if (!id) {
        id = generateNewIdentity();
      }

      setIdentity(id);

      // === LOAD PET: localStorage first (instant), then Nostr (cross-device) ===
      let bestPet: import('./types').Pet | null = null;
      let bestTimestamp = 0;

      // 1. Try localStorage (fast, reliable, survives republish)
      const local = loadLocalPet();
      if (local) {
        bestPet = local.pet;
        bestTimestamp = local.timestamp;
        console.log('[Init] Loaded pet from localStorage, saved:', new Date(bestTimestamp).toLocaleString());
      }

      // 2. Try Nostr relays (cross-device sync)
      if (id) {
        try {
          const nostrPet = await loadPetState(id.pubkey);
          if (nostrPet) {
            const nostrTimestamp = nostrPet.lastInteraction || 0;
            if (nostrTimestamp > bestTimestamp) {
              bestPet = nostrPet;
              bestTimestamp = nostrTimestamp;
              console.log('[Init] Nostr pet is newer, using Nostr data');
            } else {
              console.log('[Init] localStorage pet is newer, keeping local data');
            }
          }
        } catch (e) {
          console.warn('[Init] Nostr load failed, using localStorage:', e);
        }
      }

      // 3. Apply time-based decay and set pet
      if (bestPet) {
        const minutesElapsed = (Date.now() - bestPet.lastInteraction) / 60000;
        const decayedPet = decayNeeds(bestPet, Math.min(minutesElapsed, 480));
        setPet(decayedPet);
        saveLocalPet(decayedPet); // Persist decayed state
      }
    } catch (error) {
      console.error('Initialization error:', error);
    } finally {
      setLoading(false);
    }
  }, [setIdentity, setPet, setLoading]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Save to localStorage on every pet change
  useEffect(() => {
    if (pet) {
      saveLocalPet(pet);
    }
  }, [pet]);

  // Periodic needs decay (every 30 seconds) + save to localStorage
  useEffect(() => {
    if (!pet) return;

    const interval = setInterval(() => {
      const updatedPet = decayNeeds(pet, 0.5); // 0.5 minutes = 30 seconds
      setPet(updatedPet);
      saveLocalPet(updatedPet);
    }, 30000);

    return () => clearInterval(interval);
  }, [pet, setPet]);

  // Auto-save to Nostr every 2 minutes (cross-device sync)
  useEffect(() => {
    if (!pet || !identity) return;

    const nostrInterval = setInterval(() => {
      savePetState(identity, pet).then(ok => {
        if (ok) console.log('[AutoSave] Pet synced to Nostr relays');
      }).catch(() => {});
    }, 120000); // 2 minutes

    return () => clearInterval(nostrInterval);
  }, [pet, identity]);

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f23]">
        <div className="text-center">
          <div className="text-6xl animate-bounce-pet mb-4">🐾</div>
          <h1 className="text-2xl font-bold text-indigo-400">FabricPet</h1>
          <p className="text-gray-400 mt-2">Loading your pet...</p>
        </div>
      </div>
    );
  }

  // Setup screen (no pet yet)
  if (!pet) {
    return <SetupScreen />;
  }

  // Main app
  return (
    <div className="min-h-screen bg-[#0f0f23] flex flex-col">
      {/* Notification */}
      {notification && <Notification message={notification.message} emoji={notification.emoji} />}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {currentView === 'home' && <HomeView />}
        {currentView === 'pet' && <PetView />}
        {currentView === 'battle' && <BattleScreen />}
        {currentView === 'wallet' && <WalletView />}
      </main>

      {/* Bottom Navigation */}
      <Navigation />
    </div>
  );
}
