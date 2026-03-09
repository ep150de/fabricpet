// ============================================
// Chat View — Talk to your pet via local LLM
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getStageEmoji } from '../engine/PetStateMachine';
import {
  sendMessage,
  getGreeting,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
} from '../llm/ChatEngine';
import type { ChatEntry } from '../llm/ChatEngine';
import {
  getLLMConfig,
  saveLLMConfig,
  fetchAvailableModels,
  checkLLMHealth,
  LLM_PRESETS,
} from '../llm/LLMProvider';
import type { LLMProviderType } from '../llm/LLMProvider';

export function ChatView() {
  const { pet } = useStore();
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [llmOnline, setLlmOnline] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings state
  const [endpoint, setEndpoint] = useState(getLLMConfig().endpoint);
  const [provider, setProvider] = useState<LLMProviderType>(getLLMConfig().provider);
  const [model, setModel] = useState(getLLMConfig().model);
  const [temperature, setTemperature] = useState(getLLMConfig().temperature);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState(getLLMConfig().apiKey || '');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const history = loadChatHistory();
    if (history.length > 0) {
      setMessages(history);
    } else if (pet) {
      // First time — show greeting
      const greeting = getGreeting(pet);
      setMessages([greeting]);
      saveChatHistory([greeting]);
    }
  }, [pet]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Check LLM health on mount
  useEffect(() => {
    checkLLMHealth().then(setLlmOnline);
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !pet || isTyping) return;

    const userText = input.trim();
    setInput('');
    setError(null);
    setIsTyping(true);
    setStreamingText('');

    // Optimistically add user message
    const tempUserEntry: ChatEntry = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };
    const updatedMessages = [...messages, tempUserEntry];
    setMessages(updatedMessages);

    try {
      const { userEntry, assistantEntry } = await sendMessage(
        pet,
        userText,
        messages,
        (token) => {
          setStreamingText((prev) => prev + token);
        }
      );

      // Replace temp message with real ones
      const finalMessages = [...messages, userEntry, assistantEntry];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
      setStreamingText('');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Failed to connect to LLM';
      setError(errMsg);
      // Remove the temp user message on error
      setMessages(messages);
    } finally {
      setIsTyping(false);
    }
  }, [input, pet, isTyping, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    clearChatHistory();
    if (pet) {
      const greeting = getGreeting(pet);
      setMessages([greeting]);
      saveChatHistory([greeting]);
    } else {
      setMessages([]);
    }
  };

  const handleSaveSettings = async () => {
    saveLLMConfig({ endpoint, provider, model, temperature, apiKey: apiKey || undefined });
    const online = await checkLLMHealth({ endpoint, provider, apiKey: apiKey || undefined });
    setLlmOnline(online);
    if (online) {
      const models = await fetchAvailableModels({ endpoint, provider });
      setAvailableModels(models);
    }
    setShowSettings(false);
  };

  const handleFetchModels = async () => {
    const models = await fetchAvailableModels({ endpoint, provider });
    setAvailableModels(models);
    if (models.length > 0 && !models.includes(model)) {
      setModel(models[0]);
    }
  };

  if (!pet) return null;

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-gray-800 p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getStageEmoji(pet.stage)}</span>
          <div>
            <h2 className="text-sm font-bold text-white">{pet.name}</h2>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${llmOnline ? 'bg-green-400' : llmOnline === false ? 'bg-red-400' : 'bg-gray-500'}`} />
              <span className="text-xs text-gray-400">
                {llmOnline ? 'LLM Connected' : llmOnline === false ? 'LLM Offline' : 'Checking...'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-all text-sm"
          >
            ⚙️
          </button>
          <button
            onClick={handleClearChat}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-all text-sm"
            title="Clear chat"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-[#12122a] border-b border-gray-800 p-3 space-y-2 shrink-0">
          <h3 className="text-xs font-semibold text-gray-300">🤖 LLM Settings</h3>

          {/* Quick Presets */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">⚡ Quick Setup</label>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(LLM_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => {
                    setProvider(preset.provider);
                    setEndpoint(preset.endpoint);
                    setModel(preset.model);
                  }}
                  className={`text-xs px-2 py-1.5 rounded border transition-all text-left ${
                    endpoint === preset.endpoint && model === preset.model
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                      : 'bg-[#0f0f23] text-gray-400 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as LLMProviderType)}
                className="w-full bg-[#0f0f23] border border-gray-700 rounded px-2 py-1 text-xs text-white"
              >
                <option value="ollama">Ollama</option>
                <option value="vllm">vLLM</option>
                <option value="openai-compatible">OpenAI Compatible</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Temperature</label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full bg-[#0f0f23] border border-gray-700 rounded px-2 py-1 text-xs text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Endpoint URL</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full bg-[#0f0f23] border border-gray-700 rounded px-2 py-1 text-xs text-white"
            />
          </div>

          {/* API Key — needed for OpenRouter and other cloud providers */}
          {provider !== 'ollama' && (
            <div>
              <label className="text-xs text-gray-500">API Key {endpoint.includes('openrouter') ? '(required)' : '(optional)'}</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={endpoint.includes('openrouter') ? 'sk-or-... (get free key at openrouter.ai/keys)' : 'API key (if required)'}
                className="w-full bg-[#0f0f23] border border-gray-700 rounded px-2 py-1 text-xs text-white"
              />
              {endpoint.includes('openrouter') && !apiKey && (
                <p className="text-xs text-orange-400 mt-1">
                  ⚠️ OpenRouter requires a free API key → <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" className="underline">openrouter.ai/keys</a>
                </p>
              )}
            </div>
          )}

          {/* Ollama CORS hint */}
          {provider === 'ollama' && (
            <div className="bg-[#0f0f23] rounded p-2 border border-gray-800">
              <p className="text-xs text-gray-500">
                💡 <strong className="text-gray-400">Ollama CORS:</strong> If connecting from a hosted site, start Ollama with:
              </p>
              <code className="text-xs text-cyan-400 block mt-1">OLLAMA_ORIGINS=* ollama serve</code>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500">Model</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="llama3.2"
                className="flex-1 bg-[#0f0f23] border border-gray-700 rounded px-2 py-1 text-xs text-white"
                list="model-list"
              />
              <button
                onClick={handleFetchModels}
                className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-1 rounded border border-indigo-500/30 hover:bg-indigo-500/30"
              >
                🔄
              </button>
            </div>
            {availableModels.length > 0 && (
              <datalist id="model-list">
                {availableModels.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            )}
            {availableModels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {availableModels.slice(0, 5).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModel(m)}
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      model === m ? 'bg-indigo-500/30 text-indigo-300' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSaveSettings}
            className="w-full bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold py-1.5 rounded transition-all"
          >
            💾 Save & Connect
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-500 text-white rounded-br-sm'
                  : 'bg-[#1a1a2e] text-gray-200 border border-gray-700 rounded-bl-sm'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="text-xs text-gray-500 mb-1 font-semibold">
                  {getStageEmoji(pet.stage)} {pet.name}
                </div>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <div className="text-xs opacity-50 mt-1 text-right">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {isTyping && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-3 py-2 text-sm bg-[#1a1a2e] text-gray-200 border border-gray-700">
              <div className="text-xs text-gray-500 mb-1 font-semibold">
                {getStageEmoji(pet.stage)} {pet.name}
              </div>
              <p className="whitespace-pre-wrap">{streamingText}<span className="animate-pulse">▊</span></p>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !streamingText && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a2e] border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-300 max-w-[90%]">
              ⚠️ {error}
              {!llmOnline && (
                <div className="mt-1 text-red-400">
                  Make sure Ollama/vLLM is running. Tap ⚙️ to configure.
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-[#1a1a2e] border-t border-gray-800 p-3 shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={llmOnline ? `Talk to ${pet.name}...` : 'Configure LLM in ⚙️ settings...'}
            disabled={isTyping}
            className="flex-1 bg-[#0f0f23] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold px-4 py-2 rounded-xl transition-all"
          >
            {isTyping ? '...' : '📨'}
          </button>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-600">
            {getLLMConfig().provider} · {getLLMConfig().model}
          </span>
          <span className="text-xs text-gray-600">
            {messages.length} messages
          </span>
        </div>
      </div>
    </div>
  );
}
