// ============================================
// Wallet View — Bitcoin wallet connection & ordinal management
// ============================================

import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  hasUnisatWallet,
  connectUnisat,
  connectXverse,
  fetchUnisatInscriptions,
  fetchXverseInscriptions,
  fetchInscriptionTraits,
} from '../wallet/WalletConnect';
import { calculateElementalType, applyTraitBonuses } from '../engine/PetStateMachine';
import { savePetState } from '../nostr/petStorage';
import { connectRemoteSigner, disconnectRemoteSigner } from '../nostr/identity';
import type { OrdinalInscription } from '../types';

export function WalletView() {
  const { pet, setPet, wallet, setWallet, setInscriptions, identity, setIdentity, setNotification } = useStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingInscriptions, setIsLoadingInscriptions] = useState(false);
  const [selectedInscription, setSelectedInscription] = useState<OrdinalInscription | null>(null);
  const [bunkerUrl, setBunkerUrl] = useState('');
  const [isConnectingRemote, setIsConnectingRemote] = useState(false);

  const handleConnectUnisat = async () => {
    setIsConnecting(true);
    try {
      const result = await connectUnisat();
      setWallet({ connected: true, type: result.type, address: result.address });
      setNotification({ message: 'UniSat wallet connected!', emoji: '₿' });

      // Fetch inscriptions
      setIsLoadingInscriptions(true);
      const inscriptions = await fetchUnisatInscriptions();
      setInscriptions(inscriptions);
    } catch (error) {
      setNotification({ message: `Connection failed: ${error}`, emoji: '❌' });
    } finally {
      setIsConnecting(false);
      setIsLoadingInscriptions(false);
    }
  };

  const handleConnectXverse = async () => {
    setIsConnecting(true);
    try {
      const result = await connectXverse();
      setWallet({ connected: true, type: result.type, address: result.address });
      setNotification({ message: 'Xverse wallet connected!', emoji: '₿' });

      // Fetch inscriptions
      setIsLoadingInscriptions(true);
      const inscriptions = await fetchXverseInscriptions(result.address);
      setInscriptions(inscriptions);
    } catch (error) {
      setNotification({ message: `Connection failed: ${error}`, emoji: '❌' });
    } finally {
      setIsConnecting(false);
      setIsLoadingInscriptions(false);
    }
  };

  const handleConnectRemoteSigner = async () => {
    if (!bunkerUrl.trim()) {
      setNotification({ message: 'Please enter a bunker:// URL', emoji: '⚠️' });
      return;
    }

    setIsConnectingRemote(true);
    try {
      const newIdentity = await connectRemoteSigner(bunkerUrl.trim());
      setIdentity(newIdentity);
      setBunkerUrl('');
      setNotification({ message: 'Remote signer connected!', emoji: '🔐' });
    } catch (error) {
      setNotification({ message: `Failed to connect: ${error}`, emoji: '❌' });
    } finally {
      setIsConnectingRemote(false);
    }
  };

  const handleDisconnectRemoteSigner = () => {
    disconnectRemoteSigner();
    setIdentity(null);
    setNotification({ message: 'Remote signer disconnected', emoji: '👋' });
  };

  const handleEquipOrdinal = async (inscription: OrdinalInscription) => {
    if (!pet) return;

    setNotification({ message: 'Reading ordinal traits...', emoji: '🔍' });

    // Fetch traits for this inscription
    const traits = await fetchInscriptionTraits(inscription.id);
    const enrichedInscription = { ...inscription, traits };

    // Calculate elemental type from traits
    const elementalType = calculateElementalType(traits);

    // Apply trait bonuses to battle stats
    const enhancedStats = applyTraitBonuses(pet.battleStats, traits);

    // Update pet
    const updatedPet = {
      ...pet,
      equippedOrdinal: inscription.id,
      ordinalTraits: traits,
      elementalType,
      battleStats: enhancedStats,
    };

    setPet(updatedPet);
    setSelectedInscription(enrichedInscription);
    setNotification({
      message: `Equipped ordinal! Type: ${elementalType}`,
      emoji: '✨',
    });

    // Save to Nostr
    if (identity) {
      savePetState(identity, updatedPet).catch(console.error);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* NIP-46 Remote Signer Section */}
      <div className="mb-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white">🔐 Nostr Identity</h2>
          <p className="text-gray-400 mt-1">Connect a remote signer for secure key management</p>
        </div>

        {identity?.isRemoteSigner ? (
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-green-500/30 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-green-400">
                  ✅ Remote Signer Connected
                </div>
                <div className="text-xs text-gray-500 font-mono mt-1">
                  {identity.npub.slice(0, 16)}...{identity.npub.slice(-8)}
                </div>
              </div>
              <button
                onClick={handleDisconnectRemoteSigner}
                className="text-xs text-gray-500 hover:text-red-400"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 mb-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Connect Remote Signer (NIP-46)</h3>
            <p className="text-xs text-gray-500 mb-3">
              Use a hardware wallet or mobile app to sign events securely without storing keys locally.
            </p>
            <input
              type="text"
              value={bunkerUrl}
              onChange={(e) => setBunkerUrl(e.target.value)}
              placeholder="bunker://pubkey?relay=wss://...&secret=..."
              className="w-full bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 mb-3 font-mono"
            />
            <button
              onClick={handleConnectRemoteSigner}
              disabled={isConnectingRemote || !bunkerUrl.trim()}
              className={`w-full font-semibold py-2 rounded-lg text-sm transition-all ${
                isConnectingRemote || !bunkerUrl.trim()
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600'
              }`}
            >
              {isConnectingRemote ? 'Connecting...' : '🔐 Connect Remote Signer'}
            </button>
            <div className="mt-3 text-xs text-gray-600">
              <p className="mb-1">Supported signers:</p>
              <ul className="list-disc list-inside space-y-0.5 text-gray-500">
                <li>nsec.app (Amber)</li>
                <li>Nostore</li>
                <li>Other NIP-46 compatible signers</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Bitcoin Wallet Section */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white">💰 Bitcoin Wallet</h2>
        <p className="text-gray-400 mt-1">Connect your wallet to equip Ordinal skins</p>
      </div>

      {/* Wallet Connection */}
      {!wallet.connected ? (
        <div className="space-y-3 mb-6">
          <button
            onClick={handleConnectUnisat}
            disabled={isConnecting}
            className={`w-full bg-[#1a1a2e] border rounded-xl p-4 flex items-center gap-4 transition-all ${
              hasUnisatWallet()
                ? 'border-orange-500/50 hover:bg-orange-500/10'
                : 'border-gray-700 opacity-50'
            }`}
          >
            <span className="text-3xl">🟠</span>
            <div className="text-left">
              <div className="font-semibold text-white">UniSat Wallet</div>
              <div className="text-xs text-gray-400">
                {hasUnisatWallet() ? 'Extension detected — Click to connect' : 'Extension not detected'}
              </div>
            </div>
          </button>

          <button
            onClick={handleConnectXverse}
            disabled={isConnecting}
            className="w-full bg-[#1a1a2e] border border-purple-500/50 rounded-xl p-4 flex items-center gap-4 hover:bg-purple-500/10 transition-all"
          >
            <span className="text-3xl">🟣</span>
            <div className="text-left">
              <div className="font-semibold text-white">Xverse Wallet</div>
              <div className="text-xs text-gray-400">Connect via Sats Connect</div>
            </div>
          </button>

          {isConnecting && (
            <div className="text-center text-gray-400 text-sm">
              Connecting...
            </div>
          )}

          {/* Manual address input */}
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
            <p className="text-xs text-gray-500 mb-2">
              💡 Don't have a wallet? You can still play! Your pet will use default stats.
              Connect a wallet later to equip Ordinal skins and boost battle stats.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          {/* Connected wallet info */}
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-green-500/30 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-green-400">
                  ✅ {wallet.type === 'unisat' ? 'UniSat' : 'Xverse'} Connected
                </div>
                <div className="text-xs text-gray-500 font-mono mt-1">
                  {wallet.address?.slice(0, 12)}...{wallet.address?.slice(-8)}
                </div>
              </div>
              <button
                onClick={() => setWallet({ connected: false, type: 'none', address: null })}
                className="text-xs text-gray-500 hover:text-red-400"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Currently equipped */}
          {pet?.equippedOrdinal && (
            <div className="bg-[#1a1a2e] rounded-xl p-4 border border-indigo-500/30 mb-4">
              <h3 className="text-sm font-semibold text-indigo-300 mb-2">✨ Equipped Ordinal</h3>
              <div className="text-xs text-gray-400 font-mono">
                {pet.equippedOrdinal.slice(0, 24)}...
              </div>
              {pet.ordinalTraits.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {pet.ordinalTraits.map((trait, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-300"
                    >
                      {trait.trait_type}: {trait.value}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2 capitalize">
                Elemental Type: <span className="text-indigo-400">{pet.elementalType}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inscriptions List */}
      {wallet.connected && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            📜 Your Inscriptions ({wallet.inscriptions.length})
          </h3>

          {isLoadingInscriptions ? (
            <div className="text-center text-gray-400 py-8">
              Loading inscriptions...
            </div>
          ) : wallet.inscriptions.length === 0 ? (
            <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800 text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm text-gray-500">
                No inscriptions found in this wallet.
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Inscriptions (Bitcoin Ordinals) can be used as pet skins and influence battle stats!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {wallet.inscriptions.map((inscription) => (
                <div
                  key={inscription.id}
                  className={`bg-[#1a1a2e] rounded-xl p-3 border transition-all cursor-pointer ${
                    pet?.equippedOrdinal === inscription.id
                      ? 'border-indigo-500'
                      : 'border-gray-800 hover:border-gray-600'
                  }`}
                  onClick={() => handleEquipOrdinal(inscription)}
                >
                  <div className="flex items-center gap-3">
                    {/* Inscription preview */}
                    <div className="w-12 h-12 bg-[#0f0f23] rounded-lg flex items-center justify-center border border-gray-700 overflow-hidden">
                      {inscription.contentType.startsWith('image/') ? (
                        <img
                          src={inscription.contentUrl}
                          alt={`Inscription #${inscription.number}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-lg">₿</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">
                        Inscription #{inscription.number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {inscription.contentType} • {inscription.id.slice(0, 16)}...
                      </div>
                    </div>

                    {pet?.equippedOrdinal === inscription.id ? (
                      <span className="text-xs text-indigo-400 font-semibold">EQUIPPED</span>
                    ) : (
                      <span className="text-xs text-gray-500">Tap to equip</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 mt-6 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">ℹ️ How Ordinals Work</h3>
        <div className="space-y-2 text-xs text-gray-500">
          <p>🎨 <strong>Skins:</strong> Your ordinal's image becomes your pet's appearance</p>
          <p>⚔️ <strong>Stats:</strong> Ordinal metadata traits boost your pet's battle stats</p>
          <p>🔥 <strong>Type:</strong> Trait keywords determine your pet's elemental type</p>
          <p>💎 <strong>Rarity:</strong> Rarer ordinals give higher stat multipliers</p>
        </div>
      </div>
    </div>
  );
}
