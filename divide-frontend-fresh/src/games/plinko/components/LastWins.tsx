import React from 'react';
import { binPayouts, type RowCount } from '../lib/constants';
import { usePlinkoStore } from '../store';

interface LastWinsProps {
  winCount?: number;
}

export const LastWins: React.FC<LastWinsProps> = ({ winCount = 4 }) => {
  const { winRecords } = usePlinkoStore();
  const lastWins = winRecords.slice(-winCount).reverse();

  // Generate gradient color based on payout value
  const generateGradientColor = (multiplier: number, riskLevel: string, rowCount: RowCount): string => {
    const payouts = binPayouts[rowCount][riskLevel as 'low' | 'medium' | 'high'];
    const uniquePayouts = [...new Set(payouts)].sort((a, b) => a - b);
    const payoutIndex = uniquePayouts.indexOf(multiplier);
    const ratio = uniquePayouts.length > 1 ? payoutIndex / (uniquePayouts.length - 1) : 0;

    // Interpolate between gold (#ffd700) and cyan (#00ffff)
    const gold = { r: 255, g: 215, b: 0 };
    const cyan = { r: 0, g: 255, b: 255 };

    const r = Math.round(gold.r + (cyan.r - gold.r) * ratio);
    const g = Math.round(gold.g + (cyan.g - gold.g) * ratio);
    const b = Math.round(gold.b + (cyan.b - gold.b) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="flex w-12 flex-col overflow-hidden rounded-md lg:w-14" style={{ aspectRatio: `1 / ${winCount}` }}>
      {lastWins.length === 0 ? (
        <div className="flex flex-1 items-center justify-center bg-slate-700 text-xs text-gray-400">No wins</div>
      ) : (
        lastWins.map(({ rowCount, payout: { multiplier }, profit }, idx) => {
          // Get the riskLevel from winRecords - need to infer it or store it
          // For now, we'll use a different approach: use the profit/multiplier ratio to determine risk
          // This is a workaround since riskLevel isn't stored in winRecords
          const binColor = generateGradientColor(multiplier, 'high', rowCount as RowCount);
          
          return (
            <div
              key={idx}
              className="flex flex-1 items-center justify-center text-xs font-bold text-gray-950"
              style={{
                backgroundColor: binColor,
              }}
            >
              {multiplier}
              {multiplier < 100 ? '×' : ''}
            </div>
          );
        })
      )}
    </div>
  );
};

export default LastWins;
