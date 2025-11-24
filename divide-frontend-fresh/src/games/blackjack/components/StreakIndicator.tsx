import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StreakIndicatorProps {
  streakCount: number;
  streakType: 'win' | 'loss' | null;
}

export const StreakIndicator: React.FC<StreakIndicatorProps> = ({ streakCount, streakType }) => {
  if (streakCount === 0 || !streakType) return null;

  const isWinStreak = streakType === 'win';
  const bgColor = isWinStreak ? 'bg-green-900' : 'bg-red-900';
  const borderColor = isWinStreak ? 'border-green-500' : 'border-red-500';
  const textColor = isWinStreak ? 'text-green-300' : 'text-red-300';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`rounded-xl p-2 border-2 ${bgColor} ${borderColor} w-14 h-20 flex flex-col items-center justify-center`}
    >
      <div className="text-center">
        <div className={`text-lg font-bold`} style={{ fontSize: '1.2rem', lineHeight: '1' }}>
          {isWinStreak ? '🔥' : '❌'}
        </div>
        <motion.div
          className={`text-lg font-bold ${textColor} mt-1`}
          key={streakCount}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
        >
          ×{streakCount}
        </motion.div>
      </div>
    </motion.div>
  );
};
