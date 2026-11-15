// ============================================
// Bottom Navigation Bar — Two-Tier System
// ============================================
// Primary: Home, Pet, Chat, Battle, Social (5 items)
// Secondary: Wallet, Style, Multiplayer, Spectator (via "More" menu)

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import type { AppView } from '../types';
import { MoreMenu } from './MoreMenu';

const primaryNavItems: { view: AppView; emoji: string; key: string }[] = [
  { view: 'home', emoji: '🏠', key: 'nav.home' },
  { view: 'pet', emoji: '🐾', key: 'nav.pet' },
  { view: 'chat', emoji: '💬', key: 'nav.chat' },
  { view: 'battle', emoji: '⚔️', key: 'nav.battle' },
  { view: 'social', emoji: '👥', key: 'nav.social' },
];

const secondaryViews: AppView[] = ['wallet', 'accessories', 'multiplayer', 'spectator'];

export function Navigation() {
  const { t } = useTranslation();
  const { currentView, setView } = useStore();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const isSecondaryActive = secondaryViews.includes(currentView);

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#00ffff33]" 
        style={{ 
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'linear-gradient(to bottom, #0d0d0d, #0a0a0a)',
        }}
      >
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {primaryNavItems.map((item) => {
            const isActive = currentView === item.view;
            const label = t(item.key);
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`flex flex-col items-center py-2 px-3 transition-all ${
                  isActive
                    ? 'text-[#00ffff]'
                    : 'text-[#008800] hover:text-[#00cccc]'
                }`}
                style={isActive ? {
                  textShadow: '0 0 5px #00ffff, 0 0 10px #00cccc',
                } : {}}
              >
                <span className="text-lg">{item.emoji}</span>
                <span className="text-xs mt-0.5 font-medium font-mono">
                  {isActive ? `> ${label}` : label}
                </span>
                {isActive && (
                  <span className="animate-terminal-blink text-[#00ffff]">_</span>
                )}
              </button>
            );
          })}
          
          {/* More Button */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={`flex flex-col items-center py-2 px-3 transition-all ${
              isSecondaryActive
                ? 'text-[#00ffff]'
                : 'text-[#008800] hover:text-[#00cccc]'
            }`}
            style={isSecondaryActive ? {
              textShadow: '0 0 5px #00ffff, 0 0 10px #00cccc',
            } : {}}
          >
            <span className="text-lg">⋯</span>
            <span className="text-xs mt-0.5 font-medium font-mono">
              {isSecondaryActive ? '> More' : 'More'}
            </span>
            {isSecondaryActive && (
              <span className="animate-terminal-blink text-[#00ffff]">_</span>
            )}
          </button>
        </div>
      </nav>
      
      <MoreMenu isOpen={isMoreMenuOpen} onClose={() => setIsMoreMenuOpen(false)} />
    </>
  );
}