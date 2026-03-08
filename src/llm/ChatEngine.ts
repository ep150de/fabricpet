// ============================================
// Chat Engine — Manages conversation with pet LLM agent
// ============================================
// Handles conversation history, system prompt injection,
// streaming responses, and localStorage persistence.
// ============================================

import type { Pet } from '../types';
import type { ChatMessage } from './LLMProvider';
import { chatCompletionStream, checkLLMHealth } from './LLMProvider';
import { generateSystemPrompt, generateGreeting } from './PersonalitySystem';

export interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const STORAGE_KEY = 'fabricpet_chat_history';
const MAX_HISTORY = 50; // Keep last 50 messages
const CONTEXT_WINDOW = 10; // Send last 10 messages to LLM

/**
 * Load chat history from localStorage.
 */
export function loadChatHistory(): ChatEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatEntry[];
  } catch {
    return [];
  }
}

/**
 * Save chat history to localStorage.
 */
export function saveChatHistory(history: ChatEntry[]): void {
  try {
    // Keep only the last MAX_HISTORY messages
    const trimmed = history.slice(-MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

/**
 * Clear chat history.
 */
export function clearChatHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Generate a unique message ID.
 */
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Build the messages array for the LLM, including system prompt and recent history.
 */
function buildMessages(pet: Pet, history: ChatEntry[], userMessage: string): ChatMessage[] {
  const systemPrompt = generateSystemPrompt(pet);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add recent conversation history for context
  const recentHistory = history.slice(-CONTEXT_WINDOW);
  for (const entry of recentHistory) {
    messages.push({
      role: entry.role,
      content: entry.content,
    });
  }

  // Add the new user message
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/**
 * Send a message to the pet and get a streaming response.
 * Returns the full response when complete.
 */
export async function sendMessage(
  pet: Pet,
  userMessage: string,
  history: ChatEntry[],
  onToken: (token: string) => void
): Promise<{ userEntry: ChatEntry; assistantEntry: ChatEntry }> {
  const messages = buildMessages(pet, history, userMessage);

  const userEntry: ChatEntry = {
    id: generateId(),
    role: 'user',
    content: userMessage,
    timestamp: Date.now(),
  };

  const response = await chatCompletionStream(messages, onToken);

  const assistantEntry: ChatEntry = {
    id: generateId(),
    role: 'assistant',
    content: response.content,
    timestamp: Date.now(),
  };

  return { userEntry, assistantEntry };
}

/**
 * Get an initial greeting from the pet (no LLM needed).
 */
export function getGreeting(pet: Pet): ChatEntry {
  return {
    id: generateId(),
    role: 'assistant',
    content: generateGreeting(pet),
    timestamp: Date.now(),
  };
}

/**
 * Check if the LLM is available and ready.
 */
export async function isLLMReady(): Promise<boolean> {
  return checkLLMHealth();
}
