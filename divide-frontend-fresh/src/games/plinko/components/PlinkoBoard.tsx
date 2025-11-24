import React from 'react';
import { Risk, Rows, PAYTABLE } from '../lib/paytable';

interface PlinkoBoardProps {
  risk: Risk;
  rows: Rows;
  activeSlot?: number;
}

export const PlinkoBoard: React.FC<PlinkoBoardProps> = ({ risk, rows, activeSlot }) => {
  // Fixed peg grid: starts with 3 at top, then 4, 5, 6, 7...
  // This creates a proper Plinko triangle
  const slotCount = rows + 2; // Number of bins at the bottom
  const paytable = PAYTABLE[risk][rows];

  // Generate pegs - classic Plinko triangle (3, 4, 5, 6, 7...)
  const pegs: Array<{ x: number; y: number }> = [];

  for (let r = 0; r < rows; r++) {
    const pegsInRow = 3 + r; // 3, 4, 5, 6, 7...
    const rowY = (r / (rows - 1)) * 0.8; // Top 80% of space
    const pegSpacing = 0.08; // Fixed spacing between pegs (wider for visibility)
    const rowStartX = 0.5 - (pegsInRow * pegSpacing) / 2; // Center horizontally

    for (let c = 0; c < pegsInRow; c++) {
      const pegX = rowStartX + c * pegSpacing;
      pegs.push({ x: pegX, y: rowY });
    }
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-lg overflow-hidden">
      {/* Peg Triangle */}
      {pegs.map((peg, idx) => (
        <div
          key={`peg_${idx}`}
          className="absolute w-2.5 h-2.5 bg-purple-400 rounded-full shadow-lg shadow-purple-500/50"
          style={{
            left: `${peg.x * 100}%`,
            top: `${peg.y * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Multiplier Bins - Snapped to bottom, positioned RIGHT */}
      <div className="absolute bottom-0 right-0 h-16 flex items-center gap-0 pr-4">
        {paytable.map((mult, idx) => {
          const isActive = idx === activeSlot;
          const color = mult >= 100 ? 'purple' : mult >= 10 ? 'yellow' : mult >= 2 ? 'green' : 'red';

          const colorMap: Record<string, string> = {
            purple: 'from-purple-600 to-purple-800 border-purple-400',
            yellow: 'from-yellow-600 to-yellow-800 border-yellow-400',
            green: 'from-green-600 to-green-800 border-green-400',
            red: 'from-red-700 to-red-900 border-red-400',
          };

          return (
            <div
              key={`slot_${idx}`}
              className={`h-full min-w-8 flex items-center justify-center border-2 transition-all duration-300 bg-gradient-to-b text-center ${
                isActive ? 'shadow-lg scale-y-110' : ''
              } ${colorMap[color]}`}
            >
              <div className="text-xs font-bold text-white opacity-90 px-1">
                {(mult ?? 0).toFixed(2)}x
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlinkoBoard;
