/**
 * PlinkoPathEngine - Path-based animation system
 * 
 * Uses pre-configured paths instead of physics simulation
 * This ensures:
 * - Balls always land in the correct bin
 * - Realistic-looking bounces without floating
 * - Consistent timing
 * - Better performance
 */

import { getPathForBin, getPositionAtTime, type BallPath } from './PathAnimations';
import type { RowCount } from './constants';

export interface Ball {
  id: number;
  path: BallPath;
  startTime: number;
  binIndex: number;
  betAmount: number;
  gameResult?: any;
  completed: boolean;
  lastBounceTime?: number;
  bounceIntensity?: number;
}

interface PegPulse {
  pegIndex: number;
  startTime: number;
  intensity: number;
}

export class PlinkoPathEngine {
  static readonly WIDTH = 760;
  static readonly HEIGHT = 570;
  static readonly PADDING_X = 52;
  static readonly PADDING_TOP = 36;
  static readonly PADDING_BOTTOM = 28;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rowCount: RowCount;
  
  private balls: Map<number, Ball> = new Map();
  private nextBallId = 0;
  private animationFrame: number | null = null;
  
  private pins: { x: number; y: number; radius: number }[] = [];
  private pegPulses: PegPulse[] = [];
  
  private onBallInBin: ((binIndex: number, betAmount: number, gameResult?: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, rowCount: RowCount = 8) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.rowCount = rowCount;
    
    this.canvas.width = PlinkoPathEngine.WIDTH;
    this.canvas.height = PlinkoPathEngine.HEIGHT;
    
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

  dropBall(betAmount: number, binIndex: number, gameResult?: any): boolean {
    const path = getPathForBin(this.rowCount, binIndex);
    if (!path) {
      console.error(`No path found for bin ${binIndex}`);
      // Fire callback immediately to refund the bet
      this.onBallInBin?.(binIndex, betAmount, gameResult);
      return false;
    }

    const ball: Ball = {
      id: this.nextBallId++,
      path,
      startTime: Date.now(),
      binIndex,
      betAmount,
      gameResult,
      completed: false,
    };

    this.balls.set(ball.id, ball);
    return true;
  }

  setOnBallInBin(callback: (binIndex: number, betAmount: number, gameResult?: any) => void) {
    this.onBallInBin = callback;
  }

  private generatePins() {
    this.pins = [];
    const { PADDING_X, PADDING_TOP, PADDING_BOTTOM } = PlinkoPathEngine;
    const pinRadius = this.pinRadius;
    const pinDistanceX = this.pinDistanceX;

    for (let row = 0; row < this.rowCount; row++) {
      const rowY =
        PADDING_TOP +
        ((this.canvas.height - PADDING_TOP - PADDING_BOTTOM) / (this.rowCount - 1)) * row;

      const rowPaddingX = PADDING_X + ((this.rowCount - 1 - row) * pinDistanceX) / 2;

      for (let col = 0; col < 3 + row; col++) {
        const colX = rowPaddingX + ((this.canvas.width - rowPaddingX * 2) / (3 + row - 1)) * col;
        this.pins.push({ x: colX, y: rowY, radius: pinRadius });
      }
    }
  }

  private get pinDistanceX(): number {
    const lastRowPinCount = 3 + this.rowCount - 1;
    return (this.canvas.width - PlinkoPathEngine.PADDING_X * 2) / (lastRowPinCount - 1);
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
    
    // Update and clean up peg pulses
    this.pegPulses = this.pegPulses.filter(pulse => {
      const elapsed = now - pulse.startTime;
      return elapsed < 300; // Keep pulses for 300ms
    });
    
    // Draw peg pulse effects FIRST (behind everything)
    this.pins.forEach((pin, index) => {
      const activePulse = this.pegPulses.find(p => p.pegIndex === index);
      
      if (activePulse) {
        const elapsed = now - activePulse.startTime;
        const progress = elapsed / 300;
        const scale = 1 + (1 - progress) * 0.5;
        const opacity = (1 - progress) * 0.6;
        
        // Draw outer glow
        this.ctx.fillStyle = `rgba(147, 197, 253, ${opacity})`;
        this.ctx.beginPath();
        this.ctx.arc(pin.x, pin.y, pin.radius * scale * 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw middle glow
        this.ctx.fillStyle = `rgba(96, 165, 250, ${opacity * 1.5})`;
        this.ctx.beginPath();
        this.ctx.arc(pin.x, pin.y, pin.radius * scale * 1.4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
    
    // Draw pegs SECOND (behind balls)
    this.pins.forEach((pin) => {
      // Add shadow/depth effect
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(pin.x + 1, pin.y + 1, pin.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Draw main peg
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(pin.x, pin.y, pin.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Add highlight for 3D effect
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(pin.x - pin.radius * 0.3, pin.y - pin.radius * 0.3, pin.radius * 0.4, 0, Math.PI * 2);
      this.ctx.fill();
    });
    
    // Update and draw balls LAST (on top of pegs)
    const completedBalls: number[] = [];
    
    this.balls.forEach((ball) => {
      if (ball.completed) return;
      
      const elapsed = now - ball.startTime;
      
      // Check if ball animation is complete
      if (elapsed >= ball.path.duration) {
        if (!ball.completed) {
          ball.completed = true;
          completedBalls.push(ball.id);
          
          // Fire callback
          this.onBallInBin?.(ball.binIndex, ball.betAmount, ball.gameResult);
        }
        return;
      }
      
      // Get ball position along path
      const pos = getPositionAtTime(ball.path, elapsed);
      const x = pos.x * this.canvas.width;
      const y = pos.y * this.canvas.height;
      
      // Skip rendering if position is invalid
      if (!isFinite(x) || !isFinite(y)) {
        // Mark as completed to stop the spam
        ball.completed = true;
        completedBalls.push(ball.id);
        this.onBallInBin?.(ball.binIndex, ball.betAmount, ball.gameResult);
        return;
      }
      
      // Check if ball is near a peg (for bounce detection)
      let nearPeg = false;
      let closestPegDist = Infinity;
      let closestPegX = 0;
      let closestPegY = 0;
      
      this.pins.forEach((pin, pegIndex) => {
        const dist = Math.sqrt((pin.x - x) ** 2 + (pin.y - y) ** 2);
        
        if (dist < closestPegDist) {
          closestPegDist = dist;
          closestPegX = pin.x;
          closestPegY = pin.y;
        }
        
        if (dist < pin.radius + this.ballRadius + 2) {
          nearPeg = true;
          
          // Trigger bounce effect only when very close
          if (dist < pin.radius + this.ballRadius && (!ball.lastBounceTime || now - ball.lastBounceTime > 80)) {
            ball.lastBounceTime = now;
            ball.bounceIntensity = 0.8;
            
            // Add peg pulse effect
            const existingPulse = this.pegPulses.find(p => p.pegIndex === pegIndex);
            if (!existingPulse) {
              this.pegPulses.push({
                pegIndex,
                startTime: now,
                intensity: 1.0
              });
            }
          }
        }
      });
      
      // Decay bounce effect faster
      if (ball.bounceIntensity && ball.bounceIntensity > 0) {
        ball.bounceIntensity -= 0.08;
      }
      
      // Draw ball with subtle squash/stretch effect
      const squashFactor = ball.bounceIntensity ? 1 + ball.bounceIntensity * 0.15 : 1;
      const stretchFactorX = nearPeg ? 1.1 : (1 / Math.sqrt(squashFactor));
      const stretchFactorY = nearPeg ? 0.9 : Math.sqrt(squashFactor);
      
      // Validate all values before drawing
      if (isFinite(x) && isFinite(y) && isFinite(this.ballRadius) && 
          isFinite(stretchFactorX) && isFinite(stretchFactorY) &&
          stretchFactorX > 0 && stretchFactorY > 0) {
        // Draw ball glow
        const glowRadius = this.ballRadius * 1.5;
        if (isFinite(glowRadius) && glowRadius > 0) {
          const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
          gradient.addColorStop(0, '#ff4444');
          gradient.addColorStop(0.5, '#ff0000');
          gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
          
          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.ellipse(x, y, glowRadius * stretchFactorX, glowRadius * stretchFactorY, 0, 0, Math.PI * 2);
          this.ctx.fill();
        }
        
        // Draw solid ball on top with squash/stretch
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, this.ballRadius * stretchFactorX, this.ballRadius * stretchFactorY, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      // Add subtle motion blur trail when moving fast
      if (elapsed > 100) {
        const prevPos = getPositionAtTime(ball.path, elapsed - 16);
        const prevX = prevPos.x * this.canvas.width;
        const prevY = prevPos.y * this.canvas.height;
        const speed = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
        
        if (speed > 5) {
          this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.15)';
          this.ctx.lineWidth = this.ballRadius;
          this.ctx.lineCap = 'round';
          this.ctx.beginPath();
          this.ctx.moveTo(prevX, prevY);
          this.ctx.lineTo(x, y);
          this.ctx.stroke();
        }
      }
    });
    
    // Remove completed balls immediately instead of using setTimeout
    completedBalls.forEach(id => {
      this.balls.delete(id);
    });
    
    // Safety cleanup: remove any balls that have been around too long (10 seconds)
    const maxBallAge = 10000;
    this.balls.forEach((ball, id) => {
      const age = now - ball.startTime;
      if (age > maxBallAge) {
        console.warn(`[PlinkoPathEngine] Removing stale ball ${id} (age: ${age}ms)`);
        if (!ball.completed) {
          this.onBallInBin?.(ball.binIndex, ball.betAmount, ball.gameResult);
        }
        this.balls.delete(id);
      }
    });
    
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  destroy() {
    this.stop();
    this.balls.clear();
  }

  get binsWidthPercentage(): number {
    // Return a consistent value based on padding
    const usableWidth = PlinkoPathEngine.WIDTH - (PlinkoPathEngine.PADDING_X * 2);
    return usableWidth / PlinkoPathEngine.WIDTH;
  }
}
