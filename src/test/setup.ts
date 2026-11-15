// ============================================
// Test Setup — Vitest configuration
// ============================================

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock IndexedDB
const indexedDBMock = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  cmp: vi.fn(),
};
Object.defineProperty(window, 'indexedDB', { value: indexedDBMock });

// Mock crypto.subtle
if (!window.crypto) {
  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      subtle: {
        digest: vi.fn(),
        encrypt: vi.fn(),
        decrypt: vi.fn(),
        importKey: vi.fn(),
        deriveKey: vi.fn(),
      },
    },
  });
}

// Mock navigator.xr
Object.defineProperty(navigator, 'xr', {
  value: {
    isSessionSupported: vi.fn().mockResolvedValue(false),
    requestSession: vi.fn(),
  },
  writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Suppress console warnings in tests
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});