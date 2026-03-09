// ============================================
// Sound Manager — Web Audio API for pet interactions
// ============================================

type SoundType =
  | 'feed' | 'play' | 'clean' | 'sleep'
  | 'levelUp' | 'evolve' | 'battleStart' | 'attack'
  | 'hit' | 'heal' | 'victory' | 'defeat'
  | 'click' | 'notification' | 'petHappy' | 'petSad';

let audioCtx: AudioContext | null = null;
let muted = false;
let volume = 0.3;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a synthesized sound effect using Web Audio API.
 * No external audio files needed — all sounds are procedurally generated!
 */
export function playSound(type: SoundType): void {
  if (muted) return;

  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    switch (type) {
      case 'feed':
        playTone(ctx, 440, 0.1, 'sine', now);
        playTone(ctx, 554, 0.1, 'sine', now + 0.1);
        playTone(ctx, 659, 0.15, 'sine', now + 0.2);
        break;

      case 'play':
        playTone(ctx, 523, 0.08, 'square', now);
        playTone(ctx, 659, 0.08, 'square', now + 0.08);
        playTone(ctx, 784, 0.08, 'square', now + 0.16);
        playTone(ctx, 1047, 0.12, 'square', now + 0.24);
        break;

      case 'clean':
        for (let i = 0; i < 5; i++) {
          playNoise(ctx, 0.03, now + i * 0.06);
        }
        break;

      case 'sleep':
        playTone(ctx, 330, 0.3, 'sine', now);
        playTone(ctx, 262, 0.4, 'sine', now + 0.3);
        break;

      case 'levelUp':
        [523, 659, 784, 1047].forEach((freq, i) => {
          playTone(ctx, freq, 0.15, 'square', now + i * 0.12);
        });
        break;

      case 'evolve':
        [262, 330, 392, 523, 659, 784, 1047].forEach((freq, i) => {
          playTone(ctx, freq, 0.2, 'sawtooth', now + i * 0.1);
        });
        break;

      case 'battleStart':
        playTone(ctx, 220, 0.15, 'sawtooth', now);
        playTone(ctx, 330, 0.15, 'sawtooth', now + 0.15);
        playTone(ctx, 440, 0.2, 'sawtooth', now + 0.3);
        break;

      case 'attack':
        playNoise(ctx, 0.1, now);
        playTone(ctx, 200, 0.05, 'sawtooth', now);
        playTone(ctx, 100, 0.1, 'sawtooth', now + 0.05);
        break;

      case 'hit':
        playNoise(ctx, 0.08, now);
        playTone(ctx, 150, 0.08, 'square', now);
        break;

      case 'heal':
        playTone(ctx, 523, 0.1, 'sine', now);
        playTone(ctx, 784, 0.15, 'sine', now + 0.1);
        break;

      case 'victory':
        [523, 659, 784, 1047, 1319].forEach((freq, i) => {
          playTone(ctx, freq, 0.2, 'square', now + i * 0.15);
        });
        break;

      case 'defeat':
        [440, 370, 311, 262].forEach((freq, i) => {
          playTone(ctx, freq, 0.25, 'sine', now + i * 0.2);
        });
        break;

      case 'click':
        playTone(ctx, 800, 0.03, 'sine', now);
        break;

      case 'notification':
        playTone(ctx, 880, 0.08, 'sine', now);
        playTone(ctx, 1100, 0.1, 'sine', now + 0.1);
        break;

      case 'petHappy':
        playTone(ctx, 600, 0.08, 'sine', now);
        playTone(ctx, 800, 0.08, 'sine', now + 0.1);
        playTone(ctx, 600, 0.08, 'sine', now + 0.2);
        break;

      case 'petSad':
        playTone(ctx, 400, 0.15, 'sine', now);
        playTone(ctx, 350, 0.2, 'sine', now + 0.15);
        break;
    }
  } catch {
    // Audio not available
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType,
  startTime: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume * 0.3, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

function playNoise(ctx: AudioContext, duration: number, startTime: number): void {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();

  source.buffer = buffer;
  gain.gain.setValueAtTime(volume * 0.2, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  source.connect(gain);
  gain.connect(ctx.destination);

  source.start(startTime);
}

export function setMuted(m: boolean): void {
  muted = m;
}

export function isMuted(): boolean {
  return muted;
}

export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
}

export function getVolume(): number {
  return volume;
}
