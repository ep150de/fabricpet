// ============================================
// Multiplayer Service — WebRTC signaling via Nostr
// ============================================
// Enables:
// - Watch battles live (spectator mode)
// - Co-view pets in shared spaces
// - Peer-to-peer voice/video chat
//
// Uses Nostr events for signaling data exchange:
// - NIP-04/NIP-44 for encrypted signaling
// - Kind 30078 events with 'multiplayer' tag
// ============================================

import type { NostrIdentity } from './identity';
import { getPool, getRelays } from './relayManager';
import { NOSTR_KIND_APP_DATA } from '../utils/constants';
import { signEvent } from './identity';

export type MultiplayerSessionType = 'spectate_battle' | 'co_view_pet' | 'voice_chat' | 'video_chat';

export interface MultiplayerSession {
  sessionId: string;
  type: MultiplayerSessionType;
  hostPubkey: string;
  targetPubkey?: string;
  battleId?: string;
  petId?: string;
  timestamp: number;
  status: 'active' | 'ended';
}

export interface WebRTCSignal {
  sessionId: string;
  type: 'offer' | 'answer' | 'ice_candidate';
  fromPubkey: string;
  toPubkey: string;
  payload: string;
  timestamp: number;
}

export interface SpectatorState {
  battleId: string;
  spectators: string[];
  hostPubkey: string;
}

let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;
let currentSession: MultiplayerSession | null = null;

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getRTCConfig(): RTCConfiguration {
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };
}

async function publishSignal(
  identity: NostrIdentity,
  signal: WebRTCSignal
): Promise<void> {
  const pool = getPool();
  const relays = getRelays();

  const event = {
    kind: NOSTR_KIND_APP_DATA,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', `multiplayer-signal.${signal.sessionId}.${signal.type}.${signal.toPubkey}`],
      ['p', signal.toPubkey],
      ['t', 'multiplayer'],
      ['t', signal.type],
    ],
    content: JSON.stringify(signal),
  };

  const signedEvent = await signEvent(identity, event as any);
  
  await Promise.allSettled(
    pool.publish(relays, signedEvent as any)
  );
}

export async function createMultiplayerSession(
  identity: NostrIdentity,
  type: MultiplayerSessionType,
  targetPubkey?: string,
  battleId?: string,
  petId?: string
): Promise<MultiplayerSession> {
  const sessionId = generateSessionId();
  
  const session: MultiplayerSession = {
    sessionId,
    type,
    hostPubkey: identity.pubkey,
    targetPubkey,
    battleId,
    petId,
    timestamp: Date.now(),
    status: 'active',
  };

  currentSession = session;

  peerConnection = new RTCPeerConnection(getRTCConfig());

  if (type === 'spectate_battle' || type === 'co_view_pet') {
    dataChannel = peerConnection.createDataChannel('multiplayer');
    setupDataChannel(dataChannel);
  }

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && targetPubkey) {
      const signal: WebRTCSignal = {
        sessionId,
        type: 'ice_candidate',
        fromPubkey: identity.pubkey,
        toPubkey: targetPubkey,
        payload: JSON.stringify(event.candidate),
        timestamp: Date.now(),
      };
      publishSignal(identity, signal);
    }
  };

  peerConnection.ontrack = (event) => {
    console.log('[Multiplayer] Received track:', event.streams[0]);
  };

  if (peerConnection.iceConnectionState === 'connected') {
    console.log('[Multiplayer] Already connected');
  }

  return session;
}

function setupDataChannel(channel: RTCDataChannel): void {
  channel.onopen = () => {
    console.log('[Multiplayer] Data channel opened');
  };

  channel.onmessage = (event) => {
    console.log('[Multiplayer] Received data:', event.data);
  };

  channel.onclose = () => {
    console.log('[Multiplayer] Data channel closed');
  };
}

export async function endMultiplayerSession(identity: NostrIdentity): Promise<void> {
  if (!currentSession) return;

  currentSession.status = 'ended';

  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  currentSession = null;
}

export function subscribeToSignals(
  pubkey: string,
  onSignal: (signal: WebRTCSignal) => void
): () => void {
  const pool = getPool();
  const relays = getRelays();

  const sub = pool.subscribeMany(relays, [
    {
      kinds: [NOSTR_KIND_APP_DATA],
      '#p': [pubkey],
      '#t': ['multiplayer'],
    } as Record<string, unknown>,
  ] as unknown as Parameters<typeof pool.subscribeMany>[1], {
    onevent(event) {
      try {
        const signal = JSON.parse(event.content) as WebRTCSignal;
        if (signal.toPubkey === pubkey && signal.sessionId) {
          onSignal(signal);
        }
      } catch {
        // Invalid event
      }
    },
    oneose() {
      console.log('[Multiplayer] Subscribed to signals');
    },
  });

  return () => sub.close();
}

export async function handleSignal(
  identity: NostrIdentity,
  signal: WebRTCSignal,
  onSessionCreated: (session: MultiplayerSession) => void
): Promise<void> {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection(getRTCConfig());
  }

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      const replySignal: WebRTCSignal = {
        sessionId: signal.sessionId,
        type: 'ice_candidate',
        fromPubkey: identity.pubkey,
        toPubkey: signal.fromPubkey,
        payload: JSON.stringify(event.candidate),
        timestamp: Date.now(),
      };
      publishSignal(identity, replySignal);
    }
  };

  peerConnection.ondatachannel = (event) => {
    console.log('[Multiplayer] Received data channel');
    dataChannel = event.channel;
    setupDataChannel(dataChannel);
  };

  try {
    if (signal.type === 'offer') {
      const offer = JSON.parse(signal.payload);
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      const answerSignal: WebRTCSignal = {
        sessionId: signal.sessionId,
        type: 'answer',
        fromPubkey: identity.pubkey,
        toPubkey: signal.fromPubkey,
        payload: JSON.stringify(answer),
        timestamp: Date.now(),
      };
      await publishSignal(identity, answerSignal);

      currentSession = {
        sessionId: signal.sessionId,
        type: 'co_view_pet',
        hostPubkey: signal.fromPubkey,
        targetPubkey: identity.pubkey,
        timestamp: Date.now(),
        status: 'active',
      };
      onSessionCreated(currentSession);

    } else if (signal.type === 'answer') {
      const answer = JSON.parse(signal.payload);
      await peerConnection.setRemoteDescription(answer);

    } else if (signal.type === 'ice_candidate') {
      const candidate = JSON.parse(signal.payload);
      await peerConnection.addIceCandidate(candidate);
    }
  } catch (error) {
    console.error('[Multiplayer] Error handling signal:', error);
  }
}

export function sendDataMessage(message: string): void {
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(message);
  } else {
    console.warn('[Multiplayer] Data channel not ready');
  }
}

export function getCurrentSession(): MultiplayerSession | null {
  return currentSession;
}

export function isConnected(): boolean {
  return peerConnection?.iceConnectionState === 'connected';
}

export interface BattleSpectatorState {
  battleId: string;
  hostPubkey: string;
  spectators: string[];
}

const activeSpectators = new Map<string, Set<string>>();

export async function joinBattleAsSpectator(
  identity: NostrIdentity,
  battleId: string,
  hostPubkey: string
): Promise<void> {
  const spectators = activeSpectators.get(battleId) || new Set();
  spectators.add(identity.pubkey);
  activeSpectators.set(battleId, spectators);

  console.log(`[Multiplayer] Joined battle ${battleId} as spectator`);
}

export function getBattleSpectators(battleId: string): string[] {
  const spectators = activeSpectators.get(battleId);
  return spectators ? Array.from(spectators) : [];
}

export async function publishBattleSpectatorEvent(
  identity: NostrIdentity,
  battleId: string,
  action: 'join' | 'leave'
): Promise<void> {
  const pool = getPool();
  const relays = getRelays();

  const event = {
    kind: NOSTR_KIND_APP_DATA,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', `battle-spectate.${battleId}.${action}.${identity.pubkey}`],
      ['t', 'battle-spectate'],
      ['e', battleId],
    ],
    content: JSON.stringify({
      battleId,
      pubkey: identity.pubkey,
      action,
      timestamp: Date.now(),
    }),
  };

  const signedEvent = await signEvent(identity, event as any);
  
  await Promise.allSettled(
    pool.publish(relays, signedEvent as any)
  );
}

export function subscribeToBattleSpectators(
  battleId: string,
  onSpectatorUpdate: (spectators: string[]) => void
): () => void {
  const pool = getPool();
  const relays = getRelays();
  const spectators = new Set<string>();

  const sub = pool.subscribeMany(relays, [
    {
      kinds: [NOSTR_KIND_APP_DATA],
      '#t': ['battle-spectate'],
      '#e': [battleId],
    } as Record<string, unknown>,
  ] as unknown as Parameters<typeof pool.subscribeMany>[1], {
    onevent(event) {
      try {
        const data = JSON.parse(event.content);
        if (data.battleId === battleId) {
          if (data.action === 'join') {
            spectators.add(data.pubkey);
          } else if (data.action === 'leave') {
            spectators.delete(data.pubkey);
          }
          onSpectatorUpdate(Array.from(spectators));
        }
      } catch {
        // Invalid event
      }
    },
    oneose() {
      console.log(`[Multiplayer] Subscribed to spectators for battle ${battleId}`);
    },
  });

  return () => sub.close();
}