// ============================================
// Social View — Leaderboard + Pet Visiting + Guestbook
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getStageEmoji } from '../engine/PetStateMachine';
import { fetchLeaderboard, type LeaderboardEntry } from '../nostr/leaderboard';
import { loadPetByPubkey, signGuestbook, npubToHex, type VisitedPet } from '../nostr/petVisitor';
import { generateQRDataUrlAsync, parseQRCode, startQRScanner, isQRScanSupported } from '../social/QRCodeManager';

type SocialTab = 'leaderboard' | 'visit' | 'qr';

const ELEMENT_EMOJI: Record<string, string> = {
  fire: '🔥', water: '💧', earth: '🌿', air: '💨',
  light: '✨', dark: '🌑', neutral: '⚪',
};

export function SocialView() {
  const { identity, pet, deepLinkParams, setDeepLinkParams, setView } = useStore();
  const [tab, setTab] = useState<SocialTab>('leaderboard');

  // Handle deep link params (e.g., from QR scan or URL ?rp1_action=visit&pubkey=...)
  useEffect(() => {
    if (deepLinkParams.tab === 'visit' || deepLinkParams.pubkey) {
      setTab('visit');
      // Params will be consumed by VisitTab via store
    }
  }, [deepLinkParams]);

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
          👋 Visit
        </button>
        <button
          onClick={() => setTab('qr')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'qr'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
          }`}
        >
          🔲 QR Meet
        </button>
      </div>

      {tab === 'leaderboard' && <LeaderboardTab />}
      {tab === 'visit' && <VisitTab />}
      {tab === 'qr' && <QRMeetTab />}
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
  const [loadTime, setLoadTime] = useState(0);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadTime(0);
    const start = Date.now();

    // Show elapsed time while loading
    const timer = setInterval(() => {
      setLoadTime(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    try {
      const data = await fetchLeaderboard(8000);
      setEntries(data);
      if (data.length === 0) {
        setError('No players found yet. Save your pet (it auto-saves every 2 min) and refresh!');
      }
    } catch {
      setError('Failed to connect to Nostr relays. Check your internet and try again.');
    }
    clearInterval(timer);
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
          {loading ? `⏳ ${loadTime}s...` : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-sm text-gray-400">{error}</p>
          <button
            onClick={loadLeaderboard}
            className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline"
          >
            🔄 Try Again
          </button>
        </div>
      )}

      {loading && entries.length === 0 && (
        <div className="text-center py-8">
          <div className="text-3xl animate-bounce mb-2">🏆</div>
          <p className="text-gray-400 text-sm">Querying Nostr relays... ({loadTime}s)</p>
          <p className="text-gray-600 text-xs mt-1">Checking relay.damus.io, nos.lol, and more</p>
          {loadTime >= 5 && (
            <p className="text-yellow-400/60 text-xs mt-2">Relays are slow today — hang tight!</p>
          )}
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
  const { identity, pet, deepLinkParams, setDeepLinkParams, setView } = useStore();
  const [npubInput, setNpubInput] = useState('');
  const [visitedPet, setVisitedPet] = useState<VisitedPet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestbookMsg, setGuestbookMsg] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  // Auto-visit if deep link params contain a pubkey (from QR scan or URL)
  useEffect(() => {
    if (deepLinkParams.pubkey && deepLinkParams.pubkey.length > 0) {
      setNpubInput(deepLinkParams.pubkey);
      // Clear params so we don't re-trigger
      setDeepLinkParams({});
      // Auto-trigger visit after a short delay to let state settle
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('[data-visit-input]');
        if (input) input.value = deepLinkParams.pubkey;
      }, 100);
    }
  }, [deepLinkParams.pubkey, setDeepLinkParams]);

  const handleVisitRef = useRef<(() => void) | null>(null);

  // Auto-visit when npubInput is set from deep link
  useEffect(() => {
    if (npubInput && npubInput.length >= 32 && !visitedPet && !loading) {
      if (/^[0-9a-f]{64}$/i.test(npubInput) || npubInput.startsWith('npub1')) {
        handleVisitRef.current?.();
      }
    }
  }, [npubInput, visitedPet, loading]);

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

  // Keep ref in sync for auto-visit effect
  useEffect(() => { handleVisitRef.current = handleVisit; }, [handleVisit]);

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

          {/* Challenge to RPS Battle */}
          {identity && pet && (
            <button
              onClick={() => {
                // Store the visited pet's pubkey for the RPS challenge, then navigate to battle
                useStore.getState().setDeepLinkParams({ challengePubkey: visitedPet.pubkey, challengeMode: 'rps' });
                setView('battle');
              }}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-orange-600 hover:to-pink-600 transition-all active:scale-98"
            >
              🎲 Challenge {visitedPet.pet.name} to RPS Battle!
            </button>
          )}

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

// ============================================
// QR Meet Tab — IRL Pet Visiting via QR Code
// ============================================

function QRMeetTab() {
  const { identity, pet, setDeepLinkParams } = useStore();
  const [mode, setMode] = useState<'show' | 'scan'>('show');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void } | null>(null);

  // Generate QR code when showing (async — real scannable QR)
  useEffect(() => {
    if (mode === 'show' && identity) {
      const url = `${window.location.origin}${window.location.pathname}`;
      const deepLink = `${url}?rp1_action=visit&pubkey=${identity.pubkey}`;
      generateQRDataUrlAsync(deepLink).then(dataUrl => {
        if (dataUrl) setQrDataUrl(dataUrl);
      });
    }
  }, [mode, identity]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
      }
    };
  }, []);

  const handleStartScan = () => {
    if (!videoRef.current) return;
    setScanning(true);
    setScanResult(null);
    setScanError(null);

    const scanner = startQRScanner(videoRef.current, (data) => {
      // QR detected!
      const parsed = parseQRCode(data);
      if (parsed) {
        setScanResult(parsed.pubkey);
        scanner.stop();
        setScanning(false);
      }
    });
    scannerRef.current = scanner;
  };

  const handleStopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleVisitScanned = () => {
    if (scanResult) {
      // Navigate to visit tab via React state (NO page reload!)
      // Set deep link params so VisitTab auto-fills and auto-visits
      setDeepLinkParams({ tab: 'visit', pubkey: scanResult });
    }
  };

  if (!identity || !pet) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🔲</div>
        <p className="text-gray-400 text-sm">Create a pet first to use QR Meet!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('show'); handleStopScan(); }}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
            mode === 'show'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
          }`}
        >
          📱 Show My QR
        </button>
        <button
          onClick={() => setMode('scan')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
            mode === 'scan'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'bg-[#1a1a2e] text-gray-500 border border-gray-800'
          }`}
        >
          📷 Scan Friend's QR
        </button>
      </div>

      {/* Show QR Mode */}
      {mode === 'show' && (
        <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800 text-center">
          <h3 className="text-sm font-semibold text-cyan-300 mb-3">📱 Your Pet Visit QR Code</h3>
          <p className="text-xs text-gray-400 mb-4">
            Show this to a friend so they can scan and visit your pet!
          </p>

          {/* QR Code Display */}
          {qrDataUrl ? (
            <div className="inline-block bg-white p-4 rounded-xl mb-4">
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
            </div>
          ) : (
            <div className="w-48 h-48 mx-auto bg-[#0f0f23] rounded-xl flex items-center justify-center mb-4">
              <span className="text-gray-600">Generating...</span>
            </div>
          )}

          {/* Pet Info */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-3xl">{getStageEmoji(pet.stage)}</span>
            <div className="text-left">
              <div className="text-sm font-bold text-white">{pet.name}</div>
              <div className="text-xs text-gray-400">Lv.{pet.level} • {pet.elementalType}</div>
            </div>
          </div>

          {/* Pubkey */}
          <div className="bg-[#0f0f23] rounded-lg p-2 text-xs text-gray-500 font-mono break-all">
            {identity.pubkey.slice(0, 16)}...{identity.pubkey.slice(-16)}
          </div>
        </div>
      )}

      {/* Scan QR Mode */}
      {mode === 'scan' && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-cyan-300 mb-3">📷 Scan Friend's QR Code</h3>

          {!isQRScanSupported() && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-3">
              <p className="text-xs text-yellow-300">
                ⚠️ QR scanning requires BarcodeDetector API (Chrome 83+, Edge 83+).
                You can also manually enter a pubkey in the Visit tab.
              </p>
            </div>
          )}

          {/* Camera Viewport */}
          <div className="relative rounded-xl overflow-hidden bg-black mb-3" style={{ height: '240px' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {!scanning && !scanResult && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-gray-400 text-sm">Camera preview</span>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-cyan-400 rounded-xl animate-pulse" />
              </div>
            )}
          </div>

          {/* Scan Controls */}
          {!scanResult ? (
            <button
              onClick={scanning ? handleStopScan : handleStartScan}
              disabled={!isQRScanSupported()}
              className={`w-full font-semibold py-3 rounded-xl transition-all ${
                scanning
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600'
              }`}
            >
              {scanning ? '⏹️ Stop Scanning' : '📷 Start Scanning'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-center">
                <p className="text-sm text-green-300 font-semibold">✅ QR Code Detected!</p>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  {scanResult.slice(0, 16)}...{scanResult.slice(-8)}
                </p>
              </div>
              <button
                onClick={handleVisitScanned}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-3 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all"
              >
                👋 Visit This Pet
              </button>
              <button
                onClick={() => { setScanResult(null); setMode('scan'); }}
                className="w-full bg-[#1a1a2e] border border-gray-700 text-gray-400 font-semibold py-2 rounded-xl text-sm"
              >
                🔄 Scan Again
              </button>
            </div>
          )}

          {scanError && (
            <p className="text-xs text-red-400 mt-2 text-center">{scanError}</p>
          )}
        </div>
      )}

      {/* How It Works */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">💡 How QR Meet Works</h3>
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex items-start gap-2">
            <span className="text-cyan-400">1.</span>
            <span>Person A taps "Show My QR" — their QR code appears</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyan-400">2.</span>
            <span>Person B taps "Scan Friend's QR" — camera opens</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyan-400">3.</span>
            <span>Person B scans → instantly visits Person A's pet</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyan-400">4.</span>
            <span>Sign guestbook, check stats, or challenge to battle! ⚔️</span>
          </div>
        </div>
      </div>
    </div>
  );
}
