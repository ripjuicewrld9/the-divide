import React, { useEffect, useRef, useState } from 'react';
import { binPayouts, binColorsByRowCount, binOdds, type RowCount } from '../lib/constants';
import { RiskLevel } from '../types';
import { usePlinkoStore } from '../store';

interface BinsRowProps {
  rowCount: RowCount;
  riskLevel: RiskLevel;
  binsWidthPercentage?: number;
}

export const BinsRow: React.FC<BinsRowProps> = ({ rowCount, riskLevel, binsWidthPercentage = 1 }) => {
  const { winRecords, animationEnabled } = usePlinkoStore();
  const binRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationsRef = useRef<Animation[]>([]);
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);

  const payouts = binPayouts[rowCount][riskLevel];
  const colors = binColorsByRowCount[rowCount];
  const odds = binOdds[rowCount];
  
  // Get the actual odds for a specific bin index
  const getOddsForBin = (binIndex: number): string => {
    return odds[binIndex]?.toFixed(4) || '0';
  };

  // Generate gradient colors based on payout value (same payouts get same color)
  const generateGradientColor = (payout: number, payouts: number[]): string => {
    // Get unique payout values sorted
    const uniquePayouts = [...new Set(payouts)].sort((a, b) => a - b);
    const payoutIndex = uniquePayouts.indexOf(payout);
    const ratio = uniquePayouts.length > 1 ? payoutIndex / (uniquePayouts.length - 1) : 0;

    // Interpolate between gold (#ffd700) and cyan (#00ffff)
    const gold = { r: 255, g: 215, b: 0 };
    const cyan = { r: 0, g: 255, b: 255 };

    const r = Math.round(gold.r + (cyan.r - gold.r) * ratio);
    const g = Math.round(gold.g + (cyan.g - gold.g) * ratio);
    const b = Math.round(gold.b + (cyan.b - gold.b) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
  };

  useEffect(() => {
    // Initialize animations
    binRefs.current.forEach((bin) => {
      if (bin) {
        const animation = bin.animate(
          [{ transform: 'translateY(0)' }, { transform: 'translateY(30%)' }, { transform: 'translateY(0)' }],
          { duration: 300, easing: 'cubic-bezier(0.18, 0.89, 0.32, 1.28)' }
        );
        animation.pause();
        animationsRef.current.push(animation);
      }
    });
  }, [rowCount]);

  useEffect(() => {
    // Play animation when a new win is recorded
    if (winRecords.length > 0 && animationEnabled) {
      const lastWin = winRecords[winRecords.length - 1];
      const binIndex = lastWin.binIndex;
      if (animationsRef.current[binIndex]) {
        animationsRef.current[binIndex].cancel();
        animationsRef.current[binIndex].play();
      }
    }
  }, [winRecords, animationEnabled]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;
  return (
    <div
      className={
        isMobile
          ? 'flex w-full justify-center py-2'
          : 'flex h-[clamp(10px,0.352px+2.609vw,16px)] w-full justify-center lg:h-7'
      }
    >
      <div
        className={isMobile ? 'flex gap-2 w-full' : 'flex gap-[1%]'}
        style={isMobile ? { width: '100%' } : { width: `${binsWidthPercentage * 100}%` }}
      >
        {payouts.map((payout, idx) => {
          const binColor = generateGradientColor(payout, payouts);
          return (
            <div
              key={idx}
              ref={(el) => {
                binRefs.current[idx] = el;
              }}
              className={
                isMobile
                  ? 'flex min-w-0 flex-1 items-center justify-center rounded-lg text-base font-bold text-gray-950 shadow-md transition-all relative cursor-pointer py-4 px-1'
                  : 'flex min-w-0 flex-1 items-center justify-center rounded-xs text-[clamp(6px,2.784px+0.87vw,8px)] font-bold text-gray-950 shadow-[0_2px_0_rgba(0,0,0,0.3)] lg:rounded-md lg:text-[clamp(10px,-16.944px+2.632vw,12px)] lg:shadow-[0_3px_0_rgba(0,0,0,0.3)] transition-all relative cursor-help'
              }
              style={{
                backgroundColor: binColor,
                minHeight: isMobile ? 48 : undefined,
                fontSize: isMobile ? '1.1rem' : undefined,
                border: isMobile ? '2px solid #00ffff' : undefined,
              }}
              onMouseEnter={() => setHoveredBin(idx)}
              onMouseLeave={() => setHoveredBin(null)}
            >
              {payout}
              {payout < 100 ? '×' : ''}
              {/* Tooltip showing odds */}
              {hoveredBin === idx && (
                <div className={isMobile ? 'absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-cyan-300 text-base px-3 py-2 rounded-xl whitespace-nowrap border border-cyan-500 z-10 pointer-events-none' : 'absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-cyan-300 text-xs px-2 py-1 rounded whitespace-nowrap border border-cyan-500 z-10 pointer-events-none'}>
                  <div className={isMobile ? 'text-base' : 'text-sm'}>{getOddsForBin(idx)}% odds</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BinsRow;
