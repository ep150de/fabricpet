// ============================================
// Spectator View — Watch live battles
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useSpectatorStore } from '../store/spectatorStore';
import { subscribeToMoves, subscribeToRPSMoves, type BattleMoveEvent, type RPSMoveCommit } from '../nostr/battleRelay';
import { joinBattleAsSpectator, publishBattleSpectatorEvent, subscribeToBattleSpectators } from '../nostr/multiplayer';
import { getMove } from '../engine/MoveDatabase';
import type { BattleTurnResult } from '../types/arenaTypes';

interface ActiveBattle {
  battleId: string;
  challengerPubkey: string;
  challengerPetName: string;
  challengerPetLevel: number;
  defenderPubkey?: string;
  defenderPetName?: string;
  defenderPetLevel?: number;
  spectatorCount: number;
  startedAt: number;
  type: 'arena' | 'rps';
}

export function SpectatorView() {
  const { identity, setNotification } = useStore();
  const { isSpectating, spectatingArenaId, spectatorCount, battleLog, startSpectating, stopSpectating, addBattleLogEntry, setSpectatorCount } = useSpectatorStore();
  
  const [activeBattles, setActiveBattles] = useState<ActiveBattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBattle, setCurrentBattle] = useState<ActiveBattle | null>(null);
  const [moves, setMoves] = useState<(BattleMoveEvent | RPSMoveCommit)[]>([]);

  // Load active battles from multiplayer sessions
  useEffect(() => {
    if (!identity) {
      setLoading(false);
      return;
    }

    // For now, show a placeholder - in production this would query active battles
    const mockBattles: ActiveBattle[] = [
      {
        battleId: 'demo-battle-1',
        challengerPubkey: 'abc123...',
        challengerPetName: 'Flame Dragon',
        challengerPetLevel: 15,
        defenderPubkey: 'def456...',
        defenderPetName: 'Aqua Serpent',
        defenderPetLevel: 14,
        spectatorCount: 3,
        startedAt: Date.now() - 60000,
        type: 'arena',
      },
    ];

    setActiveBattles(mockBattles);
    setLoading(false);
  }, [identity]);

  // Subscribe to spectator count updates
  useEffect(() => {
    if (!spectatingArenaId || !identity) return;

    const unsubscribe = subscribeToBattleSpectators(
      spectatingArenaId,
      (spectators) => {
        setSpectatorCount(spectators.length);
      }
    );

    return () => unsubscribe();
  }, [spectatingArenaId, identity, setSpectatorCount]);

  // Subscribe to battle moves when spectating
  useEffect(() => {
    if (!spectatingArenaId || !currentBattle) return;

    let unsubscribe: (() => void) | null = null;

    if (currentBattle.type === 'rps') {
      subscribeToRPSMoves(spectatingArenaId, (move) => {
        setMoves(prev => [...prev, move]);
        addBattleLogEntry({
          turnNumber: move.round,
          attackerId: move.playerPubkey,
          defenderId: '',
          moveId: move.choice,
          moveName: move.choice,
          moveType: 'fire',
          moveCategory: 'contact',
          damage: 0,
          isCritical: false,
          effectiveness: 'normal',
          attackerHpAfter: 0,
          defenderHpAfter: 0,
          isFainted: false,
        });
      }).then(unsub => {
        unsubscribe = unsub;
      });
    } else {
      subscribeToMoves(spectatingArenaId, (move) => {
        setMoves(prev => [...prev, move]);
        const moveData = getMove(move.moveId);
        addBattleLogEntry({
          turnNumber: move.turn,
          attackerId: move.playerPubkey,
          defenderId: '',
          moveId: move.moveId,
          moveName: moveData?.name || move.moveId,
          moveType: (moveData?.elementalType || 'fire') as any,
          moveCategory: 'projectile',
          damage: 0,
          isCritical: false,
          effectiveness: 'normal',
          attackerHpAfter: 0,
          defenderHpAfter: 0,
          isFainted: false,
        });
      }).then(unsub => {
        unsubscribe = unsub;
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [spectatingArenaId, currentBattle, addBattleLogEntry]);

  const handleJoinBattle = useCallback(async (battle: ActiveBattle) => {
    if (!identity) {
      setNotification({ message: 'Please connect your identity first', emoji: '⚠️' });
      return;
    }

    try {
      await joinBattleAsSpectator(identity, battle.battleId, battle.challengerPubkey);
      await publishBattleSpectatorEvent(identity, battle.battleId, 'join');
      
      startSpectating(battle.battleId);
      setCurrentBattle(battle);
      setMoves([]);
      
      setNotification({ message: `Now spectating: ${battle.challengerPetName} vs ${battle.defenderPetName}`, emoji: '👁️' });
    } catch (error) {
      console.error('[SpectatorView] Failed to join battle:', error);
      setNotification({ message: 'Failed to join battle', emoji: '❌' });
    }
  }, [identity, startSpectating, setNotification]);

  const handleLeaveBattle = useCallback(async () => {
    if (!identity || !spectatingArenaId) return;

    try {
      await publishBattleSpectatorEvent(identity, spectatingArenaId, 'leave');
      stopSpectating();
      setCurrentBattle(null);
      setMoves([]);
      setNotification({ message: 'Left the battle', emoji: '👋' });
    } catch (error) {
      console.error('[SpectatorView] Failed to leave battle:', error);
    }
  }, [identity, spectatingArenaId, stopSpectating, setNotification]);

  if (!identity) {
    return (
      <div className="p-4 max-w-lg mx-auto text-center">
        <div className="text-4xl mb-3">👁️</div>
        <p className="text-gray-400">Connect your identity to spectate battles</p>
      </div>
    );
  }

  if (isSpectating && currentBattle) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">👁️ Spectating</h2>
            <p className="text-sm text-gray-400">
              {currentBattle.challengerPetName} vs {currentBattle.defenderPetName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              👥 {spectatorCount} watching
            </span>
            <button
              onClick={handleLeaveBattle}
              className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg text-xs font-semibold"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Battle Info */}
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-1">⚔️</div>
              <div className="text-sm font-semibold text-white">{currentBattle.challengerPetName}</div>
              <div className="text-xs text-gray-500">Lv.{currentBattle.challengerPetLevel}</div>
              <div className="text-xs text-gray-600 mt-1">
                {currentBattle.challengerPubkey.slice(0, 8)}...
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🛡️</div>
              <div className="text-sm font-semibold text-white">{currentBattle.defenderPetName}</div>
              <div className="text-xs text-gray-500">Lv.{currentBattle.defenderPetLevel}</div>
              <div className="text-xs text-gray-600 mt-1">
                {currentBattle.defenderPubkey?.slice(0, 8)}...
              </div>
            </div>
          </div>
        </div>

        {/* Live Moves */}
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">⚡ Live Moves</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {moves.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">Waiting for moves...</p>
            ) : (
              moves.slice(-10).map((move, i) => (
                <div key={i} className="bg-[#0f0f23] rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-indigo-400">
                      {move.playerPubkey.slice(0, 8)}...
                    </span>
                    <span className="text-xs text-gray-500">
                      {currentBattle.type === 'rps' ? `Round ${(move as RPSMoveCommit).round}` : `Turn ${(move as BattleMoveEvent).turn}`}
                    </span>
                  </div>
                  <div className="text-sm text-white mt-1">
                    {currentBattle.type === 'rps' 
                      ? (move as RPSMoveCommit).choice 
                      : getMove((move as BattleMoveEvent).moveId)?.name || (move as BattleMoveEvent).moveId
                    }
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Battle Log */}
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">📜 Battle Log</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {battleLog.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-2">No events yet</p>
            ) : (
              battleLog.slice(-20).map((entry, i) => (
                <div key={i} className="text-xs text-gray-400">
                  Turn {entry.turnNumber}: {entry.moveName}
                  {entry.damage > 0 && ` (${entry.damage} dmg)`}
                  {entry.isCritical && ' 💥'}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">👁️ Spectate Battles</h2>
        <p className="text-gray-400 text-sm mt-1">Watch live battles in real-time</p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-4xl animate-bounce mb-2">👁️</div>
          <p className="text-gray-400 text-sm">Loading active battles...</p>
        </div>
      ) : activeBattles.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">😴</div>
          <p className="text-gray-400 text-sm">No active battles right now</p>
          <p className="text-gray-600 text-xs mt-1">Start a battle to see it here!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeBattles.map((battle) => (
            <div
              key={battle.battleId}
              className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    battle.type === 'arena' 
                      ? 'bg-cyan-500/20 text-cyan-400' 
                      : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {battle.type === 'arena' ? '⚔️ Arena' : '🎲 RPS'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.floor((Date.now() - battle.startedAt) / 1000)}s ago
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  👥 {battle.spectatorCount}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-sm font-semibold text-white">{battle.challengerPetName}</div>
                  <div className="text-xs text-gray-500">Lv.{battle.challengerPetLevel}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{battle.defenderPetName || '???'}</div>
                  <div className="text-xs text-gray-500">
                    {battle.defenderPetLevel ? `Lv.${battle.defenderPetLevel}` : 'Waiting...'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleJoinBattle(battle)}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-2 rounded-lg text-sm"
              >
                👁️ Spectate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
