// ============================================
// Offline Indicator — Shows connection status
// ============================================

import { useState, useEffect } from 'react';
import { isOnline, hasPendingEvents, processSyncQueue } from '../store/offlineSync';

export function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const updateOnline = () => setOnline(isOnline());
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    // Check pending events periodically
    const checkPending = async () => {
      const count = await hasPendingEvents();
      setPendingCount(count ? 1 : 0); // Simplified for now
    };
    checkPending();
    const interval = setInterval(checkPending, 10000);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      clearInterval(interval);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (online && pendingCount > 0) {
      setSyncing(true);
      // Process queue with a dummy processor (actual implementation would use real sync)
      processSyncQueue(async () => true).then(() => {
        setSyncing(false);
        setPendingCount(0);
      });
    }
  }, [online, pendingCount]);

  if (online && pendingCount === 0 && !syncing) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-[80] px-4 py-2 text-center text-sm font-semibold ${
      online
        ? syncing
          ? 'bg-blue-500/90 text-white'
          : 'bg-green-500/90 text-white'
        : 'bg-red-500/90 text-white'
    }`}>
      {!online ? (
        <span>📡 You're offline. Changes will sync when connected.</span>
      ) : syncing ? (
        <span>🔄 Syncing pending changes...</span>
      ) : pendingCount > 0 ? (
        <span>⏳ {pendingCount} pending changes to sync</span>
      ) : null}
    </div>
  );
}
