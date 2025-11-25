import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoundResult } from '../types';

interface BettingAreaProps {
  mainBet: number;
  perfectPairsBet: number;
  twentyPlusThreeBet: number;
  blazingSevensBet: number;
  selectedChip: number | null;
  currentMode: string | null;
  onSelectMode: (mode: 'main' | 'perfectPairs' | 'twentyPlusThree' | 'blazingSevens') => void;
  onPlaceBet: (amount: number) => void;
  onDeal: () => void;
  gamePhase: string;
  hasPlayerHand: boolean;
  lastRoundResult?: RoundResult | null;
  currentDealRatios?: {
    perfectPairsRatio?: string;
    twentyPlusThreeRatio?: string;
    blazingSevenRatio?: string;
  };
}

const ChipDisplay: React.FC<{ amount: number; payoutRatio?: string }> = ({ amount, payoutRatio }) => {
  if (amount === 0) return null;

  const getChipColor = () => {
    if (amount >= 500) return { outer: '#6d28d9', inner: '#7c3aed', rim: '#4c1d95', text: '#d8b4fe' };
    if (amount >= 100) return { outer: '#374151', inner: '#4b5563', rim: '#1f2937', text: '#e5e7eb' };
    if (amount >= 25) return { outer: '#15803d', inner: '#22c55e', rim: '#064e3b', text: '#dcfce7' };
    if (amount >= 5) return { outer: '#1d4ed8', inner: '#3b82f6', rim: '#082f4f', text: '#dbeafe' };
    return { outer: '#b91c1c', inner: '#ef4444', rim: '#7f1d1d', text: '#fecaca' };
  };

  const color = getChipColor();
  const chipCount = Math.ceil(amount / 100);
  const displayChips = Math.min(chipCount, 3);

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <div className="relative w-10 h-10 flex items-center justify-center">
        {Array.from({ length: displayChips }).map((_, i) => {
          const angle = (i - (displayChips - 1) / 2) * 12;
          const yOffset = Math.abs(i - (displayChips - 1) / 2) * 0.5;
          
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
              className="absolute w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                transform: `translate(${Math.sin((angle * Math.PI) / 180) * 3}px, ${yOffset}px) rotate(${angle}deg)`,
                zIndex: displayChips - i,
              }}
            >
              {/* Chip rim/edge - angled top view */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `linear-gradient(180deg, ${color.outer} 0%, ${color.rim} 50%, ${color.outer} 100%)`,
                  boxShadow: `0 3px 8px rgba(0, 0, 0, 0.7), inset 0 -1px 2px ${color.rim}`,
                }}
              />

              {/* Main chip surface */}
              <div
                className="absolute inset-1 rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${color.inner}, ${color.outer})`,
                  boxShadow: `inset 0 1px 3px rgba(255, 255, 255, 0.25), inset 0 -1px 2px rgba(0, 0, 0, 0.3)`,
                }}
              >
                {/* Shine */}
                <div
                  className="absolute top-0.5 left-1 w-2 h-2 rounded-full blur-xs"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent)',
                  }}
                />

                {/* Amount text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="text-center font-black"
                    style={{
                      color: color.text,
                      textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                      fontSize: '0.55rem',
                      lineHeight: 1,
                    }}
                  >
                    ${amount}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      {/* Payout ratio label - shown above chips when side bet wins */}
      {payoutRatio && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-2 py-1 rounded text-xs font-bold whitespace-nowrap"
          style={{ pointerEvents: 'none' }}
        >
          {payoutRatio}
        </motion.div>
      )}
    </div>
  );
};

export const BettingArea: React.FC<BettingAreaProps> = ({
  mainBet,
  perfectPairsBet,
  twentyPlusThreeBet,
  blazingSevensBet,
  selectedChip,
  currentMode,
  onSelectMode,
  onPlaceBet,
  onDeal,
  gamePhase,
  hasPlayerHand,
  lastRoundResult,
  currentDealRatios,
}) => {
  const isDisabled = gamePhase !== 'betting';

  // Helper function to get payout ratio for a side bet
  const getPayoutRatio = (bet: number, payout?: number): string | undefined => {
    if (!bet || !payout || payout === 0) return undefined;
    // Payout includes the original bet, so divide payout by bet to get the ratio
    const ratio = Math.round(payout / bet - 1); // subtract 1 because payout includes the original bet
    return `${ratio}:1`;
  };

  return (
    <div className="space-y-2">
      {/* Circular Betting Layout - Compact - Display Only */}
      <div style={{ position: 'relative', width: '100%', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* 777 - Top Center, directly above main bet */}
        {(
        <motion.div
          style={{
            position: 'absolute',
            top: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '2px solid',
            cursor: 'default',
            backgroundColor:
              currentMode === 'blazingSevens' ? '#7c2d12' : '#431407',
            borderColor:
              currentMode === 'blazingSevens'
                ? '#facc15'
                : '#92400e',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.1rem',
            zIndex: 5,
          }}
        >
          <div style={{ color: '#fed7aa', fontSize: '0.95rem', fontWeight: 'bold' }}>777</div>
          <motion.div
            style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#fed7aa' }}
            key={blazingSevensBet + (lastRoundResult?.blazingSevensPayout || 0)}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
          >
            ${(blazingSevensBet + (lastRoundResult?.blazingSevenResult === 'win' ? (lastRoundResult?.blazingSevensPayout || 0) : 0)).toFixed(2)}
          </motion.div>
          <ChipDisplay 
            amount={blazingSevensBet + (lastRoundResult?.blazingSevenResult === 'win' ? (lastRoundResult?.blazingSevensPayout || 0) : 0)}
            payoutRatio={lastRoundResult?.blazingSevenResult === 'win' ? getPayoutRatio(blazingSevensBet, lastRoundResult?.blazingSevensPayout) : currentDealRatios?.blazingSevenRatio}
          />
        </motion.div>
        )}

        {/* 21+3 - Left of main bet */}
        {twentyPlusThreeBet > 0 && (gamePhase === 'betting' || lastRoundResult?.twentyPlusThreeResult === 'win') && (
        <motion.div
          style={{
            position: 'absolute',
            left: 'calc(50% - 80px)',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '2px solid',
            cursor: 'default',
            backgroundColor:
              currentMode === 'twentyPlusThree' ? '#1e3a8a' : '#0c2a4a',
            borderColor:
              currentMode === 'twentyPlusThree'
                ? '#facc15'
                : '#1e40af',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.1rem',
            zIndex: 5,
          }}
        >
          <div style={{ color: '#93c5fd', fontSize: '0.8rem', fontWeight: 'bold' }}>21+3</div>
          <motion.div
            style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#93c5fd' }}
            key={twentyPlusThreeBet + (lastRoundResult?.twentyPlusThreePayout || 0)}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
          >
            ${(twentyPlusThreeBet + (lastRoundResult?.twentyPlusThreeResult === 'win' ? (lastRoundResult?.twentyPlusThreePayout || 0) : 0)).toFixed(2)}
          </motion.div>
          <ChipDisplay 
            amount={twentyPlusThreeBet + (lastRoundResult?.twentyPlusThreeResult === 'win' ? (lastRoundResult?.twentyPlusThreePayout || 0) : 0)}
            payoutRatio={lastRoundResult?.twentyPlusThreeResult === 'win' ? getPayoutRatio(twentyPlusThreeBet, lastRoundResult?.twentyPlusThreePayout) : currentDealRatios?.twentyPlusThreeRatio}
          />
        </motion.div>
        )}

        {/* Main Bet - Center */}
        <motion.div
          onClick={() => {
            if (!isDisabled) {
              if (currentMode === 'main' && selectedChip) {
                onPlaceBet(selectedChip);
              } else {
                onSelectMode('main');
              }
            }
          }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '75px',
            height: '75px',
            borderRadius: '50%',
            border: '3px solid',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            backgroundColor:
              currentMode === 'main' ? '#166534' : isDisabled ? '#1f2937' : '#1a4d2e',
            borderColor:
              currentMode === 'main' ? '#facc15' : isDisabled ? '#4b5563' : '#15803d',
            opacity: isDisabled ? 0.5 : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem',
            zIndex: mainBet > 0 ? 5 : 10,
          }}
          whileHover={!isDisabled ? {} : {}}
          whileTap={!isDisabled ? {} : {}}
        >
          <div style={{ color: '#d1d5db', fontSize: '0.6rem', fontWeight: '600', textTransform: 'uppercase' }}>
            Main
          </div>
          <motion.div
            style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fbbf24' }}
            key={mainBet}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
          >
            Bet
          </motion.div>
          {mainBet > 0 && <ChipDisplay amount={mainBet} />}
        </motion.div>

        {/* Perfect Pairs - Right of main bet */}
        {(perfectPairsBet > 0 || (gamePhase === 'betting' && (currentMode === 'perfectPairs' || selectedChip !== null))) && (gamePhase === 'betting' || lastRoundResult?.perfectPairsResult === 'win') && (
        <motion.div
          onClick={() => {
            if (!isDisabled) {
              if (currentMode === 'perfectPairs' && selectedChip) {
                onPlaceBet(selectedChip);
              } else {
                onSelectMode('perfectPairs');
              }
            }
          }}
          style={{
            position: 'absolute',
            right: 'calc(50% - 80px)',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '2px solid',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            backgroundColor:
              currentMode === 'perfectPairs' ? '#581c87' : isDisabled ? '#1f2937' : '#3f0f5c',
            borderColor:
              currentMode === 'perfectPairs'
                ? '#facc15'
                : isDisabled
                ? '#4b5563'
                : '#7c3aed',
            opacity: isDisabled ? 0.5 : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.1rem',
            zIndex: perfectPairsBet > 0 ? 5 : 1,
          }}
          whileHover={!isDisabled ? {} : {}}
          whileTap={!isDisabled ? {} : {}}
        >
          <div style={{ color: '#d8b4fe', fontSize: '0.8rem', fontWeight: 'bold' }}>PP</div>
          <motion.div
            style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#d8b4fe' }}
            key={perfectPairsBet + (lastRoundResult?.perfectPairsPayout || 0)}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
          >
            ${(perfectPairsBet + (lastRoundResult?.perfectPairsResult === 'win' ? (lastRoundResult?.perfectPairsPayout || 0) : 0)).toFixed(2)}
          </motion.div>
          {perfectPairsBet > 0 && (
            <ChipDisplay 
              amount={perfectPairsBet + (lastRoundResult?.perfectPairsResult === 'win' ? (lastRoundResult?.perfectPairsPayout || 0) : 0)}
              payoutRatio={lastRoundResult?.perfectPairsResult === 'win' ? getPayoutRatio(perfectPairsBet, lastRoundResult?.perfectPairsPayout) : currentDealRatios?.perfectPairsRatio}
            />
          )}
        </motion.div>
        )}
      </div>
    </div>
  );
};
