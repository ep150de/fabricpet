// ============================================
// Notification Toast
// ============================================

import { useEffect } from 'react';
import { useStore } from '../store/useStore';

interface NotificationProps {
  message: string;
  emoji: string;
}

export function Notification({ message, emoji }: NotificationProps) {
  const { setNotification } = useStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setNotification(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [setNotification]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce-pet">
      <div className="bg-[#1a1a2e] border border-indigo-500/50 rounded-xl px-6 py-3 shadow-lg shadow-indigo-500/20">
        <span className="text-xl mr-2">{emoji}</span>
        <span className="text-white font-medium">{message}</span>
      </div>
    </div>
  );
}
