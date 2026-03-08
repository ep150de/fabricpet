/**
 * HoloBall Arena — Core Type Definitions
 * 
 * These types define the data structures used throughout the arena system.
 * They extend and complement FabricPet's type system.
 */

import * as THREE from 'three';

// ============================================================
// Vector & Spatial Types
// ============================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SpatialCoordinate extends Vector3 {
  fabricId?: string; // RP1 spatial fabric coordinate ID
}

// ============================================================
// Element Types (mirrors FabricPet)
// ============================================================

export type ElementType = 'fire' | 'water' | 'grass' | 'electric' | 'earth' | 'light' | 'dark';

// ============================================================
// HoloBall Types
// ============================================================

export type HoloBallState = 'idle' | 'selected' | 'thrown' | 'opening' | 'deployed' | 'recalled' | 'empty';

export interface HoloBallData {
  id: string;
  ownerId: string;          // Nostr public key
  petId: string;             // FabricPet pet ID
  skinId?: string;           // Ordinal inscription ID for skin
  elementType: ElementType;
  state: HoloBallState;
  position: Vector3;
  velocity: Vector3;
  animationProgress: number; // 0-1 for current state animation
  createdAt: number;
}

export interface HoloBallSkin {
  inscriptionId: string;
  imageUrl: string;
  traits: Record<string, string>;
  biomeAffinity?: string;
  rarityMultiplier: number;
  glowColor?: string;
  particleColor?: string;
}

export interface HoloBallThrowParams {
  origin: Vector3;
  direction: Vector3;
  speed: number;
  arc: number;
}

// ============================================================
// Arena Types
// ============================================================

export type ArenaStatus = 'dormant' | 'materializing' | 'active' | 'resolving' | 'collapsing';

export type BiomeId = 
  | 'cyber_grid' 
  | 'volcanic_forge' 
  | 'deep_ocean' 
  | 'crystal_cavern' 
  | 'void_nexus' 
  | 'sky_temple' 
  | 'overgrown_ruins';

export type BiomeSelectionMode = 'random' | 'challenger_choice' | 'elemental_match' | 'neutral';

export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  description: string;
  elementAffinity: ElementType;
  colors: {
    primary: string;
    secondary: string;
    grid: string;
    ambient: string;
    sky: string;
  };
  effects: {
    [key: string]: boolean | number;
    particleDensity: number;
  };
  statModifiers: Partial<Record<ElementType, number>>;
  ambientSound: string;
}

export interface ArenaData {
  id: string;
  status: ArenaStatus;
  biome: BiomeDefinition;
  position: SpatialCoordinate;
  radius: number;
  wallHeight: number;
  materializationProgress: number; // 0-1
  collapseProgress: number;        // 0-1
  createdAt: number;
  battleId?: string;
}

export interface MaterializationPhase {
  name: 'impact' | 'grid_formation' | 'wall_rise' | 'biome_fill' | 'atmosphere' | 'stabilize';
  startTime: number;  // seconds from start
  endTime: number;    // seconds from start
  progress: number;   // 0-1 within this phase
}

// ============================================================
// Battle Arena Types
// ============================================================

export interface ArenaBattleData {
  id: string;
  arenaId: string;
  challenger: ArenaPlayerData;
  defender: ArenaPlayerData;
  currentTurn: number;
  turnPhase: 'selecting' | 'executing' | 'resolving';
  winner?: string;
  startedAt: number;
  endedAt?: number;
}

export interface ArenaPlayerData {
  userId: string;       // Nostr public key
  petId: string;        // FabricPet pet ID
  holoBallId: string;
  position: Vector3;    // Position in arena
  isReady: boolean;
}

export interface BattleTurnResult {
  turnNumber: number;
  attackerId: string;
  defenderId: string;
  moveId: string;
  moveName: string;
  moveType: ElementType;
  moveCategory: 'projectile' | 'area' | 'contact' | 'buff' | 'status';
  damage: number;
  isCritical: boolean;
  effectiveness: 'super_effective' | 'not_very_effective' | 'normal';
  statusApplied?: string;
  statusCleared?: string;
  attackerHpAfter: number;
  defenderHpAfter: number;
  isFainted: boolean;
}

// ============================================================
// Camera Types
// ============================================================

export type CameraMode = 'orbit' | 'move_selection' | 'attack' | 'impact' | 'critical' | 'victory' | 'free';

export interface CameraState {
  mode: CameraMode;
  position: Vector3;
  target: Vector3;
  fov: number;
  shakeIntensity: number;
  transitionDuration: number;
}

// ============================================================
// Spectator Types
// ============================================================

export interface SpectatorData {
  userId: string;
  position: Vector3;
  cameraMode: 'free' | 'auto';
  joinedAt: number;
}

export interface SpectatorSessionData {
  arenaId: string;
  spectators: SpectatorData[];
  maxSpectators: number;
}

// ============================================================
// Matchmaking Types
// ============================================================

export type MatchmakingMode = 'proximity' | 'nostr_challenge' | 'tournament' | 'random_queue';

export interface MatchmakingRequest {
  userId: string;
  petId: string;
  mode: MatchmakingMode;
  preferredBiome?: BiomeId;
  arenaRank: number;
  position?: SpatialCoordinate;
  timestamp: number;
}

export interface MatchmakingResult {
  matched: boolean;
  opponentId?: string;
  arenaPosition?: SpatialCoordinate;
  biome?: BiomeId;
  matchId?: string;
}

// ============================================================
// Tournament Types
// ============================================================

export type TournamentSize = 8 | 16 | 32;
export type TournamentStatus = 'registration' | 'in_progress' | 'completed';

export interface TournamentData {
  id: string;
  name: string;
  status: TournamentStatus;
  size: TournamentSize;
  participants: string[];
  bracket: TournamentBracket;
  currentRound: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface TournamentBracket {
  rounds: TournamentRound[];
}

export interface TournamentRound {
  roundNumber: number;
  matches: TournamentMatch[];
}

export interface TournamentMatch {
  matchId: string;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  battleId?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

// ============================================================
// NSO / MVMF Types
// ============================================================

export interface MVMFModel {
  modelName: string;
  modelType: 'realtime' | 'stateless';
  data: Record<string, unknown>;
  timestamp: number;
}

export interface NSOEndpoint {
  path: string;
  method: 'subscribe' | 'publish' | 'request' | 'respond';
  model: string;
}

// ============================================================
// Nostr Event Types (Arena-specific)
// ============================================================

export interface ArenaChallenge {
  challengeId: string;
  challengerId: string;
  challengerPetId: string;
  targetId?: string;          // Specific target, or null for open challenge
  spatialCoordinates: SpatialCoordinate;
  preferredBiome?: BiomeId;
  spectatorUrl?: string;
  expiresAt: number;
}

export interface ArenaBattleResult {
  battleId: string;
  arenaId: string;
  winnerId: string;
  loserId: string;
  winnerPetId: string;
  loserPetId: string;
  biome: BiomeId;
  turns: number;
  duration: number;
  xpAwarded: number;
  timestamp: number;
}

// ============================================================
// Audio Types
// ============================================================

export type AudioEvent = 
  | 'ball_throw'
  | 'ball_open'
  | 'arena_materialize'
  | 'arena_collapse'
  | 'pet_emerge'
  | 'pet_recall'
  | 'move_fire'
  | 'move_water'
  | 'move_grass'
  | 'move_electric'
  | 'move_earth'
  | 'move_light'
  | 'move_dark'
  | 'hit_normal'
  | 'hit_critical'
  | 'hit_super_effective'
  | 'status_apply'
  | 'status_clear'
  | 'victory_fanfare'
  | 'defeat_sound'
  | 'crowd_cheer'
  | 'ambient_loop';

export interface AudioConfig {
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  spatialRolloff: number;
  maxAudioDistance: number;
}

// ============================================================
// VFX Types
// ============================================================

export interface ParticleConfig {
  count: number;
  color: string | string[];
  size: number;
  lifetime: number;
  speed: number;
  spread: number;
  gravity: number;
  emissionRate: number;
}

export interface ShaderConfig {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
}
