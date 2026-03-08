// ============================================
// Pet View — Main pet interaction screen
// ============================================

import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { getMoodEmoji, getStageEmoji, xpForNextLevel, addXP } from '../engine/PetStateMachine';
import { applyAction, getOverallHealth, getSuggestion, isCritical } from '../engine/NeedsSystem';
import { evaluateBehavior, getReactionEmote } from '../engine/BehaviorTree';
import { savePetState } from '../nostr/petStorage';
import { getInscriptionPreviewUrl } from '../avatar/OrdinalRenderer';
import type { PetNeeds } from '../types';

const needsConfig: { key: keyof PetNeeds; label: string; emoji: string; color: string }[] = [
  { key: 'hunger', label: 'Hunger', emoji: '🍽️', color: 'bg-orange-500' },
  { key: 'happiness', label: 'Happiness', emoji: '😊', color: 'bg-pink-500' },
  { key: 'energy', label: 'Energy', emoji: '⚡', color: 'bg-yellow-500' },
  { key: 'hygiene', label: 'Hygiene', emoji: '✨', color: 'bg-cyan-500' },
];

const actions = [
  { id: 'feed', emoji: '🍽️', label: 'Feed', event: 'fed' },
  { id: 'play', emoji: '🎮', label: 'Play', event: 'played' },
  { id: 'clean', emoji: '🛁', label: 'Clean', event: 'cleaned' },
  { id: 'sleep', emoji: '😴', label: 'Sleep', event: 'slept' },
  { id: 'treat', emoji: '🍬', label: 'Treat', event: 'fed' },
] as const;

export function PetView() {
  const { pet, setPet, identity, setNotification, currentBehavior, setCurrentBehavior } = useStore();
  const [reactionEmote, setReactionEmote] = useState<{ emoji: string; message: string } | null>(null);
  const [ordinalPreview, setOrdinalPreview] = useState<string | null>(null);
  const behaviorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load ordinal preview image
  useEffect(() => {
    if (!pet?.equippedOrdinal) { setOrdinalPreview(null); return; }
    let cancelled = false;
    getInscriptionPreviewUrl(pet.equippedOrdinal).then((url) => {
      if (!cancelled) setOrdinalPreview(url);
    });
    return () => { cancelled = true; };
  }, [pet?.equippedOrdinal]);

  // Run behavior tree
  useEffect(() => {
    if (!pet) return;

    const runBehavior = () => {
      const action = evaluateBehavior(pet, false, 0);
      setCurrentBehavior(action);

      behaviorTimerRef.current = setTimeout(runBehavior, action.duration);
    };

    runBehavior();
    return () => {
      if (behaviorTimerRef.current) clearTimeout(behaviorTimerRef.current);
    };
  }, [pet?.needs.hunger, pet?.needs.happiness, pet?.needs.energy, pet?.needs.hygiene, pet, setCurrentBehavior]);

  if (!pet) return null;

  const handleAction = async (actionId: string, eventName: string) => {
    const { pet: updatedPet, xpGained } = applyAction(pet, actionId as 'feed' | 'play' | 'clean' | 'sleep' | 'treat');
    const { pet: xpPet, leveledUp, evolved } = addXP(updatedPet, xpGained);

    setPet(xpPet);

    // Show reaction
    const reaction = getReactionEmote(eventName);
    setReactionEmote(reaction);
    setTimeout(() => setReactionEmote(null), 2000);

    // Notifications
    if (evolved) {
      setNotification({ message: `${pet.name} evolved to ${xpPet.stage}!`, emoji: '🌟' });
    } else if (leveledUp) {
      setNotification({ message: `${pet.name} reached level ${xpPet.level}!`, emoji: '🎊' });
    }

    // Save to Nostr
    if (identity) {
      savePetState(identity, xpPet).catch(console.error);
    }
  };

  const overallHealth = getOverallHealth(pet.needs);
  const critical = isCritical(pet.needs);
  const suggestion = getSuggestion(pet.needs);
  const xpNeeded = xpForNextLevel(pet.level);
  const xpPercent = Math.round((pet.xp / xpNeeded) * 100);

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Pet Display */}
      <div className="bg-[#1a1a2e] rounded-2xl p-6 mb-4 border border-gray-800 relative overflow-hidden">
        {/* Background gradient based on elemental type */}
        <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${
          pet.elementalType === 'fire' ? 'from-red-500 to-orange-500' :
          pet.elementalType === 'water' ? 'from-blue-500 to-cyan-500' :
          pet.elementalType === 'earth' ? 'from-green-500 to-emerald-500' :
          pet.elementalType === 'air' ? 'from-gray-300 to-white' :
          pet.elementalType === 'light' ? 'from-yellow-300 to-amber-300' :
          pet.elementalType === 'dark' ? 'from-purple-500 to-violet-500' :
          'from-indigo-500 to-purple-500'
        }`} />

        <div className="relative text-center">
          {/* Pet emoji/avatar — ordinal image replaces emoji when equipped */}
          <div className={`mb-2 ${critical ? 'animate-shake' : 'animate-float'}`}>
            {ordinalPreview ? (
              <img
                src={ordinalPreview}
                alt={`${pet.name} ordinal avatar`}
                className="w-24 h-24 mx-auto rounded-full object-cover border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/20"
              />
            ) : (
              <span className="text-8xl">{getStageEmoji(pet.stage)}</span>
            )}
          </div>

          {/* Reaction emote */}
          {reactionEmote && (
            <div className="absolute top-0 right-1/4 text-3xl animate-bounce-pet">
              {reactionEmote.emoji}
            </div>
          )}

          {/* Pet name and level */}
          <h2 className="text-xl font-bold text-white">{pet.name}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-sm text-gray-400">Lv.{pet.level}</span>
            <span className="text-sm">{getMoodEmoji(pet.mood)}</span>
            <span className="text-sm text-gray-400 capitalize">{pet.mood}</span>
          </div>

          {/* Elemental type badge */}
          {pet.elementalType !== 'neutral' && (
            <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-300 capitalize">
              {pet.elementalType} type
            </span>
          )}

          {/* Behavior status */}
          {currentBehavior && (
            <div className="mt-3 text-sm text-gray-500">
              {currentBehavior.emoji} {currentBehavior.name}
            </div>
          )}

          {/* Reaction message */}
          {reactionEmote && (
            <div className="mt-2 text-sm text-indigo-300 font-medium">
              "{reactionEmote.message}"
            </div>
          )}
        </div>
      </div>

      {/* XP Bar */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4 border border-gray-800">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>XP: {pet.xp}/{xpNeeded}</span>
          <span>{xpPercent}%</span>
        </div>
        <div className="status-bar">
          <div
            className="status-bar-fill bg-gradient-to-r from-indigo-500 to-purple-500"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{getStageEmoji(pet.stage)} {pet.stage}</span>
          <span>Overall: {overallHealth}%</span>
        </div>
      </div>

      {/* Needs Bars */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Needs</h3>
        <div className="space-y-3">
          {needsConfig.map(({ key, label, emoji, color }) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{emoji} {label}</span>
                <span>{Math.round(pet.needs[key])}%</span>
              </div>
              <div className="status-bar">
                <div
                  className={`status-bar-fill ${color} ${pet.needs[key] < 20 ? 'animate-pulse' : ''}`}
                  style={{ width: `${pet.needs[key]}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Suggestion */}
        <div className="mt-3 text-xs text-gray-500 italic">
          {suggestion}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id, action.event)}
            className="bg-[#1a1a2e] border border-gray-800 rounded-xl p-3 flex flex-col items-center hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all active:scale-95"
          >
            <span className="text-2xl">{action.emoji}</span>
            <span className="text-xs text-gray-400 mt-1">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Battle Stats */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">⚔️ Battle Stats</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'HP', value: pet.battleStats.hp, max: pet.battleStats.maxHp, color: 'text-red-400' },
            { label: 'ATK', value: pet.battleStats.atk, color: 'text-orange-400' },
            { label: 'DEF', value: pet.battleStats.def, color: 'text-blue-400' },
            { label: 'SPD', value: pet.battleStats.spd, color: 'text-green-400' },
            { label: 'SPL', value: pet.battleStats.special, color: 'text-purple-400' },
            { label: 'W/L', value: `${pet.battleRecord.wins}/${pet.battleRecord.losses}`, color: 'text-yellow-400' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={`text-lg font-bold ${stat.color}`}>
                {typeof stat.value === 'number' ? stat.value : stat.value}
              </div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Equipped Ordinal */}
        {pet.equippedOrdinal && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="text-xs text-gray-500">
              ₿ Equipped: <span className="text-indigo-400">{pet.equippedOrdinal.slice(0, 16)}...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
