// ============================================
// FabricPet Constants
// ============================================

// Nostr relay URLs (public, free relays)
// Note: relay.damus.io removed due to rate-limiting
// Note: relay.nostr.band and relay.f7z.io may have WebSocket connection issues
export const DEFAULT_RELAYS = [
  'wss://nos.lol',            // Reliable, good uptime
  'wss://relay.primal.net',   // Primal relay — good uptime
  'wss://relay.snort.social',
];

// NIP-78 event kind for app-specific data
export const NOSTR_KIND_APP_DATA = 30078;

// Nostr d-tag prefixes for our app
export const NOSTR_D_TAGS = {
  PET_STATE: 'com.fabricpet.pet.state',
  HOME_STATE: 'com.fabricpet.home.state',
  BATTLE_LOG: 'com.fabricpet.battle.log',
  BATTLE_CHALLENGE: 'com.fabricpet.battle.challenge',
  LEADERBOARD: 'com.fabricpet.leaderboard',
  GUESTBOOK: 'fabricpet-guestbook',
} as const;

// OSA (Open Source Avatars) API
export const OSA_API_URL = 'https://raw.githubusercontent.com/ToxSam/open-source-avatars/main/data';
export const OSA_AVATARS_URL = `${OSA_API_URL}/avatars.json`;

// Ordinals API endpoints
export const XVERSE_API_BASE = 'https://api-3.xverse.app/v1';
export const ORDINALS_CONTENT_BASE = 'https://ordinals.com/content';

// RP1 Spatial Fabric Configuration
export const RP1_CONFIG = {
  fabricUrl: 'https://enter.rp1.com?start_cid=104&lat=45.534558000000004&lon=-122.929784&rad=6371000',
  startCid: 104,
  lat: 45.534558000000004,
  lon: -122.929784,
  rad: 6371000,
  msfServiceUrl: 'https://mvserver-production-4e6c.up.railway.app',
  petsPortalUrl: 'https://pets.bitcoinlavalamps.com',
};

// Pet evolution level thresholds
export const EVOLUTION_LEVELS: Record<string, number> = {
  egg: 0,
  baby: 5,
  teen: 15,
  adult: 30,
  elder: 50,
};

// XP required per level (cumulative)
export const XP_PER_LEVEL = 100;

// Needs decay rates (per minute)
export const NEEDS_DECAY_RATES = {
  hunger: 0.15,
  happiness: 0.1,
  energy: 0.08,
  hygiene: 0.05,
};

// Action effects on needs
export const ACTION_EFFECTS = {
  feed: { hunger: 30, happiness: 5, energy: 5, hygiene: 0 },
  play: { hunger: -10, happiness: 25, energy: -15, hygiene: -5 },
  clean: { hunger: 0, happiness: 10, energy: -5, hygiene: 35 },
  sleep: { hunger: -5, happiness: 5, energy: 40, hygiene: 0 },
  treat: { hunger: 15, happiness: 20, energy: 5, hygiene: 0 },
};

// Base stats per evolution stage
export const BASE_STATS_BY_STAGE: Record<string, { hp: number; atk: number; def: number; spd: number; special: number }> = {
  egg: { hp: 10, atk: 1, def: 1, spd: 1, special: 1 },
  baby: { hp: 25, atk: 5, def: 4, spd: 6, special: 5 },
  teen: { hp: 45, atk: 12, def: 10, spd: 13, special: 11 },
  adult: { hp: 75, atk: 22, def: 18, spd: 20, special: 20 },
  elder: { hp: 100, atk: 30, def: 28, spd: 25, special: 30 },
};

// Elemental type effectiveness chart
export const TYPE_EFFECTIVENESS: Record<string, Record<string, number>> = {
  fire: { fire: 0.5, water: 0.5, earth: 2, air: 1, light: 1, dark: 1, neutral: 1 },
  water: { fire: 2, water: 0.5, earth: 1, air: 0.5, light: 1, dark: 1, neutral: 1 },
  earth: { fire: 0.5, water: 1, earth: 0.5, air: 2, light: 1, dark: 1, neutral: 1 },
  air: { fire: 1, water: 2, earth: 0.5, air: 0.5, light: 1, dark: 1, neutral: 1 },
  light: { fire: 1, water: 1, earth: 1, air: 1, light: 0.5, dark: 2, neutral: 1 },
  dark: { fire: 1, water: 1, earth: 1, air: 1, light: 2, dark: 0.5, neutral: 1 },
  neutral: { fire: 1, water: 1, earth: 1, air: 1, light: 1, dark: 1, neutral: 1 },
};

// Home themes
export const HOME_THEMES = [
  { id: 'room', name: 'Cozy Room', emoji: '🏡', unlockLevel: 0 },
  { id: 'garden', name: 'Garden', emoji: '🌳', unlockLevel: 10 },
  { id: 'beach', name: 'Beach', emoji: '🏖️', unlockLevel: 20 },
  { id: 'castle', name: 'Castle', emoji: '🏰', unlockLevel: 35 },
  { id: 'space', name: 'Space Station', emoji: '🌌', unlockLevel: 50 },
];

// Furniture items
export const FURNITURE_CATALOG = [
  { id: 'bed_01', type: 'bed', name: 'Cozy Bed', emoji: '🛏️' },
  { id: 'food_bowl', type: 'food', name: 'Food Bowl', emoji: '🍽️' },
  { id: 'toy_ball', type: 'toy', name: 'Ball', emoji: '⚽' },
  { id: 'toy_yarn', type: 'toy', name: 'Yarn Ball', emoji: '🧶' },
  { id: 'water_bowl', type: 'water', name: 'Water Bowl', emoji: '💧' },
  { id: 'scratching_post', type: 'toy', name: 'Scratching Post', emoji: '🪵' },
  { id: 'plant_01', type: 'decor', name: 'Plant', emoji: '🪴' },
  { id: 'lamp_01', type: 'decor', name: 'Lamp', emoji: '💡' },
];
