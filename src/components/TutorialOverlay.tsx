// ============================================
// Tutorial Overlay — Onboarding for new users
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  emoji: string;
  targetView?: string;
  highlight?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to FabricPet! 🎉',
    description: 'Your digital pet companion is now alive! Let\'s learn how to take care of your new friend.',
    emoji: '🐾',
  },
  {
    id: 'pet-care',
    title: 'Pet Care Basics',
    description: 'Your pet has needs: Hunger, Happiness, Energy, and Hygiene. Feed, play, clean, and let them sleep to keep them happy!',
    emoji: '🍽️',
    targetView: 'pet',
    highlight: 'needs',
  },
  {
    id: 'leveling',
    title: 'Level Up & Evolve',
    description: 'Interact with your pet to gain XP. As your pet levels up, it will evolve into new stages and unlock new abilities!',
    emoji: '⭐',
    targetView: 'pet',
  },
  {
    id: 'battles',
    title: 'Battle System',
    description: 'Challenge other pets in turn-based battles! Use different moves and strategies to win. Battles earn XP and rewards.',
    emoji: '⚔️',
    targetView: 'battle',
  },
  {
    id: 'social',
    title: 'Social Features',
    description: 'Visit other players\' pets, sign guestbooks, and climb the leaderboard! Use QR codes to meet in real life.',
    emoji: '👥',
    targetView: 'social',
  },
  {
    id: 'wallet',
    title: 'Bitcoin Ordinals',
    description: 'Connect a Bitcoin wallet to equip Ordinal inscriptions as pet skins. They boost battle stats!',
    emoji: '₿',
    targetView: 'wallet',
  },
  {
    id: 'accessories',
    title: 'Accessories',
    description: 'Customize your pet with hats, capes, and more! Accessories provide stat bonuses and unlock as you level up.',
    emoji: '🎨',
    targetView: 'accessories',
  },
  {
    id: 'done',
    title: 'You\'re Ready! 🚀',
    description: 'That\'s everything you need to know! Have fun with your pet in the metaverse. You can always revisit this tutorial from settings.',
    emoji: '🎉',
  },
];

const TUTORIAL_STORAGE_KEY = 'fabricpet_tutorial_completed';

export function isTutorialCompleted(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markTutorialCompleted(): void {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  } catch (e) {
    console.warn('[Tutorial] Failed to mark as completed:', e);
  }
}

export function resetTutorial(): void {
  try {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  } catch (e) {
    console.warn('[Tutorial] Failed to reset:', e);
  }
}

interface TutorialOverlayProps {
  onComplete: () => void;
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const { t } = useTranslation();
  const { currentView, setView, setNotification } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  useEffect(() => {
    if (step.targetView && step.targetView !== currentView) {
      setView(step.targetView as any);
    }
  }, [step, currentView, setView]);

  const handleNext = () => {
    if (isLastStep) {
      markTutorialCompleted();
      setIsVisible(false);
      onComplete();
      setNotification({ message: 'Tutorial complete! Have fun! 🎉', emoji: '🎉' });
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    markTutorialCompleted();
    setIsVisible(false);
    onComplete();
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Tutorial Card */}
      <div className="relative bg-[#0d0d0d] border border-[#00ffff33] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        {/* Progress Bar */}
        <div className="w-full bg-[#1a1a2e] rounded-full h-1.5 mb-4">
          <div
            className="bg-gradient-to-r from-[#00ffff] to-[#00cccc] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Counter */}
        <div className="text-xs text-gray-500 mb-2">
          Step {currentStep + 1} of {TUTORIAL_STEPS.length}
        </div>

        {/* Emoji */}
        <div className="text-6xl text-center mb-4 animate-bounce-pet">
          {step.emoji}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center mb-3">
          {step.title}
        </h2>

        {/* Description */}
        <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
          {step.description}
        </p>

        {/* Navigation Buttons */}
        <div className="flex gap-2">
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              className="flex-1 bg-[#1a1a2e] border border-gray-700 text-gray-300 font-semibold py-2 rounded-lg text-sm hover:border-gray-600 transition-all"
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 bg-gradient-to-r from-[#00ffff] to-[#00cccc] text-black font-semibold py-2 rounded-lg text-sm hover:from-[#00cccc] hover:to-[#00ffff] transition-all"
          >
            {isLastStep ? 'Done! 🎉' : 'Next →'}
          </button>
        </div>

        {/* Skip Button */}
        {!isLastStep && (
          <button
            onClick={handleSkip}
            className="w-full mt-3 text-gray-500 text-xs hover:text-gray-400 transition-all"
          >
            Skip Tutorial
          </button>
        )}
      </div>
    </div>
  );
}
