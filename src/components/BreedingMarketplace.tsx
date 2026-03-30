// ============================================
// Breeding Marketplace — Browse, Create & Manage Breeding Offers
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import type { BreedingOffer } from '../types';
import { subscribeToBreedingOffers, publishBreedingOffer, publishBreedingResult } from '../nostr/breeding';
import { createOffspring, validateBreedingEligibility, type OffspringResult } from '../engine/BreedingEngine';
import { getStageEmoji } from '../engine/PetStateMachine';
import { signEvent } from '../nostr/identity';
import { NOSTR_KIND_APP_DATA, NOSTR_D_TAGS } from '../utils/constants';

type BreedingTab = 'browse' | 'my-offers' | 'create';

const ELEMENT_EMOJI: Record<string, string> = {
  fire: '🔥', water: '💧', earth: '🌿', air: '💨',
  light: '✨', dark: '🌑', neutral: '⚪',
};

const RARITY_COLOR: Record<string, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
};

export function BreedingMarketplace() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<BreedingTab>('browse');

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">💞 Breeding Market</h2>
        <p className="text-gray-400 text-sm mt-1">Find mates for your pets</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('browse')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === 'browse'
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50'
              : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
          }`}
        >
          🔍 Browse
        </button>
        <button
          onClick={() => setTab('my-offers')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === 'my-offers'
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50'
              : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
          }`}
        >
          📋 My Offers
        </button>
        <button
          onClick={() => setTab('create')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === 'create'
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50'
              : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
          }`}
        >
          ➕ Create
        </button>
      </div>

      {tab === 'browse' && <BrowseOffers />}
      {tab === 'my-offers' && <MyOffers />}
      {tab === 'create' && <CreateOffer />}
    </div>
  );
}

// ============================================
// Browse Offers Tab
// ============================================

function BrowseOffers() {
  const { t } = useTranslation();
  const { identity, pet, setNotification } = useStore();
  const [offers, setOffers] = useState<BreedingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [breeding, setBreeding] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  useEffect(() => {
    const sub = subscribeToBreedingOffers(
      (offer) => {
        if (offer.offerer !== identity?.pubkey) {
          setOffers(prev => {
            if (prev.find(o => o.id === offer.id)) return prev;
            return [offer, ...prev];
          });
        }
      },
      (error) => {
        console.error('[Breeding] Subscribe error:', error);
      }
    );

    const timer = setTimeout(() => setLoading(false), 5000);

    return () => {
      sub.close();
      clearTimeout(timer);
    };
  }, [identity?.pubkey]);

  const handleBreed = useCallback(async (offer: BreedingOffer) => {
    if (!identity || !pet || !selectedPetId) return;

    const myPet = useStore.getState().roster.pets.find(p => p.id === selectedPetId);
    if (!myPet) return;

    const eligibility = validateBreedingEligibility(myPet);
    if (!eligibility.eligible) {
      setNotification({ message: eligibility.reason || 'Cannot breed', emoji: '⚠️' });
      return;
    }

    setBreeding(offer.id);

    try {
      const fatherPet = { ...myPet, elementalType: offer.patrilinealElement } as any;
      const motherPet = { ...myPet, elementalType: offer.matriarchElement } as any;

      const offspring: OffspringResult = createOffspring(
        { matriarch: motherPet, patrilineal: fatherPet },
        `${myPet.name} Jr.`
      );

      const event = {
        kind: NOSTR_KIND_APP_DATA,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', `${NOSTR_D_TAGS.LINEAGE}.${offspring.pet.id}`],
          ['p', identity.pubkey],
          ['t', 'breeding-result'],
        ],
        content: JSON.stringify({
          type: 'breeding_result',
          offspringId: offspring.pet.id,
          offspringName: offspring.pet.name,
          matriarchId: offspring.matriarchId,
          patrilinealId: offspring.patrilinealId,
          elementalType: offspring.pet.elementalType,
          rarity: offspring.rarity,
          generation: offspring.generation,
          timestamp: Date.now(),
        }),
      };

      await signEvent(identity, event as any);

      setNotification({
        message: `🎉 ${offspring.pet.name} was born! (${offspring.rarity})`,
        emoji: '🐣'
      });

      setOffers(prev => prev.filter(o => o.id !== offer.id));
    } catch (error) {
      console.error('[Breeding] Failed:', error);
      setNotification({ message: 'Breeding failed', emoji: '❌' });
    }

    setBreeding(null);
    setSelectedPetId(null);
  }, [identity, pet, selectedPetId, setNotification]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl animate-bounce mb-2">💞</div>
        <p className="text-gray-400 text-sm">Finding breeding offers...</p>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">💔</div>
        <p className="text-gray-400 text-sm">No breeding offers available</p>
        <p className="text-gray-600 text-xs mt-1">Be the first to create one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((offer) => (
        <BreedingOfferCard
          key={offer.id}
          offer={offer}
          myPet={pet}
          selectedPetId={selectedPetId}
          breeding={breeding === offer.id}
          onSelectPet={(id) => setSelectedPetId(id)}
          onBreed={() => handleBreed(offer)}
        />
      ))}
    </div>
  );
}

function BreedingOfferCard({
  offer,
  myPet,
  selectedPetId,
  breeding,
  onSelectPet,
  onBreed,
}: {
  offer: BreedingOffer;
  myPet: any;
  selectedPetId: string | null;
  breeding: boolean;
  onSelectPet: (id: string) => void;
  onBreed: () => void;
}) {
  const { t } = useTranslation();
  const { roster } = useStore();
  const eligiblePets = roster.pets.filter(p => validateBreedingEligibility(p).eligible);

  const isExpired = offer.expiresAt && offer.expiresAt < Date.now();

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-3xl">💞</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{offer.matriarchName}</span>
            <span className="text-xs text-gray-500">×</span>
            <span className="text-sm font-bold text-white">{offer.patrilinealName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{ELEMENT_EMOJI[offer.matriarchElement]} {offer.matriarchElement}</span>
            <span>×</span>
            <span>{ELEMENT_EMOJI[offer.patrilinealElement]} {offer.patrilinealElement}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-pink-400">{offer.breedingFeeSats} sats</div>
          <div className="text-xs text-gray-500">
            {offer.offerer?.slice(0, 8) || 'unknown'}...
          </div>
        </div>
      </div>

      {isExpired ? (
        <div className="bg-gray-800/50 rounded-lg p-2 text-center text-xs text-gray-500">
          This offer has expired
        </div>
      ) : myPet ? (
        <div className="space-y-2">
          {eligiblePets.length > 0 ? (
            <>
              <select
                value={selectedPetId || ''}
                onChange={(e) => onSelectPet(e.target.value)}
                className="w-full bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="">Select your pet...</option>
                {eligiblePets.map(p => (
                  <option key={p.id} value={p.id}>
                    {getStageEmoji(p.stage)} {p.name} (Lv.{p.level} {p.elementalType})
                  </option>
                ))}
              </select>
              <button
                onClick={onBreed}
                disabled={!selectedPetId || breeding}
                className={`w-full font-semibold py-2 rounded-lg text-xs transition-all ${
                  selectedPetId && !breeding
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {breeding ? '💞 Breeding...' : '💞 Breed with selected pet'}
              </button>
            </>
          ) : (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2 text-center text-xs text-yellow-300">
              No eligible pets to breed. Pets must be level 5+ and not in egg/baby stage.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-lg p-2 text-center text-xs text-gray-500">
          Create a pet to breed
        </div>
      )}
    </div>
  );
}

// ============================================
// My Offers Tab
// ============================================

function MyOffers() {
  const { t } = useTranslation();
  const { identity, roster } = useStore();
  const [myOffers, setMyOffers] = useState<BreedingOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = subscribeToBreedingOffers(
      (offer) => {
        if (offer.offerer === identity?.pubkey) {
          setMyOffers(prev => {
            if (prev.find(o => o.id === offer.id)) return prev;
            return [offer, ...prev];
          });
        }
      }
    );

    const timer = setTimeout(() => setLoading(false), 3000);

    return () => {
      sub.close();
      clearTimeout(timer);
    };
  }, [identity?.pubkey]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl animate-bounce mb-2">📋</div>
        <p className="text-gray-400 text-sm">Loading your offers...</p>
      </div>
    );
  }

  if (myOffers.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">📝</div>
        <p className="text-gray-400 text-sm">You haven't created any breeding offers</p>
        <p className="text-gray-600 text-xs mt-1">Go to "Create" tab to list your pets</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {myOffers.map((offer) => (
        <div key={offer.id} className="bg-[#1a1a2e] rounded-xl p-4 border border-pink-500/30">
          <div className="flex items-center gap-3">
            <div className="text-3xl">💞</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{offer.matriarchName}</span>
                <span className="text-xs text-gray-500">×</span>
                <span className="text-sm font-bold text-white">{offer.patrilinealName}</span>
              </div>
              <div className="text-xs text-gray-500">
                {offer.breedingFeeSats} sats fee • {offer.status}
              </div>
            </div>
            <button
              onClick={() => setMyOffers(prev => prev.filter(o => o.id !== offer.id))}
              className="text-xs text-red-400 hover:text-red-300"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Create Offer Tab
// ============================================

function CreateOffer() {
  const { t } = useTranslation();
  const { identity, roster, setNotification } = useStore();
  const [matriarchId, setMatriarchId] = useState<string>('');
  const [patrilinealId, setPatrilinealId] = useState<string>('');
  const [fee, setFee] = useState<number>(100);
  const [publishing, setPublishing] = useState(false);

  const eligiblePets = roster.pets.filter(p => validateBreedingEligibility(p).eligible);

  const handlePublish = useCallback(async () => {
    if (!identity || !matriarchId || !patrilinealId) return;

    const matriarch = roster.pets.find(p => p.id === matriarchId);
    const patrilineal = roster.pets.find(p => p.id === patrilinealId);

    if (!matriarch || !patrilineal) return;

    setPublishing(true);

    try {
      const result = await publishBreedingOffer(identity, {
        offerer: identity.pubkey,
        matriarchId,
        patrilinealId,
        matriarchName: matriarch.name,
        patrilinealName: patrilineal.name,
        matriarchElement: matriarch.elementalType,
        patrilinealElement: patrilineal.elementalType,
        matriarchRarity: (matriarch as any).lineage?.rarity || 'common',
        patrilinealRarity: (patrilineal as any).lineage?.rarity || 'common',
        breedingFeeSats: fee,
      });

      if (result.success) {
        setNotification({ message: 'Breeding offer published!', emoji: '✅' });
        setMatriarchId('');
        setPatrilinealId('');
      } else {
        setNotification({ message: result.error || 'Failed to publish', emoji: '❌' });
      }
    } catch (error) {
      setNotification({ message: 'Failed to publish offer', emoji: '❌' });
    }

    setPublishing(false);
  }, [identity, matriarchId, patrilinealId, fee, roster.pets, setNotification]);

  if (!identity) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🔐</div>
        <p className="text-gray-400 text-sm">Create an identity first</p>
      </div>
    );
  }

  if (eligiblePets.length < 2) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🐾</div>
        <p className="text-gray-400 text-sm">You need at least 2 eligible pets to breed</p>
        <p className="text-gray-600 text-xs mt-1">
          {eligiblePets.length === 1 ? 'You have 1 eligible pet' : 'No eligible pets yet'}.
          Pets must be level 5+ and not in egg/baby stage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Select Parents</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">🐇 Matriarch (Mother)</label>
            <select
              value={matriarchId}
              onChange={(e) => setMatriarchId(e.target.value)}
              className="w-full bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">Select matriarch...</option>
              {eligiblePets.map(p => (
                <option key={p.id} value={p.id}>
                  {getStageEmoji(p.stage)} {p.name} (Lv.{p.level} {ELEMENT_EMOJI[p.elementalType]})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">🐻 Patrilineal (Father)</label>
            <select
              value={patrilinealId}
              onChange={(e) => setPatrilinealId(e.target.value)}
              className="w-full bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">Select patrilineal...</option>
              {eligiblePets.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === matriarchId}>
                  {getStageEmoji(p.stage)} {p.name} (Lv.{p.level} {ELEMENT_EMOJI[p.elementalType]})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">💰 Breeding Fee (sats)</label>
            <input
              type="number"
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
              min={0}
              max={10000}
              className="w-full bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      {matriarchId && patrilinealId && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-pink-500/30">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Preview</h3>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-2xl">{getStageEmoji(roster.pets.find(p => p.id === matriarchId)?.stage || 'adult')}</div>
              <div className="text-xs text-gray-400">{roster.pets.find(p => p.id === matriarchId)?.name}</div>
            </div>
            <div className="text-2xl">💞</div>
            <div className="text-center">
              <div className="text-2xl">{getStageEmoji(roster.pets.find(p => p.id === patrilinealId)?.stage || 'adult')}</div>
              <div className="text-xs text-gray-400">{roster.pets.find(p => p.id === patrilinealId)?.name}</div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handlePublish}
        disabled={!matriarchId || !patrilinealId || publishing}
        className={`w-full font-semibold py-3 rounded-xl text-sm transition-all ${
          matriarchId && patrilinealId && !publishing
            ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {publishing ? '📡 Publishing...' : '📡 Publish Breeding Offer'}
      </button>

      <p className="text-xs text-gray-600 text-center">
        Publishing costs a small relay fee. Your offer will be visible to all FabricPet users.
      </p>
    </div>
  );
}
