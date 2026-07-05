// ============================================
// Accessory Shop — Browse and equip pet cosmetics
// ============================================

import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  ACCESSORIES,
  getAvailableAccessories,
  getAccessoriesBySlot,
  equipAccessory,
  unequipAccessory,
  getRarityColor,
} from '../engine/AccessoryEngine';
import { saveLocalPet } from '../store/indexedDBStorage';
import type { AccessorySlot } from '../types';

type ShopTab = 'all' | 'head' | 'body' | 'back' | 'held';

export function AccessoryShop() {
  const { pet, setPet, setNotification } = useStore();
  const [activeTab, setActiveTab] = useState<ShopTab>('all');
  const [showLocked, setShowLocked] = useState(false);

  if (!pet) {
    return (
      <div className="p-4 text-center text-gray-400">
        No pet selected
      </div>
    );
  }

  const availableAccessories = getAvailableAccessories(pet.level);
  const equippedIds = pet.accessories.map(acc => acc.accessoryId);

  const filteredAccessories = activeTab === 'all'
    ? ACCESSORIES
    : getAccessoriesBySlot(activeTab as AccessorySlot);

  const displayAccessories = showLocked
    ? filteredAccessories
    : filteredAccessories.filter(acc => acc.unlockLevel <= pet.level);

  const handleEquip = async (accessoryId: string) => {
    const updatedPet = equipAccessory(pet, accessoryId);
    setPet(updatedPet);
    await saveLocalPet(updatedPet);
    
    const accessory = ACCESSORIES.find(a => a.id === accessoryId);
    setNotification({
      message: `Equipped ${accessory?.name}!`,
      emoji: accessory?.emoji || '✨',
    });
  };

  const handleUnequip = async (slot: AccessorySlot) => {
    const updatedPet = unequipAccessory(pet, slot);
    setPet(updatedPet);
    await saveLocalPet(updatedPet);
    setNotification({
      message: 'Accessory removed',
      emoji: '👋',
    });
  };

  const tabs: { id: ShopTab; label: string; emoji: string }[] = [
    { id: 'all', label: 'All', emoji: '🎨' },
    { id: 'head', label: 'Head', emoji: '👒' },
    { id: 'body', label: 'Body', emoji: '👕' },
    { id: 'back', label: 'Back', emoji: '🎒' },
    { id: 'held', label: 'Held', emoji: '⚔️' },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">🎨 Accessory Shop</h2>
        <p className="text-gray-400 text-sm mt-1">
          Customize your pet with cosmetics
        </p>
      </div>

      {/* Currently Equipped */}
      {pet.accessories.length > 0 && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">✨ Equipped</h3>
          <div className="space-y-2">
            {pet.accessories.map((equipped) => {
              const accessory = ACCESSORIES.find(a => a.id === equipped.accessoryId);
              if (!accessory) return null;
              
              return (
                <div
                  key={equipped.slot}
                  className="flex items-center justify-between bg-[#0f0f23] rounded-lg p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{accessory.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {accessory.name}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {equipped.slot} slot
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnequip(equipped.slot)}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Show Locked Toggle */}
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={showLocked}
            onChange={(e) => setShowLocked(e.target.checked)}
            className="rounded"
          />
          Show locked accessories
        </label>
        <div className="text-xs text-gray-500">
          {availableAccessories.length} / {ACCESSORIES.length} unlocked
        </div>
      </div>

      {/* Accessory Grid */}
      <div className="grid grid-cols-2 gap-3">
        {displayAccessories.map((accessory) => {
          const isEquipped = equippedIds.includes(accessory.id);
          const isLocked = accessory.unlockLevel > pet.level;
          const rarityColor = getRarityColor(accessory.rarity);

          return (
            <div
              key={accessory.id}
              className={`bg-[#1a1a2e] rounded-xl p-3 border transition-all ${
                isEquipped
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : isLocked
                    ? 'border-gray-800 opacity-50'
                    : 'border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="text-center mb-2">
                <div className="text-4xl mb-1">{accessory.emoji}</div>
                <div className="text-sm font-semibold text-white">
                  {accessory.name}
                </div>
                <div
                  className="text-xs font-semibold capitalize mt-1"
                  style={{ color: rarityColor }}
                >
                  {accessory.rarity}
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center mb-2">
                {accessory.description}
              </div>

              {accessory.statBonus && (
                <div className="text-xs text-gray-400 text-center mb-2">
                  {Object.entries(accessory.statBonus).map(([stat, value]) => (
                    <span key={stat} className="inline-block mr-2">
                      +{value} {stat.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}

              {isLocked ? (
                <div className="text-xs text-gray-600 text-center">
                  🔒 Unlocks at Lv.{accessory.unlockLevel}
                </div>
              ) : isEquipped ? (
                <div className="text-xs text-indigo-400 text-center font-semibold">
                  ✓ Equipped
                </div>
              ) : (
                <button
                  onClick={() => handleEquip(accessory.id)}
                  className="w-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 rounded-lg py-1 text-xs font-semibold hover:bg-indigo-500/30 transition-all"
                >
                  Equip
                </button>
              )}
            </div>
          );
        })}
      </div>

      {displayAccessories.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🎨</div>
          <p className="text-sm">No accessories in this category</p>
        </div>
      )}
    </div>
  );
}
