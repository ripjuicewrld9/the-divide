import { Peg, Ball, RiskLevel } from '../types';

export const PEG_RADIUS = 8;
export const BALL_RADIUS = 6;
export const GRAVITY = 0.4;
export const DAMPING = 0.98;
export const BOUNCE = 0.7;

/**
 * Generate pegs for Plinko board with perfect centering
 * - Uses full container width for optimal spacing
 * - Centers triangle symmetrically
 * - Aligns pegs with multiplier bins
 * 
 * For N rows, we have N+1 bins below (the final positions)
 * Peg layout: row 0 = 1 peg, row 1 = 2 pegs, ..., row N = N+1 pegs
 */
export const generatePegs = (rows: number, containerWidth: number = 600, containerHeight: number = 700): Peg[] => {
  const pegs: Peg[] = [];
  
  // The last row has (rows + 1) pegs, which should align with (rows + 1) bins
  const maxPegsInRow = rows + 1;
  
  // Calculate spacing: we want to use most of the width with padding on edges
  const paddingPercent = 0.08; // 8% padding on each side
  const usableWidth = containerWidth * (1 - 2 * paddingPercent);
  const pegSpacing = usableWidth / rows; // Space between pegs in the widest row
  
  const startX = containerWidth / 2; // Center horizontally
  const startY = 40; // Top padding for pegs
  
  // Generate pegs in triangular formation
  for (let row = 0; row < rows; row++) {
    const pegCount = row + 1; // Each row has (row + 1) pegs
    const rowY = startY + row * pegSpacing;
    
    // Center this row: pegs should span from -(pegCount-1)/2 * spacing to +(pegCount-1)/2 * spacing
    const offsetFromCenter = (pegCount - 1) / 2;
    
    for (let col = 0; col < pegCount; col++) {
      const xOffset = (col - offsetFromCenter) * pegSpacing;
      
      pegs.push({
        x: startX + xOffset,
        y: rowY,
        row,
        col,
      });
    }
  }
  
  return pegs;
};

export const updateBallPhysics = (
  ball: Ball,
  pegs: Peg[],
  containerWidth: number,
  containerHeight: number
): Ball => {
  let updated = { ...ball };

  // Apply gravity
  updated.vy += GRAVITY;

  // Apply damping
  updated.vx *= DAMPING;
  updated.vy *= DAMPING;

  // Update position
  updated.x += updated.vx;
  updated.y += updated.vy;

  // Update rotation
  updated.rotation += updated.vx * 2;

  // Wall collision
  if (updated.x - BALL_RADIUS < 0) {
    updated.x = BALL_RADIUS;
    updated.vx = Math.abs(updated.vx) * BOUNCE;
  }
  if (updated.x + BALL_RADIUS > containerWidth) {
    updated.x = containerWidth - BALL_RADIUS;
    updated.vx = -Math.abs(updated.vx) * BOUNCE;
  }

  // Peg collision
  for (const peg of pegs) {
    const dx = updated.x - peg.x;
    const dy = updated.y - peg.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDist = BALL_RADIUS + PEG_RADIUS;

    if (distance < minDist) {
      // Collision detected
      const angle = Math.atan2(dy, dx);
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);

      // Separate balls
      updated.x = peg.x + cos * minDist;
      updated.y = peg.y + sin * minDist;

      // Bounce
      const vx = updated.vx * cos + updated.vy * sin;
      const vy = updated.vy * cos - updated.vx * sin;

      updated.vx = vx * BOUNCE * cos - vy * sin;
      updated.vy = vy * BOUNCE * cos + vx * sin;

      // Add some randomness to bounce direction (slight)
      const randomFactor = (Math.random() - 0.5) * 0.2;
      updated.vx += randomFactor;
    }
  }

  // Update trail
  if (updated.trail.length < 20) {
    updated.trail.push({ x: updated.x, y: updated.y, opacity: 1 });
  } else {
    updated.trail.shift();
    updated.trail.push({ x: updated.x, y: updated.y, opacity: 1 });
  }

  // Fade trail
  updated.trail = updated.trail.map((point, idx) => ({
    ...point,
    opacity: (idx / updated.trail.length) * 0.6,
  }));

  // Check if finished (below container)
  if (updated.y > containerHeight + 50) {
    updated.finished = true;
  }

  return updated;
};

export const getBinFromY = (y: number, containerHeight: number, binCount: number): number => {
  const binHeight = containerHeight * 0.2;
  const binY = containerHeight - binHeight;

  if (y < binY) return -1; // Not in bins yet

  const relativeX = ((y - binY) / binHeight) * binCount;
  return Math.floor(Math.max(0, Math.min(binCount - 1, relativeX)));
};
