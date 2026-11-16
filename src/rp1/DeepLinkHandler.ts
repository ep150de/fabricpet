// ============================================
// Deep Link Handler — RP1 ↔ FabricPet URL routing
// ============================================

import type { AppView } from '../types';

export interface DeepLinkAction {
  view: AppView;
  params: Record<string, string>;
}

/**
 * Parse URL parameters for deep link actions.
 * 
 * Supported deep links:
 * - ?rp1_action=visit&pubkey=<hex>     → Open Social > Visit tab with pubkey pre-filled
 * - ?rp1_action=battle&challenger=<hex> → Open Battle with challenger info
 * - ?rp1_action=arena                  → Open Battle > Arena tab
 * - ?rp1_action=ar                     → Open AR mode
 * - ?rp1_action=chat                   → Open Chat
 * - ?view=<viewname>                   → Navigate to any view
 */
// Validate hex pubkey or npub format
function isValidPubkey(input: string): boolean {
  if (!input) return true; // Empty is OK (will be handled later)
  // Hex pubkey (64 chars)
  if (/^[0-9a-fA-F]{64}$/.test(input)) return true;
  // npub format
  if (input.startsWith('npub1') && input.length >= 58) return true;
  return false;
}

export function parseDeepLink(url: string = window.location.href): DeepLinkAction | null {
  try {
    const params = new URL(url).searchParams;

    // RP1 action deep links
    const rp1Action = params.get('rp1_action');
    if (rp1Action) {
      switch (rp1Action) {
        case 'visit': {
          const pubkey = params.get('pubkey') || '';
          if (pubkey && !isValidPubkey(pubkey)) {
            console.warn('[DeepLink] Invalid pubkey in deep link');
            return null;
          }
          return {
            view: 'social',
            params: { tab: 'visit', pubkey },
          };
        }
        case 'battle': {
          const challenger = params.get('challenger') || '';
          if (challenger && !isValidPubkey(challenger)) {
            console.warn('[DeepLink] Invalid challenger in deep link');
            return null;
          }
          return {
            view: 'battle',
            params: { challenger },
          };
        }
        case 'arena':
          return {
            view: 'battle',
            params: { mode: 'arena' },
          };
        case 'ar':
          return {
            view: 'ar',
            params: {},
          };
        case 'chat':
          return {
            view: 'chat',
            params: {},
          };
      }
    }

    // Generic view navigation
    const view = params.get('view');
    if (view) {
      const validViews: AppView[] = ['home', 'pet', 'battle', 'arena', 'social', 'wallet', 'chat', 'ar', 'avatars', 'settings'];
      if (validViews.includes(view as AppView)) {
        return { view: view as AppView, params: {} };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a deep link URL for sharing.
 */
export function generateDeepLink(action: string, params: Record<string, string> = {}): string {
  const base = window.location.origin + window.location.pathname;
  const searchParams = new URLSearchParams({ rp1_action: action, ...params });
  return `${base}?${searchParams.toString()}`;
}

/**
 * Generate the RP1 fabric entry URL with FabricPet scene loaded.
 */
export function generateRP1EntryUrl(fabricUrl: string, petName?: string): string {
  const url = new URL(fabricUrl);
  if (petName) {
    url.searchParams.set('pet', petName);
  }
  return url.toString();
}

/**
 * Clean up URL after processing deep link (remove params without reload).
 */
export function clearDeepLinkParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('rp1_action');
  url.searchParams.delete('pubkey');
  url.searchParams.delete('challenger');
  url.searchParams.delete('mode');
  url.searchParams.delete('view');
  window.history.replaceState({}, '', url.pathname);
}
