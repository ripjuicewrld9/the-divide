import { useCallback, useRef } from 'react';

/**
 * Hook to manage tick sound effects for reel spinning
 * Plays tick.wav from /sounds directory
 */
export function useTickSound() {
  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);

  const playTick = useCallback(() => {
    if (isPlayingRef.current) return; // Prevent overlapping sounds
    isPlayingRef.current = true;

    try {
      // Create audio element on first use
      if (!audioRef.current) {
        const audio = new Audio('/sounds/tick.wav');
        audio.volume = 0.3; // 30% volume
        audioRef.current = audio;
      }

      // Clone and play the audio
      const clonedAudio = audioRef.current.cloneNode();
      clonedAudio.volume = 0.3;
      clonedAudio.play().catch(err => {
        console.error('Error playing tick sound:', err);
      });

      // Reset flag after sound completes (tick should be short, ~100ms)
      setTimeout(() => {
        isPlayingRef.current = false;
      }, 100);
    } catch (err) {
      console.error('Error in tick sound setup:', err);
      isPlayingRef.current = false;
    }
  }, []);

  return { playTick };
}
