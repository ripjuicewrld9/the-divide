import Matter from 'matter-js';
import { binPayouts, type RowCount } from '../lib/constants';
import { RiskLevel } from '../types';

const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composite = Matter.Composite;

/**
 * PlinkoEngine - VISUAL ONLY
 * 
 * This engine is responsible ONLY for:
 * 1. Rendering the pins and game board
 * 2. Animating the ball from top to the predetermined bin
 * 3. Displaying the result
 * 
 * It does NOT:
 * - Calculate which bin the ball lands in (backend does this)
 * - Use physics to determine the outcome (backend does this)
 * 
 * The backend sends the binIndex, this engine just shows it visually.
 */
export class PlinkoEngine {
  static readonly WIDTH = 760;
  static readonly HEIGHT = 570;

  private static readonly PADDING_X = 52;
  private static readonly PADDING_TOP = 36;
  private static readonly PADDING_BOTTOM = 28;

  private static readonly PIN_CATEGORY = 0x0001;
  private static readonly BALL_CATEGORY = 0x0002;

  private canvas: HTMLCanvasElement;
  private engine: Matter.Engine;
  private render: Matter.Render;
  private runner: Matter.Runner;

  private pins: Matter.Body[] = [];
  private walls: Matter.Body[] = [];
  private pinsLastRowXCoords: number[] = [];
  private activeBalls: Set<Matter.Body> = new Set();
  private ballCleanupTimers: Map<Matter.Body, NodeJS.Timeout> = new Map();

  private rowCount: RowCount;
  private riskLevel: RiskLevel;

  private onBallInBin: ((binIndex: number, betAmount: number, gameResult?: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, rowCount: RowCount = 8, riskLevel: RiskLevel = 'low') {
    this.canvas = canvas;
    this.rowCount = rowCount;
    this.riskLevel = riskLevel;

    // Setup physics engine for rendering pins only (no game logic)
    this.engine = Matter.Engine.create({
      timing: { timeScale: 1 },
    });

    this.render = Matter.Render.create({
      engine: this.engine,
      canvas: this.canvas,
      options: {
        width: PlinkoEngine.WIDTH,
        height: PlinkoEngine.HEIGHT,
        background: 'rgb(15, 23, 40)',
        wireframes: false,
      },
    });

    this.runner = Matter.Runner.create();
    this.placePinsAndWalls();

    // Reduce gravity for slower fall
    this.engine.gravity.y = 0.6;
  }

  start() {
    Matter.Render.run(this.render);
    Matter.Runner.run(this.runner, this.engine);
    
    // Apply downward magnetic pull to guide balls toward their bins
    const guidanceInterval = setInterval(() => {
      this.activeBalls.forEach(ball => {
        // Skip dead balls (removed balls that are still in the set during iteration)
        if ((ball as any).isDead) {
          return;
        }
        
        if (!Composite.allBodies(this.engine.world).includes(ball)) {
          return;
        }
        
        // Subtle downward pull toward target bin
        const targetBinX = (ball as any).targetBinX;
        if (targetBinX !== undefined) {
          const currentX = ball.position.x;
          const currentY = ball.position.y;
          const targetY = this.canvas.height - 40;
          
          // Very subtle horizontal and downward nudge
          const distanceX = targetBinX - currentX;
          const distanceY = targetY - currentY;
          
          // Reduced force for slower fall
          const guidanceForce = 0.000006;
          Body.applyForce(ball, ball.position, {
            x: distanceX * guidanceForce,     // Horizontal pull toward bin
            y: distanceY * guidanceForce * 0.8 // Downward to maintain consistent speed
          });
        }
      });
    }, 16); // ~60fps
    
    (this as any).guidanceInterval = guidanceInterval;
  }

  stop() {
    Matter.Render.stop(this.render);
    Matter.Runner.stop(this.runner);
    
    if ((this as any).guidanceInterval) {
      clearInterval((this as any).guidanceInterval);
    }
  }

  setRowCount(rowCount: RowCount) {
    if (rowCount === this.rowCount) return;
    this.rowCount = rowCount;
    
    // Rebuild pins
    Composite.remove(this.engine.world, this.pins);
    Composite.remove(this.engine.world, this.walls);
    this.pins = [];
    this.walls = [];
    this.pinsLastRowXCoords = [];
    
    this.placePinsAndWalls();
  }

  setRiskLevel(riskLevel: RiskLevel) {
    this.riskLevel = riskLevel;
  }

  /**
   * Drop a ball with a predetermined bin index
   * Ball falls naturally with physics and bouncing through pegs
   * Subtle downward magnetic pull guides it toward target bin from the start
   * No snap at the end - smooth continuous fall
   */
  dropBall(betAmount: number, binIndex: number, gameResult?: any) {
    if (binIndex === undefined || binIndex < 0 || binIndex >= this.rowCount + 1) {
      console.error(`[PlinkoEngine] Invalid binIndex: ${binIndex}, rowCount=${this.rowCount}, numBins=${this.rowCount + 1}`);
      return;
    }

    console.log(`[PlinkoEngine] dropBall called: binIndex=${binIndex}, rowCount=${this.rowCount}, numBins=${this.rowCount + 1}, multiplier=${gameResult?.multiplier}x, activeBalls=${this.activeBalls.size}`);

    // Clean up landed balls IMMEDIATELY - don't keep them in the world
    // Allow multiple balls to fall simultaneously, but remove them as soon as they land
    const oldBalls = Array.from(this.activeBalls);
    oldBalls.forEach(oldBall => {
      // Only remove balls that have already landed
      if ((oldBall as any).hasLanded) {
        // Remove from world IMMEDIATELY
        if (Composite.allBodies(this.engine.world).includes(oldBall)) {
          Composite.remove(this.engine.world, oldBall);
          console.log(`[PlinkoEngine] Removed landed ball from world`);
        }
        
        // Remove from tracking
        this.activeBalls.delete(oldBall);
        
        // Cancel the removal timer if it exists
        if (this.ballCleanupTimers.has(oldBall)) {
          clearTimeout(this.ballCleanupTimers.get(oldBall)!);
          this.ballCleanupTimers.delete(oldBall);
        }
      }
    });

    const ballRadius = this.pinRadius * 2;

    // Create ball at top center
    const ball = Bodies.circle(
      this.canvas.width / 2,
      ballRadius,
      ballRadius,
      {
        restitution: 0.9,
        friction: 0.5,
        frictionAir: 0.08,
        collisionFilter: {
          category: PlinkoEngine.BALL_CATEGORY,
          mask: PlinkoEngine.PIN_CATEGORY,
        },
        render: {
          fillStyle: '#ff0000',
        },
      }
    );

    Composite.add(this.engine.world, ball);
    this.activeBalls.add(ball);

    // Store metadata
    (ball as any).plinkoData = {
      binIndex,
      betAmount,
      gameResult,
      createdAt: Date.now(),
    };

    const targetX = this.getBinCenterX(binIndex);

    // Store target for continuous downward magnetic pull during fall
    (ball as any).targetBinX = targetX;

    console.log(`[PlinkoEngine] Ball dropping to bin ${binIndex}, activeBalls=${this.activeBalls.size}, ballId=${ball.id}`);

    // After falling time, fire the callback immediately (ball lands naturally due to gravity + guidance)
    const fallTime = 1200 + this.rowCount * 40;
    
    const landTimer = setTimeout(() => {
      console.log(`[PlinkoEngine] landTimer fired for ballId=${ball.id}, activeBalls=${this.activeBalls.size}`);
      // Mark ball as landed so it gets cleaned up when next ball drops
      (ball as any).hasLanded = true;
      (ball as any).isDead = true;
      
      // Fire callback IMMEDIATELY to update multiplier stack on the side
      this.onBallInBin?.(binIndex, betAmount, gameResult);
    }, fallTime);
    
    this.ballCleanupTimers.set(ball, landTimer);
  }

  setOnBallInBin(callback: (binIndex: number, betAmount: number, gameResult?: any) => void) {
    this.onBallInBin = callback;
  }

  get binsWidthPercentage(): number {
    if (this.pinsLastRowXCoords.length === 0) return 1;
    const lastPinX = this.pinsLastRowXCoords[this.pinsLastRowXCoords.length - 1];
    return (lastPinX - this.pinsLastRowXCoords[0]) / PlinkoEngine.WIDTH;
  }

  private getBinCenterX(binIndex: number): number {
    const numBins = this.rowCount + 1;
    
    // Clamp
    if (binIndex < 0) binIndex = 0;
    if (binIndex >= numBins) binIndex = numBins - 1;

    // Evenly distribute bins across the playing area
    const binsStart = PlinkoEngine.PADDING_X;
    const binsEnd = PlinkoEngine.WIDTH - PlinkoEngine.PADDING_X;
    const binsWidth = binsEnd - binsStart;
    const binWidth = binsWidth / numBins;
    const binCenterX = binsStart + (binIndex + 0.5) * binWidth;

    return binCenterX;
  }

  private get pinDistanceX(): number {
    const lastRowPinCount = 3 + this.rowCount - 1;
    return (this.canvas.width - PlinkoEngine.PADDING_X * 2) / (lastRowPinCount - 1);
  }

  private get pinRadius(): number {
    return (24 - this.rowCount) / 2;
  }

  private placePinsAndWalls() {
    const { PADDING_X, PADDING_TOP, PADDING_BOTTOM, PIN_CATEGORY, BALL_CATEGORY } = PlinkoEngine;

    for (let row = 0; row < this.rowCount; ++row) {
      const rowY =
        PADDING_TOP +
        ((this.canvas.height - PADDING_TOP - PADDING_BOTTOM) / (this.rowCount - 1)) * row;

      const rowPaddingX = PADDING_X + ((this.rowCount - 1 - row) * this.pinDistanceX) / 2;

      for (let col = 0; col < 3 + row; ++col) {
        const colX = rowPaddingX + ((this.canvas.width - rowPaddingX * 2) / (3 + row - 1)) * col;
        const pin = Bodies.circle(colX, rowY, this.pinRadius, {
          isStatic: true,
          render: { fillStyle: '#ffffff' },
          collisionFilter: {
            category: PIN_CATEGORY,
            mask: BALL_CATEGORY,
          },
        });
        this.pins.push(pin);

        if (row === this.rowCount - 1) {
          this.pinsLastRowXCoords.push(colX);
        }
      }
    }

    Composite.add(this.engine.world, this.pins);

    const firstPinX = this.pins[0].position.x;
    const lastRowFirstPinX = this.pinsLastRowXCoords[0];
    const lastRowLastPinX = this.pinsLastRowXCoords[this.pinsLastRowXCoords.length - 1];

    const leftWallAngle = Math.atan2(
      firstPinX - lastRowFirstPinX,
      this.canvas.height - PADDING_TOP - PADDING_BOTTOM
    );
    const leftWallX = firstPinX - (firstPinX - lastRowFirstPinX) / 2 - this.pinDistanceX * 0.25;

    const leftWall = Bodies.rectangle(
      leftWallX,
      this.canvas.height / 2,
      10,
      this.canvas.height,
      {
        isStatic: true,
        angle: leftWallAngle,
        render: { visible: false },
      }
    );

    const rightWall = Bodies.rectangle(
      this.canvas.width - leftWallX,
      this.canvas.height / 2,
      10,
      this.canvas.height,
      {
        isStatic: true,
        angle: -leftWallAngle,
        render: { visible: false },
      }
    );

    this.walls.push(leftWall, rightWall);
    Composite.add(this.engine.world, this.walls);
  }

  private removeAllBalls() {
    Composite.allBodies(this.engine.world).forEach((body: any) => {
      if (body.collisionFilter?.category === PlinkoEngine.BALL_CATEGORY) {
        Composite.remove(this.engine.world, body);
      }
    });
  }

  destroy() {
    // Cancel all pending cleanup timers
    this.ballCleanupTimers.forEach((timer) => clearTimeout(timer));
    this.ballCleanupTimers.clear();
    
    // Remove all active balls
    this.activeBalls.forEach(ball => {
      if (Composite.allBodies(this.engine.world).includes(ball)) {
        Composite.remove(this.engine.world, ball);
      }
    });
    this.activeBalls.clear();
    
    this.stop();
    if ((this.render as any).controller?.view?.remove) {
      (this.render as any).controller.view.remove();
    }
  }
}
