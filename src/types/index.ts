// ============================================
// FabricPet Core Type Definitions
// ============================================

// --- Pet Types ---

export type PetStage = 'egg' | 'baby' | 'teen' | 'adult' | 'elder';
export type PetMood = 'happy' | 'playful' | 'content' | 'hungry' | 'tired' | 'sad' | 'sick' | 'excited';
export type ElementalType = 'fire' | 'water' | 'earth' | 'air' | 'light' | 'dark' | 'neutral';

export interface PetNeeds {
  hunger: number;    // 0-100
  happiness: number; // 0-100
  energy: number;    // 0-100
  hygiene: number;   // 0-100
}

export interface BattleStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  special: number;
}

export interface BattleRecord {
  wins: number;
  losses: number;
  draws: number;
}

export interface Pet {
  id: string;
  name: string;
  level: number;
  xp: number;
  stage: PetStage;
  needs: PetNeeds;
  mood: PetMood;
  elementalType: ElementalType;
  equippedOrdinal: string | null;
  ordinalTraits: OrdinalTrait[];
  battleStats: BattleStats;
  moves: string[];
  battleRecord: BattleRecord;
  avatarId: string | null;
  createdAt: number;
  lastInteraction: number;
}

// --- Ordinal Types ---

export interface OrdinalTrait {
  trait_type: string;
  value: string;
}

export interface OrdinalInscription {
  id: string;
  number: number;
  contentType: string;
  contentUrl: string;
  traits: OrdinalTrait[];
  owner: string;
}

// --- Battle Types ---

export type MoveCategory = 'attack' | 'special' | 'defense' | 'support' | 'status';
export type StatusEffect = 'sleepy' | 'dizzy' | 'dazzled' | 'charmed' | 'pumped' | 'none';

export interface Move {
  id: string;
  name: string;
  emoji: string;
  category: MoveCategory;
  power: number;
  accuracy: number;
  description: string;
  elementalType: ElementalType;
  statusEffect?: StatusEffect;
  statusChance?: number;
  statBoost?: Partial<BattleStats>;
  healAmount?: number;
}

export interface BattleTurn {
  turn: number;
  attacker: string; // pubkey
  move: string;     // move id
  damage: number;
  effect: StatusEffect | null;
  healing: number;
  message: string;
}

export interface BattleState {
  id: string;
  players: [string, string]; // pubkeys
  pets: [BattleStats & { name: string; moves: string[]; elementalType: ElementalType }, BattleStats & { name: string; moves: string[]; elementalType: ElementalType }];
  currentTurn: number;
  turns: BattleTurn[];
  activeEffects: [StatusEffect, StatusEffect];
  winner: string | null;
  status: 'waiting' | 'active' | 'finished';
}

// --- Avatar Types ---

export interface OSAAvatar {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  modelFileUrl: string;
  format: string;
  polygonCount: number;
  materialCount: number;
  license: string;
  creator: string;
  attributes: Record<string, unknown>;
}

// --- Nostr Types ---

export interface NostrProfile {
  pubkey: string;
  npub: string;
  name?: string;
  picture?: string;
}

export interface PetStateEvent {
  pet: Pet;
  avatarId: string | null;
  lastFed: number;
  lastPlayed: number;
  createdAt: number;
}

export interface HomeState {
  theme: string;
  furniture: FurnitureItem[];
  unlockedThemes: string[];
  visitorsAllowed: boolean;
  spatialFabric: SpatialFabricConfig | null;
  guestbook: GuestbookEntry[];
}

export interface FurnitureItem {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface SpatialFabricConfig {
  nodeUrl: string;
  coordinates: { x: number; y: number; z: number };
  fabricId: string;
}

export interface GuestbookEntry {
  visitor: string;
  message: string;
  timestamp: number;
}

// --- Wallet Types ---

export type WalletType = 'unisat' | 'xverse' | 'none';

export interface WalletState {
  connected: boolean;
  type: WalletType;
  address: string | null;
  inscriptions: OrdinalInscription[];
}

// --- App State ---

export type AppView = 'home' | 'pet' | 'battle' | 'arena' | 'wallet' | 'chat' | 'avatars' | 'settings';
