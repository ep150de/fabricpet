// ============================================
// Multiplayer View — WebRTC peer connections
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  createMultiplayerSession,
  subscribeToSignals,
  handleSignal,
  endMultiplayerSession,
  sendDataMessage,
  onMessage,
  onConnectionStateChange,
  getAllSessions,
  addMediaStream,
  getMediaStream,
  type MultiplayerSession,
  type MultiplayerMessage,
  type ConnectionState,
} from '../nostr/multiplayer';

export function MultiplayerView() {
  const { identity, setNotification } = useStore();
  const [sessions, setSessions] = useState<MultiplayerSession[]>([]);
  const [targetPubkey, setTargetPubkey] = useState('');
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionState>>({});
  const [chatMessage, setChatMessage] = useState('');
  const [chatLog, setChatLog] = useState<MultiplayerMessage[]>([]);

  useEffect(() => {
    if (!identity) return;

    const unsubscribe = subscribeToSignals(identity, async (signal) => {
      await handleSignal(identity, signal, (session) => {
        setSessions(prev => [...prev, session]);
        setNotification({ message: 'Multiplayer session started!', emoji: '🔗' });
      });
    });

    const unsubscribeMessages = onMessage('chat', (message) => {
      setChatLog(prev => [...prev, message]);
    });

    const unsubscribeConnection = onConnectionStateChange((sessionId, state) => {
      setConnectionStates(prev => ({ ...prev, [sessionId]: state }));
    });

    setSessions(getAllSessions());

    return () => {
      unsubscribe();
      unsubscribeMessages();
      unsubscribeConnection();
    };
  }, [identity, setNotification]);

  const handleCreateSession = useCallback(async (type: 'spectate_battle' | 'co_view_pet' | 'voice_chat' | 'video_chat') => {
    if (!identity || !targetPubkey.trim()) {
      setNotification({ message: 'Enter a target pubkey', emoji: '⚠️' });
      return;
    }

    try {
      const session = await createMultiplayerSession(
        identity,
        type,
        targetPubkey.trim()
      );
      setSessions(prev => [...prev, session]);
      setNotification({ message: `Session created: ${type}`, emoji: '✅' });

      if (type === 'voice_chat' || type === 'video_chat') {
        await addMediaStream(session.sessionId, {
          audio: true,
          video: type === 'video_chat',
        });
      }
    } catch (error) {
      setNotification({ message: 'Failed to create session', emoji: '❌' });
    }
  }, [identity, targetPubkey, setNotification]);

  const handleEndSession = useCallback(async (sessionId: string) => {
    if (!identity) return;
    await endMultiplayerSession(identity, sessionId);
    setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    setNotification({ message: 'Session ended', emoji: '👋' });
  }, [identity, setNotification]);

  const handleSendChat = useCallback(() => {
    if (!chatMessage.trim() || sessions.length === 0) return;

    const message: MultiplayerMessage = {
      type: 'chat',
      sessionId: sessions[0].sessionId,
      fromPubkey: identity?.pubkey || '',
      timestamp: Date.now(),
      data: { text: chatMessage },
    };

    sendDataMessage(sessions[0].sessionId, message);
    setChatLog(prev => [...prev, message]);
    setChatMessage('');
  }, [chatMessage, sessions, identity]);

  if (!identity) {
    return (
      <div className="p-4 max-w-lg mx-auto text-center">
        <div className="text-4xl mb-3">🔗</div>
        <p className="text-gray-400">Create an identity to use multiplayer</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">🔗 Multiplayer</h2>
        <p className="text-gray-400 text-sm mt-1">WebRTC peer connections</p>
      </div>

      {/* Create Session */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 mb-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Start Session</h3>
        <input
          type="text"
          value={targetPubkey}
          onChange={(e) => setTargetPubkey(e.target.value)}
          placeholder="Target pubkey (hex or npub)"
          className="w-full bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 mb-3"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleCreateSession('co_view_pet')}
            className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 rounded-lg py-2 text-xs font-semibold"
          >
            👀 Co-View Pet
          </button>
          <button
            onClick={() => handleCreateSession('spectate_battle')}
            className="bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded-lg py-2 text-xs font-semibold"
          >
            ⚔️ Spectate Battle
          </button>
          <button
            onClick={() => handleCreateSession('voice_chat')}
            className="bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg py-2 text-xs font-semibold"
          >
            🎙️ Voice Chat
          </button>
          <button
            onClick={() => handleCreateSession('video_chat')}
            className="bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded-lg py-2 text-xs font-semibold"
          >
            📹 Video Chat
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      {sessions.length > 0 && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Active Sessions</h3>
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.sessionId} className="bg-[#0f0f23] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white capitalize">
                    {session.type.replace('_', ' ')}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    connectionStates[session.sessionId] === 'connected'
                      ? 'bg-green-500/20 text-green-400'
                      : connectionStates[session.sessionId] === 'connecting'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {connectionStates[session.sessionId] || session.connectionState}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {session.targetPubkey?.slice(0, 16)}...
                </div>
                <button
                  onClick={() => handleEndSession(session.sessionId)}
                  className="w-full bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg py-1 text-xs"
                >
                  End Session
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat */}
      {sessions.length > 0 && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Chat</h3>
          <div className="bg-[#0f0f23] rounded-lg p-3 h-40 overflow-y-auto mb-3">
            {chatLog.length === 0 ? (
              <p className="text-xs text-gray-600 text-center">No messages yet</p>
            ) : (
              chatLog.map((msg, i) => (
                <div key={i} className="text-xs mb-2">
                  <span className="text-indigo-400">{msg.fromPubkey.slice(0, 8)}:</span>{' '}
                  <span className="text-gray-300">{msg.data.text as string}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Type a message..."
              className="flex-1 bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
            <button
              onClick={handleSendChat}
              className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
