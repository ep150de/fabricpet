/**
 * BattleHUD Component
 * 
 * Heads-up display overlay during battles.
 * Shows HP bars, move selection, turn info, and battle log.
 */

import React from 'react';
import { useArenaStore } from '../store/arenaStore';

export interface BattleHUDProps {
  onMoveSelect?: (moveId: string) => void;
  onForfeit?: () => void;
  moves?: Array<{ id: string; name: string; type: string; power: number }>;
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  onMoveSelect,
  onForfeit,
  moves = [],
}) => {
  const activeBattle = useArenaStore((s) => s.activeBattle);
  const isMyTurn = useArenaStore((s) => s.isMyTurn);
  const currentTurnResult = useArenaStore((s) => s.currentTurnResult);
  const battleLog = useArenaStore((s) => s.battleLog);

  if (!activeBattle) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '1rem',
      background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
      color: 'white',
      fontFamily: 'monospace',
    }}>
      {/* Turn indicator */}
      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <span style={{ color: isMyTurn ? '#00ff44' : '#ff4444' }}>
          {isMyTurn ? '⚔️ Your Turn' : '⏳ Opponent\'s Turn'}
        </span>
        <span style={{ marginLeft: '1rem', opacity: 0.6 }}>
          Turn {activeBattle.currentTurn}
        </span>
      </div>

      {/* Move selection */}
      {isMyTurn && moves.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'center',
          marginBottom: '0.5rem',
        }}>
          {moves.map((move) => (
            <button
              key={move.id}
              onClick={() => onMoveSelect?.(move.id)}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(0, 255, 255, 0.2)',
                border: '1px solid #00ffff',
                color: '#00ffff',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {move.name} ({move.power})
            </button>
          ))}
        </div>
      )}

      {/* Last turn result */}
      {currentTurnResult && (
        <div style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.7 }}>
          {currentTurnResult.moveName} dealt {currentTurnResult.damage} damage
          {currentTurnResult.isCritical && ' 💥 CRITICAL!'}
          {currentTurnResult.effectiveness === 'super_effective' && ' ⚡ Super Effective!'}
        </div>
      )}

      {/* Forfeit button */}
      <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
        <button
          onClick={onForfeit}
          style={{
            padding: '0.25rem 0.5rem',
            background: 'rgba(255, 0, 0, 0.2)',
            border: '1px solid #ff4444',
            color: '#ff4444',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '0.7rem',
          }}
        >
          Forfeit
        </button>
      </div>
    </div>
  );
};

export default BattleHUD;
