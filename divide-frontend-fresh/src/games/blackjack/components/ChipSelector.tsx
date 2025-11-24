import React from 'react';
import { motion } from 'framer-motion';

interface ChipSelectorProps {
  balance: number;
  onSelectChip: (amount: number) => void;
  selectedChip: number | null;
  disabled?: boolean;
}

const CHIP_DENOMINATIONS = [
  { value: 1, color: 'from-red-600 to-red-700', innerColor: '#dc2626', labelColor: '#fecaca' },
  { value: 5, color: 'from-blue-600 to-blue-700', innerColor: '#2563eb', labelColor: '#93c5fd' },
  { value: 25, color: 'from-green-600 to-green-700', innerColor: '#16a34a', labelColor: '#86efac' },
  { value: 100, color: 'from-gray-600 to-gray-700', innerColor: '#4b5563', labelColor: '#e5e7eb' },
  { value: 500, color: 'from-purple-600 to-purple-700', innerColor: '#7c3aed', labelColor: '#d8b4fe' },
];

export const ChipSelector: React.FC<ChipSelectorProps> = ({
  balance,
  onSelectChip,
  selectedChip,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-1 items-center">
      <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Chips</div>
      <div className="flex flex-row gap-1">
        {CHIP_DENOMINATIONS.map((chip) => {
          const isAffordable = balance >= chip.value;
          const isSelected = selectedChip === chip.value;
          const isClickable = !disabled && isAffordable;

          return (
            <motion.button
              key={chip.value}
              onClick={() => isClickable && onSelectChip(chip.value)}
              disabled={!isClickable}
              whileHover={isClickable ? { scale: 1.08 } : {}}
              whileTap={isClickable ? { scale: 0.92 } : {}}
              className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden transition-opacity flex-shrink-0"
              style={{
                opacity: disabled && !isAffordable ? 0.4 : 1,
                cursor: isClickable ? 'pointer' : 'not-allowed',
              }}
            >
              {/* Outer rim */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, ${chip.innerColor}, ${chip.innerColor}aa, ${chip.innerColor})`,
                  boxShadow: `0 8px 16px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.3)`,
                }}
              />

              {/* Inner chip body */}
              <div
                className="absolute inset-1 rounded-full flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${chip.innerColor}, ${chip.innerColor}dd)`,
                  boxShadow: `inset 0 2px 8px rgba(0, 0, 0, 0.4), inset 0 -2px 4px rgba(255, 255, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.3)`,
                }}
              >
                {/* Shine effect */}
                <div
                  className="absolute top-1 left-1 w-3 h-3 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent)',
                  }}
                />

                {/* Center text */}
                <div className="flex flex-col items-center justify-center z-10">
                  <div
                    className="font-black"
                    style={{
                      color: chip.labelColor,
                      textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                      fontSize: '0.5rem',
                      letterSpacing: '0.3px',
                    }}
                  >
                    ${chip.value}
                  </div>
                </div>
              </div>

              {/* Selection ring */}
              {isSelected && (
                <motion.div
                  layoutId="chip-selection"
                  className="absolute inset-0 rounded-full border-2"
                  style={{ borderColor: '#facc15' }}
                  animate={{ boxShadow: '0 0 12px rgba(250, 204, 21, 0.6)' }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
