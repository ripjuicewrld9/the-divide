/**
 * SOUND DESIGN SYSTEM
 * High-quality audio for case opens, reveals, particle effects
 * Optimized for mobile & desktop
 */

import React, { useEffect } from 'react';

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.sounds = new Map();
    this.masterVolume = 0.7;
    this.initialized = false;
  }

  /**
   * Initialize Web Audio API
   */
  async init() {
    if (this.initialized) return;
    
    try {
      const audioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new audioContext();
      this.initialized = true;
      console.log('[SoundManager] Initialized');
    } catch (err) {
      console.warn('[SoundManager] Web Audio API not available:', err);
    }
  }

  /**
   * Ensure audio context is running
   */
  ensureContext() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Create a simple synth sound
   * @param {number} frequency - Hz
   * @param {number} duration - ms
   * @param {string} waveform - 'sine', 'square', 'triangle', 'sawtooth'
   * @param {object} options - envelope options
   */
  async playTone(frequency = 440, duration = 200, waveform = 'sine', options = {}) {
    if (!this.audioContext) return;
    this.ensureContext();

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Waveform
    osc.type = waveform;
    osc.frequency.setValueAtTime(frequency, now);

    // Envelope: Attack, Decay, Sustain, Release
    const attack = (options.attack || 0) / 1000;
    const decay = (options.decay || 50) / 1000;
    const sustain = options.sustain || 0.3;
    const release = (options.release || 100) / 1000;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(options.volume || 0.3, now + attack);
    gain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    gain.gain.linearRampToValueAtTime(0, now + (duration / 1000) + release);

    osc.start(now);
    osc.stop(now + (duration / 1000) + release);
  }

  /**
   * Play a "woosh" sound (item flying in)
   */
  async playWoosh() {
    if (!this.audioContext) return;
    this.ensureContext();

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Sweep from high to low frequency
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Play a "ding" sound (item revealed)
   */
  async playDing() {
    await this.playTone(523, 100, 'sine', {
      attack: 10,
      decay: 80,
      sustain: 0,
      release: 50,
      volume: 0.4
    });
  }

  /**
   * Play a "success" chord (winner announced)
   */
  async playSuccess() {
    if (!this.audioContext) return;
    this.ensureContext();

    // C, E, G chord
    await Promise.all([
      this.playTone(261.63, 300, 'sine', { attack: 20, decay: 100, sustain: 0.2, release: 150, volume: 0.25 }),
      this.playTone(329.63, 300, 'sine', { attack: 20, decay: 100, sustain: 0.2, release: 150, volume: 0.25 }),
      this.playTone(392, 300, 'sine', { attack: 20, decay: 100, sustain: 0.2, release: 150, volume: 0.25 })
    ]);
  }

  /**
   * Play an "epic drop" sound (legendary item)
   */
  async playEpicDrop() {
    if (!this.audioContext) return;
    this.ensureContext();

    // Bass hit
    await this.playTone(110, 150, 'sine', {
      attack: 0,
      decay: 100,
      sustain: 0,
      release: 50,
      volume: 0.6
    });

    // High note
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.playTone(523, 200, 'square', {
      attack: 10,
      decay: 150,
      sustain: 0,
      release: 50,
      volume: 0.4
    });
  }

  /**
   * Play a "level up" sound (multi-note ascending)
   */
  async playLevelUp() {
    const notes = [261.63, 329.63, 392, 523.25]; // C, E, G, C
    for (let i = 0; i < notes.length; i++) {
      this.playTone(notes[i], 100, 'sine', {
        attack: 5,
        decay: 70,
        sustain: 0,
        release: 25,
        volume: 0.3
      });
      await new Promise(resolve => setTimeout(resolve, 120));
    }
  }

  /**
   * Play a case lock click
   */
  async playLockClick() {
    await this.playTone(400, 50, 'square', {
      attack: 0,
      decay: 40,
      sustain: 0,
      release: 10,
      volume: 0.25
    });
  }

  /**
   * Play case spin loop (looping background sound)
   */
  async playSpinLoop(duration = 2000) {
    if (!this.audioContext) return;
    this.ensureContext();

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(100, now);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + (duration / 1000));

    osc.start(now);
    osc.stop(now + (duration / 1000));
  }

  /**
   * Play particle burst sound (explosion/sparkle)
   */
  async playParticleBurst() {
    if (!this.audioContext) return;
    this.ensureContext();

    // Create 3-5 quick clicks
    for (let i = 0; i < 4; i++) {
      const frequency = 200 + Math.random() * 400;
      await new Promise(resolve => setTimeout(resolve, 30));
      this.playTone(frequency, 50, 'triangle', {
        attack: 0,
        decay: 40,
        sustain: 0,
        release: 10,
        volume: 0.2
      });
    }
  }

  /**
   * Play rarity-based glow sound
   */
  async playRarityGlow(rarity) {
    switch (rarity) {
      case 'common':
        await this.playDing();
        break;
      case 'uncommon':
        await this.playTone(440, 150, 'sine', { volume: 0.3 });
        break;
      case 'rare':
        await this.playTone(523, 200, 'sine', { volume: 0.35 });
        break;
      case 'epic':
        await this.playEpicDrop();
        break;
      case 'legendary':
        await this.playSuccess();
        break;
    }
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Play notification sound
   */
  async playNotification() {
    await this.playTone(880, 100, 'sine', { volume: 0.3 });
  }
}

const soundManager = new SoundManager();

/**
 * Hook to use sound manager with component
 */
const useSoundManager = () => {
  useEffect(() => {
    soundManager.init();
  }, []);

  return soundManager;
};

/**
 * SoundToggle Component
 */
export const SoundToggle = () => {
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  const handleToggle = () => {
    setSoundEnabled(!soundEnabled);
    soundManager.masterVolume = !soundEnabled ? 0.7 : 0;
  };

  return (
    <button
      onClick={handleToggle}
      className="glass-surface"
      style={{
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }}
    >
      {soundEnabled ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" /><path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" /></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" /></svg>
      )}
    </button>
  );
};

export { soundManager, useSoundManager };
