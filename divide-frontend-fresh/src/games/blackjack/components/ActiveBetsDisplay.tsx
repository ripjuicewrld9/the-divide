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
        className={`rounded-lg border ${isMobile ? 'p-2' : 'p-3'}`}
        style={{
          background: 'rgba(26, 26, 46, 0.6)',
          borderColor: 'rgba(255, 215, 0, 0.2)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center text-gray-500 text-xs">
          No active bets
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`rounded-lg border ${isMobile ? 'p-2' : 'p-3'}`}
      style={{
        background: 'rgba(26, 26, 46, 0.6)',
        borderColor: 'rgba(255, 215, 0, 0.3)',
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className={`font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent ${isMobile ? 'text-xs' : 'text-sm'}`}>
          💰 Active Bets
        </h3>
        <div className={`font-bold text-yellow-400 ${isMobile ? 'text-sm' : 'text-base'}`}>
          ${totalBet.toFixed(2)}
        </div>
      </div>

      <div className={`space-y-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
        <AnimatePresence mode="popLayout">
          {mainBet > 0 && (
            <motion.div
              key="main"
              className="flex justify-between items-center p-2 rounded-lg"
              style={{ background: 'rgba(59, 130, 246, 0.15)', borderLeft: '3px solid #3b82f6' }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <span className="text-gray-300 flex items-center gap-2">
                <span className="text-blue-400">♠</span>
                Main Bet
              </span>
              <span className="font-bold text-blue-400">${mainBet.toFixed(2)}</span>
            </motion.div>
          )}

          {perfectPairsBet > 0 && (
            <motion.div
              key="perfectPairs"
              className="flex justify-between items-center p-2 rounded-lg"
              style={{ background: 'rgba(236, 72, 153, 0.15)', borderLeft: '3px solid #ec4899' }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: 0.05 }}
            >
              <span className="text-gray-300 flex items-center gap-2">
                <span className="text-pink-400">♥♥</span>
                Perfect Pairs
              </span>
              <span className="font-bold text-pink-400">${perfectPairsBet.toFixed(2)}</span>
            </motion.div>
          )}

          {twentyPlusThreeBet > 0 && (
            <motion.div
              key="twentyPlusThree"
              className="flex justify-between items-center p-2 rounded-lg"
              style={{ background: 'rgba(16, 185, 129, 0.15)', borderLeft: '3px solid #10b981' }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: 0.1 }}
            >
              <span className="text-gray-300 flex items-center gap-2">
                <span className="text-green-400">21+3</span>
              </span>
              <span className="font-bold text-green-400">${twentyPlusThreeBet.toFixed(2)}</span>
            </motion.div>
          )}

          {blazingSevensBet > 0 && (
            <motion.div
              key="blazingSevens"
              className="flex justify-between items-center p-2 rounded-lg"
              style={{ background: 'rgba(234, 179, 8, 0.15)', borderLeft: '3px solid #eab308' }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: 0.15 }}
            >
              <span className="text-gray-300 flex items-center gap-2">
                <span className="text-yellow-400">🔥7️⃣7️⃣7️⃣</span>
                Blazing 7s
              </span>
              <span className="font-bold text-yellow-400">${blazingSevensBet.toFixed(2)}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
