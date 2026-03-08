// ============================================
// Battle Screen — Pokémon-style turn-based battles
// ============================================

import { useState } from 'react';
import { useStore } from '../store/useStore';
import { createBattle, executeTurn, calculateBattleXP, getBattleSummary } from '../battle/BattleEngine';
import { getMove, MOVES } from '../engine/MoveDatabase';
import { addXP, getStageEmoji } from '../engine/PetStateMachine';
import { savePetState } from '../nostr/petStorage';
import type { BattleState } from '../types';

// Generate a random opponent for practice battles
function generateOpponent(playerLevel: number) {
  const names = ['Sparky', 'Biscuit', 'Luna', 'Mochi', 'Pixel', 'Nimbus', 'Ember', 'Frost'];
  const types = ['fire', 'water', 'earth', 'air', 'light', 'dark', 'neutral'] as const;
  const name = names[Math.floor(Math.random() * names.length)];
  const level = Math.max(1, playerLevel + Math.floor(Math.random() * 5) - 2);
  const type = types[Math.floor(Math.random() * types.length)];
  const baseHp = 20 + level * 3;

  return {
    name,
    level,
    stats: {
      hp: baseHp,
      maxHp: baseHp,
      atk: 5 + level * 2,
      def: 4 + level * 1.5,
      spd: 5 + level * 1.5,
      special: 5 + level * 1.5,
    },
    moves: ['tackle', 'spark', 'shield', 'rest'],
    elementalType: type,
  };
}

export function BattleScreen() {
  const { pet, setPet, identity, activeBattle, setActiveBattle, setNotification } = useStore();
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  if (!pet) return null;

  const startPracticeBattle = () => {
    const opponent = generateOpponent(pet.level);
    const battle = createBattle(
      'player',
      'cpu',
      {
        name: pet.name,
        stats: { ...pet.battleStats },
        moves: pet.moves,
        elementalType: pet.elementalType,
      },
      opponent
    );
    setActiveBattle(battle);
    setBattleLog([`⚔️ ${pet.name} vs ${opponent.name}! Battle start!`]);
    setSelectedMove(null);
  };

  const executePlayerMove = async (moveId: string) => {
    if (!activeBattle || activeBattle.status === 'finished' || isAnimating) return;

    setIsAnimating(true);
    setSelectedMove(moveId);

    // CPU picks a random move
    const cpuMoves = activeBattle.pets[1].moves;
    const cpuMove = cpuMoves[Math.floor(Math.random() * cpuMoves.length)];

    // Execute turn
    const result = executeTurn(activeBattle, moveId, cpuMove);

    // Add turn messages to log
    const newMessages = result.turns
      .filter(t => t.turn === activeBattle.currentTurn)
      .map(t => t.message);
    setBattleLog(prev => [...prev, ...newMessages]);

    // Animate
    await new Promise(resolve => setTimeout(resolve, 1500));

    setActiveBattle(result);
    setSelectedMove(null);
    setIsAnimating(false);

    // Check for battle end
    if (result.status === 'finished') {
      const won = result.winner === 'player';
      const xp = calculateBattleXP(won, pet.level);
      const { pet: updatedPet, leveledUp, evolved } = addXP(pet, xp);

      // Update battle record
      const newPet = {
        ...updatedPet,
        battleRecord: {
          ...updatedPet.battleRecord,
          wins: updatedPet.battleRecord.wins + (won ? 1 : 0),
          losses: updatedPet.battleRecord.losses + (won ? 0 : 1),
        },
      };

      setPet(newPet);
      setBattleLog(prev => [
        ...prev,
        getBattleSummary(result),
        `+${xp} XP gained!`,
      ]);

      if (evolved) {
        setNotification({ message: `${pet.name} evolved to ${newPet.stage}!`, emoji: '🌟' });
      } else if (leveledUp) {
        setNotification({ message: `${pet.name} reached level ${newPet.level}!`, emoji: '🎊' });
      }

      // Save to Nostr
      if (identity) {
        savePetState(identity, newPet).catch(console.error);
      }
    }
  };

  // No active battle — show battle menu
  if (!activeBattle) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">⚔️ Battle Arena</h2>
          <p className="text-gray-400 mt-1">Challenge opponents to friendly battles!</p>
        </div>

        {/* Pet Preview */}
        <div className="bg-[#1a1a2e] rounded-xl p-6 mb-4 border border-gray-800 text-center">
          <div className="text-5xl mb-2">{getStageEmoji(pet.stage)}</div>
          <h3 className="text-lg font-bold text-white">{pet.name}</h3>
          <p className="text-sm text-gray-400">Lv.{pet.level} • {pet.elementalType} type</p>
          <div className="flex justify-center gap-4 mt-3 text-sm">
            <span className="text-red-400">HP:{pet.battleStats.hp}</span>
            <span className="text-orange-400">ATK:{pet.battleStats.atk}</span>
            <span className="text-blue-400">DEF:{pet.battleStats.def}</span>
            <span className="text-green-400">SPD:{pet.battleStats.spd}</span>
          </div>
        </div>

        {/* Battle Options */}
        <div className="space-y-3">
          <button
            onClick={startPracticeBattle}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-4 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all active:scale-98"
          >
            🤖 Practice Battle (vs CPU)
          </button>

          <button
            disabled
            className="w-full bg-[#1a1a2e] border border-gray-700 text-gray-500 font-semibold py-4 rounded-xl cursor-not-allowed"
          >
            🌐 Challenge Player (via Nostr) — Coming Soon
          </button>

          <button
            disabled
            className="w-full bg-[#1a1a2e] border border-gray-700 text-gray-500 font-semibold py-4 rounded-xl cursor-not-allowed"
          >
            🏟️ Spatial Arena (RP1 Fabric) — Coming Soon
          </button>
        </div>

        {/* Battle Record */}
        <div className="bg-[#1a1a2e] rounded-xl p-4 mt-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">📊 Battle Record</h3>
          <div className="flex justify-around text-center">
            <div>
              <div className="text-xl font-bold text-green-400">{pet.battleRecord.wins}</div>
              <div className="text-xs text-gray-500">Wins</div>
            </div>
            <div>
              <div className="text-xl font-bold text-red-400">{pet.battleRecord.losses}</div>
              <div className="text-xs text-gray-500">Losses</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-400">{pet.battleRecord.draws}</div>
              <div className="text-xs text-gray-500">Draws</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active battle
  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Battle Header */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-white">
          Turn {activeBattle.currentTurn}
          {activeBattle.status === 'finished' && ' — Battle Over!'}
        </h2>
      </div>

      {/* Battle Field */}
      <div className="bg-[#1a1a2e] rounded-2xl p-4 mb-4 border border-gray-800">
        {/* Opponent */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">{activeBattle.pets[1].name}</div>
            <div className="text-xs text-gray-400 capitalize">{activeBattle.pets[1].elementalType}</div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>HP</span>
              <span>{Math.max(0, activeBattle.pets[1].hp)}/{activeBattle.pets[1].maxHp}</span>
            </div>
            <div className="status-bar">
              <div
                className={`status-bar-fill ${
                  activeBattle.pets[1].hp / activeBattle.pets[1].maxHp > 0.5
                    ? 'bg-green-500'
                    : activeBattle.pets[1].hp / activeBattle.pets[1].maxHp > 0.2
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, (activeBattle.pets[1].hp / activeBattle.pets[1].maxHp) * 100)}%` }}
              />
            </div>
          </div>
          <div className={`text-4xl ml-3 ${isAnimating && selectedMove ? 'animate-shake' : ''}`}>
            🤖
          </div>
        </div>

        {/* VS Divider */}
        <div className="text-center text-gray-600 text-sm mb-6">— VS —</div>

        {/* Player */}
        <div className="flex items-center justify-between">
          <div className={`text-4xl mr-3 ${isAnimating && selectedMove ? 'animate-shake' : 'animate-float'}`}>
            {getStageEmoji(pet.stage)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>HP</span>
              <span>{Math.max(0, activeBattle.pets[0].hp)}/{activeBattle.pets[0].maxHp}</span>
            </div>
            <div className="status-bar">
              <div
                className={`status-bar-fill ${
                  activeBattle.pets[0].hp / activeBattle.pets[0].maxHp > 0.5
                    ? 'bg-green-500'
                    : activeBattle.pets[0].hp / activeBattle.pets[0].maxHp > 0.2
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, (activeBattle.pets[0].hp / activeBattle.pets[0].maxHp) * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex-1 text-right">
            <div className="text-sm font-semibold text-white">{activeBattle.pets[0].name}</div>
            <div className="text-xs text-gray-400">Lv.{pet.level}</div>
          </div>
        </div>
      </div>

      {/* Move Selector */}
      {activeBattle.status === 'active' && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {activeBattle.pets[0].moves.map((moveId) => {
            const move = getMove(moveId);
            if (!move) return null;
            return (
              <button
                key={moveId}
                onClick={() => executePlayerMove(moveId)}
                disabled={isAnimating}
                className={`bg-[#1a1a2e] border rounded-xl p-3 text-left transition-all active:scale-95 ${
                  isAnimating
                    ? 'border-gray-800 opacity-50'
                    : 'border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{move.emoji}</span>
                  <span className="text-sm font-semibold text-white">{move.name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {move.power > 0 ? `PWR: ${move.power}` : move.healAmount ? `Heal: ${move.healAmount}` : 'Status'}
                  {' • '}ACC: {move.accuracy}%
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Battle Over Actions */}
      {activeBattle.status === 'finished' && (
        <div className="space-y-2 mb-4">
          <button
            onClick={startPracticeBattle}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-3 rounded-xl"
          >
            🔄 Battle Again
          </button>
          <button
            onClick={() => setActiveBattle(null)}
            className="w-full bg-[#1a1a2e] border border-gray-700 text-gray-300 font-semibold py-3 rounded-xl"
          >
            ← Back to Menu
          </button>
        </div>
      )}

      {/* Battle Log */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 max-h-48 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">📜 Battle Log</h3>
        <div className="space-y-1">
          {battleLog.map((msg, i) => (
            <div key={i} className="text-xs text-gray-400">
              {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
