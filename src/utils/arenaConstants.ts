/**
 * Arena Constants
 * 
 * Shared constants used throughout the HoloBall Arena system.
 */

// Element type colors
export const ELEMENT_COLORS: Record<string, string> = {
  fire: '#ff4400',
  water: '#0066ff',
  grass: '#00ff44',
  electric: '#ffdd00',
  earth: '#aa44ff',
  light: '#ffffff',
  dark: '#8800ff',
};

// Status effect colors
export const STATUS_COLORS: Record<string, string> = {
  Sleepy: '#9999ff',
  Dizzy: '#ffff00',
  Dazzled: '#ff88ff',
  Charmed: '#ff4488',
  Pumped: '#ff8800',
};

// Arena defaults
export const ARENA_DEFAULTS = {
  radius: 15,
  wallHeight: 10,
  gridCellSize: 1.0,
  barrierOpacity: 0.3,
  maxSpectators: 100,
} as const;

// HoloBall defaults
export const HOLOBALL_DEFAULTS = {
  throwSpeed: 20,
  throwArc: 0.6,
  openingDurationMs: 1500,
  beamHeight: 8,
  beamDurationMs: 2000,
  recallDurationMs: 1000,
  maxInventorySize: 6,
} as const;

// Battle defaults
export const BATTLE_DEFAULTS = {
  turnTimeLimit: 30000,
  battleTimeout: 300000,
  moveAnimationDurationMs: 1200,
  statusEffectDurationMs: 800,
  hitFlashDurationMs: 200,
  victoryAnimationDurationMs: 3000,
} as const;

// Camera defaults
export const CAMERA_DEFAULTS = {
  orbitSpeed: 0.3,
  orbitDistance: 12,
  orbitHeight: 6,
  fovDefault: 60,
  fovZoomed: 45,
} as const;

// Nostr event kinds (arena-specific)
export const NOSTR_EVENT_KINDS = {
  arenaChallenge: 30078,
  battleResult: 30079,
  tournamentBracket: 30080,
  leaderboard: 30081,
} as const;

// Biome IDs
export const BIOME_IDS = [
  'cyber_grid',
  'volcanic_forge',
  'deep_ocean',
  'crystal_cavern',
  'void_nexus',
  'sky_temple',
  'overgrown_ruins',
] as const;
