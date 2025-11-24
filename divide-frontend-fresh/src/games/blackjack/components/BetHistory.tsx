import React from 'react';
import { motion } from 'framer-motion';

interface BetHistoryEntry {
  timestamp: number;
  playerBet: number;
  playerTotal: number;
  dealerTotal: number;
  outcome: string;
  payout: number;
}

interface BetHistoryProps {
  history: BetHistoryEntry[];
}

export const BetHistory: React.FC<BetHistoryProps> = ({ history }) => {
  const lastRound = history[history.length - 1];

  return (
    <motion.div
      className="bg-gray-800 rounded-lg border-2 border-gray-700 p-2 text-xs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {lastRound ? (
        <div className="text-gray-300 space-y-1">
          <div className="flex justify-between">
            <span>Bet:</span>
            <span className="font-bold text-yellow-400">${lastRound.playerBet.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>You: {lastRound.playerTotal} | Dealer: {lastRound.dealerTotal}</span>
            <span className={lastRound.payout > lastRound.playerBet ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
              {lastRound.outcome.toUpperCase()}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-gray-500">No hands played yet</div>
      )}
    </motion.div>
  );
};
