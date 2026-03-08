// ============================================
// Social View — Leaderboard + Pet Visiting + Guestbook
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getStageEmoji } from '../engine/PetStateMachine';
import { fetchLeaderboard, type LeaderboardEntry } from '../nostr/leaderboard';
import { loadPetByPubkey, signGuestbook, npubToHex, type VisitedPet } from '../nostr/petVisitor';

type SocialTab = 'leaderboard' | 'visit';

const ELEMENT_EMOJI: Record<string, string> = {
  fire: '🔥', water: '💧', earth: '🌿', air: '💨',
  light: '✨', dark: '🌑', neutral: '⚪',
};

export function SocialView() {
  const { identity, pet } = useStore();
  const [tab, setTab] = useState<SocialTab>('leaderboard');

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">👥 Social</h2>
        <p className="text-gray-400 text-sm mt-1">Leaderboard & Pet Visiting</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('leaderboard')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'leaderboard'
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
              : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
          }`}
        >
          🏆 Leaderboard
        </button>
        <button
          onClick={() => setTab('visit')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'visit'
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
              : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
          }`}
        >
          👋 Visit Pet
        </button>
      </div>

      {tab === 'leaderboard' && <LeaderboardTab />}
      {tab === 'visit' && <VisitTab />}
    </div>
  );
}

// ============================================
// Leaderboard Tab
// ============================================

function LeaderboardTab() {
  const { identity } = useStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard();
      setEntries(data);
      if (data.length === 0) {
        setError('No players found yet. Be the first to save your pet to Nostr!');
      }
    } catch {
      setError('Failed to load leaderboard');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">🏆 Global Rankings</h3>
        <button
          onClick={loadLeaderboard}
          disabled={loading}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 text-center text-sm text-gray-400">
          {error}
        </div>
      )}

      {loading && entries.length === 0 && (
        <div className="text-center py-8">
          <div className="text-3xl animate-bounce mb-2">🏆</div>
          <p className="text-gray-400 text-sm">Querying Nostr relays...</p>
        </div>
      )}

      <div className="space-y-2">
        {entries.map((entry, index) => {
          const isMe = identity?.pubkey === entry.pubkey;
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
          const totalBattles = entry.wins + entry.losses + entry.draws;

          return (
            <div
              key={entry.pubkey}
              className={`bg-[#1a1a2e] rounded-xl p-3 border transition-all ${
                isMe ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-xl w-8 text-center font-bold">
                  {typeof medal === 'string' && medal.startsWith('#') ? (
                    <span className="text-gray-500 text-sm">{medal}</span>
                  ) : (
                    medal
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {entry.petName}
                      {isMe && <span className="text-indigo-400 text-xs ml-1">(you)</span>}
                    </span>
                    <span className="text-xs">{ELEMENT_EMOJI[entry.elementalType] || '⚪'}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Lv.{entry.petLevel} • {entry.pubkey.slice(0, 8)}...
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">
                    <span className="text-green-400">{entry.wins}W</span>
                    <span className="text-gray-600 mx-1">/</span>
                    <span className="text-red-400">{entry.losses}L</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {totalBattles > 0 ? `${Math.round(entry.winRate * 100)}%` : 'No battles'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Visit Tab
// ============================================

function VisitTab() {
  const { identity, pet } = useStore();
  const [npubInput, setNpubInput] = useState('');
  const [visitedPet, setVisitedPet] = useState<VisitedPet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestbookMsg, setGuestbookMsg] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const handleVisit = useCallback(async () => {
    if (!npubInput.trim()) return;
    setLoading(true);
    setError(null);
    setVisitedPet(null);
    setSigned(false);

    try {
      const hex = await npubToHex(npubInput.trim());
      if (!hex) {
        setError('Invalid npub or pubkey format');
        setLoading(false);
        return;
      }

      if (hex === identity?.pubkey) {
        setError("That's your own pubkey! Visit someone else 😄");
        setLoading(false);
        return;
      }

      const result = await loadPetByPubkey(hex);
      if (result) {
        setVisitedPet(result);
      } else {
        setError('No FabricPet found for this pubkey');
      }
    } catch {
      setError('Failed to load pet');
    }
    setLoading(false);
  }, [npubInput, identity]);

  const handleSignGuestbook = useCallback(async () => {
    if (!identity || !visitedPet || !guestbookMsg.trim()) return;
    setSigning(true);
    try {
      const ok = await signGuestbook(identity, visitedPet.pubkey, guestbookMsg.trim());
      if (ok) {
        setSigned(true);
        setGuestbookMsg('');
      }
    } catch { /* ignore */ }
    setSigning(false);
  }, [identity, visitedPet, guestbookMsg]);

  return (
    <div>
      {/* Search */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 mb-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">🔍 Find a Pet</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={npubInput}
            onChange={(e) => setNpubInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVisit()}
            placeholder="Enter npub1... or hex pubkey"
            className="flex-1 bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleVisit}
            disabled={loading || !npubInput.trim()}
            className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-700 text-white font-bold px-4 py-2 rounded-lg transition-all text-sm"
          >
            {loading ? '⏳' : '👋'}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {/* Visited Pet */}
      {visitedPet && (
        <div className="space-y-3">
          {/* Pet Card */}
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#12122a] rounded-xl p-5 border border-indigo-500/30">
            <div className="text-center mb-3">
              <div className="text-5xl mb-2">{getStageEmoji(visitedPet.pet.stage)}</div>
              <h3 className="text-xl font-bold text-white">{visitedPet.pet.name}</h3>
              <p className="text-sm text-gray-400">
                Lv.{visitedPet.pet.level} • {ELEMENT_EMOJI[visitedPet.pet.elementalType]} {visitedPet.pet.elementalType} type
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Owner: {visitedPet.pubkey.slice(0, 12)}...
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-[#0f0f23] rounded-lg p-2 text-center">
                <div className="text-xs text-gray-500">HP</div>
                <div className="text-sm font-bold text-red-400">{visitedPet.pet.battleStats.maxHp}</div>
              </div>
              <div className="bg-[#0f0f23] rounded-lg p-2 text-center">
                <div className="text-xs text-gray-500">ATK</div>
                <div className="text-sm font-bold text-orange-400">{visitedPet.pet.battleStats.atk}</div>
              </div>
              <div className="bg-[#0f0f23] rounded-lg p-2 text-center">
                <div className="text-xs text-gray-500">DEF</div>
                <div className="text-sm font-bold text-blue-400">{visitedPet.pet.battleStats.def}</div>
              </div>
              <div className="bg-[#0f0f23] rounded-lg p-2 text-center">
                <div className="text-xs text-gray-500">SPD</div>
                <div className="text-sm font-bold text-green-400">{visitedPet.pet.battleStats.spd}</div>
              </div>
            </div>

            {/* Battle Record */}
            <div className="flex justify-center gap-6 text-sm">
              <span className="text-green-400">{visitedPet.pet.battleRecord.wins}W</span>
              <span className="text-red-400">{visitedPet.pet.battleRecord.losses}L</span>
              <span className="text-gray-400">{visitedPet.pet.battleRecord.draws}D</span>
            </div>

            {/* Mood & Needs */}
            <div className="mt-3 text-center">
              <span className="text-xs text-gray-500">
                Mood: <span className="text-gray-300 capitalize">{visitedPet.pet.mood}</span>
                {' • '}Stage: <span className="text-gray-300 capitalize">{visitedPet.pet.stage}</span>
              </span>
            </div>
          </div>

          {/* Guestbook */}
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">📖 Guestbook</h3>

            {/* Sign Guestbook */}
            {identity && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={guestbookMsg}
                  onChange={(e) => setGuestbookMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignGuestbook()}
                  placeholder={signed ? '✅ Signed!' : 'Leave a message...'}
                  disabled={signing || signed}
                  maxLength={140}
                  className="flex-1 bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
                <button
                  onClick={handleSignGuestbook}
                  disabled={signing || signed || !guestbookMsg.trim()}
                  className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all"
                >
                  {signing ? '...' : signed ? '✅' : '✍️'}
                </button>
              </div>
            )}

            {/* Guestbook Entries */}
            {visitedPet.guestbook.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {visitedPet.guestbook.map((entry, i) => (
                  <div key={i} className="bg-[#0f0f23] rounded-lg p-2">
                    <p className="text-xs text-gray-300">{entry.message}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {entry.visitor.slice(0, 8)}... • {new Date(entry.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center py-2">
                No guestbook entries yet. Be the first to sign! ✍️
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!visitedPet && !loading && !error && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🌐</div>
          <p className="text-gray-400 text-sm">Enter a player's npub to visit their pet!</p>
          <p className="text-gray-600 text-xs mt-1">You can find npubs on the leaderboard</p>
        </div>
      )}
    </div>
  );
}
