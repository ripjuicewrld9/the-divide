import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoundResult } from '../types';

interface BetHistoryProps {
  history: RoundResult[];
  isMobile?: boolean;
}

export const BetHistory: React.FC<BetHistoryProps> = ({ history, isMobile = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayHistory = isExpanded ? history.slice().reverse() : history.slice(-3).reverse();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'win':
      case 'blackjack':
        return 'text-green-400';
      case 'loss':
      case 'bust':
        return 'text-red-400';
      case 'push':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTotalBet = (round: RoundResult) => {
    let total = round.playerBet || 0;
    if (round.perfectPairsBet) total += round.perfectPairsBet;
    if (round.twentyPlusThreeBet) total += round.twentyPlusThreeBet;
    if (round.blazingSevensBet) total += round.blazingSevensBet;
    return total;
  };

  const getTotalPayout = (round: RoundResult) => {
    let total = round.payout || 0;
    if (round.perfectPairsPayout) total += round.perfectPairsPayout;
    if (round.twentyPlusThreePayout) total += round.twentyPlusThreePayout;
    if (round.blazingSevensPayout) total += round.blazingSevensPayout;
    return total;
  };

  if (history.length === 0) {
    return (
      <motion.div
        className={`rounded-lg border ${isMobile ? 'p-3' : 'p-4'}`}
        style={{
          background: 'rgba(26, 26, 46, 0.6)',
          borderColor: 'rgba(0, 255, 255, 0.2)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center text-gray-500 text-sm">
          No hands played yet
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`rounded-lg border ${isMobile ? 'p-2' : 'p-4'}`}
      style={{
        background: 'rgba(26, 26, 46, 0.6)',
        borderColor: 'rgba(0, 255, 255, 0.2)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className={`font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent ${isMobile ? 'text-sm' : 'text-base'}`}>
          🎲 Bet History ({history.length})
        </h3>
        {history.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`${isMobile ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'} bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded transition-colors`}
          >
            {isExpanded ? 'Show Less' : 'Show All'}
          </button>
        )}
      </div>

      <div className={`space-y-2 ${isExpanded ? 'max-h-96 overflow-y-auto' : ''}`}>
        <AnimatePresence mode="popLayout">
          {displayHistory.map((round, index) => {
            const totalBet = getTotalBet(round);
            const totalPayout = getTotalPayout(round);
            const netProfit = totalPayout - totalBet;

            return (
              <motion.div
                key={round.timestamp}
                className={`rounded-lg ${isMobile ? 'p-2' : 'p-3'} border`}
                style={{
                  background: 'rgba(15, 15, 30, 0.8)',
                  borderColor: netProfit > 0 ? 'rgba(34, 197, 94, 0.3)' : netProfit < 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)',
                }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start mb-2">
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-400`}>
                    {formatTime(round.timestamp)}
                  </div>
                  <div className={`font-bold ${getOutcomeColor(round.outcome)} ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {round.outcome.toUpperCase()}
                  </div>
                </div>

                {/* Hand Info */}
                <div className={`flex justify-between items-center mb-2 ${isMobile ? 'text-xs' : 'text-sm'} text-gray-300`}>
                  <span>You: {round.playerTotal}</span>
                  <span className="text-gray-500">vs</span>
                  <span>Dealer: {round.dealerTotal}</span>
                </div>

                {/* Main Bet */}
                <div className={`space-y-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Main Bet:</span>
                    <span className="text-yellow-400 font-semibold">${round.playerBet.toFixed(2)}</span>
                  </div>
                  {round.payout > 0 && (
                    <div className="flex justify-between pl-4">
                      <span className="text-gray-500 text-xs">Payout:</span>
                      <span className="text-green-400 font-semibold">${round.payout.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Perfect Pairs Side Bet */}
                  {round.perfectPairsBet && round.perfectPairsBet > 0 && (
                    <>
                      <div className="flex justify-between pt-1 border-t border-white/5">
                        <span className="text-gray-400">Perfect Pairs:</span>
                        <span className="text-yellow-400 font-semibold">${round.perfectPairsBet.toFixed(2)}</span>
                      </div>
                      {round.perfectPairsPayout && round.perfectPairsPayout > 0 ? (
                        <div className="flex justify-between pl-4">
                          <span className="text-green-400 text-xs">{round.perfectPairsRatio || 'WIN'}</span>
                          <span className="text-green-400 font-semibold">${round.perfectPairsPayout.toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between pl-4">
                          <span className="text-red-400 text-xs">Lost</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* 21+3 Side Bet */}
                  {round.twentyPlusThreeBet && round.twentyPlusThreeBet > 0 && (
                    <>
                      <div className="flex justify-between pt-1 border-t border-white/5">
                        <span className="text-gray-400">21+3:</span>
                        <span className="text-yellow-400 font-semibold">${round.twentyPlusThreeBet.toFixed(2)}</span>
                      </div>
                      {round.twentyPlusThreePayout && round.twentyPlusThreePayout > 0 ? (
                        <div className="flex justify-between pl-4">
                          <span className="text-green-400 text-xs">{round.twentyPlusThreeRatio || 'WIN'}</span>
                          <span className="text-green-400 font-semibold">${round.twentyPlusThreePayout.toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between pl-4">
                          <span className="text-red-400 text-xs">Lost</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Blazing 7s Side Bet */}
                  {round.blazingSevensBet && round.blazingSevensBet > 0 && (
                    <>
                      <div className="flex justify-between pt-1 border-t border-white/5">
                        <span className="text-gray-400">Blazing 7s:</span>
                        <span className="text-yellow-400 font-semibold">${round.blazingSevensBet.toFixed(2)}</span>
                      </div>
                      {round.blazingSevensPayout && round.blazingSevensPayout > 0 ? (
                        <div className="flex justify-between pl-4">
                          <span className="text-green-400 text-xs">{round.blazingSevenRatio || 'WIN'}</span>
                          <span className="text-green-400 font-semibold">${round.blazingSevensPayout.toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between pl-4">
                          <span className="text-red-400 text-xs">Lost</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Total */}
                  <div className={`flex justify-between pt-2 border-t border-white/10 font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>
                    <span className="text-gray-300">Net:</span>
                    <span className={netProfit > 0 ? 'text-green-400' : netProfit < 0 ? 'text-red-400' : 'text-yellow-400'}>
                      {netProfit > 0 ? '+' : ''}{netProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
