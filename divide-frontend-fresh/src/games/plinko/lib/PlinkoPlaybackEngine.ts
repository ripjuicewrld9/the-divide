/**
 * PlinkoPlaybackEngine - Plays back recorded physics simulations
 * 
 * This engine displays pre-recorded ball drops with real physics
 */

import type { Recording, RecordedFrame } from './PlinkoRecorder';
import type { RowCount } from './constants';

interface PlayingBall {
  id: number;
  recording: Recording;
  startTime: number;
  betAmount: number;
  gameResult?: any;
  completed: boolean;
}

export class PlinkoPlaybackEngine {
  static readonly WIDTH = 760;
  static readonly HEIGHT = 570;
  static readonly PADDING_X = 52;
  static readonly PADDING_TOP = 36;
  static readonly PADDING_BOTTOM = 28;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rowCount: RowCount;
  
  private balls: Map<number, PlayingBall> = new Map();
  private nextBallId = 0;
  private animationFrame: number | null = null;
  
  private pins: { x: number; y: number; radius: number }[] = [];
  private recordings: Map<string, Recording[]> = new Map();
  
  private onBallInBin: ((binIndex: number, betAmount: number, gameResult?: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, rowCount: RowCount = 8) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.rowCount = rowCount;
    
    this.canvas.width = PlinkoPlaybackEngine.WIDTH;
    this.canvas.height = PlinkoPlaybackEngine.HEIGHT;
    
    this.generatePins();
  }

  start() {
    this.animate();
  }

  stop() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  setRowCount(rowCount: RowCount) {
    if (rowCount === this.rowCount) return;
    this.rowCount = rowCount;
    this.generatePins();
  }

  loadRecordings(recordings: Map<string, Recording[]>) {
    this.recordings = recordings;
  }

  dropBall(betAmount: number, binIndex: number, gameResult?: any) {
    const key = `${this.rowCount}-${binIndex}`;
    const recordings = this.recordings.get(key);
    
    if (!recordings || recordings.length === 0) {
      console.error(`No recordings found for bin ${binIndex} with ${this.rowCount} rows`);
      return;
    }

    // Pick random recording
    const randomIndex = Math.floor(Math.random() * recordings.length);
    const recording = recordings[randomIndex];

    const ball: PlayingBall = {
      id: this.nextBallId++,
      recording,
      startTime: Date.now(),
      betAmount,
      gameResult,
      completed: false,
    };

    this.balls.set(ball.id, ball);
  }

  setOnBallInBin(callback: (binIndex: number, betAmount: number, gameResult?: any) => void) {
    this.onBallInBin = callback;
  }

  destroy() {
    this.stop();
    this.balls.clear();
    this.recordings.clear();
  }

  get binsWidthPercentage(): number {
    // Match PlinkoEngine's calculation
    const lastRowPinCount = this.rowCount + 2;
    const pinDistanceX = (PlinkoPlaybackEngine.WIDTH - PlinkoPlaybackEngine.PADDING_X * 2) / (lastRowPinCount - 1);
    const binCount = this.rowCount + 1;
    const totalBinWidth = pinDistanceX * binCount;
    const availableWidth = PlinkoPlaybackEngine.WIDTH - PlinkoPlaybackEngine.PADDING_X * 2;
    return totalBinWidth / availableWidth;
  }

  private generatePins() {
    this.pins = [];
    const pinRadius = this.pinRadius;
    const pinDistanceX = (PlinkoPlaybackEngine.WIDTH - PlinkoPlaybackEngine.PADDING_X * 2) / (3 + this.rowCount - 1 - 1);

    for (let row = 0; row < this.rowCount; row++) {
      const y = PlinkoPlaybackEngine.PADDING_TOP + ((PlinkoPlaybackEngine.HEIGHT - PlinkoPlaybackEngine.PADDING_TOP - PlinkoPlaybackEngine.PADDING_BOTTOM) / (this.rowCount - 1)) * row;
      const rowPaddingX = PlinkoPlaybackEngine.PADDING_X + ((this.rowCount - 1 - row) * pinDistanceX) / 2;
      const numPins = 3 + row;

      for (let col = 0; col < numPins; col++) {
        const x = rowPaddingX + ((PlinkoPlaybackEngine.WIDTH - rowPaddingX * 2) / (numPins - 1)) * col;
        this.pins.push({ x, y, radius: pinRadius });
      }
    }
  }

  private get pinRadius(): number {
    return (24 - this.rowCount) / 2;
  }

  private get ballRadius(): number {
    return this.pinRadius * 2;
  }

  private animate = () => {
    const now = Date.now();
    
    // Clear canvas
    this.ctx.fillStyle = 'rgb(15, 23, 40)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw pins
    this.pins.forEach(pin => {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(pin.x, pin.y, pin.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
    
    // Update and draw balls
    const completedBalls: number[] = [];
    
    this.balls.forEach((ball) => {
      if (ball.completed) return;
      
      const elapsed = now - ball.startTime;
      
      // Get current frame (even if past duration for final fade)
      const frame = this.getFrameAtTime(ball.recording, elapsed);
      
      // Check if playback is complete
      if (elapsed >= ball.recording.duration) {
        if (!ball.completed) {
          ball.completed = true;
          completedBalls.push(ball.id);
          
          // Fire callback
          this.onBallInBin?.(ball.recording.binIndex, ball.betAmount, ball.gameResult);
        }
        // Continue drawing for a bit after completion
        if (elapsed > ball.recording.duration + 200) {
          return; // Fully done, stop drawing
        }
      }
      
      if (frame) {
        // Draw ball at recorded position
        this.ctx.save();
        this.ctx.translate(frame.x, frame.y);
        this.ctx.rotate(frame.rotation);
        
        // Draw ball
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.ballRadius);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#c92a2a');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
      }
    });
    
    // Remove completed balls
    completedBalls.forEach(id => this.balls.delete(id));
    
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private getFrameAtTime(recording: Recording, time: number): RecordedFrame | null {
    const frames = recording.frames;
    
    if (frames.length === 0) return null;
    if (time <= 0) return frames[0];
    if (time >= recording.duration) return frames[frames.length - 1];
    
    // Find the two frames to interpolate between
    for (let i = 0; i < frames.length - 1; i++) {
      if (time >= frames[i].time && time <= frames[i + 1].time) {
        // Linear interpolation between frames
        const t = (time - frames[i].time) / (frames[i + 1].time - frames[i].time);
        return {
          x: frames[i].x + (frames[i + 1].x - frames[i].x) * t,
          y: frames[i].y + (frames[i + 1].y - frames[i].y) * t,
          rotation: frames[i].rotation + (frames[i + 1].rotation - frames[i].rotation) * t,
          time,
        };
      }
    }
    
    return frames[frames.length - 1];
  }
}
