import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface NewWheelCanvasProps {
  wheelSegments: number[]; // 54 base multipliers
  boostedSegments: Array<{
    segmentIndex: number;
    baseMultiplier: number;
    boostMultiplier: number;
    finalMultiplier: number;
  }>;
  wheelStopPosition: number | null;
  seatOutcomes: Array<{
    seatNumber: number;
    segmentUnderFlapper: number;
    baseMultiplier: number;
    boostMultiplier: number;
    finalMultiplier: number;
    isOccupied: boolean;
    userId: string | null;
    betAmount: number;
    payout: number;
    isBoosted: boolean;
  }>;
  isSpinning: boolean;
}

export const NewWheelCanvas: React.FC<NewWheelCanvasProps> = ({
  wheelSegments,
  boostedSegments,
  wheelStopPosition,
  seatOutcomes,
  isSpinning,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number>(0);
  const targetRotationRef = useRef(0);
  const currentRotationRef = useRef(0);
  const spinStartTimeRef = useRef(0);

  const SEGMENT_COUNT = 54;
  const FLAPPER_COUNT = 8;
  const SPIN_DURATION = 5000; // 5 seconds

  // Create boost map for quick lookup
  const boostMap = new Map();
  boostedSegments.forEach(b => {
    boostMap.set(b.segmentIndex, b);
  });

  // Get color for segment multiplier
  const getSegmentColor = (multiplier: number, isBoosted: boolean) => {
    if (isBoosted) return '#FFD700'; // Gold for boosted
    if (multiplier < 0) return '#EF4444'; // Red for negative
    if (multiplier < 1) return '#F97316'; // Orange for small positive
    if (multiplier < 2) return '#22C55E'; // Green for moderate
    if (multiplier < 5) return '#3B82F6'; // Blue for good
    if (multiplier < 10) return '#A855F7'; // Purple for great
    return '#F59E0B'; // Amber for jackpot
  };

  // Draw the wheel
  const drawWheel = (ctx: CanvasRenderingContext2D, width: number, height: number, currentRotation: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    const segmentAngle = (2 * Math.PI) / SEGMENT_COUNT;

    ctx.clearRect(0, 0, width, height);

    // Draw segments
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const multiplier = wheelSegments[i];
      const isBoosted = boostMap.has(i);
      const boost = boostMap.get(i);
      
      const startAngle = i * segmentAngle + currentRotation;
      const endAngle = startAngle + segmentAngle;

      // Segment background
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      
      ctx.fillStyle = getSegmentColor(multiplier, isBoosted);
      ctx.fill();
      
      // Segment border
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Arial';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      
      if (isBoosted && boost) {
        // Show boosted multiplier
        ctx.fillText(`${boost.finalMultiplier.toFixed(1)}x`, radius - 8, 0);
        ctx.font = 'bold 7px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`⚡${boost.boostMultiplier}x`, radius - 8, 10);
      } else {
        ctx.fillText(`${multiplier >= 0 ? '+' : ''}${multiplier}x`, radius - 8, 0);
      }
      
      ctx.restore();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw 8 flappers (fixed positions around the wheel)
    const flapperAngle = (2 * Math.PI) / FLAPPER_COUNT;
    for (let i = 0; i < FLAPPER_COUNT; i++) {
      const angle = i * flapperAngle - Math.PI / 2; // Start at top
      const flapperX = centerX + Math.cos(angle) * (radius + 15);
      const flapperY = centerY + Math.sin(angle) * (radius + 15);

      // Flapper marker (triangle pointing inward)
      ctx.save();
      ctx.translate(flapperX, flapperY);
      ctx.rotate(angle + Math.PI / 2);
      
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(-8, 8);
      ctx.lineTo(8, 8);
      ctx.closePath();
      
      // Check if this flapper has an outcome
      const outcome = seatOutcomes.find(o => o.seatNumber === i);
      if (outcome && outcome.isOccupied) {
        if (outcome.payout > 0) {
          ctx.fillStyle = '#22C55E'; // Green for win
        } else if (outcome.payout < 0) {
          ctx.fillStyle = '#EF4444'; // Red for loss
        } else {
          ctx.fillStyle = '#6B7280'; // Gray for break-even
        }
      } else {
        ctx.fillStyle = '#3B82F6'; // Blue default
      }
      
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Seat number
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((i + 1).toString(), 0, 0);
      
      ctx.restore();
    }
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const animate = () => {
      if (isSpinning && spinStartTimeRef.current > 0) {
        const elapsed = Date.now() - spinStartTimeRef.current;
        const progress = Math.min(elapsed / SPIN_DURATION, 1);
        
        // Easing function (ease-out)
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const easedProgress = easeOutCubic(progress);
        
        currentRotationRef.current = easedProgress * targetRotationRef.current;
        
        if (progress >= 1) {
          currentRotationRef.current = targetRotationRef.current;
        }
      }

      setRotation(currentRotationRef.current);
      drawWheel(ctx, width, height, currentRotationRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [wheelSegments, boostedSegments, seatOutcomes, isSpinning]);

  // Handle spin start
  useEffect(() => {
    if (isSpinning && wheelStopPosition === null) {
      // Start spinning
      spinStartTimeRef.current = Date.now();
      // Generate target rotation (multiple full rotations + final position)
      const fullRotations = 5 + Math.random() * 2; // 5-7 full rotations
      const segmentAngle = (2 * Math.PI) / SEGMENT_COUNT;
      targetRotationRef.current = fullRotations * 2 * Math.PI;
    }
  }, [isSpinning, wheelStopPosition]);

  // Handle spin complete
  useEffect(() => {
    if (!isSpinning && wheelStopPosition !== null) {
      // Snap to final position
      const segmentAngle = (2 * Math.PI) / SEGMENT_COUNT;
      const finalRotation = -(wheelStopPosition * segmentAngle);
      currentRotationRef.current = finalRotation;
      targetRotationRef.current = finalRotation;
      spinStartTimeRef.current = 0;
    }
  }, [isSpinning, wheelStopPosition]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        className="w-full h-full"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />

      {/* Status overlay */}
      {isSpinning && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="text-6xl opacity-30"
          >
            🎰
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default NewWheelCanvas;
