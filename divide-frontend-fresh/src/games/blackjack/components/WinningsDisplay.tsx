import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoundResult } from '../types';

interface WinningsDisplayProps {
  result: RoundResult | null;
  isVisible: boolean;
}

const PAYOUT_RATIOS = {
  perfectPairs: { 'mixed': '5:1', 'colored': '10:1', 'identical': '25:1' },
  twentyPlusThree: { '0': '1:1', '1': '2:1', '2': '2:1', '3': '3:1' },
  blazingSevens: { '1': '3:1', '2': '50:1', '3': '500:1' },
};

export const WinningsDisplay: React.FC<WinningsDisplayProps> = ({ result, isVisible }) => {
  if (!result) return null;

  const mainWinAmount = result.payout;
  const totalWinnings = 
    mainWinAmount + 
    (result.perfectPairsPayout || 0) + 
    (result.twentyPlusThreePayout || 0) + 
    (result.blazingSevensPayout || 0);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-black bg-opacity-90 rounded-lg p-6 max-w-sm border-2 border-yellow-400 shadow-2xl">
            {/* Main Outcome */}
            <div className="text-center mb-4">
              <div className={`text-3xl font-bold mb-2 ${
                result.outcome === 'win' || result.outcome === 'blackjack' ? 'text-green-400' :
                result.outcome === 'push' ? 'text-blue-400' :
                'text-red-400'
              }`}>
                {result.outcome === 'blackjack' ? '🎉 BLACKJACK!' : 
                 result.outcome === 'win' ? '✓ WIN' :
                 result.outcome === 'push' ? '= PUSH' :
                 result.outcome === 'bust' ? '💥 BUST' :
                 '✗ LOSS'}
              </div>
              {mainWinAmount > 0 && (
                <div className="text-yellow-300 text-2xl font-bold">
                  +${mainWinAmount.toFixed(2)}
                </div>
              )}
            </div>

            {/* Side Bets Results */}
            <div className="space-y-2 mb-4">
              {result.perfectPairsBet && result.perfectPairsBet > 0 && (
                <div className={`text-sm p-2 rounded ${
                  result.perfectPairsResult === 'win' 
                    ? 'bg-green-900 text-green-200' 
                    : 'bg-red-900 text-red-200'
                }`}>
                  <div className="font-semibold">
                    Perfect Pairs {result.perfectPairsRatio ? `(${result.perfectPairsRatio})` : ''}: {result.perfectPairsResult === 'win' ? 'HIT ✓' : 'MISS'}
                  </div>
                  {result.perfectPairsResult === 'win' && result.perfectPairsPayout && (
                    <div className="text-yellow-300">+${result.perfectPairsPayout.toFixed(2)}</div>
                  )}
                </div>
              )}

              {result.twentyPlusThreeBet && result.twentyPlusThreeBet > 0 && (
                <div className={`text-sm p-2 rounded ${
                  result.twentyPlusThreeResult === 'win' 
                    ? 'bg-green-900 text-green-200' 
                    : 'bg-red-900 text-red-200'
                }`}>
                  <div className="font-semibold">
                    21+3 {result.twentyPlusThreeRatio ? `(${result.twentyPlusThreeRatio})` : ''}: {result.twentyPlusThreeResult === 'win' ? 'HIT ✓' : 'MISS'}
                  </div>
                  {result.twentyPlusThreeResult === 'win' && result.twentyPlusThreePayout && (
                    <div className="text-yellow-300">+${result.twentyPlusThreePayout.toFixed(2)}</div>
                  )}
                </div>
              )}

              {result.blazingSevensBet && result.blazingSevensBet > 0 && (
                <div className={`text-sm p-2 rounded ${
                  result.blazingSevenResult === 'win' 
                    ? 'bg-green-900 text-green-200' 
                    : 'bg-red-900 text-red-200'
                }`}>
                  <div className="font-semibold">
                    Blazing 7s {result.blazingSevenRatio ? `(${result.blazingSevenRatio})` : ''}: {result.blazingSevenResult === 'win' ? 'HIT ✓' : 'MISS'}
                  </div>
                  {result.blazingSevenResult === 'win' && result.blazingSevensPayout && (
                    <div className="text-yellow-300">+${result.blazingSevensPayout.toFixed(2)}</div>
                  )}
                </div>
              )}
            </div>

            {/* Total */}
            {totalWinnings > 0 && (
              <div className="border-t border-yellow-400 pt-3 text-center">
                <div className="text-gray-300 text-xs mb-1">TOTAL WINNINGS</div>
                <div className="text-yellow-400 text-2xl font-bold">
                  ${totalWinnings.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
