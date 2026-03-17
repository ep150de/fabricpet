// ============================================
// AR Battle Visualizer — Turn-based battles in AR/XR
// ============================================
// Provides visual battle effects and UI for AR/XR mode:
// - Health bars overlay
// - Damage numbers floating up
// - Attack animations
// - Move selection UI
// - Elemental effects
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import type { BattleState, Move } from '../types';
import { getMove } from '../engine/MoveDatabase';
import { TYPE_EFFECTIVENESS } from '../utils/constants';

interface ARBattleVisualizerProps {
  battleState: BattleState | null;
  onMoveSelect?: (moveId: string) => void;
  isActive: boolean;
}

export function ARBattleVisualizer({ battleState, onMoveSelect, isActive }: ARBattleVisualizerProps) {
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<Array<{
    id: string;
    value: number;
    x: number;
    y: number;
    color: string;
  }>>([]);
  const [turnLog, setTurnLog] = useState<string[]>([]);
  const [showMoveSelector, setShowMoveSelector] = useState(false);
  
  // Clear damage numbers after animation
  useEffect(() => {
    if (damageNumbers.length > 0) {
      const timer = setTimeout(() => {
        setDamageNumbers([]);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [damageNumbers]);

  // Update turn log when battle state changes
  useEffect(() => {
    if (battleState?.turns) {
      const newLogs = battleState.turns.map((turn, i) => {
        const move = getMove(turn.move);
        return `Turn ${i + 1}: ${turn.attacker} used ${move?.name || turn.move}`;
      });
      setTurnLog(newLogs);
    }
  }, [battleState?.turns]);

  const handleMoveSelect = useCallback((moveId: string) => {
    setSelectedMove(moveId);
    setShowMoveSelector(false);
    if (onMoveSelect) {
      onMoveSelect(moveId);
    }
    
    // Simulate damage number
    const damage = Math.floor(Math.random() * 50) + 10;
    setDamageNumbers(prev => [...prev, {
      id: `dmg-${Date.now()}`,
      value: damage,
      x: Math.random() * 100,
      y: 30 + Math.random() * 20,
      color: damage > 30 ? '#ff4444' : damage > 15 ? '#ffaa44' : '#44ff44',
    }]);
  }, [onMoveSelect]);

  if (!isActive || !battleState) {
    return null;
  }

  const playerPet = battleState.pets[0];
  const opponentPet = battleState.pets[1];
  // Player's turn is on even turns (0-indexed), opponent's turn on odd turns
  const isPlayerTurn = battleState.currentTurn % 2 === 1;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 100 }}>
      {/* Health Bars */}
      <div className="absolute top-4 left-4 right-4 flex justify-between">
        {/* Player Health */}
        <div className="bg-black/70 rounded-lg p-2 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-sm font-bold">{playerPet?.name || 'Your Pet'}</span>
            <span className="text-xs text-gray-400">
              {playerPet?.hp || 0}/{playerPet?.maxHp || 100}
            </span>
          </div>
          <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${((playerPet?.hp || 0) / (playerPet?.maxHp || 100)) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Opponent Health */}
        <div className="bg-black/70 rounded-lg p-2 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-sm font-bold">{opponentPet?.name || 'Opponent'}</span>
            <span className="text-xs text-gray-400">
              {opponentPet?.hp || 0}/{opponentPet?.maxHp || 100}
            </span>
          </div>
          <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                ((opponentPet?.hp || 0) / (opponentPet?.maxHp || 100)) > 0.5 ? 'bg-green-500' :
                ((opponentPet?.hp || 0) / (opponentPet?.maxHp || 100)) > 0.2 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${((opponentPet?.hp || 0) / (opponentPet?.maxHp || 100)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Damage Numbers */}
      {damageNumbers.map(dmg => (
        <div
          key={dmg.id}
          className="absolute text-2xl font-bold animate-bounce pointer-events-none"
          style={{
            left: `${dmg.x}%`,
            top: `${dmg.y}%`,
            color: dmg.color,
            textShadow: '0 0 10px rgba(0,0,0,0.8)',
            animation: 'floatUp 2s ease-out forwards',
          }}
        >
          -{dmg.value}
        </div>
      ))}

      {/* Move Selector */}
      {showMoveSelector && playerPet?.moves && (
        <div className="absolute bottom-20 left-4 right-4 bg-black/80 rounded-xl p-4 backdrop-blur-sm pointer-events-auto">
          <h4 className="text-white text-sm font-semibold mb-2">Choose a move:</h4>
          <div className="grid grid-cols-2 gap-2">
            {playerPet.moves.map((moveId) => {
              const move = getMove(moveId);
              return (
                <button
                  key={moveId}
                  onClick={() => handleMoveSelect(moveId)}
                  className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 rounded-lg p-2 text-sm hover:bg-indigo-500/30 transition-all"
                >
                  {move?.emoji || '⚡'} {move?.name || moveId}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Battle Log */}
      <div className="absolute bottom-4 left-4 right-4 bg-black/50 rounded-lg p-2 backdrop-blur-sm max-h-24 overflow-y-auto">
        <div className="text-xs text-gray-400 space-y-1">
          {turnLog.slice(-3).map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      </div>

      {/* Move Selector Toggle */}
      {!showMoveSelector && isPlayerTurn && (
        <div className="absolute bottom-20 left-4 right-4 pointer-events-auto">
          <button
            onClick={() => setShowMoveSelector(true)}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-3 rounded-xl"
          >
            Select Move
          </button>
        </div>
      )}

      {/* Battle Status */}
      {battleState.winner && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">
              {battleState.winner === battleState.players[0] ? '🎉' : '😢'}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {battleState.winner === battleState.players[0] ? 'Victory!' : 'Defeat'}
            </h2>
            <p className="text-gray-300">
              {battleState.winner === battleState.players[0] 
                ? `You defeated ${opponentPet?.name || 'the opponent'}!`
                : `${opponentPet?.name || 'The opponent'} was stronger this time.`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
