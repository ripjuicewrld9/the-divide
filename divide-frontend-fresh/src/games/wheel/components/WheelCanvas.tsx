import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface WheelCanvasProps {
  winningSegment: number | null;
  isSpinning: boolean;
  onSpinComplete?: () => void;
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
    const radius = Math.min(centerX, centerY) - 30;

    const drawWheel = (rotation: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const totalSegments = WHEEL_SEGMENTS.length;
      const segmentAngle = (2 * Math.PI) / totalSegments;

      // Draw 3D outer shadow/depth
      const gradient = ctx.createRadialGradient(centerX, centerY, radius - 30, centerX, centerY, radius + 20);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.8, 'rgba(0,0,0,0.3)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 20, 0, 2 * Math.PI);
      ctx.fill();

      // Draw wheel segments
      for (let i = 0; i < totalSegments; i++) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation + i * segmentAngle);

        const multiplier = WHEEL_SEGMENTS[i];
        const baseColor = getSegmentColor(multiplier);
        
        // Create radial gradient for 3D effect
        const segmentGradient = ctx.createRadialGradient(0, 0, 40, 0, 0, radius);
        segmentGradient.addColorStop(0, lightenColor(baseColor, 30));
        segmentGradient.addColorStop(0.6, baseColor);
        segmentGradient.addColorStop(1, darkenColor(baseColor, 20));
        ctx.fillStyle = segmentGradient;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, 0, segmentAngle);
        ctx.lineTo(0, 0);
        ctx.fill();

        // Draw border between segments with gold accent
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw multiplier text with shadow
        ctx.rotate(segmentAngle / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        const displayText = multiplier > 0 ? `${multiplier}x` : `${multiplier}x`;
        ctx.fillText(displayText, radius * 0.7, 0);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.restore();
      }

      // Draw outer rim with 3D effect (like the red rim in the image)
      // Outer rim shadow
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI);
      ctx.stroke();

      // Main red rim
      const rimGradient = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
      rimGradient.addColorStop(0, '#dc2626');
      rimGradient.addColorStop(0.5, '#ef4444');
      rimGradient.addColorStop(1, '#991b1b');
      ctx.strokeStyle = rimGradient;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();

      // Rim highlight
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 6, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw decorative studs on rim
      for (let i = 0; i < totalSegments; i++) {
        const angle = (i * 2 * Math.PI) / totalSegments;
        const studX = centerX + (radius - 7) * Math.cos(angle);
        const studY = centerY + (radius - 7) * Math.sin(angle);
        
        // Stud shadow
        ctx.fillStyle = '#4b5563';
        ctx.beginPath();
        ctx.arc(studX + 1, studY + 1, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Stud
        const studGradient = ctx.createRadialGradient(studX - 1, studY - 1, 1, studX, studY, 4);
        studGradient.addColorStop(0, '#fef3c7');
        studGradient.addColorStop(0.5, '#fbbf24');
        studGradient.addColorStop(1, '#92400e');
        ctx.fillStyle = studGradient;
        ctx.beginPath();
        ctx.arc(studX, studY, 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw center hub with 3D gold effect
      // Hub shadow
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(centerX + 3, centerY + 3, 48, 0, 2 * Math.PI);
      ctx.fill();

      // Hub base
      const hubGradient = ctx.createRadialGradient(centerX - 15, centerY - 15, 10, centerX, centerY, 48);
      hubGradient.addColorStop(0, '#fef3c7');
      hubGradient.addColorStop(0.3, '#fbbf24');
      hubGradient.addColorStop(0.7, '#f59e0b');
      hubGradient.addColorStop(1, '#92400e');
      ctx.fillStyle = hubGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 45, 0, 2 * Math.PI);
      ctx.fill();

      // Hub highlight ring
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX - 5, centerY - 5, 35, Math.PI, Math.PI * 1.7);
      ctx.stroke();

      // Hub inner circle
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
      ctx.fill();

      // Hub center shine
      const shineGradient = ctx.createRadialGradient(centerX - 5, centerY - 5, 0, centerX, centerY, 20);
      shineGradient.addColorStop(0, '#fef9c3');
      shineGradient.addColorStop(0.5, '#fbbf24');
      shineGradient.addColorStop(1, '#92400e');
      ctx.fillStyle = shineGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
      ctx.fill();
    };

    // Helper functions for color manipulation
    const lightenColor = (color: string, percent: number): string => {
      const num = parseInt(color.replace('#', ''), 16);
      const r = Math.min(255, ((num >> 16) & 0xff) + percent);
      const g = Math.min(255, ((num >> 8) & 0xff) + percent);
      const b = Math.min(255, (num & 0xff) + percent);
      return `rgb(${r},${g},${b})`;
    };

    const darkenColor = (color: string, percent: number): string => {
      const num = parseInt(color.replace('#', ''), 16);
      const r = Math.max(0, ((num >> 16) & 0xff) - percent);
      const g = Math.max(0, ((num >> 8) & 0xff) - percent);
      const b = Math.max(0, (num & 0xff) - percent);
      return `rgb(${r},${g},${b})`;
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
