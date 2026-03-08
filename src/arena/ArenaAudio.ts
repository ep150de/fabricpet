/**
 * Arena Audio
 * 
 * Manages spatial audio for the arena, including battle sounds,
 * ambient biome audio, and the materialization/collapse sequences.
 * Integrates with RP1's spatial audio zones.
 */

import * as THREE from 'three';
import type { AudioEvent, AudioConfig, BiomeDefinition } from '../types/arenaTypes';

export interface AudioZone {
  name: string;
  type: 'enclosed' | 'open';
  reverb: number;
  rolloff: number;
}

export class ArenaAudio {
  private listener: THREE.AudioListener;
  private sounds: Map<AudioEvent, THREE.Audio | THREE.PositionalAudio> = new Map();
  private ambientSound: THREE.Audio | null = null;
  private config: AudioConfig;
  private audioContext: AudioContext | null = null;
  private isInitialized: boolean = false;

  constructor(camera: THREE.Camera, config?: Partial<AudioConfig>) {
    this.config = {
      masterVolume: 0.8,
      sfxVolume: 1.0,
      ambientVolume: 0.4,
      spatialRolloff: 1.0,
      maxAudioDistance: 50,
      ...config,
    };

    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.audioContext = this.listener.context;
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isInitialized = true;
  }

  /**
   * Play a sound effect
   */
  playSFX(event: AudioEvent, position?: THREE.Vector3): void {
    if (!this.isInitialized) return;

    // In production, load actual audio files
    // For now, create placeholder oscillator-based sounds
    const sound = this.createPlaceholderSound(event, position);
    if (sound) {
      sound.play();
    }
  }

  /**
   * Start ambient biome audio
   */
  startAmbient(biome: BiomeDefinition): void {
    if (!this.isInitialized) return;

    this.stopAmbient();

    // Create ambient sound (placeholder)
    this.ambientSound = new THREE.Audio(this.listener);
    const oscillator = this.listener.context.createOscillator();
    const gainNode = this.listener.context.createGain();

    // Different ambient tones per biome
    const biomeFrequencies: Record<string, number> = {
      cyber_grid: 80,
      volcanic_forge: 60,
      deep_ocean: 100,
      crystal_cavern: 120,
      void_nexus: 40,
      sky_temple: 150,
      overgrown_ruins: 90,
    };

    oscillator.frequency.value = biomeFrequencies[biome.id] || 80;
    oscillator.type = 'sine';
    gainNode.gain.value = this.config.ambientVolume * this.config.masterVolume * 0.1;

    oscillator.connect(gainNode);
    // Note: In production, connect to the audio listener's context destination
    // and load actual ambient audio files

    console.log(`[ArenaAudio] Started ambient: ${biome.ambientSound}`);
  }

  /**
   * Stop ambient audio
   */
  stopAmbient(): void {
    if (this.ambientSound) {
      if (this.ambientSound.isPlaying) {
        this.ambientSound.stop();
      }
      this.ambientSound = null;
    }
  }

  /**
   * Play the arena materialization sound sequence
   */
  playMaterializationSequence(progress: number): void {
    // Trigger sounds at specific progress points
    if (progress < 0.05) {
      this.playSFX('arena_materialize');
    }
  }

  /**
   * Play the arena collapse sound sequence
   */
  playCollapseSequence(progress: number): void {
    if (progress < 0.05) {
      this.playSFX('arena_collapse');
    }
  }

  /**
   * Play battle move sound
   */
  playMoveSound(elementType: string, position?: THREE.Vector3): void {
    const event = `move_${elementType}` as AudioEvent;
    this.playSFX(event, position);
  }

  /**
   * Play hit sound
   */
  playHitSound(
    isCritical: boolean,
    isSuperEffective: boolean,
    position?: THREE.Vector3
  ): void {
    if (isCritical) {
      this.playSFX('hit_critical', position);
    } else if (isSuperEffective) {
      this.playSFX('hit_super_effective', position);
    } else {
      this.playSFX('hit_normal', position);
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    this.listener.setMasterVolume(this.config.masterVolume);
  }

  /**
   * Create a placeholder sound (oscillator-based)
   * In production, replace with actual audio file loading
   */
  private createPlaceholderSound(
    event: AudioEvent,
    position?: THREE.Vector3
  ): THREE.Audio | null {
    if (!this.audioContext) return null;

    const sound = new THREE.Audio(this.listener);

    // Map events to simple oscillator configs
    const soundConfigs: Partial<Record<AudioEvent, { freq: number; duration: number; type: OscillatorType }>> = {
      ball_throw: { freq: 400, duration: 0.3, type: 'sine' },
      ball_open: { freq: 800, duration: 0.5, type: 'triangle' },
      arena_materialize: { freq: 200, duration: 2.0, type: 'sawtooth' },
      arena_collapse: { freq: 150, duration: 1.5, type: 'sawtooth' },
      pet_emerge: { freq: 600, duration: 1.0, type: 'triangle' },
      pet_recall: { freq: 500, duration: 0.8, type: 'triangle' },
      hit_normal: { freq: 300, duration: 0.2, type: 'square' },
      hit_critical: { freq: 500, duration: 0.3, type: 'square' },
      hit_super_effective: { freq: 700, duration: 0.4, type: 'square' },
      victory_fanfare: { freq: 523, duration: 2.0, type: 'triangle' },
      crowd_cheer: { freq: 250, duration: 1.5, type: 'sawtooth' },
    };

    const config = soundConfigs[event];
    if (!config) return null;

    // Create oscillator buffer (simplified)
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * config.duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3); // Decay envelope
      data[i] = Math.sin(2 * Math.PI * config.freq * t) * envelope * 0.3;
    }

    sound.setBuffer(buffer);
    sound.setVolume(this.config.sfxVolume * this.config.masterVolume);

    return sound;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stopAmbient();
    this.sounds.forEach((sound) => {
      if (sound.isPlaying) sound.stop();
    });
    this.sounds.clear();
  }
}
