/**
 * Pre-configured path animations for Plinko balls
 * Multiple variations per bin for variety - like recorded real physics simulations
 */

export interface PathWaypoint {
  x: number;        // X position (0-1, percentage of width)
  y: number;        // Y position (0-1, percentage of height)
  time: number;     // Time in ms from start
  bounce?: boolean; // Whether this is a peg collision point
  bounceAngle?: number; // Angle of bounce for realistic physics
}

export interface BallPath {
  binIndex: number;
  waypoints: PathWaypoint[];
  duration: number; // Total animation duration in ms
  variation: number; // Which variation this is (0, 1, 2, etc.)
}

interface Peg {
  x: number;
  y: number;
  row: number;
  col: number;
}

const VARIATIONS_PER_BIN = 5; // Number of different paths per bin

/**
 * Generate peg positions matching PlinkoPathEngine layout
 */
function generatePegPositions(rows: number): Peg[] {
  const WIDTH = 760;
  const HEIGHT = 570;
  const PADDING_X = 52;
  const PADDING_TOP = 36;
  const PADDING_BOTTOM = 28;
  
  const pegs: Peg[] = [];
  const pinDistanceX = (WIDTH - PADDING_X * 2) / (3 + rows - 1 - 1);

  for (let row = 0; row < rows; row++) {
    const rowY = PADDING_TOP + ((HEIGHT - PADDING_TOP - PADDING_BOTTOM) / (rows - 1)) * row;
    const rowPaddingX = PADDING_X + ((rows - 1 - row) * pinDistanceX) / 2;
    const numPegsInRow = 3 + row;

    for (let col = 0; col < numPegsInRow; col++) {
      const colX = rowPaddingX + ((WIDTH - rowPaddingX * 2) / (numPegsInRow - 1)) * col;
      pegs.push({
        x: colX / WIDTH,
        y: rowY / HEIGHT,
        row,
        col,
      });
    }
  }
  
  return pegs;
}

/**
 * Generate multiple realistic path variations for each bin
 * Simulates physics with proper gravity, velocity, and bounces
 */
export function generatePathsForRows(rows: number): BallPath[] {
  const numBins = rows + 1;
  const allPaths: BallPath[] = [];
  const pegs = generatePegPositions(rows);
  
  // Calculate bin positions
  const getBinX = (binIndex: number) => {
    const padding = 0.068;
    const usableWidth = 1 - (padding * 2);
    const binWidth = usableWidth / numBins;
    return padding + (binIndex + 0.5) * binWidth;
  };

  // Physics constants for realistic motion (slowed down 10x for better visibility)
  const GRAVITY = 0.00045; // Pixels per ms^2
  const INITIAL_VY = 0.0003; // Initial downward velocity
  const BOUNCE_DAMPING = 0.65; // Energy loss on bounce
  const HORIZONTAL_SPREAD = 0.25; // How much ball can move horizontally per bounce
  const SPEED_MULTIPLIER = 10.0; // Slow down animation by this factor
  
  // Generate multiple variations for each bin
  for (let binIndex = 0; binIndex < numBins; binIndex++) {
    const targetX = getBinX(binIndex);
    const lastRowPegs = pegs.filter(p => p.row === rows - 1);
    
    // Create multiple variations with different paths
    for (let variation = 0; variation < VARIATIONS_PER_BIN; variation++) {
      const waypoints: PathWaypoint[] = [];
      
      // Start position with variation-based offset
      const startXOffset = (variation - Math.floor(VARIATIONS_PER_BIN / 2)) * 0.018;
      const startX = 0.5 + startXOffset;
      
      // Initial state
      let currentX = startX;
      let currentY = 0.04;
      let velocityX = (targetX - startX) * 0.15; // Initial bias toward target
      let velocityY = INITIAL_VY;
      let currentTime = 0;
      
      waypoints.push({ x: currentX, y: currentY, time: 0 });
      
      // Simulate ball falling through pegs (stop at second-to-last row)
      for (let row = 0; row < rows - 1; row++) {
        const rowPegs = pegs.filter(p => p.row === row);
        const rowProgress = row / (rows - 1);
        
        // Find which peg the ball will hit - bias toward target bin
        let hitPeg: Peg | null = null;
        let bestScore = -Infinity;
        
        for (const peg of rowPegs) {
          const dx = peg.x - currentX;
          const dy = peg.y - currentY;
          
          // Check if ball can reach this peg
          if (dy > 0 && Math.abs(dx) < 0.12) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Score based on distance to current position AND distance to target
            const distanceToTarget = Math.abs(peg.x - targetX);
            const biasWeight = 0.3 + (rowProgress * 0.6); // Increase from 30% to 90%
            
            // Lower score is better - we want pegs close to us AND close to target
            const score = -(dist * (1 - biasWeight)) - (distanceToTarget * biasWeight);
            
            if (score > bestScore) {
              bestScore = score;
              hitPeg = peg;
            }
          }
        }
        
        if (!hitPeg) {
          // Pick peg closest to target as fallback
          hitPeg = rowPegs.reduce((closest, peg) => {
            const distToTarget = Math.abs(peg.x - targetX);
            const closestDistToTarget = Math.abs(closest.x - targetX);
            return distToTarget < closestDistToTarget ? peg : closest;
          });
        }
        
        // Calculate time to reach peg (using physics equations)
        const dy = Math.max(0.001, hitPeg.y - currentY); // Ensure positive distance
        const timeToHit = Math.sqrt(2 * dy / GRAVITY) * (0.85 + Math.random() * 0.3) * SPEED_MULTIPLIER;
        
        // Validate timeToHit before accumulating
        if (!isFinite(timeToHit) || timeToHit <= 0) {
          console.error('Invalid timeToHit', { dy, timeToHit, currentY, pegY: hitPeg.y });
          currentTime += 150 * SPEED_MULTIPLIER; // Fallback: 150ms per row
        } else {
          currentTime += timeToHit;
        }
        
        // Update position at peg with slight offset for natural variation
        currentX = hitPeg.x + (Math.random() - 0.5) * 0.006;
        currentY = hitPeg.y;
        
        waypoints.push({
          x: currentX,
          y: currentY,
          time: Math.round(currentTime),
          bounce: true,
          bounceAngle: 0,
        });
        
        // Validate waypoint time is valid
        if (!isFinite(currentTime)) {
          console.error('Invalid currentTime at row', row, { currentTime, waypoints });
          currentTime = waypoints[waypoints.length - 1].time + (150 * SPEED_MULTIPLIER); // Fix with fallback
        }
      }
      
      // At this point, ball should be very close to target bin
      // Add one gentle convergence waypoint
      const preDropY = 0.90;
      const preDropDistance = Math.max(0.001, preDropY - currentY);
      const preDropTime = Math.sqrt(2 * preDropDistance / GRAVITY) * 0.85 * SPEED_MULTIPLIER;
      
      if (isFinite(preDropTime) && preDropTime > 0) {
        currentTime += preDropTime;
      } else {
        currentTime += 150 * SPEED_MULTIPLIER;
      }
      
      // Gently move remaining distance to target
      const remainingDist = targetX - currentX;
      currentX = currentX + (remainingDist * 0.8);
      currentY = preDropY;
      
      waypoints.push({
        x: currentX,
        y: currentY,
        time: Math.round(currentTime),
      });
      
      // Final drop to bin
      const finalFallDistance = Math.max(0.001, 0.94 - currentY);
      const finalFallTime = Math.sqrt(2 * finalFallDistance / GRAVITY) * 0.9 * SPEED_MULTIPLIER;
      
      // Validate finalFallTime
      if (!isFinite(finalFallTime) || finalFallTime <= 0) {
        console.error('Invalid finalFallTime', { finalFallDistance, finalFallTime });
        currentTime += 200 * SPEED_MULTIPLIER; // Fallback
      } else {
        currentTime += finalFallTime;
      }
      
      // Final position - move remaining 20% plus tiny variation
      const finalRemainingDist = targetX - currentX;
      const finalX = currentX + finalRemainingDist + (Math.random() - 0.5) * 0.003;
      
      waypoints.push({
        x: finalX,
        y: 0.94,
        time: Math.round(currentTime),
      });
      
      // Final validation of path
      const pathDuration = Math.round(currentTime);
      if (!isFinite(pathDuration) || pathDuration <= 0) {
        console.error('Invalid path duration', { pathDuration, currentTime, binIndex, variation });
        // Use a reasonable fallback duration based on number of rows
        const fallbackDuration = (rows * 180 + 300) * SPEED_MULTIPLIER;
        allPaths.push({
          binIndex,
          waypoints,
          duration: fallbackDuration,
          variation,
        });
      } else {
        allPaths.push({
          binIndex,
          waypoints,
          duration: pathDuration,
          variation,
        });
      }
    }
  }
  
  return allPaths;
}

/**
 * Get interpolated position along a path at a given time
 * Uses physics-based easing for realistic bounce dynamics
 */
export function getPositionAtTime(path: BallPath, elapsedMs: number): { x: number; y: number } {
  // Validate path has waypoints
  if (!path.waypoints || path.waypoints.length < 2) {
    console.error('Invalid path: no waypoints', path);
    return { x: 0.5, y: 0.5 };
  }
  
  // Clamp time to path duration
  const t = Math.min(elapsedMs, path.duration);
  
  // Find the two waypoints we're between
  let prevWaypoint = path.waypoints[0];
  let nextWaypoint = path.waypoints[1];
  let waypointIndex = 0;
  
  for (let i = 0; i < path.waypoints.length - 1; i++) {
    if (t >= path.waypoints[i].time && t <= path.waypoints[i + 1].time) {
      prevWaypoint = path.waypoints[i];
      nextWaypoint = path.waypoints[i + 1];
      waypointIndex = i;
      break;
    }
  }
  
  // If we're past the last waypoint, return the last position
  if (t >= path.waypoints[path.waypoints.length - 1].time) {
    const last = path.waypoints[path.waypoints.length - 1];
    return { x: last.x, y: last.y };
  }
  
  // Calculate progress between waypoints
  const segmentDuration = nextWaypoint.time - prevWaypoint.time;
  const segmentElapsed = t - prevWaypoint.time;
  const segmentProgress = segmentDuration > 0 ? segmentElapsed / segmentDuration : 1;
  
  // Check if this is the final segment (last peg to bin)
  const isFinalDrop = waypointIndex >= path.waypoints.length - 2;
  
  // Use smooth cubic easing for X to prevent sudden direction changes
  // This creates smooth curves instead of linear segments
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  
  // For bounce segments, use more linear X movement to avoid wrapping around pegs
  const easedX = (prevWaypoint.bounce || nextWaypoint.bounce) ? segmentProgress : easeInOutCubic(segmentProgress);
  
  // Physics-based motion for Y with proper gravity and bounces
  let easedY: number;
  
  if (isFinalDrop) {
    // Final drop - strong gravity, converging to bin
    const gravity = 2.8;
    easedY = segmentProgress + (segmentProgress * segmentProgress * gravity);
    easedY = Math.min(easedY, 1);
  } else if (prevWaypoint.bounce) {
    // Just bounced - create pronounced parabolic arc away from peg
    const bounceHeight = 0.25; // Increased for more visible bounce
    const parabola = 4 * segmentProgress * (1 - segmentProgress);
    easedY = segmentProgress - (parabola * bounceHeight);
  } else if (nextWaypoint.bounce) {
    // Falling toward peg with gravity acceleration
    const gravity = 1.8;
    easedY = segmentProgress * segmentProgress * gravity;
  } else {
    // Free fall with gravity
    const gravity = 2.0;
    easedY = segmentProgress * segmentProgress * gravity;
  }
  
  // Interpolate position with smooth X and physics-based Y
  const x = prevWaypoint.x + (nextWaypoint.x - prevWaypoint.x) * easedX;
  const y = prevWaypoint.y + (nextWaypoint.y - prevWaypoint.y) * easedY;
  
  // Validate output
  if (!isFinite(x) || !isFinite(y)) {
    console.error('Invalid position calculated', { x, y, prevWaypoint, nextWaypoint, easedX, easedY });
    return { x: prevWaypoint.x, y: prevWaypoint.y };
  }
  
  return { x, y };
}

/**
 * Path cache - generate once per row configuration
 */
const pathCache = new Map<number, BallPath[]>();

export function getPathsForRows(rows: number): BallPath[] {
  if (!pathCache.has(rows)) {
    pathCache.set(rows, generatePathsForRows(rows));
  }
  return pathCache.get(rows)!;
}

/**
 * Get a random path variation for a specific bin
 * This is like picking a random "recording" of a ball drop to that bin
 */
export function getPathForBin(rows: number, binIndex: number): BallPath | null {
  const allPaths = getPathsForRows(rows);
  const pathsForBin = allPaths.filter(p => p.binIndex === binIndex);
  
  if (pathsForBin.length === 0) {
    console.error(`No paths found for bin ${binIndex} with ${rows} rows`);
    return null;
  }
  
  // Pick a random variation
  const randomIndex = Math.floor(Math.random() * pathsForBin.length);
  return pathsForBin[randomIndex];
}
