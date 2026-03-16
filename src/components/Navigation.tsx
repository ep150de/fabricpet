// ============================================
// Bottom Navigation Bar — Terminal Style
// ============================================

import { useStore } from '../store/useStore';
import type { AppView } from '../types';

const navItems: { view: AppView; emoji: string; label: string; cmd: string }[] = [
  { view: 'home', emoji: '🏠', label: 'Home', cmd: '_home' },
  { view: 'pet', emoji: '🐾', label: 'Pet', cmd: '_pet' },
  { view: 'chat', emoji: '💬', label: 'Chat', cmd: '_chat' },
  { view: 'battle', emoji: '⚔️', label: 'Battle', cmd: '_battle' },
  { view: 'social', emoji: '👥', label: 'Social', cmd: '_social' },
  { view: 'wallet', emoji: '💰', label: 'Wallet', cmd: '_wallet' },
];

export function Navigation() {
  const { currentView, setView } = useStore();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#00ffff33]" 
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'linear-gradient(to bottom, #0d0d0d, #0a0a0a)',
      }}
    >
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex flex-col items-center py-2 px-3 transition-all ${
                isActive
                  ? 'text-[#00ffff]'
                  : 'text-[#008888] hover:text-[#00cccc]'
              }`}
              style={isActive ? {
                textShadow: '0 0 5px #00ffff, 0 0 10px #00cccc',
              } : {}}
            >
              <span className="text-lg">{item.emoji}</span>
              <span className="text-xs mt-0.5 font-medium font-mono">
                {isActive ? `> ${item.label}` : item.label}
              </span>
              {isActive && (
                <span className="animate-terminal-blink text-[#00ffff]">_</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
