// ============================================
// Pet Lineage Viewer — Visualize pet ancestry
// ============================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { getStageEmoji } from '../engine/PetStateMachine';
import type { Pet, RarityTier } from '../types';

interface LineageViewerProps {
  pet: Pet;
}

const RARITY_COLORS: Record<RarityTier, string> = {
  common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  uncommon: 'bg-green-500/20 text-green-400 border-green-500/30',
  rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const RARITY_EMOJI: Record<RarityTier, string> = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  epic: '🟣',
  legendary: '🟡',
};

export function LineageViewer({ pet }: LineageViewerProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const lineage = (pet as any).lineage as LineageData | undefined;

  if (!lineage) {
    return null;
  }

  const generation = lineage.generation || 1;
  const rarity = lineage.rarity || 'common';
  const parentIds = lineage.parentIds || [null, null];
  const bloodline = lineage.bloodline || [];

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-300">🌳 Lineage</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${RARITY_COLORS[rarity]}`}>
            {RARITY_EMOJI[rarity]} Gen {generation}
          </span>
        </div>
        <span className="text-gray-500 text-sm">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Generation & Rarity */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0f0f23] rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Generation</div>
              <div className="text-xl font-bold text-indigo-400">{generation}</div>
            </div>
            <div className="bg-[#0f0f23] rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Rarity</div>
              <div className={`text-sm font-bold capitalize ${RARITY_COLORS[rarity].split(' ')[1]}`}>
                {rarity}
              </div>
            </div>
          </div>

          {/* Parents */}
          <div>
            <div className="text-xs text-gray-500 mb-2">Parents</div>
            <div className="flex gap-2">
              <ParentCard
                label="Father"
                petId={parentIds[0]}
                side="patrilineal"
              />
              <ParentCard
                label="Mother"
                petId={parentIds[1]}
                side="matriarch"
              />
            </div>
          </div>

          {/* Bloodline */}
          {bloodline.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">
                Bloodline ({bloodline.length} ancestor{bloodline.length !== 1 ? 's' : ''})
              </div>
              <div className="bg-[#0f0f23] rounded-lg p-2">
                <div className="flex flex-wrap gap-1">
                  {bloodline.slice(0, 10).map((ancestor, i) => (
                    <span
                      key={i}
                      title={ancestor}
                      className="text-xs px-2 py-1 bg-[#1a1a2e] rounded text-gray-400 font-mono"
                    >
                      {ancestor.slice(0, 6)}...
                    </span>
                  ))}
                  {bloodline.length > 10 && (
                    <span className="text-xs px-2 py-1 text-gray-500">
                      +{bloodline.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Ancestry Tree Visualization */}
          <div>
            <div className="text-xs text-gray-500 mb-2">Ancestry Tree</div>
            <div className="bg-[#0f0f23] rounded-lg p-3">
              <AncestorTree lineage={lineage} petName={pet.name} />
            </div>
          </div>

          {/* Birth Info */}
          {lineage.birthEvent && (
            <div className="text-xs text-gray-500 text-center">
              Born: {new Date(lineage.birthEvent.timestamp || Date.now()).toLocaleDateString()}
              {lineage.birthEvent.breedingEventId && (
                <span className="ml-2">via breeding event</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ParentCardProps {
  label: string;
  petId: string | null;
  side: 'patrilineal' | 'matriarch';
}

function ParentCard({ label, petId, side }: ParentCardProps) {
  const { t } = useTranslation();
  const { setDeepLinkParams, setView } = useStore();

  const handleVisit = () => {
    if (petId) {
      setDeepLinkParams({ pubkey: petId, tab: 'visit' });
      setView('social');
    }
  };

  return (
    <div className={`flex-1 bg-[#0f0f23] rounded-lg p-2 text-center border ${
      side === 'patrilineal' ? 'border-blue-500/20' : 'border-pink-500/20'
    }`}>
      <div className={`text-xs ${side === 'patrilineal' ? 'text-blue-400' : 'text-pink-400'} mb-1`}>
        {label}
      </div>
      {petId ? (
        <button
          onClick={handleVisit}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-mono truncate block w-full"
          title={petId}
        >
          {petId.slice(0, 8)}...
        </button>
      ) : (
        <div className="text-xs text-gray-600">Unknown</div>
      )}
    </div>
  );
}

interface LineageData {
  parentIds: [string | null, string | null];
  generation: number;
  bloodline: string[];
  birthEvent?: {
    timestamp: number;
    breedingEventId: string | null;
  };
  rarity: RarityTier;
}

interface AncestorTreeProps {
  lineage: LineageData;
  petName: string;
  depth?: number;
}

function AncestorTree({ lineage, petName, depth = 0 }: AncestorTreeProps) {
  if (depth > 3) {
    return <span className="text-xs text-gray-500">...</span>;
  }

  const [fatherKnown, motherKnown] = [
    lineage.parentIds[0] !== null,
    lineage.parentIds[1] !== null,
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-medium text-white">{petName}</div>
      {lineage.parentIds[0] || lineage.parentIds[1] ? (
        <>
          <div className="text-gray-600">│</div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              {fatherKnown ? (
                <>
                  <div className="text-xs text-blue-400">♂ {lineage.parentIds[0]?.slice(0, 6)}...</div>
                  <div className="text-gray-600">│</div>
                </>
              ) : (
                <>
                  <div className="text-xs text-gray-600">♂ ?</div>
                  <div className="text-gray-600">│</div>
                </>
              )}
            </div>
            <div className="flex flex-col items-center">
              {motherKnown ? (
                <>
                  <div className="text-xs text-pink-400">♀ {lineage.parentIds[1]?.slice(0, 6)}...</div>
                  <div className="text-gray-600">│</div>
                </>
              ) : (
                <>
                  <div className="text-xs text-gray-600">♀ ?</div>
                  <div className="text-gray-600">│</div>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-xs text-gray-600 mt-1">No parent data</div>
      )}
    </div>
  );
}
