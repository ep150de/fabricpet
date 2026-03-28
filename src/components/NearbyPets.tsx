// ============================================
// Nearby Pets — Display and interact with nearby pets
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  getCurrentPosition,
  broadcastPosition,
  fetchNearbyPets,
  isInSameFabric,
  clearLocationCache,
  type NearbyPet,
  type PetPosition,
} from '../nostr/realtimeSharing';
import { RP1_CONFIG } from '../utils/constants';

export function NearbyPets() {
  const { pet, identity, setDeepLinkParams, setView } = useStore();
  const [nearbyPets, setNearbyPets] = useState<NearbyPet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [lastBroadcast, setLastBroadcast] = useState<number | null>(null);

  // Check location permission status
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    if (!navigator.permissions) return;
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setLocationEnabled(result.state === 'granted');
      result.addEventListener('change', () => {
        setLocationEnabled(result.state === 'granted');
      });
    } catch {
      // Ignore if permissions API not supported
    }
  };

  const handleEnableLocation = async () => {
    try {
      const position = await getCurrentPosition();
      if (position) {
        setLocationEnabled(true);
        setError(null);
      } else {
        setError('Could not get location. Please enable location services.');
      }
    } catch {
      setError('Location permission denied.');
    }
  };

  const handleBroadcastPosition = async () => {
    if (!identity || !pet) {
      setError('Please connect your wallet and create a pet first.');
      return;
    }

    setBroadcasting(true);
    setError(null);

    try {
      const position = await getCurrentPosition();
      if (!position) {
        setError('Could not get location. Please enable location services.');
        return;
      }

      // Get current fabric CID from RP1 config
      const fabricCid = RP1_CONFIG.startCid;
      
      const success = await broadcastPosition(identity, pet, position, fabricCid);
      if (success) {
        setLastBroadcast(Date.now());
        // Refresh nearby pets after broadcasting
        handleFetchNearby();
      } else {
        setError('Failed to broadcast position. Please try again.');
      }
    } catch (e) {
      setError('Error broadcasting position.');
      console.error('[NearbyPets] Broadcast error:', e);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleFetchNearby = async () => {
    setLoading(true);
    setError(null);

    try {
      const position = await getCurrentPosition();
      if (!position) {
        setError('Could not get location. Please enable location services.');
        setLoading(false);
        return;
      }

      const pets = await fetchNearbyPets(position, 10000); // 10km radius
      setNearbyPets(pets);
      
      if (pets.length === 0) {
        setError('No nearby pets found. Try broadcasting your position!');
      }
    } catch {
      setError('Failed to fetch nearby pets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (meters?: number): string => {
    if (!meters) return 'Unknown distance';
    if (meters < 1000) return `${Math.round(meters)}m away`;
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  const getTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">📍 Nearby Pets</h3>
        <div className="flex gap-2">
          <button
            onClick={handleBroadcastPosition}
            disabled={broadcasting || !identity || !pet}
            className={`text-xs px-3 py-1 rounded-lg transition-all ${
              broadcasting
                ? 'bg-gray-700 text-gray-400'
                : 'bg-indigo-500 text-white hover:bg-indigo-600'
            }`}
          >
            {broadcasting ? '📡 Broadcasting...' : '📡 Broadcast'}
          </button>
          <button
            onClick={handleFetchNearby}
            disabled={loading}
            className="text-xs px-3 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            {loading ? '🔄' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Location permission */}
      {!locationEnabled && (
        <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-400 mb-2">
            Enable location services to find nearby pets
          </p>
          <button
            onClick={handleEnableLocation}
            className="text-xs bg-yellow-500 text-black px-3 py-1 rounded"
          >
            Enable Location
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Last broadcast time */}
      {lastBroadcast && (
        <div className="mb-3 text-xs text-gray-500">
          Last broadcast: {getTimeAgo(lastBroadcast)}
        </div>
      )}

      {/* Nearby pets list */}
      {nearbyPets.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {nearbyPets.map((pet, index) => (
            <div
              key={`${pet.pubkey}-${pet.petId}-${index}`}
              className="bg-[#0f0f23] rounded-lg p-3 border border-gray-800 hover:border-indigo-500/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="text-lg">
                    {pet.petState.elementalType === 'fire' ? '🔥' :
                     pet.petState.elementalType === 'water' ? '💧' :
                     pet.petState.elementalType === 'earth' ? '🌿' :
                     pet.petState.elementalType === 'air' ? '💨' :
                     pet.petState.elementalType === 'light' ? '✨' :
                     pet.petState.elementalType === 'dark' ? '🌑' : '⚪'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {pet.petName}
                    </span>
                    <span className="text-xs bg-gray-700 px-1 rounded">
                      Lv.{pet.petState.level}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {pet.distance ? formatDistance(pet.distance) : 'Nearby'} • 
                    {getTimeAgo(pet.timestamp)}
                  </div>
                </div>
                <div className="text-right">
                  <button
                    onClick={() => {
                      setDeepLinkParams({ pubkey: pet.pubkey });
                      setView('social');
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && nearbyPets.length === 0 && locationEnabled && (
        <div className="text-center py-4">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-sm text-gray-400">No pets nearby</p>
          <p className="text-xs text-gray-500 mt-1">
            Try broadcasting your position or come back later!
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-3 p-2 bg-[#111111] border border-gray-800 rounded-lg">
        <p className="text-xs text-gray-500">
          Broadcast your pet's location to find nearby pets. Other users can see your pet when they're close by!
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Privacy: Location data is shared only while broadcasting and is not stored permanently.
        </p>
      </div>
    </div>
  );
}