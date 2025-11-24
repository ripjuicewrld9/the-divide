import { useCallback, useRef } from 'react';

/**
 * Hook to manage gold sound effects for gold spin wins
 * Plays gold.wav from /sounds directory
 */
export function useGoldSound() {
  const audioRef = useRef(null);

  const playGold = useCallback(() => {
    try {
      // Create audio element on first use
      if (!audioRef.current) {
        const audio = new Audio('/sounds/gold.wav');
        audio.volume = 0.5; // 50% volume
        audioRef.current = audio;
      }

      // Clone and play the audio
      const clonedAudio = audioRef.current.cloneNode();
      clonedAudio.volume = 0.5;
      clonedAudio.play().catch(err => {
        console.error('Error playing gold sound:', err);
      });
    } catch (err) {
      console.error('Error in gold sound setup:', err);
    }
  }, []);

  return { playGold };
}
