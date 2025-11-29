import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SEAT_COLORS } from '../constants';

interface WheelCanvasProps {
  winningSegment: number | null;
  isSpinning: boolean;
  onSpinComplete?: () => void;
}

const WheelCanvas: React.FC<WheelCanvasProps> = ({ winningSegment, isSpinning, onSpinComplete }) => {
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
    const radius = Math.min(centerX, centerY) - 20;

    const drawWheel = (rotation: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw wheel segments
      const totalSegments = 54;
      const segmentAngle = (2 * Math.PI) / totalSegments;

      for (let i = 0; i < totalSegments; i++) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation + i * segmentAngle);

        // Determine color based on which seat owns this segment
        let colorIndex = i % 12;
        if (i < 9 * 6) {
          colorIndex = Math.floor(i / 6);
        } else if (i >= 9 * 6) {
          // Seats 9, 10, 11 have different distributions
          if (i % 6 === 0) colorIndex = 9;
          else if (i % 6 === 3) colorIndex = 10;
          else colorIndex = 11;
        }

        ctx.fillStyle = SEAT_COLORS[colorIndex];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, 0, segmentAngle);
        ctx.lineTo(0, 0);
        ctx.fill();

        // Draw border
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
      }

      // Draw center circle
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
      ctx.fill();

      // Draw pointer at top
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(centerX, 10);
      ctx.lineTo(centerX - 15, 35);
      ctx.lineTo(centerX + 15, 35);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();
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
          const segmentAngle = (2 * Math.PI) / 54;
          const targetRotation = (54 - winningSegment) * segmentAngle + Math.PI / 2;
          const totalRotations = 5 * 2 * Math.PI; // 5 full spins
          const finalRotation = totalRotations + targetRotation;

          rotationRef.current = finalRotation * easeOut;
          drawWheel(rotationRef.current);
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Spin complete
          const segmentAngle = (2 * Math.PI) / 54;
          const targetRotation = (54 - winningSegment) * segmentAngle + Math.PI / 2;
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
        width={500}
        height={500}
        className="max-w-full h-auto"
      />
    </div>
  );
};

export default WheelCanvas;
