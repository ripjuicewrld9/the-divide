import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../types';
import { getHandValue } from '../gameLogic';
import { PlayingCard } from './PlayingCard';

interface HandDisplayProps {
  cards: Card[];
  label: string;
  isCurrent?: boolean;
  isDealer?: boolean;
  canAct?: boolean;
}

export const HandDisplay: React.FC<HandDisplayProps> = ({
  cards,
  label,
  isCurrent = false,
  isDealer = false,
  canAct = false,
}) => {
  const handValue = getHandValue(cards);
  const isBust = handValue.value > 21;
  const isBlackjack = cards.length === 2 && handValue.value === 21;

  return (
    <motion.div
      className={`rounded-lg p-1 border-2 transition-all ${
        isCurrent
          ? 'border-yellow-400 bg-green-900 shadow-xl'
          : 'border-green-700 bg-green-950'
      } ${isBust ? 'opacity-60' : ''}`}
      animate={isCurrent ? { scale: 1.02 } : { scale: 1 }}
    >
      <div className="flex flex-col items-center gap-1">
        {/* Overlapping Cards */}
        <div className="relative h-20 w-24">
          <AnimatePresence mode="popLayout">
            {cards.map((card, index) => (
              <div
                key={card.id}
                className="absolute"
                style={{
                  left: `${index * 12}px`,
                  zIndex: index,
                }}
              >
                <PlayingCard
                  card={card}
                  index={index}
                  delay={index * 0.1}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {canAct && isCurrent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-yellow-300 text-sm font-semibold animate-pulse text-center"
        >
          Your turn
        </motion.div>
      )}
    </motion.div>
  );
};
