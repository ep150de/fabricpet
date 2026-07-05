// ============================================
// Storage Adapter — IndexedDB with localStorage fallback
// ============================================
// Uses IndexedDB as primary storage (larger capacity, better performance)
// Falls back to localStorage if IndexedDB is unavailable
// ============================================

import { get, set, del, keys } from 'idb-keyval';

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * IndexedDB storage adapter using idb-keyval
 */
class IndexedDBAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await get(key);
      return value ?? null;
    } catch (error) {
      console.warn('[IndexedDB] Failed to get:', key, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await set(key, value);
    } catch (error) {
      console.warn('[IndexedDB] Failed to set:', key, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await del(key);
    } catch (error) {
      console.warn('[IndexedDB] Failed to remove:', key, error);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    try {
      return await keys();
    } catch (error) {
      console.warn('[IndexedDB] Failed to get keys:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      const allKeys = await keys();
      await Promise.all(allKeys.map(key => del(key)));
    } catch (error) {
      console.warn('[IndexedDB] Failed to clear:', error);
      throw error;
    }
  }
}

/**
 * localStorage adapter (fallback)
 */
class LocalStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn('[LocalStorage] Failed to get:', key, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('[LocalStorage] Failed to set:', key, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('[LocalStorage] Failed to remove:', key, error);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    return Object.keys(localStorage);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }
}

/**
 * Check if IndexedDB is available
 */
function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Create the appropriate storage adapter
 */
export function createStorageAdapter(): StorageAdapter {
  if (isIndexedDBAvailable()) {
    console.log('[Storage] Using IndexedDB');
    return new IndexedDBAdapter();
  } else {
    console.warn('[Storage] IndexedDB unavailable, falling back to localStorage');
    return new LocalStorageAdapter();
  }
}

// Singleton storage instance
let storageInstance: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    storageInstance = createStorageAdapter();
  }
  return storageInstance;
}
