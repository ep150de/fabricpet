// ============================================
// Setup Screen — Create your first pet
// ============================================

import { useState } from 'react';
import { useStore } from '../store/useStore';
import { createNewPet } from '../engine/PetStateMachine';
import { savePetState } from '../nostr/petStorage';

export function SetupScreen() {
  const { identity, setPet, setView, setNotification } = useStore();
  const [petName, setPetName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!petName.trim()) return;
    setIsCreating(true);

    try {
      const newPet = createNewPet(petName.trim());
      setPet(newPet);

      // Save to Nostr
      if (identity) {
        await savePetState(identity, newPet);
      }

      setNotification({ message: `${petName} has hatched! 🎉`, emoji: '🥚' });
      setView('pet');
    } catch (error) {
      console.error('Failed to create pet:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4 animate-float">🥚</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
            FabricPet
          </h1>
          <p className="text-gray-400 mt-2">
            Your virtual pet in the spatial metaverse
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { emoji: '🌐', text: 'Lives in RP1 Spatial Fabric' },
            { emoji: '₿', text: 'Bitcoin Ordinal Skins' },
            { emoji: '⚔️', text: 'Pokémon-style Battles' },
            { emoji: '📡', text: 'Nostr-powered Storage' },
          ].map((feature) => (
            <div
              key={feature.text}
              className="bg-[#1a1a2e] rounded-lg p-3 text-center border border-gray-800"
            >
              <div className="text-2xl mb-1">{feature.emoji}</div>
              <div className="text-xs text-gray-400">{feature.text}</div>
            </div>
          ))}
        </div>

        {/* Name Input */}
        <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">Name Your Pet</h2>
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="Enter a name..."
            maxLength={20}
            className="w-full bg-[#0f0f23] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={!petName.trim() || isCreating}
            className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold py-3 rounded-lg hover:from-indigo-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isCreating ? '🥚 Hatching...' : '🐣 Hatch Your Pet!'}
          </button>
        </div>

        {/* Identity Info */}
        {identity && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600">
              Nostr ID: {identity.npub.slice(0, 12)}...{identity.npub.slice(-8)}
            </p>
          </div>
        )}

        {/* Open Source Badge */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-600">
            🔓 100% Open Source • MIT License
          </p>
          <p className="text-xs text-gray-700 mt-1">
            Powered by RP1 • Nostr • Open Source Avatars • Bitcoin Ordinals
          </p>
        </div>
      </div>
    </div>
  );
}
