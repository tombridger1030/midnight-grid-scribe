import React, { useRef, useEffect } from 'react';

// Sound effects component for cyberpunk experience
// Note: This is a placeholder implementation - actual sound files would need to be added

interface SoundEffectsProps {
  enabled?: boolean;
}

const SoundEffects: React.FC<SoundEffectsProps> = ({ enabled = false }) => {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Initialize Web Audio API context
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    } catch (error) {
      console.log('Web Audio API not supported');
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [enabled]);

  // Generate synthetic beep sound
  const playBeep = (frequency: number = 440, duration: number = 200) => {
    if (!enabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  };

  // Generate typing sound
  const playTyping = () => {
    if (!enabled) return;
    const frequencies = [800, 900, 1000, 1100];
    const freq = frequencies[Math.floor(Math.random() * frequencies.length)];
    playBeep(freq, 50);
  };

  // Generate error sound
  const playError = () => {
    if (!enabled) return;
    playBeep(200, 300);
    setTimeout(() => playBeep(150, 300), 150);
  };

  // Generate success sound
  const playSuccess = () => {
    if (!enabled) return;
    playBeep(523, 200);  // C5
    setTimeout(() => playBeep(659, 200), 200);  // E5
    setTimeout(() => playBeep(784, 400), 400);  // G5
  };

  // Generate scanning sound
  const playScanning = () => {
    if (!enabled) return;
    let freq = 200;
    const interval = setInterval(() => {
      playBeep(freq, 100);
      freq += 50;
      if (freq > 800) {
        clearInterval(interval);
      }
    }, 100);
  };

  // Export functions to global scope for easy access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).cyberpunkSounds = {
        playBeep,
        playTyping,
        playError,
        playSuccess,
        playScanning,
        enabled
      };
    }
  }, [enabled]);

  return null; // This component doesn't render anything
};

export default SoundEffects;

// Helper function to play sounds from anywhere in the app
export const playSound = (type: 'beep' | 'typing' | 'error' | 'success' | 'scanning') => {
  if (typeof window !== 'undefined' && (window as any).cyberpunkSounds) {
    const sounds = (window as any).cyberpunkSounds;
    if (sounds.enabled) {
      switch (type) {
        case 'beep':
          sounds.playBeep();
          break;
        case 'typing':
          sounds.playTyping();
          break;
        case 'error':
          sounds.playError();
          break;
        case 'success':
          sounds.playSuccess();
          break;
        case 'scanning':
          sounds.playScanning();
          break;
      }
    }
  }
};