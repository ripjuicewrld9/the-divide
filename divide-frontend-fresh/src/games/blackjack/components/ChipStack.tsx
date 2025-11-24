import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChipStackProps {
  balance: number;
  onSelectChip: (amount: number) => void;
  selectedChip: number | null;
  disabled?: boolean;
}

const CHIP_DENOMINATIONS = [1, 5, 25, 100, 500];

export const ChipStack: React.FC<ChipStackProps> = ({
  balance,
  onSelectChip,
  selectedChip,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <div className="text-gray-400 text-sm font-semibold">SELECT CHIP VALUE</div>
        <div className="grid grid-cols-5 gap-2">
          {CHIP_DENOMINATIONS.map((denomination) => (
            <motion.button
              key={denomination}
              onClick={() => onSelectChip(denomination)}
              disabled={disabled || balance < denomination}
              className={`py-3 px-2 rounded-lg font-bold text-sm transition-all ${
                selectedChip === denomination
                  ? 'ring-4 ring-yellow-400'
                  : ''
              } ${
                denomination === 1
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : denomination === 5
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : denomination === 25
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : denomination === 100
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              } ${
                disabled || balance < denomination
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
              }`}
              whileHover={!disabled && balance >= denomination ? { scale: 1.05 } : {}}
              whileTap={!disabled && balance >= denomination ? { scale: 0.95 } : {}}
            >
              <div>${denomination}</div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};
