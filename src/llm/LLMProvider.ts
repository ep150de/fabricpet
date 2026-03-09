// ============================================
// LLM Provider — Ollama + vLLM + OpenAI-compatible + OpenRouter
// ============================================
// Abstraction layer for LLM inference (local or cloud).
// Supports streaming responses for real-time chat.
// Includes free public fallback via OpenRouter.
// ============================================

export type LLMProviderType = 'ollama' | 'vllm' | 'openai-compatible';

/**
 * Preset LLM configurations for quick setup.
 */
export const LLM_PRESETS: Record<string, { provider: LLMProviderType; endpoint: string; model: string; label: string }> = {
  ollama_local: {
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    model: 'llama3.2',
    label: '🏠 Ollama (Local)',
  },
  openrouter_free: {
    provider: 'openai-compatible',
    endpoint: 'https://openrouter.ai/api',
    model: 'meta-llama/llama-3.2-3b-instruct:free',
    label: '🌐 OpenRouter (Free)',
  },
  openrouter_good: {
    provider: 'openai-compatible',
    endpoint: 'https://openrouter.ai/api',
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    label: '🌐 OpenRouter 8B (Free)',
  },
  vllm_local: {
    provider: 'vllm',
    endpoint: 'http://localhost:8000',
    model: 'default',
    label: '⚡ vLLM (Local)',
  },
};

export interface LLMConfig {
  provider: LLMProviderType;
  endpoint: string;       // e.g. http://localhost:11434
  model: string;          // e.g. llama3.2
  temperature: number;    // 0.0 - 2.0
  maxTokens: number;      // max response tokens
  systemPrompt: string;   // pet personality prompt
  apiKey?: string;         // API key for OpenRouter / OpenAI-compatible endpoints
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  done: boolean;
  model?: string;
  tokensUsed?: number;
}

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'ollama',
  endpoint: 'http://localhost:11434',
  model: 'llama3.2',
  temperature: 0.8,
  maxTokens: 256,
  systemPrompt: '',
};

/**
 * Get saved LLM config from localStorage, or defaults.
 */
export function getLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem('fabricpet_llm_config');
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...saved };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG };
}

/**
 * Save LLM config to localStorage.
 */
export function saveLLMConfig(config: Partial<LLMConfig>): void {
  const current = getLLMConfig();
  const merged = { ...current, ...config };
  localStorage.setItem('fabricpet_llm_config', JSON.stringify(merged));
}

/**
 * Fetch available models from the LLM endpoint.
 */
export async function fetchAvailableModels(config?: Partial<LLMConfig>): Promise<string[]> {
  const cfg = { ...getLLMConfig(), ...config };

  try {
    if (cfg.provider === 'ollama') {
      const res = await fetch(`${cfg.endpoint}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map((m: { name: string }) => m.name);
    }

    if (cfg.provider === 'vllm' || cfg.provider === 'openai-compatible') {
      const res = await fetch(`${cfg.endpoint}/v1/models`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map((m: { id: string }) => m.id);
    }
  } catch {
    // Endpoint not reachable
  }
  return [];
}

/**
 * Check if the LLM endpoint is reachable.
 */
export async function checkLLMHealth(config?: Partial<LLMConfig>): Promise<boolean> {
  const cfg = { ...getLLMConfig(), ...config };
  try {
    if (cfg.provider === 'ollama') {
      const res = await fetch(`${cfg.endpoint}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    }
    const res = await fetch(`${cfg.endpoint}/v1/models`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Send a chat completion request (non-streaming).
 */
export async function chatCompletion(
  messages: ChatMessage[],
  config?: Partial<LLMConfig>
): Promise<LLMResponse> {
  const cfg = { ...getLLMConfig(), ...config };

  if (cfg.provider === 'ollama') {
    return ollamaChat(messages, cfg);
  }
  return openAICompatibleChat(messages, cfg);
}

/**
 * Send a streaming chat completion request.
 * Calls onToken for each chunk, returns full response when done.
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  config?: Partial<LLMConfig>
): Promise<LLMResponse> {
  const cfg = { ...getLLMConfig(), ...config };

  if (cfg.provider === 'ollama') {
    return ollamaChatStream(messages, onToken, cfg);
  }
  return openAICompatibleChatStream(messages, onToken, cfg);
}

// ============================================
// Ollama Provider
// ============================================

async function ollamaChat(messages: ChatMessage[], cfg: LLMConfig): Promise<LLMResponse> {
  const res = await fetch(`${cfg.endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: false,
      options: {
        temperature: cfg.temperature,
        num_predict: cfg.maxTokens,
      },
    }),
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Ollama model not found. Run `ollama pull llama3.2` (or another model) first, then retry.');
    }
    throw new Error(`Ollama error: ${res.status}`);
  }
  const data = await res.json();

  return {
    content: data.message?.content || '',
    done: true,
    model: data.model,
    tokensUsed: data.eval_count,
  };
}

async function ollamaChatStream(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  cfg: LLMConfig
): Promise<LLMResponse> {
  const res = await fetch(`${cfg.endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: true,
      options: {
        temperature: cfg.temperature,
        num_predict: cfg.maxTokens,
      },
    }),
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Ollama model not found. Run `ollama pull llama3.2` (or another model) first, then retry.');
    }
    throw new Error(`Ollama error: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullContent = '';
  let tokensUsed = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          fullContent += data.message.content;
          onToken(data.message.content);
        }
        if (data.eval_count) tokensUsed = data.eval_count;
      } catch { /* skip malformed lines */ }
    }
  }

  return { content: fullContent, done: true, model: cfg.model, tokensUsed };
}

// ============================================
// OpenAI-Compatible Provider (vLLM, etc.)
// ============================================

function buildHeaders(cfg: LLMConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.apiKey) {
    headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  }
  return headers;
}

async function openAICompatibleChat(messages: ChatMessage[], cfg: LLMConfig): Promise<LLMResponse> {
  const res = await fetch(`${cfg.endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(cfg),
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: cfg.temperature,
      max_tokens: cfg.maxTokens,
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`LLM error: ${res.status}`);
  const data = await res.json();

  return {
    content: data.choices?.[0]?.message?.content || '',
    done: true,
    model: data.model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function openAICompatibleChatStream(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  cfg: LLMConfig
): Promise<LLMResponse> {
  const res = await fetch(`${cfg.endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(cfg),
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: cfg.temperature,
      max_tokens: cfg.maxTokens,
      stream: true,
    }),
  });

  if (!res.ok) throw new Error(`LLM error: ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(l => l.trim() && l.startsWith('data: '));

    for (const line of lines) {
      const jsonStr = line.slice(6); // Remove "data: "
      if (jsonStr === '[DONE]') continue;
      try {
        const data = JSON.parse(jsonStr);
        const token = data.choices?.[0]?.delta?.content || '';
        if (token) {
          fullContent += token;
          onToken(token);
        }
      } catch { /* skip */ }
    }
  }

  return { content: fullContent, done: true, model: cfg.model };
}
