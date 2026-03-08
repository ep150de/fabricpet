// ============================================
// Bottom Navigation Bar
// ============================================

import { useStore } from '../store/useStore';
import type { AppView } from '../types';

const navItems: { view: AppView; emoji: string; label: string }[] = [
  { view: 'home', emoji: '🏠', label: 'Home' },
  { view: 'pet', emoji: '🐾', label: 'Pet' },
  { view: 'chat', emoji: '💬', label: 'Chat' },
  { view: 'battle', emoji: '⚔️', label: 'Battle' },
  { view: 'social', emoji: '👥', label: 'Social' },
  { view: 'wallet', emoji: '💰', label: 'Wallet' },
];

export function Navigation() {
  const { currentView, setView } = useStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e] border-t border-gray-800 px-2 py-1 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-all ${
              currentView === item.view
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-xl">{item.emoji}</span>
            <span className="text-xs mt-0.5 font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
