import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface BoostedSegment {
  segmentIndex: number;
  baseMultiplier: number;
  boostMultiplier: number;
  finalMultiplier: number;
}

interface WheelCanvasProps {
  winningSegment: number | null;
  isSpinning: boolean;
  onSpinComplete?: () => void;
  boostedSegments?: BoostedSegment[];
}

// Wheel segments distributed evenly (like Crazy Time)
const WHEEL_SEGMENTS = [
  -0.75, -0.5, -0.25, 0.25, -0.75, -0.5, 0.5, -0.75, -0.25, 1.5,
  -0.75, -0.5, 0.75, 2, -0.75, -0.5, 0.25, 3, -0.75, -0.25,
  0.5, -0.75, -0.5, 1, 2, -0.75, -0.5, 0.25, -0.75, -0.25,
  5, -0.75, -0.5, 0.5, 1.5, -0.75, -0.5, 0.25, -0.75, -0.25,
  0.75, 2, -0.75, 1.5, 3, 0.5, 5, 1, 7.5, 25, -0.75, -0.5, -0.75, -0.75
];

// Color mapping for different multipliers
const getSegmentColor = (multiplier: number): string => {
  if (multiplier <= -0.5) return '#dc2626'; // red for losses
  if (multiplier < 0) return '#ea580c'; // orange for small losses
  if (multiplier < 1) return '#eab308'; // yellow for small wins
  if (multiplier === 1) return '#22c55e'; // green for 1x
  if (multiplier < 2) return '#10b981'; // emerald for 1.5x
  if (multiplier < 3) return '#06b6d4'; // cyan for 2x
  if (multiplier < 5) return '#3b82f6'; // blue for 3x
  if (multiplier < 7) return '#8b5cf6'; // purple for 5x
  if (multiplier < 10) return '#a855f7'; // purple for 7.5x
  return '#f59e0b'; // gold for 25x
};

const WheelCanvas: React.FC<WheelCanvasProps> = ({ winningSegment, isSpinning, onSpinComplete, boostedSegments = [] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const spinStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 30;
    
    // Create a Set of boosted segment indices for quick lookup
    const boostedIndices = new Set(boostedSegments.map(b => b.segmentIndex));

    const drawWheel = (rotation: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw wheel segments
      const totalSegments = WHEEL_SEGMENTS.length;
      const segmentAngle = (2 * Math.PI) / totalSegments;

      for (let i = 0; i < totalSegments; i++) {
        const isBoosted = boostedIndices.has(i);
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation + i * segmentAngle);

        // Get color based on multiplier value
        const multiplier = WHEEL_SEGMENTS[i];
        ctx.fillStyle = getSegmentColor(multiplier);
        
        // Add glow effect for boosted segments
        if (isBoosted) {
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 20;
        }
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, 0, segmentAngle);
        ctx.lineTo(0, 0);
        ctx.fill();
        
        ctx.shadowBlur = 0;

        // Draw border between segments
        ctx.strokeStyle = isBoosted ? '#fbbf24' : '#000000';
        ctx.lineWidth = isBoosted ? 4 : 3;
        ctx.stroke();

        // Draw multiplier text
        ctx.rotate(segmentAngle / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = isBoosted ? 'bold 16px Arial' : 'bold 14px Arial';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        
        // Show boosted multiplier if this segment is boosted
        let displayText = multiplier > 0 ? `${multiplier}x` : `${multiplier}x`;
        if (isBoosted) {
          const boosted = boostedSegments.find(b => b.segmentIndex === i);
          if (boosted) {
            displayText = `${boosted.finalMultiplier.toFixed(1)}x`;
          }
        }
        
        ctx.fillText(displayText, radius * 0.7, 0);
        
        // Add star icon for boosted segments
        if (isBoosted) {
          ctx.font = '16px Arial';
          ctx.fillText('⭐', radius * 0.7, -15);
        }
        
        ctx.shadowBlur = 0;

        ctx.restore();
      }

      // Draw outer rim
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw 8 flappers pointing DOWN into the wheel (like a real lucky wheel)
      const numFlappers = 8;
      for (let i = 0; i < numFlappers; i++) {
        const flapperAngle = (i * 2 * Math.PI) / numFlappers;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(flapperAngle);
        
        // Flapper pointing downward toward the wheel segments
        ctx.fillStyle = '#ef4444'; // Red color
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        // Triangle pointing down (from outer rim toward center)
        ctx.moveTo(0, -(radius + 25)); // Top point (outside wheel)
        ctx.lineTo(-10, -(radius + 5)); // Left base (at rim)
        ctx.lineTo(10, -(radius + 5)); // Right base (at rim)
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
      }

      // Draw center circle
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw pointer at top (triangle)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-Math.PI / 2); // Point to the right (will be at top after rotation)
      
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(radius + 15, 0);
      ctx.lineTo(radius - 10, -20);
      ctx.lineTo(radius - 10, 20);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.restore();
    };

    const animate = () => {
      if (isSpinning && winningSegment !== null) {
        const elapsed = Date.now() - spinStartTimeRef.current;
        const duration = 5000; // 5 second spin

        if (elapsed < duration) {
          // Calculate easing for deceleration
          const progress = elapsed / duration;
          const easeOut = 1 - Math.pow(1 - progress, 3);

          // Calculate target rotation
          const segmentAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;
          const targetRotation = (WHEEL_SEGMENTS.length - winningSegment) * segmentAngle - Math.PI / 2;
          const totalRotations = 8 * 2 * Math.PI; // 8 full spins
          const finalRotation = totalRotations + targetRotation;

          rotationRef.current = finalRotation * easeOut;
          drawWheel(rotationRef.current);
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Spin complete
          const segmentAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;
          const targetRotation = (WHEEL_SEGMENTS.length - winningSegment) * segmentAngle - Math.PI / 2;
          rotationRef.current = targetRotation;
          drawWheel(rotationRef.current);
          
          if (onSpinComplete) {
            onSpinComplete();
          }
        }
      } else {
        drawWheel(rotationRef.current);
      }
    };

    if (isSpinning && winningSegment !== null) {
      spinStartTimeRef.current = Date.now();
    }

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpinning, winningSegment, onSpinComplete]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className="max-w-full h-auto"
      />
    </div>
  );
};

export default WheelCanvas;
