// ============================================
// Audio Manager — Sound effects for FabricPet
// ============================================

export type SoundType = 
  | 'feed' 
  | 'play' 
  | 'clean' 
  | 'sleep' 
  | 'treat'
  | 'levelup' 
  | 'evolve' 
  | 'battle_hit' 
  | 'battle_win' 
  | 'battle_lose'
  | 'achievement'
  | 'notification'
  | 'click'
  | 'error';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  ramp?: 'up' | 'down' | 'none';
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  feed: { frequency: 523.25, duration: 0.15, type: 'sine', volume: 0.3, ramp: 'up' },
  play: { frequency: 659.25, duration: 0.2, type: 'triangle', volume: 0.3, ramp: 'up' },
  clean: { frequency: 783.99, duration: 0.15, type: 'sine', volume: 0.25, ramp: 'down' },
  sleep: { frequency: 392.00, duration: 0.3, type: 'sine', volume: 0.2, ramp: 'down' },
  treat: { frequency: 880.00, duration: 0.1, type: 'triangle', volume: 0.3, ramp: 'up' },
  levelup: { frequency: 523.25, duration: 0.5, type: 'square', volume: 0.4, ramp: 'up' },
  evolve: { frequency: 392.00, duration: 0.8, type: 'sawtooth', volume: 0.5, ramp: 'up' },
  battle_hit: { frequency: 220.00, duration: 0.1, type: 'square', volume: 0.3, ramp: 'none' },
  battle_win: { frequency: 523.25, duration: 0.6, type: 'triangle', volume: 0.4, ramp: 'up' },
  battle_lose: { frequency: 196.00, duration: 0.5, type: 'sawtooth', volume: 0.3, ramp: 'down' },
  achievement: { frequency: 659.25, duration: 0.4, type: 'sine', volume: 0.4, ramp: 'up' },
  notification: { frequency: 440.00, duration: 0.15, type: 'sine', volume: 0.25, ramp: 'none' },
  click: { frequency: 800.00, duration: 0.05, type: 'square', volume: 0.15, ramp: 'none' },
  error: { frequency: 150.00, duration: 0.3, type: 'sawtooth', volume: 0.3, ramp: 'down' },
};

class AudioManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  private getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('[AudioManager] Web Audio API not supported');
        return null;
      }
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.volume;
  }

  play(sound: SoundType): void {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const config = SOUND_CONFIGS[sound];
    if (!config) return;

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = config.type;
      oscillator.frequency.value = config.frequency;

      const effectiveVolume = config.volume * this.volume;
      gainNode.gain.value = effectiveVolume;

      // Apply ramp
      if (config.ramp === 'up') {
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(effectiveVolume, ctx.currentTime + config.duration * 0.3);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + config.duration);
      } else if (config.ramp === 'down') {
        gainNode.gain.setValueAtTime(effectiveVolume, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + config.duration);
      } else {
        gainNode.gain.setValueAtTime(effectiveVolume, ctx.currentTime);
        gainNode.gain.setValueAtTime(0, ctx.currentTime + config.duration);
      }

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration);
    } catch (e) {
      console.warn('[AudioManager] Failed to play sound:', sound, e);
    }
  }

  // Play a sequence of sounds (for level up, etc.)
  playSequence(sounds: SoundType[], delay: number = 100): void {
    if (!this.enabled) return;

    sounds.forEach((sound, index) => {
      setTimeout(() => this.play(sound), index * delay);
    });
  }

  // Play a chord (multiple frequencies at once)
  playChord(frequencies: number[], duration: number = 0.3, volume: number = 0.3): void {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      frequencies.forEach(freq => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = freq;

        const effectiveVolume = volume * this.volume / frequencies.length;
        gainNode.gain.setValueAtTime(effectiveVolume, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
      });
    } catch (e) {
      console.warn('[AudioManager] Failed to play chord:', e);
    }
  }
}

// Singleton instance
let audioManagerInstance: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  return audioManagerInstance;
}

// Convenience function
export function playSound(sound: SoundType): void {
  getAudioManager().play(sound);
}