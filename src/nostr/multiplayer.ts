// ============================================
// Multiplayer Service — WebRTC signaling via Nostr
// ============================================
// Enables:
// - Watch battles live (spectator mode)
// - Co-view pets in shared spaces
// - Peer-to-peer voice/video chat
//
// Uses Nostr events for encrypted signaling:
// - NIP-44 for encrypted signaling
// - Kind 30078 events with 'multiplayer' tag
// ============================================

import type { NostrIdentity } from './identity';
import { getPool, getRelays } from './relayManager';
import { NOSTR_KIND_APP_DATA } from '../utils/constants';
import { signEvent } from './identity';
import { nip44 } from 'nostr-tools';

export type MultiplayerSessionType = 'spectate_battle' | 'co_view_pet' | 'voice_chat' | 'video_chat';

export type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

export interface MultiplayerSession {
  sessionId: string;
  type: MultiplayerSessionType;
  hostPubkey: string;
  targetPubkey?: string;
  battleId?: string;
  petId?: string;
  timestamp: number;
  status: 'active' | 'ended';
  connectionState: ConnectionState;
}

export interface WebRTCSignal {
  sessionId: string;
  type: 'offer' | 'answer' | 'ice_candidate';
  fromPubkey: string;
  toPubkey: string;
  payload: string;
  sessionType?: MultiplayerSessionType;
  timestamp: number;
}

export type MultiplayerMessageType =
  | 'state_sync'
  | 'chat'
  | 'emote'
  | 'battle_update'
  | 'pet_update'
  | 'ping'
  | 'pong';

export interface MultiplayerMessage {
  type: MultiplayerMessageType;
  sessionId: string;
  fromPubkey: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface SpectatorState {
  battleId: string;
  spectators: string[];
  hostPubkey: string;
}

interface PeerConnectionState {
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  session: MultiplayerSession;
  mediaStream: MediaStream | null;
}

const peerConnections = new Map<string, PeerConnectionState>();
const messageHandlers = new Map<string, (message: MultiplayerMessage) => void>();
const connectionStateHandlers = new Set<(sessionId: string, state: ConnectionState) => void>();

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getRTCConfig(): RTCConfiguration {
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    iceCandidatePoolSize: 10,
  };
}

async function publishSignal(
  identity: NostrIdentity,
  signal: WebRTCSignal
): Promise<void> {
  const pool = getPool();
  const relays = getRelays();

  let encryptedContent: string;
  try {
    if (identity.secretKey) {
      const conversationKey = nip44.v2.utils.getConversationKey(identity.secretKey, signal.toPubkey);
      encryptedContent = nip44.v2.encrypt(JSON.stringify(signal), conversationKey);
    } else {
      encryptedContent = JSON.stringify(signal);
    }
  } catch {
    encryptedContent = JSON.stringify(signal);
  }

  const event = {
    kind: NOSTR_KIND_APP_DATA,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', `multiplayer-signal.${signal.sessionId}.${signal.type}.${signal.toPubkey}`],
      ['p', signal.toPubkey],
      ['t', 'multiplayer'],
      ['t', signal.type],
    ],
    content: encryptedContent,
  };

  const signedEvent = await signEvent(identity, event as any);
  
  await Promise.allSettled(
    pool.publish(relays, signedEvent as any)
  );
}

function setupPeerConnectionHandlers(
  identity: NostrIdentity,
  sessionId: string,
  peerConnection: RTCPeerConnection,
  targetPubkey: string
): void {
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
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

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState as ConnectionState;
    const peerState = peerConnections.get(sessionId);
    if (peerState) {
      peerState.session.connectionState = state;
    }
    
    connectionStateHandlers.forEach(handler => handler(sessionId, state));
    
    console.log(`[Multiplayer] Connection state for ${sessionId}: ${state}`);
    
    if (state === 'failed' || state === 'disconnected') {
      setTimeout(() => {
        if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          console.log(`[Multiplayer] Attempting reconnection for ${sessionId}`);
          peerConnection.restartIce();
        }
      }, 3000);
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log(`[Multiplayer] ICE state for ${sessionId}: ${peerConnection.iceConnectionState}`);
  };

  peerConnection.onnegotiationneeded = async () => {
    console.log(`[Multiplayer] Renegotiation needed for ${sessionId}`);
  };

  peerConnection.ontrack = (event) => {
    console.log(`[Multiplayer] Received track for ${sessionId}:`, event.streams[0]);
    const peerState = peerConnections.get(sessionId);
    if (peerState && event.streams[0]) {
      peerState.mediaStream = event.streams[0];
    }
  };
}

function setupDataChannel(channel: RTCDataChannel, sessionId: string): void {
  channel.onopen = () => {
    console.log(`[Multiplayer] Data channel opened for ${sessionId}`);
    const pingInterval = setInterval(() => {
      if (channel.readyState === 'open') {
        const ping: MultiplayerMessage = {
          type: 'ping',
          sessionId,
          fromPubkey: '',
          timestamp: Date.now(),
          data: {},
        };
        channel.send(JSON.stringify(ping));
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  };

  channel.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as MultiplayerMessage;
      
      if (message.type === 'ping') {
        const pong: MultiplayerMessage = {
          type: 'pong',
          sessionId,
          fromPubkey: '',
          timestamp: Date.now(),
          data: { pingTimestamp: message.timestamp },
        };
        if (channel.readyState === 'open') {
          channel.send(JSON.stringify(pong));
        }
        return;
      }
      
      const handler = messageHandlers.get(message.type);
      if (handler) {
        handler(message);
      }
    } catch (error) {
      console.error('[Multiplayer] Failed to parse message:', error);
    }
  };

  channel.onclose = () => {
    console.log(`[Multiplayer] Data channel closed for ${sessionId}`);
  };

  channel.onerror = (error) => {
    console.error(`[Multiplayer] Data channel error for ${sessionId}:`, error);
  };
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
    connectionState: 'new',
  };

  const peerConnection = new RTCPeerConnection(getRTCConfig());
  
  let dataChannel: RTCDataChannel | null = null;
  if (type === 'spectate_battle' || type === 'co_view_pet') {
    dataChannel = peerConnection.createDataChannel('multiplayer', {
      ordered: true,
      maxRetransmits: 3,
    });
    setupDataChannel(dataChannel, sessionId);
  }

  if (targetPubkey) {
    setupPeerConnectionHandlers(identity, sessionId, peerConnection, targetPubkey);
  }

  peerConnections.set(sessionId, {
    peerConnection,
    dataChannel,
    session,
    mediaStream: null,
  });

  if (targetPubkey) {
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const signal: WebRTCSignal = {
        sessionId,
        type: 'offer',
        fromPubkey: identity.pubkey,
        toPubkey: targetPubkey,
        payload: JSON.stringify(offer),
        sessionType: type,
        timestamp: Date.now(),
      };
      await publishSignal(identity, signal);
      session.connectionState = 'connecting';
    } catch (error) {
      console.error('[Multiplayer] Failed to create offer:', error);
      session.connectionState = 'failed';
    }
  }

  return session;
}

export async function addMediaStream(
  sessionId: string,
  constraints: MediaStreamConstraints = { audio: true, video: false }
): Promise<MediaStream | null> {
  const peerState = peerConnections.get(sessionId);
  if (!peerState) {
    console.error('[Multiplayer] Session not found:', sessionId);
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    peerState.mediaStream = stream;

    stream.getTracks().forEach(track => {
      peerState.peerConnection.addTrack(track, stream);
    });

    return stream;
  } catch (error) {
    console.error('[Multiplayer] Failed to get media stream:', error);
    return null;
  }
}

export function getMediaStream(sessionId: string): MediaStream | null {
  const peerState = peerConnections.get(sessionId);
  return peerState?.mediaStream || null;
}

export async function endMultiplayerSession(
  identity: NostrIdentity,
  sessionId?: string
): Promise<void> {
  const sessionsToEnd = sessionId 
    ? [sessionId]
    : Array.from(peerConnections.keys());

  for (const sid of sessionsToEnd) {
    const peerState = peerConnections.get(sid);
    if (!peerState) continue;

    peerState.session.status = 'ended';
    peerState.session.connectionState = 'closed';

    if (peerState.mediaStream) {
      peerState.mediaStream.getTracks().forEach(track => track.stop());
      peerState.mediaStream = null;
    }

    if (peerState.dataChannel) {
      peerState.dataChannel.close();
    }

    if (peerState.peerConnection) {
      peerState.peerConnection.close();
    }

    peerConnections.delete(sid);
    connectionStateHandlers.forEach(handler => handler(sid, 'closed'));
  }
}

export function subscribeToSignals(
  identity: NostrIdentity,
  onSignal: (signal: WebRTCSignal) => void
): () => void {
  const pool = getPool();
  const relays = getRelays();

  const sub = pool.subscribeMany(relays, [
    {
      kinds: [NOSTR_KIND_APP_DATA],
      '#p': [identity.pubkey],
      '#t': ['multiplayer'],
    } as Record<string, unknown>,
  ] as unknown as Parameters<typeof pool.subscribeMany>[1], {
    onevent(event) {
      try {
        let signalContent = event.content;
        
        try {
          if (identity.secretKey && event.pubkey) {
            const conversationKey = nip44.v2.utils.getConversationKey(identity.secretKey, event.pubkey);
            signalContent = nip44.v2.decrypt(event.content, conversationKey);
          }
        } catch {
          // Fallback to plaintext if decryption fails
        }
        
        const signal = JSON.parse(signalContent) as WebRTCSignal;
        if (signal.toPubkey === identity.pubkey && signal.sessionId) {
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
  let peerState = peerConnections.get(signal.sessionId);

  if (!peerState) {
    const peerConnection = new RTCPeerConnection(getRTCConfig());
    
    const session: MultiplayerSession = {
      sessionId: signal.sessionId,
      type: signal.sessionType || 'co_view_pet',
      hostPubkey: signal.fromPubkey,
      targetPubkey: identity.pubkey,
      timestamp: Date.now(),
      status: 'active',
      connectionState: 'connecting',
    };

    setupPeerConnectionHandlers(identity, signal.sessionId, peerConnection, signal.fromPubkey);

    peerConnection.ondatachannel = (event) => {
      console.log(`[Multiplayer] Received data channel for ${signal.sessionId}`);
      const state = peerConnections.get(signal.sessionId);
      if (state) {
        state.dataChannel = event.channel;
        setupDataChannel(event.channel, signal.sessionId);
      }
    };

    peerState = {
      peerConnection,
      dataChannel: null,
      session,
      mediaStream: null,
    };
    peerConnections.set(signal.sessionId, peerState);
    onSessionCreated(session);
  }

  try {
    if (signal.type === 'offer') {
      const offer = JSON.parse(signal.payload);
      await peerState.peerConnection.setRemoteDescription(offer);
      const answer = await peerState.peerConnection.createAnswer();
      await peerState.peerConnection.setLocalDescription(answer);

      const answerSignal: WebRTCSignal = {
        sessionId: signal.sessionId,
        type: 'answer',
        fromPubkey: identity.pubkey,
        toPubkey: signal.fromPubkey,
        payload: JSON.stringify(answer),
        sessionType: signal.sessionType,
        timestamp: Date.now(),
      };
      await publishSignal(identity, answerSignal);

    } else if (signal.type === 'answer') {
      const answer = JSON.parse(signal.payload);
      await peerState.peerConnection.setRemoteDescription(answer);

    } else if (signal.type === 'ice_candidate') {
      const candidate = JSON.parse(signal.payload);
      await peerState.peerConnection.addIceCandidate(candidate);
    }
  } catch (error) {
    console.error('[Multiplayer] Error handling signal:', error);
  }
}

export function sendDataMessage(sessionId: string, message: MultiplayerMessage): void {
  const peerState = peerConnections.get(sessionId);
  if (peerState?.dataChannel && peerState.dataChannel.readyState === 'open') {
    peerState.dataChannel.send(JSON.stringify(message));
  } else {
    console.warn(`[Multiplayer] Data channel not ready for ${sessionId}`);
  }
}

export function sendRawData(sessionId: string, data: string | ArrayBuffer): void {
  const peerState = peerConnections.get(sessionId);
  if (peerState?.dataChannel && peerState.dataChannel.readyState === 'open') {
    if (typeof data === 'string') {
      peerState.dataChannel.send(data);
    } else {
      peerState.dataChannel.send(data);
    }
  }
}

export function onMessage(type: MultiplayerMessageType, handler: (message: MultiplayerMessage) => void): () => void {
  messageHandlers.set(type, handler);
  return () => messageHandlers.delete(type);
}

export function onConnectionStateChange(handler: (sessionId: string, state: ConnectionState) => void): () => void {
  connectionStateHandlers.add(handler);
  return () => connectionStateHandlers.delete(handler);
}

export function getSession(sessionId: string): MultiplayerSession | null {
  return peerConnections.get(sessionId)?.session || null;
}

export function getAllSessions(): MultiplayerSession[] {
  return Array.from(peerConnections.values()).map(state => state.session);
}

export function isConnected(sessionId?: string): boolean {
  if (sessionId) {
    const state = peerConnections.get(sessionId);
    return state?.peerConnection.connectionState === 'connected';
  }
  return Array.from(peerConnections.values()).some(
    state => state.peerConnection.connectionState === 'connected'
  );
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
): Promise<MultiplayerSession | null> {
  const spectators = activeSpectators.get(battleId) || new Set();
  spectators.add(identity.pubkey);
  activeSpectators.set(battleId, spectators);

  const session = await createMultiplayerSession(
    identity,
    'spectate_battle',
    hostPubkey,
    battleId
  );

  return session;
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
