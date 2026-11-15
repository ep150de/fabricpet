// ============================================
// Pet Customizer — Color and pattern customization
// ============================================

import { useState } from 'react';
import { useStore } from '../store/useStore';
import { playSound } from '../engine/AudioManager';
import { saveLocalPet } from '../store/indexedDBStorage';
import { getStageEmoji } from '../engine/PetStateMachine';

interface ColorOption {
  id: string;
  name: string;
  color: string;
  unlockLevel: number;
}

interface PatternOption {
  id: string;
  name: string;
  emoji: string;
  unlockLevel: number;
}

const COLOR_OPTIONS: ColorOption[] = [
  { id: 'default', name: 'Default', color: '', unlockLevel: 1 },
  { id: 'red', name: 'Crimson', color: '#ff4444', unlockLevel: 5 },
  { id: 'blue', name: 'Ocean', color: '#4488ff', unlockLevel: 5 },
  { id: 'green', name: 'Forest', color: '#44ff44', unlockLevel: 5 },
  { id: 'purple', name: 'Royal', color: '#aa44ff', unlockLevel: 10 },
  { id: 'gold', name: 'Golden', color: '#ffcc00', unlockLevel: 15 },
  { id: 'pink', name: 'Cherry', color: '#ff69b4', unlockLevel: 10 },
  { id: 'cyan', name: 'Ice', color: '#00ffff', unlockLevel: 15 },
  { id: 'orange', name: 'Sunset', color: '#ff8800', unlockLevel: 20 },
  { id: 'white', name: 'Pearl', color: '#ffffff', unlockLevel: 25 },
  { id: 'black', name: 'Shadow', color: '#333333', unlockLevel: 25 },
  { id: 'rainbow', name: 'Rainbow', color: 'rainbow', unlockLevel: 50 },
];

const PATTERN_OPTIONS: PatternOption[] = [
  { id: 'none', name: 'Solid', emoji: '⚪', unlockLevel: 1 },
  { id: 'spots', name: 'Spots', emoji: '🐆', unlockLevel: 8 },
  { id: 'stripes', name: 'Stripes', emoji: '🐯', unlockLevel: 8 },
  { id: 'stars', name: 'Stars', emoji: '⭐', unlockLevel: 12 },
  { id: 'hearts', name: 'Hearts', emoji: '💕', unlockLevel: 12 },
  { id: 'flames', name: 'Flames', emoji: '🔥', unlockLevel: 15 },
  { id: 'waves', name: 'Waves', emoji: '🌊', unlockLevel: 15 },
  { id: 'leaves', name: 'Leaves', emoji: '🌿', unlockLevel: 20 },
];

export function PetCustomizer() {
  const { pet, setPet, setNotification } = useStore();
  const [selectedColor, setSelectedColor] = useState<string>(pet?.customColor || 'default');
  const [selectedPattern, setSelectedPattern] = useState<string>(pet?.customPattern || 'none');

  if (!pet) {
    return (
      <div className="p-4 text-center text-gray-400">
        No pet selected
      </div>
    );
  }

  const handleApplyColor = async (colorId: string) => {
    const colorOption = COLOR_OPTIONS.find(c => c.id === colorId);
    if (!colorOption || colorOption.unlockLevel > pet.level) return;

    const updatedPet = { ...pet, customColor: colorId };
    setPet(updatedPet);
    await saveLocalPet(updatedPet);
    playSound('click');
    setNotification({
      message: `Color changed to ${colorOption.name}!`,
      emoji: '🎨',
    });
  };

  const handleApplyPattern = async (patternId: string) => {
    const patternOption = PATTERN_OPTIONS.find(p => p.id === patternId);
    if (!patternOption || patternOption.unlockLevel > pet.level) return;

    const updatedPet = { ...pet, customPattern: patternId };
    setPet(updatedPet);
    await saveLocalPet(updatedPet);
    playSound('click');
    setNotification({
      message: `Pattern changed to ${patternOption.name}!`,
      emoji: '✨',
    });
  };

  const availableColors = COLOR_OPTIONS.filter(c => c.unlockLevel <= pet.level);
  const availablePatterns = PATTERN_OPTIONS.filter(p => p.unlockLevel <= pet.level);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">🎨 Pet Customizer</h2>
        <p className="text-gray-400 text-sm mt-1">
          Personalize your pet's appearance
        </p>
      </div>

      {/* Preview */}
      <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800 mb-4 text-center">
        <div className="text-6xl mb-2">{getStageEmoji(pet.stage)}</div>
        <div className="text-sm font-semibold text-white">{pet.name}</div>
        <div className="text-xs text-gray-400 mt-1">
          {COLOR_OPTIONS.find(c => c.id === (pet.customColor || 'default'))?.name || 'Default'} • 
          {PATTERN_OPTIONS.find(p => p.id === (pet.customPattern || 'none'))?.name || 'Solid'}
        </div>
      </div>

      {/* Color Selection */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 mb-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">🎨 Colors</h3>
        <div className="grid grid-cols-4 gap-2">
          {COLOR_OPTIONS.map((color) => {
            const isLocked = color.unlockLevel > pet.level;
            const isSelected = (pet.customColor || 'default') === color.id;
            
            return (
              <button
                key={color.id}
                onClick={() => !isLocked && handleApplyColor(color.id)}
                disabled={isLocked}
                className={`relative p-2 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/20'
                    : isLocked
                      ? 'border-gray-800 opacity-40 cursor-not-allowed'
                      : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {color.id === 'rainbow' ? (
                  <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500" />
                ) : color.color ? (
                  <div 
                    className="w-8 h-8 mx-auto rounded-full border border-gray-600"
                    style={{ backgroundColor: color.color }}
                  />
                ) : (
                  <div className="w-8 h-8 mx-auto rounded-full bg-gray-600 border border-gray-500" />
                )}
                <div className="text-xs text-gray-400 mt-1 truncate">{color.name}</div>
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs">🔒</span>
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-0 right-0 text-indigo-400 text-xs">✓</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pattern Selection */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">✨ Patterns</h3>
        <div className="grid grid-cols-4 gap-2">
          {PATTERN_OPTIONS.map((pattern) => {
            const isLocked = pattern.unlockLevel > pet.level;
            const isSelected = (pet.customPattern || 'none') === pattern.id;
            
            return (
              <button
                key={pattern.id}
                onClick={() => !isLocked && handleApplyPattern(pattern.id)}
                disabled={isLocked}
                className={`relative p-2 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/20'
                    : isLocked
                      ? 'border-gray-800 opacity-40 cursor-not-allowed'
                      : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-2xl text-center">{pattern.emoji}</div>
                <div className="text-xs text-gray-400 mt-1 text-center truncate">{pattern.name}</div>
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs">🔒 Lv.{pattern.unlockLevel}</span>
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-0 right-0 text-indigo-400 text-xs">✓</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-600 text-center">
        Unlock more colors and patterns by leveling up your pet!
      </div>
    </div>
  );
}
