// ============================================
// FabricPet — Main Application
// ============================================

import { useEffect, useCallback } from 'react';
import { useStore } from './store/useStore';
import { loadStoredIdentity, hasNostrExtension, connectWithExtension, generateNewIdentity } from './nostr/identity';
import { loadPetState, savePetState } from './nostr/petStorage';
import { decayNeeds } from './engine/NeedsSystem';
import { saveLocalPet, loadLocalPet, saveLocalRoster, loadLocalRoster } from './store/localStorage';
import { Navigation } from './components/Navigation';
import { PetView } from './components/PetView';
import { BattleScreen } from './components/BattleScreen';
import { WalletView } from './components/WalletView';
import { HomeView } from './components/HomeView';
import { ChatView } from './components/ChatView';
import { ArenaView } from './components/ArenaView';
import { SocialView } from './components/SocialView';
import { ARView } from './components/ARView';
import { SetupScreen } from './components/SetupScreen';
import { scheduleSceneSync } from './rp1/SceneSync';
import { parseDeepLink, clearDeepLinkParams } from './rp1/DeepLinkHandler';
import { startRP1Listener, stopRP1Listener } from './rp1/RP1Listener';
import { Notification } from './components/Notification';

export default function App() {
  const { identity, setIdentity, pet, setPet, currentView, setView, isLoading, setLoading, notification, setNotification, wallet, roster, setRoster } = useStore();

  // Initialize identity and load pet state
  const initialize = useCallback(async () => {
    setLoading(true);

    try {
      // Try to load stored identity (async — decodes nsec for signing)
      let id = await loadStoredIdentity();

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

      // 4. Load roster (multi-pet support) — migrates single pet if needed
      const localRoster = loadLocalRoster();
      if (localRoster) {
        // Update max slots based on wallet (will be updated again when wallet connects)
        setRoster(localRoster.roster);
        console.log(`[Init] Loaded roster: ${localRoster.roster.pets.length} pets, active: ${localRoster.roster.activePetId}`);
      } else if (bestPet) {
        // Bootstrap roster from the single pet we just loaded
        setRoster({
          pets: [bestPet],
          activePetId: bestPet.id,
          maxSlots: 1,
        });
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

  // Process deep links on load
  useEffect(() => {
    const deepLink = parseDeepLink();
    if (deepLink) {
      console.log('[DeepLink] Processing:', deepLink);
      // Store params BEFORE navigating so components can read them
      if (Object.keys(deepLink.params).length > 0) {
        useStore.getState().setDeepLinkParams(deepLink.params);
      }
      setView(deepLink.view);
      clearDeepLinkParams();
    }
  }, [setView]);

  // Start RP1 proximity listener when identity is available
  useEffect(() => {
    if (!identity) return;
    startRP1Listener(identity.pubkey);
    return () => stopRP1Listener();
  }, [identity]);

  // Save to localStorage on every pet change + save roster
  useEffect(() => {
    if (pet) {
      saveLocalPet(pet);
    }
  }, [pet]);

  // Save roster whenever it changes
  useEffect(() => {
    if (roster.pets.length > 0) {
      saveLocalRoster(roster);
    }
  }, [roster]);

  // Update max pet slots when wallet inscriptions change
  useEffect(() => {
    if (wallet.connected) {
      const maxSlots = Math.max(1, wallet.inscriptions.length);
      if (maxSlots !== roster.maxSlots) {
        setRoster({ ...roster, maxSlots });
        console.log(`[Roster] Max pet slots updated: ${maxSlots} (${wallet.inscriptions.length} inscriptions)`);
      }
    }
  }, [wallet.inscriptions.length, wallet.connected]);

  // Periodic needs decay (every 30 seconds) + save to localStorage
  // Uses functional update to avoid stale closure overwriting battle records
  const { updatePetFn } = useStore();
  useEffect(() => {
    if (!pet) return;

    const interval = setInterval(() => {
      updatePetFn((prev: import('./types').Pet) => {
        const updated = decayNeeds(prev, 0.5); // 0.5 minutes = 30 seconds
        saveLocalPet(updated);
        return updated;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [!!pet, updatePetFn]); // Only re-create when pet exists/doesn't exist

  // Auto-sync scene to RP1 when wallet inscriptions change
  useEffect(() => {
    if (!pet || !wallet.connected || wallet.inscriptions.length === 0) return;
    
    scheduleSceneSync(
      pet, 
      wallet.inscriptions,
      // onSyncStart
      () => {
        setNotification({ message: 'Syncing scene to RP1...', emoji: '🔄' });
      },
      // onSyncComplete
      (success: boolean) => {
        if (success) {
          setNotification({ message: 'Scene synced to RP1!', emoji: '✅' });
        } else {
          setNotification({ message: 'Scene sync failed - use manual share', emoji: '⚠️' });
        }
        // Clear notification after 3 seconds
        setTimeout(() => setNotification(null), 3000);
      }
    );
  }, [pet, wallet.connected, wallet.inscriptions, setNotification]);

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
      <main className="flex-1 overflow-y-auto pb-28" style={{ paddingBottom: 'max(7rem, calc(5rem + env(safe-area-inset-bottom, 0px)))' }}>
        {currentView === 'home' && <HomeView />}
        {currentView === 'pet' && <PetView />}
        {currentView === 'chat' && <ChatView />}
        {currentView === 'battle' && <BattleScreen />}
        {currentView === 'arena' && <ArenaView height="calc(100vh - 8rem)" />}
        {currentView === 'social' && <SocialView />}
        {currentView === 'ar' && <ARView />}
        {currentView === 'wallet' && <WalletView />}
      </main>

      {/* Bottom Navigation */}
      <Navigation />
    </div>
  );
}
