// ============================================
// Debug Logger — Gated console logging
// ============================================

const DEBUG = import.meta.env.DEV || localStorage.getItem('fabricpet_debug') === 'true';

export function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    console.log(...args);
  }
}

export function debugWarn(...args: unknown[]): void {
  if (DEBUG) {
    console.warn(...args);
  }
}

export function debugError(...args: unknown[]): void {
  // Always log errors
  console.error(...args);
}

export function isDebugEnabled(): boolean {
  return DEBUG;
}

export function setDebugEnabled(enabled: boolean): void {
  localStorage.setItem('fabricpet_debug', String(enabled));
}