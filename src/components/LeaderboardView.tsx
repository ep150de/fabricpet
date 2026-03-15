// ============================================
// Leaderboard View — Display pet rankings from Nostr
// ============================================

import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { fetchLeaderboard } from '../nostr/leaderboard';
import type { LeaderboardEntry } from '../nostr/leaderboard';

export function LeaderboardView() {
  const { pet } = useStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard(15000); // 15 second timeout
      setEntries(data);
    } catch (e) {
      console.error('[LeaderboardView] Failed to load:', e);
      setError('Failed to load leaderboard from Nostr relays');
    } finally {
      setLoading(false);
    }
  };

  // Elemental type emoji
  const elementEmoji: Record<string, string> = {
    fire: '🔥',
    water: '💧',
    earth: '🌿',
    air: '💨',
    light: '✨',
    dark: '🌑',
    neutral: '⚪',
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">🏆 Leaderboard</h2>
        <p className="text-gray-400 text-sm mt-1">Top pets from the Nostr network</p>
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadLeaderboard}
        disabled={loading}
        className="w-full mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-2 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50"
      >
        {loading ? '⏳ Loading...' : '🔄 Refresh Leaderboard'}
      </button>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Leaderboard Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-4xl animate-bounce mb-2">⏳</div>
          <p className="text-gray-400">Fetching from Nostr relays...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800 text-center">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-gray-400">No pets found yet.</p>
          <p className="text-gray-500 text-sm mt-1">Battle other pets to get on the leaderboard!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const isCurrentUser = pet && entry.pubkey === localStorage.getItem('fabricpet_pubkey');
            const totalBattles = entry.wins + entry.losses + entry.draws;
            const winRate = totalBattles > 0 ? Math.round((entry.wins / totalBattles) * 100) : 0;
            
            return (
              <div
                key={entry.pubkey}
                className={`bg-[#1a1a2e] rounded-xl p-3 border transition-all ${
                  isCurrentUser 
                    ? 'border-indigo-500 bg-indigo-900/20' 
                    : 'border-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Rank & Name */}
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-300 text-black' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1">
                        <span>{elementEmoji[entry.elementalType] || '⚪'}</span>
                        <span>{entry.petName}</span>
                        {isCurrentUser && <span className="text-xs text-indigo-400">(You)</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        Level {entry.petLevel} • {entry.elementalType}
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">
                      {entry.wins}W - {entry.losses}L - {entry.draws}D
                    </div>
                    <div className="text-xs text-gray-400">
                      {winRate}% win rate
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Last Updated */}
      {!loading && entries.length > 0 && (
        <div className="text-xs text-gray-600 text-center mt-4">
          Data from Nostr relays • {entries.length} pets ranked
        </div>
      )}
    </div>
  );
}
