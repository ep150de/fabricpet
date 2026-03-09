// ============================================
// Battle Screen — Pokémon-style turn-based battles
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useArenaStore } from '../store/arenaStore';
import { ArenaView } from './ArenaView';
import { publishChallenge, subscribeToChallenges, type BattleChallenge } from '../nostr/battleRelay';
import { createBattle, executeTurn, calculateBattleXP, getBattleSummary } from '../battle/BattleEngine';
import { getMove, MOVES } from '../engine/MoveDatabase';
import { addXP, getStageEmoji } from '../engine/PetStateMachine';
import { savePetState } from '../nostr/petStorage';
import type { BattleState, Pet } from '../types';

// ============================================
// Arena Mode Panel — Biome selector + arena battle launcher
// ============================================

const BIOMES = [
  { id: 'cyber_grid', name: 'Cyber Grid', emoji: '⚡', color: 'text-cyan-400', bg: 'from-cyan-900/40 to-blue-900/40', element: 'air', desc: 'Neon-lit digital battlefield with pulsing grid lines' },
  { id: 'volcanic_forge', name: 'Volcanic Forge', emoji: '🌋', color: 'text-red-400', bg: 'from-red-900/40 to-orange-900/40', element: 'fire', desc: 'Molten lava flows and volcanic eruptions' },
  { id: 'deep_ocean', name: 'Deep Ocean', emoji: '🌊', color: 'text-blue-400', bg: 'from-blue-900/40 to-indigo-900/40', element: 'water', desc: 'Bioluminescent deep sea arena' },
  { id: 'crystal_cavern', name: 'Crystal Cavern', emoji: '💎', color: 'text-purple-400', bg: 'from-purple-900/40 to-violet-900/40', element: 'light', desc: 'Shimmering crystal formations and prismatic light' },
  { id: 'void_nexus', name: 'Void Nexus', emoji: '🌀', color: 'text-gray-400', bg: 'from-gray-900/40 to-slate-900/40', element: 'dark', desc: 'Swirling void energy and dark matter' },
  { id: 'sky_temple', name: 'Sky Temple', emoji: '⛩️', color: 'text-yellow-400', bg: 'from-yellow-900/40 to-amber-900/40', element: 'air', desc: 'Floating temple above the clouds' },
  { id: 'overgrown_ruins', name: 'Overgrown Ruins', emoji: '🌿', color: 'text-green-400', bg: 'from-green-900/40 to-emerald-900/40', element: 'earth', desc: 'Ancient ruins reclaimed by nature' },
] as const;

function ArenaModePanel({ pet, startPracticeBattle }: { pet: Pet; startPracticeBattle: () => void }) {
  const { arenaStatus, selectedBiome, setSelectedBiome, setArenaStatus, setMaterializationProgress, resetArena } = useArenaStore();
  const [materializing, setMaterializing] = useState(false);

  const selectedBiomeData = BIOMES.find(b => b.id === selectedBiome) || null;

  const handleStartArenaBattle = () => {
    if (!selectedBiome) return;

    // Simulate arena materialization
    setMaterializing(true);
    setArenaStatus('materializing');
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      setMaterializationProgress(Math.min(progress, 1));
      if (progress >= 1) {
        clearInterval(interval);
        setArenaStatus('active');
        setMaterializing(false);
        // Start the battle in the arena context
        startPracticeBattle();
      }
    }, 100);
  };

  return (
    <div className="mb-4 space-y-3">
      {/* Arena Viewport */}
      <ArenaView height="200px" className="rounded-xl overflow-hidden border border-gray-800" />

      {/* Arena Status */}
      <div className="bg-[#1a1a2e] rounded-xl p-3 border border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            arenaStatus === 'active' ? 'bg-green-400' :
            arenaStatus === 'materializing' ? 'bg-yellow-400 animate-pulse' :
            arenaStatus === 'resolving' ? 'bg-red-400 animate-pulse' :
            'bg-gray-600'
          }`} />
          <span className="text-xs text-gray-400 capitalize">Arena: {arenaStatus}</span>
        </div>
        {arenaStatus !== 'dormant' && (
          <button onClick={resetArena} className="text-xs text-gray-500 hover:text-gray-300">Reset</button>
        )}
      </div>

      {/* Biome Selector */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-cyan-300 mb-3">🏟️ Select Arena Biome</h3>
        <div className="grid grid-cols-1 gap-2">
          {BIOMES.map((biome) => (
            <button
              key={biome.id}
              onClick={() => setSelectedBiome(biome.id as any)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                selectedBiome === biome.id
                  ? `bg-gradient-to-r ${biome.bg} border border-${biome.color.replace('text-', '')}/50`
                  : 'bg-[#0f0f23] border border-gray-800 hover:border-gray-700'
              }`}
            >
              <span className="text-2xl">{biome.emoji}</span>
              <div className="flex-1">
                <div className={`text-sm font-semibold ${selectedBiome === biome.id ? biome.color : 'text-gray-300'}`}>
                  {biome.name}
                </div>
                <div className="text-xs text-gray-500">{biome.desc}</div>
              </div>
              <span className="text-xs text-gray-600 capitalize">{biome.element}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Start Arena Battle */}
      <button
        onClick={handleStartArenaBattle}
        disabled={!selectedBiome || materializing}
        className={`w-full font-semibold py-4 rounded-xl transition-all active:scale-98 ${
          !selectedBiome
            ? 'bg-[#1a1a2e] border border-gray-700 text-gray-500 cursor-not-allowed'
            : materializing
            ? 'bg-gradient-to-r from-cyan-700 to-teal-700 text-cyan-200'
            : 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600'
        }`}
      >
        {materializing
          ? '⏳ Materializing Arena...'
          : selectedBiome
          ? `🏟️ Start Arena Battle — ${selectedBiomeData?.name}`
          : '🏟️ Select a Biome to Battle'}
      </button>

      {/* Pet Preview in Arena Context */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 text-center">
        <div className="text-4xl mb-2">{getStageEmoji(pet.stage)}</div>
        <div className="text-sm font-semibold text-white">{pet.name}</div>
        <div className="text-xs text-gray-400">Lv.{pet.level} • {pet.elementalType} type</div>
        <div className="flex justify-center gap-3 mt-2 text-xs">
          <span className="text-red-400">HP:{pet.battleStats.hp}</span>
          <span className="text-orange-400">ATK:{pet.battleStats.atk}</span>
          <span className="text-blue-400">DEF:{pet.battleStats.def}</span>
          <span className="text-green-400">SPD:{pet.battleStats.spd}</span>
        </div>
      </div>
    </div>
  );
}

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

type BattleMode = 'fight' | 'arena';

export function BattleScreen() {
  const { pet, setPet, identity, activeBattle, setActiveBattle, setNotification } = useStore();
  const [battleMode, setBattleMode] = useState<BattleMode>('fight');
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [incomingChallenges, setIncomingChallenges] = useState<BattleChallenge[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [challengePublished, setChallengePublished] = useState(false);

  // Subscribe to incoming Nostr challenges
  useEffect(() => {
    if (!identity) return;
    let unsub: (() => void) | null = null;

    subscribeToChallenges(identity.pubkey, (challenge) => {
      setIncomingChallenges(prev => {
        // Deduplicate
        if (prev.some(c => c.challengeId === challenge.challengeId)) return prev;
        return [...prev, challenge];
      });
    }).then(fn => { unsub = fn; });

    return () => { if (unsub) unsub(); };
  }, [identity]);

  const handlePublishChallenge = useCallback(async () => {
    if (!identity || !pet) return;
    setIsPublishing(true);
    try {
      await publishChallenge(
        identity,
        pet.name,
        pet.level,
        pet.elementalType,
        { ...pet.battleStats },
        pet.moves
      );
      setChallengePublished(true);
      setNotification({ message: '📡 Challenge broadcast to Nostr!', emoji: '⚔️' });
      setTimeout(() => setChallengePublished(false), 10000);
    } catch (e) {
      console.error('Failed to publish challenge:', e);
      setNotification({ message: 'Failed to publish challenge', emoji: '❌' });
    }
    setIsPublishing(false);
  }, [identity, pet, setNotification]);

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

      // Save to Nostr immediately (don't wait for 2-min auto-save)
      if (identity) {
        savePetState(identity, newPet).then(ok => {
          if (ok) {
            console.log('[Battle] Pet saved to Nostr with updated record:', newPet.battleRecord);
            setNotification({
              message: won
                ? `🏆 Victory! ${newPet.battleRecord.wins} wins recorded!`
                : `Battle lost. ${newPet.battleRecord.losses} losses total.`,
              emoji: won ? '🏆' : '💪',
            });
          }
        }).catch(console.error);
      } else {
        // No identity — still show notification for local tracking
        setNotification({
          message: won
            ? `🏆 Victory! ${newPet.battleRecord.wins} wins!`
            : `Battle lost. Keep training!`,
          emoji: won ? '🏆' : '💪',
        });
      }
    }
  };

  // No active battle — show battle menu
  if (!activeBattle) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white">⚔️ Battle Arena</h2>
          <p className="text-gray-400 mt-1">Challenge opponents to friendly battles!</p>
        </div>

        {/* Mode Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setBattleMode('fight')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              battleMode === 'fight'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
            }`}
          >
            ⚔️ Fight
          </button>
          <button
            onClick={() => setBattleMode('arena')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              battleMode === 'arena'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
            }`}
          >
            🏟️ HoloBall Arena
          </button>
        </div>

        {/* Arena Mode */}
        {battleMode === 'arena' && <ArenaModePanel pet={pet} startPracticeBattle={startPracticeBattle} />}

        {/* Fight Mode */}
        {battleMode === 'fight' && <>
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

          {identity ? (
            <button
              onClick={handlePublishChallenge}
              disabled={isPublishing || challengePublished}
              className={`w-full font-semibold py-4 rounded-xl transition-all active:scale-98 ${
                challengePublished
                  ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
              }`}
            >
              {isPublishing ? '📡 Broadcasting...' : challengePublished ? '✅ Challenge Live on Nostr!' : '🌐 Challenge Player (via Nostr)'}
            </button>
          ) : (
            <button
              disabled
              className="w-full bg-[#1a1a2e] border border-gray-700 text-gray-500 font-semibold py-4 rounded-xl cursor-not-allowed"
            >
              🌐 Connect Wallet to Challenge Players
            </button>
          )}

          <button
            onClick={() => setBattleMode('arena')}
            className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold py-4 rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all active:scale-98"
          >
            🏟️ HoloBall Arena Battle (Spatial Fabric)
          </button>
        </div>

        {/* Incoming Challenges */}
        {incomingChallenges.length > 0 && (
          <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl p-4 mt-4 border border-orange-500/30">
            <h3 className="text-sm font-semibold text-orange-300 mb-3">📨 Incoming Challenges ({incomingChallenges.length})</h3>
            <div className="space-y-2">
              {incomingChallenges.slice(0, 5).map((challenge) => (
                <div key={challenge.challengeId} className="bg-[#0f0f23] rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white font-semibold">{challenge.challengerPetName}</div>
                    <div className="text-xs text-gray-400">
                      Lv.{challenge.challengerPetLevel} • {challenge.challengerPetType} type •{' '}
                      <span className="text-gray-500">{challenge.challengerPubkey.slice(0, 8)}...</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Start battle against the challenger's pet
                      const battle = createBattle(
                        'player',
                        challenge.challengerPubkey,
                        {
                          name: pet.name,
                          stats: { ...pet.battleStats },
                          moves: pet.moves,
                          elementalType: pet.elementalType,
                        },
                        {
                          name: challenge.challengerPetName,
                          stats: { ...challenge.challengerStats },
                          moves: challenge.challengerMoves,
                          elementalType: challenge.challengerPetType,
                        }
                      );
                      setActiveBattle(battle);
                      setBattleLog([`⚔️ ${pet.name} vs ${challenge.challengerPetName}! P2P Battle via Nostr!`]);
                      setIncomingChallenges(prev => prev.filter(c => c.challengeId !== challenge.challengeId));
                    }}
                    className="bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all"
                  >
                    ⚔️ Accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
        </>}
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
