// ============================================
// Avatar Picker — Browse and select avatars from OSA Gallery
// ============================================
// Uses Open Source Avatars API to let users browse 4260+ free VRM avatars
// Users can preview and select avatars to use as their pet

import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { fetchAvatarList } from '../avatar/AvatarLoader';
import type { OSAAvatar } from '../types';

interface AvatarPickerProps {
  onSelect?: (avatar: OSAAvatar) => void;
}

export function AvatarPicker({ onSelect }: AvatarPickerProps) {
  const { pet } = useStore();
  const [avatars, setAvatars] = useState<OSAAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadAvatars();
  }, []);

  const loadAvatars = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAvatarList();
      setAvatars(data);
      if (data.length === 0) {
        setError('No avatars found. The OSA Gallery might be unavailable.');
      }
    } catch (e) {
      console.error('[AvatarPicker] Failed to load avatars:', e);
      setError('Failed to load avatars. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  // Filter avatars based on search query
  const filteredAvatars = filter
    ? avatars.filter(
        (a) =>
          a.name.toLowerCase().includes(filter.toLowerCase()) ||
          a.description.toLowerCase().includes(filter.toLowerCase())
      )
    : avatars.slice(0, 24); // Show first 24 by default

  const handleSelect = (avatar: OSAAvatar) => {
    setSelectedId(avatar.id);
    if (onSelect) {
      onSelect(avatar);
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#00ffff33] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#00ffff]">🎭 OSA Avatar Gallery</h3>
        <span className="text-xs text-[#008888]">{avatars.length} avatars</span>
      </div>

      {/* Search filter */}
      <div className="mb-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search avatars..."
          className="w-full bg-[#0f0f23] border border-[#00ffff33] rounded-lg px-3 py-2 text-sm text-[#00ffff] placeholder-[#008888] focus:outline-none focus:border-[#00ffff]"
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8">
          <div className="text-4xl animate-bounce mb-2">🔄</div>
          <p className="text-sm text-[#008888]">Loading avatars from OSA Gallery...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={loadAvatars}
            className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Avatar grid */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
          {filteredAvatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleSelect(avatar)}
              className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                selectedId === avatar.id
                  ? 'bg-[#00ffff22] border border-[#00ffff]'
                  : 'bg-[#111111] border border-[#00ffff33] hover:border-[#00ffff66]'
              }`}
            >
              {/* Avatar thumbnail */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#1a1a2e] flex items-center justify-center">
                {avatar.thumbnailUrl ? (
                  <img
                    src={avatar.thumbnailUrl}
                    alt={avatar.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-2xl">🎭</span>
                )}
              </div>
              
              {/* Avatar info */}
              <span className="text-xs text-[#00ffff] mt-1 truncate w-full text-center">
                {avatar.name}
              </span>
              <span className="text-xs text-[#008888] truncate w-full text-center">
                {avatar.format.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Show more button */}
      {!loading && !error && filteredAvatars.length > 24 && (
        <button
          onClick={() => setFilter('')}
          className="w-full mt-2 text-xs text-[#00ffff] hover:text-[#33ffff] underline"
        >
          Show all {avatars.length} avatars
        </button>
      )}

      {/* Selected avatar info */}
      {selectedId && (
        <div className="mt-3 p-2 bg-[#0f0f23] border border-[#00ffff33] rounded-lg">
          <p className="text-xs text-[#00ffff]">
            Selected: {avatars.find(a => a.id === selectedId)?.name}
          </p>
          <p className="text-xs text-[#008888]">
            License: {avatars.find(a => a.id === selectedId)?.license}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-3 p-2 bg-[#111111] border border-[#00ffff33] rounded-lg">
        <p className="text-xs text-[#008888]">
          Select an avatar to use as your pet. Avatars from Open Source Avatars Gallery.
        </p>
        <p className="text-xs text-[#006666] mt-1">
          Note: Selected avatars will be used when no Bitcoin ordinal is equipped.
        </p>
      </div>
    </div>
  );
}
