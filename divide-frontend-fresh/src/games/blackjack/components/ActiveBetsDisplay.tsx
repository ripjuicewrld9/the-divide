import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveBetsDisplayProps {
  mainBet: number;
  perfectPairsBet: number;
  twentyPlusThreeBet: number;
  blazingSevensBet: number;
  isMobile?: boolean;
}

export const ActiveBetsDisplay: React.FC<ActiveBetsDisplayProps> = ({
  mainBet,
  perfectPairsBet,
  twentyPlusThreeBet,
  blazingSevensBet,
  isMobile = false,
}) => {
  const totalBet = mainBet + perfectPairsBet + twentyPlusThreeBet + blazingSevensBet;

  if (totalBet === 0) {
    return (
      <motion.div
        className={`rounded-lg border ${isMobile ? 'p-2' : 'p-2.5'}`}
        style={{
          background: 'rgba(26, 26, 46, 0.4)',
          borderColor: 'rgba(255, 215, 0, 0.15)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center text-gray-500 text-xs">
          Place your bets
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`rounded-lg border ${isMobile ? 'p-2' : 'p-2.5'}`}
      style={{
        background: 'rgba(26, 26, 46, 0.4)',
        borderColor: 'rgba(255, 215, 0, 0.25)',
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <AnimatePresence mode="popLayout">
          {mainBet > 0 && (
            <motion.div
              key="main"
              className={`flex items-center gap-1.5 px-2 py-1 rounded ${isMobile ? 'text-xs' : 'text-xs'}`}
              style={{ background: 'rgba(59, 130, 246, 0.2)' }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <span className="text-blue-400">♠</span>
              <span className="text-gray-300 font-medium">${mainBet.toFixed(2)}</span>
            </motion.div>
          )}

          {perfectPairsBet > 0 && (
            <motion.div
              key="perfectPairs"
              className={`flex items-center gap-1.5 px-2 py-1 rounded ${isMobile ? 'text-xs' : 'text-xs'}`}
              style={{ background: 'rgba(236, 72, 153, 0.2)' }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: 0.05 }}
            >
              <span className="text-pink-400">♥♥</span>
              <span className="text-gray-300 font-medium">${perfectPairsBet.toFixed(2)}</span>
            </motion.div>
          )}

          {twentyPlusThreeBet > 0 && (
            <motion.div
              key="twentyPlusThree"
              className={`flex items-center gap-1.5 px-2 py-1 rounded ${isMobile ? 'text-xs' : 'text-xs'}`}
              style={{ background: 'rgba(16, 185, 129, 0.2)' }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: 0.1 }}
            >
              <span className="text-green-400 font-semibold">21+3</span>
              <span className="text-gray-300 font-medium">${twentyPlusThreeBet.toFixed(2)}</span>
            </motion.div>
          )}

          {blazingSevensBet > 0 && (
            <motion.div
              key="blazingSevens"
              className={`flex items-center gap-1.5 px-2 py-1 rounded ${isMobile ? 'text-xs' : 'text-xs'}`}
              style={{ background: 'rgba(234, 179, 8, 0.2)' }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: 0.15 }}
            >
              <span className="text-yellow-400">🔥7s</span>
              <span className="text-gray-300 font-medium">${blazingSevensBet.toFixed(2)}</span>
            </motion.div>
          )}

          {/* Total */}
          <motion.div
            key="total"
            className={`flex items-center gap-1.5 px-2 py-1 rounded ml-auto ${isMobile ? 'text-xs' : 'text-xs'}`}
            style={{ background: 'rgba(255, 215, 0, 0.15)', borderLeft: '2px solid rgba(255, 215, 0, 0.4)' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="text-yellow-400 font-semibold">Total</span>
            <span className="text-yellow-400 font-bold">${totalBet.toFixed(2)}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
