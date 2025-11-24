/**
 * Physics-based paths using recorded peg collision data
 * 
 * Instead of recording every frame, we record:
 * - Which pegs the ball hits
 * - The velocity/angle at each collision
 * 
 * Then play back with real physics between collisions
 * This gives natural physics with tiny data size
 */

export interface PegCollision {
  pegX: number;
  pegY: number;
  velocityX: number;
  velocityY: number;
  time: number;
}

export interface PhysicsPath {
  binIndex: number;
  startX: number;
  collisions: PegCollision[];
  variation: number;
}

// Pre-configured collision data (generated once, committed to repo)
// Each bin has multiple variations based on real physics simulations
export const PHYSICS_PATHS: Record<number, Record<number, PhysicsPath[]>> = {
  // 8 rows
  8: {},
  // 12 rows  
  12: {},
  // 16 rows
  16: {},
};

/**
 * Get a random physics path for a bin
 */
export function getPhysicsPath(rows: number, binIndex: number): PhysicsPath | null {
  const rowPaths = PHYSICS_PATHS[rows];
  if (!rowPaths) return null;
  
  const binPaths = rowPaths[binIndex];
  if (!binPaths || binPaths.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * binPaths.length);
  return binPaths[randomIndex];
}

/**
 * Simulate ball physics between two points with velocity
 */
export function simulateSegment(
  startX: number,
  startY: number,
  velocityX: number,
  velocityY: number,
  targetX: number,
  targetY: number,
  duration: number
): { x: number; y: number; rotation: number } {
  const gravity = 0.98;
  const t = duration / 1000; // Convert to seconds
  
  // Physics equations with gravity
  const x = startX + velocityX * t;
  const y = startY + velocityY * t + 0.5 * gravity * t * t;
  
  // Calculate rotation based on velocity
  const rotation = Math.atan2(velocityY + gravity * t, velocityX);
  
  return { x, y, rotation };
}
