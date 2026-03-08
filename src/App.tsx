// ============================================
// FabricPet — Main Application
// ============================================

import { useEffect, useCallback } from 'react';
import { useStore } from './store/useStore';
import { loadStoredIdentity, hasNostrExtension, connectWithExtension, generateNewIdentity } from './nostr/identity';
import { loadPetState } from './nostr/petStorage';
import { decayNeeds } from './engine/NeedsSystem';
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

      // Load pet state from Nostr
      if (id) {
        const savedPet = await loadPetState(id.pubkey);
        if (savedPet) {
          // Apply time-based decay since last interaction
          const minutesElapsed = (Date.now() - savedPet.lastInteraction) / 60000;
          const decayedPet = decayNeeds(savedPet, Math.min(minutesElapsed, 480)); // Cap at 8 hours
          setPet(decayedPet);
        }
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

  // Periodic needs decay (every 30 seconds)
  useEffect(() => {
    if (!pet) return;

    const interval = setInterval(() => {
      const updatedPet = decayNeeds(pet, 0.5); // 0.5 minutes = 30 seconds
      setPet(updatedPet);
    }, 30000);

    return () => clearInterval(interval);
  }, [pet, setPet]);

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
