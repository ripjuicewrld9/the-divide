import { useState, useEffect, useRef, useCallback } from 'react';
import { Rows } from '../lib/paytable';

export interface Ball {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  vx: number;
  vy: number;
  rotation: number;
}

interface UsePlinkoPhysicsOptions {
  onFinish?: (slot: number) => void;
}

const GRAVITY = 0.0001;
const DAMPING = 0.999;
const BOUNCE = 0.8;
const PEG_RADIUS = 0.02;

export const usePlinkoPhysics = (rows: Rows, options: UsePlinkoPhysicsOptions = {}) => {
  const [ball, setBall] = useState<Ball | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const slotCount = rows + 1;

  // Generate pegs using exact positioning (must match PlinkoBoard)
  // Stake.com style: 1, 3, 5, 7, 9... pegs per row
  const pegs: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) {
    const pegsInRow = r === 0 ? 1 : 3 + r * 2; // 1, 3, 5, 7...
    const rowY = (r / (rows - 1)) * 0.8; // Top 80%
    const pegSpacing = 0.02; // Fixed spacing
    const rowStartX = 0.5 - (pegsInRow * pegSpacing) / 2; // Center
    for (let c = 0; c < pegsInRow; c++) {
      const pegX = rowStartX + c * pegSpacing;
      pegs.push({ x: pegX, y: rowY });
    }
  }

  const drop = useCallback(() => {
    setBall({
      x: 0.5,
      y: 0.05,
      vx: (Math.random() - 0.5) * 0.0003,
      vy: 0,
      rotation: 0,
    });
  }, []);

  // Physics loop
  useEffect(() => {
    if (!ball) return;

    const animate = () => {
      setBall((prevBall) => {
        if (!prevBall) return null;

        let updated = { ...prevBall };

        // Apply gravity
        updated.vy += GRAVITY;

        // Apply damping
        updated.vx *= DAMPING;
        updated.vy *= DAMPING;

        // Update position
        updated.x += updated.vx;
        updated.y += updated.vy;

        // Update rotation
        updated.rotation += updated.vx * 100;

        // Wall collision
        if (updated.x < 0.01) {
          updated.x = 0.01;
          updated.vx = Math.abs(updated.vx) * BOUNCE;
        }
        if (updated.x > 0.99) {
          updated.x = 0.99;
          updated.vx = -Math.abs(updated.vx) * BOUNCE;
        }

        // Peg collisions - allow ball to bounce off pegs
        let hitPeg = false;
        for (const peg of pegs) {
          const dist = Math.hypot(updated.x - peg.x, updated.y - peg.y);
          if (dist < PEG_RADIUS + 0.02) { // Slightly larger hitbox
            hitPeg = true;
            const dx = updated.x - peg.x;
            const dy = updated.y - peg.y;
            const angle = Math.atan2(dy, dx);
            const speed = Math.hypot(updated.vx, updated.vy) * 0.75; // BOUNCE_DAMP
            updated.vx = Math.cos(angle + Math.PI) * speed;
            updated.vy = Math.sin(angle + Math.PI) * speed;
            // Push ball out to prevent overlap
            const pushDist = PEG_RADIUS - dist + 0.01;
            updated.x += Math.cos(angle) * pushDist;
            updated.y += Math.sin(angle) * pushDist;
          }
        }

        // Check if landed in slot
        if (updated.y >= 0.88) {
          const slot = Math.floor(updated.x / (1 / slotCount));
          const clampedSlot = Math.max(0, Math.min(slot, slotCount - 1));
          options.onFinish?.(clampedSlot);
          return null; // Remove ball
        }

        return updated;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [ball, slotCount, options]);

  return { ball, drop };
};
