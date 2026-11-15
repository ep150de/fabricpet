// ============================================
// Trade View — P2P pet trading
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';
import {
  subscribeToTradeOffers,
  publishTradeOffer,
  publishTradeResponse,
  type TradeOffer,
} from '../nostr/trading';
import { getStageEmoji } from '../engine/PetStateMachine';
import { saveLocalPet, saveLocalRoster } from '../store/indexedDBStorage';
import { playSound } from '../engine/AudioManager';

type TradeTab = 'browse' | 'my-offers' | 'create';

const ELEMENT_EMOJI: Record<string, string> = {
  fire: '🔥', water: '💧', earth: '🌿', air: '💨',
  light: '✨', dark: '🌑', neutral: '⚪',
};

export function TradeView() {
  const { t } = useTranslation();
  const { identity, pet, roster, setPet, setRoster, setNotification } = useStore();
  const [tab, setTab] = useState<TradeTab>('browse');
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [myOffers, setMyOffers] = useState<TradeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [publishing, setPublishing] = useState(false);

  // Subscribe to trade offers
  useEffect(() => {
    if (!identity) {
      setLoading(false);
      return;
    }

    const sub = subscribeToTradeOffers(
      (offer) => {
        if (offer.offerer !== identity.pubkey) {
          setOffers(prev => {
            if (prev.find(o => o.id === offer.id)) return prev;
            return [offer, ...prev];
          });
        } else {
          setMyOffers(prev => {
            if (prev.find(o => o.id === offer.id)) return prev;
            return [offer, ...prev];
          });
        }
      }
    );

    const timer = setTimeout(() => setLoading(false), 5000);

    return () => {
      sub.close();
      clearTimeout(timer);
    };
  }, [identity]);

  const handlePublishOffer = useCallback(async () => {
    if (!identity || !selectedPetId) return;

    const selectedPet = roster.pets.find(p => p.id === selectedPetId);
    if (!selectedPet) return;

    setPublishing(true);

    try {
      const result = await publishTradeOffer(identity, {
        offerer: identity.pubkey,
        offererPetId: selectedPet.id,
        offererPetName: selectedPet.name,
        offererPetLevel: selectedPet.level,
        offererPetElement: selectedPet.elementalType,
      });

      if (result.success) {
        playSound('notification');
        setNotification({ message: 'Trade offer published!', emoji: '✅' });
        setSelectedPetId('');
      } else {
        setNotification({ message: result.error || 'Failed to publish', emoji: '❌' });
      }
    } catch (error) {
      setNotification({ message: 'Failed to publish offer', emoji: '❌' });
    }

    setPublishing(false);
  }, [identity, selectedPetId, roster.pets, setNotification]);

  const handleAcceptTrade = useCallback(async (offer: TradeOffer) => {
    if (!identity || !pet) return;

    // Find a pet to trade
    const tradePet = roster.pets.find(p => p.id !== pet.id);
    if (!tradePet) {
      setNotification({ message: 'You need at least 2 pets to trade', emoji: '⚠️' });
      return;
    }

    try {
      const result = await publishTradeResponse(
        identity,
        offer.id,
        offer.offerer,
        tradePet,
        true
      );

      if (result.success) {
        // Execute the trade locally
        const offererPet = { ...pet, id: offer.offererPetId, name: offer.offererPetName };
        const newRoster = {
          ...roster,
          pets: roster.pets.map(p => 
            p.id === tradePet.id ? offererPet : p
          ),
        };
        setRoster(newRoster);
        await saveLocalRoster(newRoster);
        playSound('achievement');
        setNotification({ message: `Traded for ${offer.offererPetName}!`, emoji: '🤝' });
      } else {
        setNotification({ message: result.error || 'Trade failed', emoji: '❌' });
      }
    } catch (error) {
      setNotification({ message: 'Trade failed', emoji: '❌' });
    }
  }, [identity, pet, roster, setRoster, setNotification]);

  const handleRejectTrade = useCallback(async (offer: TradeOffer) => {
    if (!identity) return;

    try {
      await publishTradeResponse(identity, offer.id, offer.offerer, pet!, false);
      setOffers(prev => prev.filter(o => o.id !== offer.id));
      setNotification({ message: 'Trade rejected', emoji: '❌' });
    } catch (error) {
      setNotification({ message: 'Failed to reject trade', emoji: '❌' });
    }
  }, [identity, pet, setNotification]);

  if (!identity) {
    return (
      <div className="p-4 max-w-lg mx-auto text-center">
        <div className="text-4xl mb-3">🤝</div>
        <p className="text-gray-400">Create an identity to trade pets</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">🤝 Pet Trading</h2>
        <p className="text-gray-400 text-sm mt-1">Trade pets with other players</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('browse')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === 'browse'
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
          }`}
        >
          🔍 Browse
        </button>
        <button
          onClick={() => setTab('my-offers')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === 'my-offers'
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
          }`}
        >
          📋 My Offers
        </button>
        <button
          onClick={() => setTab('create')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === 'create'
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
          }`}
        >
          ➕ Create
        </button>
      </div>

      {tab === 'browse' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-4xl animate-bounce mb-2">🤝</div>
              <p className="text-gray-400 text-sm">Loading trade offers...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">💔</div>
              <p className="text-gray-400 text-sm">No trade offers available</p>
              <p className="text-gray-600 text-xs mt-1">Be the first to create one!</p>
            </div>
          ) : (
            offers.map((offer) => (
              <div key={offer.id} className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">🐾</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{offer.offererPetName}</div>
                    <div className="text-xs text-gray-500">
                      Lv.{offer.offererPetLevel} • {ELEMENT_EMOJI[offer.offererPetElement]} {offer.offererPetElement}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {offer.offerer.slice(0, 8)}...
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptTrade(offer)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold py-2 rounded-lg text-xs"
                  >
                    🤝 Accept Trade
                  </button>
                  <button
                    onClick={() => handleRejectTrade(offer)}
                    className="flex-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg py-2 text-xs"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'my-offers' && (
        <div className="space-y-3">
          {myOffers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-gray-400 text-sm">You haven't created any trade offers</p>
            </div>
          ) : (
            myOffers.map((offer) => (
              <div key={offer.id} className="bg-[#1a1a2e] rounded-xl p-4 border border-green-500/30">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🐾</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{offer.offererPetName}</div>
                    <div className="text-xs text-gray-500">
                      Lv.{offer.offererPetLevel} • {offer.status}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'create' && (
        <div className="space-y-4">
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Select Pet to Trade</h3>
            <select
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="w-full bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white mb-3"
            >
              <option value="">Select a pet...</option>
              {roster.pets.map(p => (
                <option key={p.id} value={p.id}>
                  {getStageEmoji(p.stage)} {p.name} (Lv.{p.level} {ELEMENT_EMOJI[p.elementalType]})
                </option>
              ))}
            </select>
          </div>

          {selectedPetId && (
            <button
              onClick={handlePublishOffer}
              disabled={publishing}
              className={`w-full font-semibold py-3 rounded-xl text-sm transition-all ${
                publishing
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600'
              }`}
            >
              {publishing ? '📡 Publishing...' : '🤝 Publish Trade Offer'}
            </button>
          )}

          <p className="text-xs text-gray-600 text-center">
            Your pet will be listed for other players to trade with.
          </p>
        </div>
      )}
    </div>
  );
}
