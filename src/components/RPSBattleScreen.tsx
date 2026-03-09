// ============================================
// RPS Battle Screen — Rock-Paper-Scissors mini-game
// ============================================
// Pick Strike/Wind/Shield → sign & commit to Nostr → reveal → resolve damage.
// Each move is a signed Nostr event — verifiable battle log!
// ============================================

import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getStageEmoji } from '../engine/PetStateMachine';
import { addXP } from '../engine/PetStateMachine';
import { savePetState } from '../nostr/petStorage';
import { saveLocalPet } from '../store/localStorage';
import { commitRPSMove, publishRPSResult } from '../nostr/battleRelay';
import {
  createRPSBattle,
  executeRPSRound,
  cpuPickRPS,
  getFlavorName,
  getChoiceDisplay,
  calculateRPSXP,
  getRPSSummary,
  type RPSChoice,
  type RPSBattleState,
} from '../battle/RPSEngine';

type Difficulty = 'easy' | 'normal' | 'hard';

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 0.6,
  normal: 0.85,
  hard: 1.15,
};

interface RPSBattleScreenProps {
  onBack: () => void;
}

export function RPSBattleScreen({ onBack }: RPSBattleScreenProps) {
  const { pet, setPet, identity, setNotification } = useStore();

  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [rpsBattle, setRpsBattle] = useState<RPSBattleState | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitStatus, setCommitStatus] = useState<string | null>(null);
  const [playerChoice, setPlayerChoice] = useState<RPSChoice | null>(null);
  const [cpuChoice, setCpuChoice] = useState<RPSChoice | null>(null);
  const [roundResult, setRoundResult] = useState<'p1win' | 'p2win' | 'draw' | null>(null);
  const [battleResult, setBattleResult] = useState<'won' | 'lost' | null>(null);
  const [showReveal, setShowReveal] = useState(false);

  if (!pet) return null;

  // Generate CPU opponent scaled from player stats
  const generateCPU = () => {
    const names = ['Sparky', 'Biscuit', 'Luna', 'Mochi', 'Pixel', 'Nimbus', 'Ember', 'Frost'];
    const types = ['fire', 'water', 'earth', 'air', 'light', 'dark', 'neutral'] as const;
    const mult = DIFFICULTY_MULTIPLIER[difficulty];
    const v = () => 0.9 + Math.random() * 0.2;
    const hp = Math.max(5, Math.round(pet.battleStats.maxHp * mult * v()));
    return {
      name: names[Math.floor(Math.random() * names.length)],
      stats: {
        hp, maxHp: hp,
        atk: Math.max(1, Math.round(pet.battleStats.atk * mult * v())),
        def: Math.max(1, Math.round(pet.battleStats.def * mult * v())),
        spd: Math.max(1, Math.round(pet.battleStats.spd * mult * v())),
        special: Math.max(1, Math.round(pet.battleStats.special * mult * v())),
      },
      elementalType: types[Math.floor(Math.random() * types.length)] as typeof types[number],
    };
  };

  const startBattle = () => {
    setBattleResult(null);
    setPlayerChoice(null);
    setCpuChoice(null);
    setRoundResult(null);
    setShowReveal(false);
    setCommitStatus(null);

    const cpu = generateCPU();
    const battle = createRPSBattle(
      identity?.pubkey || 'player',
      'cpu',
      { name: pet.name, stats: { ...pet.battleStats }, elementalType: pet.elementalType },
      { name: cpu.name, stats: cpu.stats, elementalType: cpu.elementalType }
    );
    setRpsBattle(battle);
    setBattleLog([`⚔️ RPS Battle! ${pet.name} vs ${cpu.name}!`]);
  };

  const handlePickMove = useCallback(async (choice: RPSChoice) => {
    if (!rpsBattle || rpsBattle.status === 'finished' || isCommitting) return;

    setPlayerChoice(choice);
    setIsCommitting(true);
    setCommitStatus('✍️ Signing move...');

    // Step 1: Commit move to Nostr (signed event)
    let relayCount = 0;
    if (identity) {
      try {
        setCommitStatus('📡 Publishing to Nostr relays...');
        const result = await commitRPSMove(identity, rpsBattle.id, rpsBattle.currentRound, choice);
        relayCount = result.relayCount;
        setCommitStatus(`✅ Committed to ${relayCount} relay${relayCount > 1 ? 's' : ''}!`);
      } catch (e) {
        console.warn('[RPS] Commit failed (continuing locally):', e);
        setCommitStatus('⚠️ Relay commit failed — resolving locally');
      }
    } else {
      setCommitStatus('🔒 No identity — resolving locally');
    }

    // Step 2: CPU picks (after a brief delay for drama)
    await new Promise(r => setTimeout(r, 800));

    const cpuPick = cpuPickRPS(difficulty, rpsBattle.currentRound, rpsBattle.id);
    setCpuChoice(cpuPick);

    // Step 3: Reveal animation
    setShowReveal(true);
    await new Promise(r => setTimeout(r, 1200));

    // Step 4: Resolve round
    const updated = executeRPSRound(rpsBattle, choice, cpuPick);
    const lastRound = updated.rounds[updated.rounds.length - 1];
    setRoundResult(lastRound.result);
    setBattleLog(prev => [...prev, lastRound.message]);
    setRpsBattle(updated);

    // Step 5: Check for battle end
    if (updated.status === 'finished') {
      const won = updated.winner === updated.players[0];
      setBattleResult(won ? 'won' : 'lost');
      setBattleLog(prev => [...prev, getRPSSummary(updated)]);

      // Award XP
      const xp = calculateRPSXP(won, updated.rounds.length);
      const { pet: updatedPet, leveledUp, evolved } = addXP(pet, xp);
      const newPet = {
        ...updatedPet,
        battleRecord: {
          ...updatedPet.battleRecord,
          wins: updatedPet.battleRecord.wins + (won ? 1 : 0),
          losses: updatedPet.battleRecord.losses + (won ? 0 : 1),
        },
      };
      setPet(newPet);
      saveLocalPet(newPet);
      setBattleLog(prev => [...prev, `+${xp} XP gained!`]);

      // Publish result to Nostr
      if (identity) {
        publishRPSResult(identity, updated).catch(console.error);
        savePetState(identity, newPet).catch(console.error);
      }

      if (evolved) {
        setNotification({ message: `${pet.name} evolved to ${newPet.stage}!`, emoji: '🌟' });
      } else if (leveledUp) {
        setNotification({ message: `${pet.name} reached level ${newPet.level}!`, emoji: '🎊' });
      } else {
        setNotification({
          message: won ? `🏆 Victory! +${xp} XP` : `💪 Defeat. +${xp} XP`,
          emoji: won ? '🏆' : '💪',
        });
      }
    }

    // Reset for next round (after delay)
    await new Promise(r => setTimeout(r, 1500));
    if (updated.status !== 'finished') {
      setPlayerChoice(null);
      setCpuChoice(null);
      setRoundResult(null);
      setShowReveal(false);
      setCommitStatus(null);
    }
    setIsCommitting(false);
  }, [rpsBattle, isCommitting, identity, difficulty, pet, setPet, setNotification]);

  // --- Pre-battle menu ---
  if (!rpsBattle) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white">🎲 RPS Battle</h2>
          <p className="text-gray-400 text-sm mt-1">Rock-Paper-Scissors with Nostr signing!</p>
        </div>

        {/* How it works */}
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 mb-4">
          <h3 className="text-sm font-semibold text-cyan-300 mb-2">⚡ How It Works</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-[#0f0f23] rounded-lg">
              <div className="text-2xl">🔥</div>
              <div className="text-xs text-gray-400 mt-1">Strike</div>
              <div className="text-xs text-green-400">beats Wind</div>
            </div>
            <div className="text-center p-2 bg-[#0f0f23] rounded-lg">
              <div className="text-2xl">💨</div>
              <div className="text-xs text-gray-400 mt-1">Wind</div>
              <div className="text-xs text-green-400">beats Shield</div>
            </div>
            <div className="text-center p-2 bg-[#0f0f23] rounded-lg">
              <div className="text-2xl">🛡️</div>
              <div className="text-xs text-gray-400 mt-1">Shield</div>
              <div className="text-xs text-green-400">beats Strike</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Each move is signed & committed to Nostr relays — verifiable battle log! ✍️
          </p>
        </div>

        {/* Pet preview */}
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 mb-4 text-center">
          <div className="text-4xl mb-2">{getStageEmoji(pet.stage)}</div>
          <div className="text-sm font-bold text-white">{pet.name}</div>
          <div className="text-xs text-gray-400">Lv.{pet.level} • {pet.elementalType}</div>
          <div className="flex justify-center gap-3 mt-2 text-xs">
            <span className="text-red-400">HP:{pet.battleStats.maxHp}</span>
            <span className="text-orange-400">ATK:{pet.battleStats.atk}</span>
            <span className="text-blue-400">DEF:{pet.battleStats.def}</span>
          </div>
        </div>

        {/* Difficulty */}
        <div className="bg-[#1a1a2e] rounded-xl p-3 mb-4 border border-gray-800">
          <div className="text-xs text-gray-400 mb-2 text-center">Difficulty</div>
          <div className="flex gap-2">
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  difficulty === d
                    ? d === 'easy' ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : d === 'normal' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                      : 'bg-red-500/20 text-red-400 border border-red-500/50'
                    : 'bg-[#0f0f23] text-gray-500 border border-gray-800'
                }`}
              >
                {d === 'easy' ? '🟢 Easy' : d === 'normal' ? '🟡 Normal' : '🔴 Hard'}
              </button>
            ))}
          </div>
        </div>

        {/* Start */}
        <button
          onClick={startBattle}
          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold py-4 rounded-xl hover:from-orange-600 hover:to-pink-600 transition-all active:scale-98 mb-3"
        >
          🎲 Start RPS Battle (vs CPU)
        </button>

        <button
          onClick={onBack}
          className="w-full bg-[#1a1a2e] border border-gray-700 text-gray-400 font-semibold py-3 rounded-xl"
        >
          ← Back to Battle Menu
        </button>
      </div>
    );
  }

  // --- Active RPS Battle ---
  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-3">
        <h2 className="text-lg font-bold text-white">
          Round {rpsBattle.currentRound}
          {rpsBattle.status === 'finished' && ' — Battle Over!'}
        </h2>
      </div>

      {/* Victory / Defeat Banner */}
      {battleResult && (
        <div className={`rounded-2xl p-6 mb-4 text-center border-2 ${
          battleResult === 'won'
            ? 'bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/50'
            : 'bg-gradient-to-r from-red-900/50 to-rose-900/50 border-red-500/50'
        }`}>
          <div className="text-5xl mb-2">{battleResult === 'won' ? '🏆' : '💀'}</div>
          <div className={`text-3xl font-black tracking-wider ${
            battleResult === 'won' ? 'text-green-400' : 'text-red-400'
          }`}>
            {battleResult === 'won' ? 'VICTORY!' : 'DEFEAT'}
          </div>
          <div className="text-sm text-gray-400 mt-2">
            {battleResult === 'won'
              ? `${pet.name} wins the RPS battle! 🎉`
              : `${pet.name} was defeated. Try again! 💪`}
          </div>
        </div>
      )}

      {/* HP Bars */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4 border border-gray-800">
        {/* Opponent */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-2xl">🤖</div>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{rpsBattle.petNames[1]}</span>
              <span>{Math.max(0, rpsBattle.hp[1])}/{rpsBattle.maxHp[1]}</span>
            </div>
            <div className="h-3 bg-[#0f0f23] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  rpsBattle.hp[1] / rpsBattle.maxHp[1] > 0.5 ? 'bg-green-500'
                    : rpsBattle.hp[1] / rpsBattle.maxHp[1] > 0.2 ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, (rpsBattle.hp[1] / rpsBattle.maxHp[1]) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* VS + Round Result */}
        <div className="text-center mb-4">
          {showReveal && playerChoice && cpuChoice ? (
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div className={`text-4xl transition-all duration-300 ${roundResult === 'p1win' ? 'scale-125' : roundResult === 'p2win' ? 'opacity-50 scale-90' : ''}`}>
                  {getChoiceDisplay(playerChoice).emoji}
                </div>
                <div className="text-xs text-gray-400 mt-1">{getChoiceDisplay(playerChoice).name}</div>
              </div>
              <div className={`text-lg font-black ${
                roundResult === 'p1win' ? 'text-green-400' : roundResult === 'p2win' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {roundResult === 'p1win' ? 'WIN!' : roundResult === 'p2win' ? 'LOSE' : 'DRAW'}
              </div>
              <div className="text-center">
                <div className={`text-4xl transition-all duration-300 ${roundResult === 'p2win' ? 'scale-125' : roundResult === 'p1win' ? 'opacity-50 scale-90' : ''}`}>
                  {getChoiceDisplay(cpuChoice).emoji}
                </div>
                <div className="text-xs text-gray-400 mt-1">{getChoiceDisplay(cpuChoice).name}</div>
              </div>
            </div>
          ) : playerChoice ? (
            <div className="text-center">
              <div className="text-3xl animate-pulse">❓</div>
              <div className="text-xs text-gray-400 mt-1">Waiting for reveal...</div>
            </div>
          ) : (
            <div className="text-gray-600 text-sm">— VS —</div>
          )}
        </div>

        {/* Player */}
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getStageEmoji(pet.stage)}</div>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{rpsBattle.petNames[0]}</span>
              <span>{Math.max(0, rpsBattle.hp[0])}/{rpsBattle.maxHp[0]}</span>
            </div>
            <div className="h-3 bg-[#0f0f23] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  rpsBattle.hp[0] / rpsBattle.maxHp[0] > 0.5 ? 'bg-green-500'
                    : rpsBattle.hp[0] / rpsBattle.maxHp[0] > 0.2 ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, (rpsBattle.hp[0] / rpsBattle.maxHp[0]) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Nostr Commit Status */}
      {commitStatus && (
        <div className={`rounded-lg p-2 mb-3 text-center text-xs font-semibold ${
          commitStatus.startsWith('✅') ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : commitStatus.startsWith('⚠️') ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
        }`}>
          {commitStatus}
        </div>
      )}

      {/* Move Picker */}
      {rpsBattle.status === 'active' && !isCommitting && (
        <div className="mb-4">
          <div className="text-xs text-gray-400 text-center mb-2">Pick your move:</div>
          <div className="grid grid-cols-3 gap-3">
            {(['strike', 'wind', 'shield'] as RPSChoice[]).map((choice) => {
              const display = getChoiceDisplay(choice);
              const flavorName = getFlavorName(choice, pet.elementalType);
              return (
                <button
                  key={choice}
                  onClick={() => handlePickMove(choice)}
                  className="bg-[#1a1a2e] border border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/10 rounded-xl p-4 text-center transition-all active:scale-95"
                >
                  <div className="text-4xl mb-2">{display.emoji}</div>
                  <div className="text-sm font-semibold text-white">{display.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{flavorName}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Committing animation */}
      {isCommitting && rpsBattle.status === 'active' && (
        <div className="text-center py-4 mb-4">
          <div className="text-3xl animate-bounce mb-2">✍️</div>
          <p className="text-sm text-gray-400">Signing & committing move...</p>
        </div>
      )}

      {/* Battle Over Actions */}
      {rpsBattle.status === 'finished' && (
        <div className="space-y-2 mb-4">
          <button
            onClick={startBattle}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold py-3 rounded-xl"
          >
            🔄 Play Again
          </button>
          <button
            onClick={onBack}
            className="w-full bg-[#1a1a2e] border border-gray-700 text-gray-300 font-semibold py-3 rounded-xl"
          >
            ← Back to Battle Menu
          </button>
        </div>
      )}

      {/* Battle Log */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 max-h-40 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">📜 Battle Log</h3>
        <div className="space-y-1">
          {battleLog.map((msg, i) => (
            <div key={i} className="text-xs text-gray-400">{msg}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
