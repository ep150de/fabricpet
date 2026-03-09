// ============================================
// Pet Roster Bar — Multi-pet switcher UI
// ============================================
// Horizontal scrollable bar showing all owned pets.
// Tap to switch active pet. "+" to hatch new pet.
// Max slots = number of wallet inscriptions (min 1).
// ============================================

import { useState } from 'react';
import { useStore } from '../store/useStore';
import { getStageEmoji, getMoodEmoji } from '../engine/PetStateMachine';
import { createNewPet } from '../engine/PetFactory';
import type { ElementalType } from '../types';

const ELEMENT_EMOJI: Record<string, string> = {
  fire: '🔥', water: '💧', earth: '🌿', air: '💨',
  light: '✨', dark: '🌑', neutral: '⚪',
};

const ELEMENT_COLORS: Record<string, string> = {
  fire: 'border-red-500/50', water: 'border-blue-500/50', earth: 'border-green-500/50',
  air: 'border-cyan-500/50', light: 'border-yellow-500/50', dark: 'border-purple-500/50',
  neutral: 'border-gray-500/50',
};

export function PetRosterBar() {
  const { pet, roster, switchActivePet, addPet, removePet, wallet, setNotification } = useStore();
  const [showHatchModal, setShowHatchModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  if (!pet) return null;

  const maxSlots = Math.max(1, wallet.inscriptions.length || roster.maxSlots);
  const canAddPet = roster.pets.length < maxSlots;
  const emptySlots = Math.max(0, Math.min(maxSlots - roster.pets.length, 5)); // Show up to 5 empty slots

  return (
    <>
      {/* Roster Bar */}
      <div className="bg-[#1a1a2e] border-b border-gray-800 px-3 py-2">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-xs text-gray-500">🐾 Roster</span>
          <span className="text-xs text-gray-600">
            {roster.pets.length}/{maxSlots} pets
          </span>
          {!wallet.connected && (
            <span className="text-xs text-amber-500/60 ml-auto">
              Connect wallet for more slots!
            </span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {/* Existing Pets */}
          {roster.pets.map((rosterPet: import('../types').Pet) => {
            const isActive = rosterPet.id === pet.id;
            const borderColor = ELEMENT_COLORS[rosterPet.elementalType] || 'border-gray-500/50';

            return (
              <button
                key={rosterPet.id}
                onClick={() => {
                  if (!isActive) {
                    switchActivePet(rosterPet.id);
                    setNotification({ message: `Switched to ${rosterPet.name}!`, emoji: '🔄' });
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (roster.pets.length > 1) {
                    setShowDeleteConfirm(rosterPet.id);
                  }
                }}
                className={`flex-shrink-0 flex flex-col items-center p-2 rounded-xl transition-all min-w-[64px] ${
                  isActive
                    ? `bg-indigo-500/20 border-2 ${borderColor} shadow-lg shadow-indigo-500/10`
                    : 'bg-[#0f0f23] border border-gray-800 hover:border-gray-600 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="text-2xl">{getStageEmoji(rosterPet.stage)}</div>
                <div className={`text-xs font-semibold truncate max-w-[56px] ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {rosterPet.name}
                </div>
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px] text-gray-500">Lv.{rosterPet.level}</span>
                  <span className="text-[10px]">{getMoodEmoji(rosterPet.mood)}</span>
                </div>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-0.5" />
                )}
              </button>
            );
          })}

          {/* Empty Slots */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <button
              key={`empty-${i}`}
              onClick={() => canAddPet && setShowHatchModal(true)}
              className="flex-shrink-0 flex flex-col items-center justify-center p-2 rounded-xl min-w-[64px] min-h-[72px] border border-dashed border-gray-700 hover:border-indigo-500/50 transition-all group"
            >
              <div className="text-xl text-gray-600 group-hover:text-indigo-400 transition-colors">+</div>
              <div className="text-[10px] text-gray-600 group-hover:text-indigo-400">Hatch</div>
            </button>
          ))}

          {/* Locked Slots indicator */}
          {!wallet.connected && (
            <div className="flex-shrink-0 flex flex-col items-center justify-center p-2 rounded-xl min-w-[64px] min-h-[72px] border border-dashed border-amber-800/30">
              <div className="text-xl text-amber-800/50">🔒</div>
              <div className="text-[10px] text-amber-800/50">Wallet</div>
            </div>
          )}
        </div>
      </div>

      {/* Hatch New Pet Modal */}
      {showHatchModal && (
        <HatchPetModal
          onClose={() => setShowHatchModal(false)}
          onHatch={(name, element) => {
            const newPet = createNewPet(name, element);
            addPet(newPet);
            setShowHatchModal(false);
            setNotification({ message: `${name} hatched! 🥚✨`, emoji: '🎉' });
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <DeletePetModal
          petId={showDeleteConfirm}
          petName={roster.pets.find((p: import('../types').Pet) => p.id === showDeleteConfirm)?.name || ''}
          onClose={() => setShowDeleteConfirm(null)}
          onDelete={() => {
            const name = roster.pets.find((p: import('../types').Pet) => p.id === showDeleteConfirm)?.name;
            removePet(showDeleteConfirm);
            setShowDeleteConfirm(null);
            setNotification({ message: `${name} released... 🌈`, emoji: '👋' });
          }}
        />
      )}
    </>
  );
}

// --- Hatch Pet Modal ---

function HatchPetModal({ onClose, onHatch }: { onClose: () => void; onHatch: (name: string, element: ElementalType) => void }) {
  const [name, setName] = useState('');
  const [element, setElement] = useState<ElementalType>('neutral');

  const elements: { type: ElementalType; emoji: string; label: string }[] = [
    { type: 'fire', emoji: '🔥', label: 'Fire' },
    { type: 'water', emoji: '💧', label: 'Water' },
    { type: 'earth', emoji: '🌿', label: 'Earth' },
    { type: 'air', emoji: '💨', label: 'Air' },
    { type: 'light', emoji: '✨', label: 'Light' },
    { type: 'dark', emoji: '🌑', label: 'Dark' },
    { type: 'neutral', emoji: '⚪', label: 'Neutral' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-sm w-full border border-indigo-500/30" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-1">🥚 Hatch New Pet</h3>
        <p className="text-xs text-gray-400 mb-4">Each inscription in your wallet unlocks a pet slot!</p>

        {/* Name Input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name your pet..."
          maxLength={20}
          className="w-full bg-[#0f0f23] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 mb-4"
          autoFocus
        />

        {/* Element Selector */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Choose element:</p>
          <div className="grid grid-cols-4 gap-2">
            {elements.map(el => (
              <button
                key={el.type}
                onClick={() => setElement(el.type)}
                className={`p-2 rounded-lg text-center transition-all ${
                  element === el.type
                    ? 'bg-indigo-500/20 border border-indigo-500'
                    : 'bg-[#0f0f23] border border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="text-lg">{el.emoji}</div>
                <div className="text-[10px] text-gray-400">{el.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-[#0f0f23] border border-gray-700 text-gray-400 py-3 rounded-xl font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onHatch(name.trim(), element)}
            disabled={!name.trim()}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-xl font-semibold disabled:opacity-40"
          >
            🥚 Hatch!
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Delete Pet Modal ---

function DeletePetModal({ petId, petName, onClose, onDelete }: { petId: string; petName: string; onClose: () => void; onDelete: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-sm w-full border border-red-500/30" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-2">👋 Release {petName}?</h3>
        <p className="text-sm text-gray-400 mb-4">
          This will permanently release {petName} into the wild. This cannot be undone!
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-[#0f0f23] border border-gray-700 text-gray-400 py-3 rounded-xl font-semibold"
          >
            Keep
          </button>
          <button
            onClick={onDelete}
            className="flex-1 bg-red-500/20 border border-red-500/50 text-red-400 py-3 rounded-xl font-semibold"
          >
            Release 🌈
          </button>
        </div>
      </div>
    </div>
  );
}
