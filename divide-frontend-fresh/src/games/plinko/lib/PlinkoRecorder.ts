/**
 * PlinkoRecorder - Records real physics simulations for playback
 * 
 * This system:
 * 1. Runs real Matter.js physics simulations
 * 2. Records ball position at every frame
 * 3. Saves recordings for each bin outcome
 * 4. Allows playback of random recordings
 */

import Matter from 'matter-js';
import type { RowCount } from './constants';

export interface RecordedFrame {
  x: number;  // Ball x position
  y: number;  // Ball y position
  rotation: number;  // Ball rotation
  time: number;  // Time in ms from start
}

export interface Recording {
  binIndex: number;
  frames: RecordedFrame[];
  duration: number;
  recordingIndex: number;  // Which recording this is (0, 1, 2, etc.)
}

const RECORDINGS_PER_BIN = 5;  // More variation per bin
const RECORD_FPS = 60;  // Higher FPS for smoother slow-motion
const RECORD_INTERVAL = 1000 / RECORD_FPS;

export class PlinkoRecorder {
  static readonly WIDTH = 760;
  static readonly HEIGHT = 570;
  static readonly PADDING_X = 52;
  static readonly PADDING_TOP = 36;
  static readonly PADDING_BOTTOM = 28;

  private rowCount: RowCount;
  private recordings: Map<string, Recording[]> = new Map();  // Key: "rows-binIndex"

  constructor(rowCount: RowCount = 8) {
    this.rowCount = rowCount;
  }

  /**
   * Record multiple physics simulations for a specific bin
   */
  async recordBin(binIndex: number, onProgress?: (current: number, total: number) => void, silent = false): Promise<void> {
    const key = `${this.rowCount}-${binIndex}`;
    const recordings: Recording[] = [];

    let successCount = 0;
    let attempts = 0;
    const maxAttempts = 100; // Keep trying until we get all recordings

    while (successCount < RECORDINGS_PER_BIN && attempts < maxAttempts) {
      attempts++;
      const recording = await this.recordSingleDrop(binIndex, successCount, silent);
      if (recording) {
        recordings.push(recording);
        successCount++;
        onProgress?.(successCount, RECORDINGS_PER_BIN);
      }
    }

    if (recordings.length > 0) {
      this.recordings.set(key, recordings);
      if (!silent) {
        console.log(`✓ Bin ${binIndex}: ${recordings.length} recordings (${attempts} attempts)`);
      }
    } else {
      console.warn(`⚠ Bin ${binIndex}: Failed to record any successful drops`);
    }
  }

  /**
   * Record all bins for current row count
   */
  async recordAllBins(onProgress?: (bin: number, totalBins: number) => void, silent = false): Promise<void> {
    const numBins = this.rowCount + 1;
    
    for (let binIndex = 0; binIndex < numBins; binIndex++) {
      await this.recordBin(binIndex, undefined, silent);
      onProgress?.(binIndex + 1, numBins);
    }
  }

  /**
   * Record a single physics drop to a specific bin
   */
  private async recordSingleDrop(targetBin: number, recordingIndex: number, silent = false): Promise<Recording | null> {
    return new Promise((resolve) => {
      // Create physics engine with faster simulation
      const engine = Matter.Engine.create({
        gravity: { x: 0, y: 1.5 }  // Normal gravity - we speed up simulation, not physics
      });

      // Create pins
      const pins = this.createPins();
      pins.forEach(pin => {
        Matter.World.add(engine.world, pin);
      });

      // Create walls
      const walls = this.createWalls();
      walls.forEach(wall => {
        Matter.World.add(engine.world, wall);
      });

      // Add ground at bottom to catch ball
      const ground = Matter.Bodies.rectangle(
        PlinkoRecorder.WIDTH / 2,
        PlinkoRecorder.HEIGHT - PlinkoRecorder.PADDING_BOTTOM + 10,
        PlinkoRecorder.WIDTH,
        20,
        { isStatic: true, restitution: 0.2 }
      );
      Matter.World.add(engine.world, ground);

      // Calculate target bin position
      const targetX = this.getBinCenterX(targetBin);
      
      // Bias start position toward target bin for faster recording
      // Add randomness around the target position
      const numBins = this.rowCount + 1;
      const targetNormalized = targetBin / (numBins - 1); // 0 to 1
      const centerX = PlinkoRecorder.PADDING_X + (PlinkoRecorder.WIDTH - PlinkoRecorder.PADDING_X * 2) * targetNormalized;
      const startX = centerX + (Math.random() - 0.5) * 60; // ±30 pixels around target
      const startY = PlinkoRecorder.PADDING_TOP - 20;

      // Create ball with normal physics for realistic playback
      const ball = Matter.Bodies.circle(startX, startY, this.ballRadius, {
        restitution: 0.5,  // Normal bounce
        friction: 0.02,
        density: 0.001,
      });
      Matter.World.add(engine.world, ball);

      const frames: RecordedFrame[] = [];
      const startTime = Date.now();
      let lastRecordTime = startTime;
      let settled = false;
      let settleStartTime = 0;
      let frameCount = 0;

      // Run simulation and record frames
      const simulate = () => {
        const now = Date.now();
        // Update physics much faster - 5x speed for GENERATION
        Matter.Engine.update(engine, (1000 / 60) * 5);
        frameCount++;

        // Record frame at fixed intervals - but STRETCH time for slow-motion playback
        // Record interval is 16ms (60fps) but playback will be slower
        if (now - lastRecordTime >= RECORD_INTERVAL) {
          frames.push({
            x: ball.position.x,
            y: ball.position.y,
            rotation: ball.angle,
            time: frames.length * (RECORD_INTERVAL * 2.5),  // 2.5x slower playback
          });
          lastRecordTime = now;
        }

        // Check if ball has settled in a bin
        const ballY = ball.position.y;
        const ballVelocity = Math.abs(ball.velocity.x) + Math.abs(ball.velocity.y);

        if (ballY > PlinkoRecorder.HEIGHT - PlinkoRecorder.PADDING_BOTTOM - 30) {
          if (!settled && ballVelocity < 2.0) {  // Less strict settling check
            settled = true;
            settleStartTime = now;
          }

          // Wait 100ms after settling (very quick)
          if (settled && now - settleStartTime > 100) {
            // Determine which bin the ball landed in
            const finalBin = this.getBinIndexFromX(ball.position.x);
            
            if (!silent) {
              console.log(`  Attempt ${recordingIndex + 1}: Ball landed in bin ${finalBin} (target: ${targetBin}), frames: ${frames.length}`);
            }
            
            // Only save if it landed in the target bin
            if (finalBin === targetBin) {
              const recording: Recording = {
                binIndex: targetBin,
                frames,
                duration: frames.length * (RECORD_INTERVAL * 2.5),  // Match the stretched time
                recordingIndex,
              };
              resolve(recording);
            } else {
              // Wrong bin, discard and try again
              if (!silent) {
                console.log(`  ❌ Wrong bin, retrying...`);
              }
              resolve(null);
            }

            // Clean up
            Matter.World.clear(engine.world, false);
            Matter.Engine.clear(engine);
            return;
          }
        }

        // Timeout after 2 seconds (very aggressive)
        if (now - startTime > 2000) {
          if (!silent) {
            console.log(`  ⏱ Timeout after ${frameCount} frames, ball at (${ball.position.x.toFixed(0)}, ${ball.position.y.toFixed(0)})`);
          }
          resolve(null);
          Matter.World.clear(engine.world, false);
          Matter.Engine.clear(engine);
          return;
        }

        requestAnimationFrame(simulate);
      };

      if (!silent) {
        console.log(`  Starting simulation for bin ${targetBin}, recording ${recordingIndex}...`);
      }
      simulate();
    });
  }

  /**
   * Get a random recording for a specific bin
   */
  getRandomRecording(binIndex: number): Recording | null {
    const key = `${this.rowCount}-${binIndex}`;
    const recordings = this.recordings.get(key);
    
    if (!recordings || recordings.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * recordings.length);
    return recordings[randomIndex];
  }

  /**
   * Get all recordings (for saving/loading)
   */
  getAllRecordings(): Map<string, Recording[]> {
    return this.recordings;
  }

  /**
   * Load recordings from saved data
   */
  loadRecordings(data: Map<string, Recording[]>): void {
    this.recordings = data;
  }

  private createPins(): Matter.Body[] {
    const pins: Matter.Body[] = [];
    const pinRadius = this.pinRadius;
    const pinDistanceX = (PlinkoRecorder.WIDTH - PlinkoRecorder.PADDING_X * 2) / (3 + this.rowCount - 1 - 1);

    for (let row = 0; row < this.rowCount; row++) {
      const y = PlinkoRecorder.PADDING_TOP + ((PlinkoRecorder.HEIGHT - PlinkoRecorder.PADDING_TOP - PlinkoRecorder.PADDING_BOTTOM) / (this.rowCount - 1)) * row;
      const rowPaddingX = PlinkoRecorder.PADDING_X + ((this.rowCount - 1 - row) * pinDistanceX) / 2;
      const numPins = 3 + row;

      for (let col = 0; col < numPins; col++) {
        const x = rowPaddingX + ((PlinkoRecorder.WIDTH - rowPaddingX * 2) / (numPins - 1)) * col;
        const pin = Matter.Bodies.circle(x, y, pinRadius, {
          isStatic: true,
          restitution: 0.5,  // Normal bounce
          friction: 0.02,
        });
        pins.push(pin);
      }
    }

    return pins;
  }

  private createWalls(): Matter.Body[] {
    const wallThickness = 20;
    return [
      // Left wall
      Matter.Bodies.rectangle(
        PlinkoRecorder.PADDING_X - wallThickness / 2,
        PlinkoRecorder.HEIGHT / 2,
        wallThickness,
        PlinkoRecorder.HEIGHT,
        { isStatic: true, restitution: 0.6 }
      ),
      // Right wall
      Matter.Bodies.rectangle(
        PlinkoRecorder.WIDTH - PlinkoRecorder.PADDING_X + wallThickness / 2,
        PlinkoRecorder.HEIGHT / 2,
        wallThickness,
        PlinkoRecorder.HEIGHT,
        { isStatic: true, restitution: 0.6 }
      ),
    ];
  }

  private getBinCenterX(binIndex: number): number {
    const numBins = this.rowCount + 1;
    const binWidth = (PlinkoRecorder.WIDTH - PlinkoRecorder.PADDING_X * 2) / numBins;
    return PlinkoRecorder.PADDING_X + binWidth * binIndex + binWidth / 2;
  }

  private getBinIndexFromX(x: number): number {
    const numBins = this.rowCount + 1;
    const binWidth = (PlinkoRecorder.WIDTH - PlinkoRecorder.PADDING_X * 2) / numBins;
    const binIndex = Math.floor((x - PlinkoRecorder.PADDING_X) / binWidth);
    return Math.max(0, Math.min(numBins - 1, binIndex));
  }

  private get pinRadius(): number {
    return (24 - this.rowCount) / 2;
  }

  private get ballRadius(): number {
    return this.pinRadius * 2;
  }
}
