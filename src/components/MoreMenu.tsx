// ============================================
// More Menu — Bottom sheet for secondary navigation
// ============================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import type { AppView } from '../types';

interface MoreMenuItem {
  view: AppView;
  emoji: string;
  key: string;
  description: string;
}

const moreMenuItems: MoreMenuItem[] = [
  { view: 'wallet', emoji: '💰', key: 'nav.wallet', description: 'Bitcoin wallet & ordinals' },
  { view: 'accessories', emoji: '🎨', key: 'nav.accessories', description: 'Pet cosmetics & styles' },
  { view: 'pet-customizer', emoji: '🖌️', key: 'nav.customizer', description: 'Customize pet colors & patterns' },
  { view: 'trade', emoji: '🤝', key: 'nav.trade', description: 'Trade pets with players' },
  { view: 'multiplayer', emoji: '🔗', key: 'nav.multiplayer', description: 'WebRTC peer connections' },
  { view: 'spectator', emoji: '👁️', key: 'nav.spectator', description: 'Watch live battles' },
];

export function MoreMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { currentView, setView } = useStore();

  if (!isOpen) return null;

  const handleNavigate = (view: AppView) => {
    setView(view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="relative w-full max-w-lg bg-[#0d0d0d] border-t border-[#00ffff33] rounded-t-2xl p-4 pb-8 animate-slide-up">
        {/* Handle */}
        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">More</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {moreMenuItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => handleNavigate(item.view)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#00ffff11] border border-[#00ffff33]'
                    : 'bg-[#1a1a2e] border border-gray-800 hover:border-gray-700'
                }`}
              >
                <span className="text-2xl">{item.emoji}</span>
                <div className="flex-1 text-left">
                  <div className={`font-semibold ${isActive ? 'text-[#00ffff]' : 'text-white'}`}>
                    {t(item.key)}
                  </div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
                {isActive && (
                  <span className="text-[#00ffff] text-xs">Active</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
