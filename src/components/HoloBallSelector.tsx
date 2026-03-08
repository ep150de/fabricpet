/**
 * HoloBallSelector Component
 * 
 * UI for selecting which HoloBall/pet to deploy into the arena.
 */

import React from 'react';
import { useHoloBallStore } from '../store/holoBallStore';
import { ELEMENT_COLORS } from '../utils/arenaConstants';

export interface HoloBallSelectorProps {
  onSelect?: (ballId: string) => void;
  onThrow?: (ballId: string) => void;
}

export const HoloBallSelector: React.FC<HoloBallSelectorProps> = ({
  onSelect,
  onThrow,
}) => {
  const holoBalls = useHoloBallStore((s) => s.holoBalls);
  const selectedBallId = useHoloBallStore((s) => s.selectedBallId);
  const selectBall = useHoloBallStore((s) => s.selectBall);

  return (
    <div style={{
      position: 'absolute',
      bottom: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '0.75rem',
      padding: '0.75rem',
      background: 'rgba(0, 0, 0, 0.7)',
      borderRadius: '12px',
      border: '1px solid rgba(0, 255, 255, 0.3)',
    }}>
      {holoBalls.map((ball) => {
        const isSelected = ball.id === selectedBallId;
        const color = ELEMENT_COLORS[ball.elementType] || '#ffffff';

        return (
          <div
            key={ball.id}
            onClick={() => {
              selectBall(ball.id);
              onSelect?.(ball.id);
            }}
            onDoubleClick={() => onThrow?.(ball.id)}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${color}44, ${color}11)`,
              border: `2px solid ${isSelected ? color : 'rgba(255,255,255,0.2)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              transform: isSelected ? 'scale(1.2)' : 'scale(1)',
              boxShadow: isSelected ? `0 0 12px ${color}66` : 'none',
            }}
          >
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: color,
              opacity: ball.state === 'empty' ? 0.2 : 0.8,
            }} />
          </div>
        );
      })}

      {holoBalls.length === 0 && (
        <div style={{ color: '#666', fontFamily: 'monospace', fontSize: '0.8rem' }}>
          No HoloBalls
        </div>
      )}
    </div>
  );
};

export default HoloBallSelector;
