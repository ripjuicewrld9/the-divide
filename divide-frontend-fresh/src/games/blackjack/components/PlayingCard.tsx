import React from 'react';
import { Card, Suit } from '../types';
import { motion } from 'framer-motion';

interface PlayingCardProps {
  card: Card;
  isHidden?: boolean;
  isDealer?: boolean;
  index?: number;
  delay?: number;
}

const getSuitColor = (suit: Suit): string => {
  return suit === 'hearts' || suit === 'diamonds' ? '#E63946' : '#000000';
};

const getSuitSymbol = (suit: Suit): string => {
  switch (suit) {
    case 'hearts':
      return '♥';
    case 'diamonds':
      return '♦';
    case 'clubs':
      return '♣';
    case 'spades':
      return '♠';
  }
};

export const PlayingCard = React.forwardRef<HTMLDivElement, PlayingCardProps>(
  (
    {
      card,
      isHidden = false,
      isDealer = false,
      index = 0,
      delay = 0,
    },
    ref
  ) => {
    const color = getSuitColor(card.suit);
    const symbol = getSuitSymbol(card.suit);

    return (
    <motion.div
      initial={{
        x: 0,
        y: -200,
        rotateZ: isDealer ? 20 : -20,
        opacity: 0,
      }}
      animate={{
        x: index * 15,
        y: 0,
        rotateZ: 0,
        opacity: 1,
      }}
      transition={{
        delay: delay || index * 0.1,
        duration: 0.6,
        ease: 'easeOut',
      }}
      className="relative w-20 h-28 flex-shrink-0"
    >
      {isHidden ? (
        <motion.div
          animate={{ rotateY: 180 }}
          transition={{ duration: 0.6 }}
          className="w-full h-full rounded-lg bg-gradient-to-br from-blue-800 to-blue-900 border-2 border-blue-600 shadow-lg flex items-center justify-center"
          style={{ perspective: '1000px' }}
        >
          <div className="text-white text-xl font-bold">♠♥♣♦</div>
        </motion.div>
      ) : (
        <motion.div
          animate={{ rotateY: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full h-full rounded-lg bg-white border-2 border-gray-300 shadow-lg flex flex-col p-1 relative"
          style={{ perspective: '1000px' }}
        >
          {/* Top-left corner */}
          <div className="absolute top-1 left-1 flex flex-col items-center leading-none">
            <div className="text-xs font-bold" style={{ color }}>
              {card.rank}
            </div>
            <div className="text-xs" style={{ color }}>
              {symbol}
            </div>
          </div>
          
          {/* Center suit */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-2xl" style={{ color }}>
              {symbol}
            </div>
          </div>
          
          {/* Bottom-right corner (rotated 180) */}
          <div className="absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180">
            <div className="text-xs font-bold" style={{ color }}>
              {card.rank}
            </div>
            <div className="text-xs" style={{ color }}>
              {symbol}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
    );
  }
);

PlayingCard.displayName = 'PlayingCard';

interface CardPlaceholderProps {
  size?: 'sm' | 'md' | 'lg';
}

export const CardPlaceholder: React.FC<CardPlaceholderProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-16 h-24',
    md: 'w-20 h-28',
    lg: 'w-24 h-32',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-lg border-2 border-dashed border-gray-500 bg-gray-700 opacity-50`} />
  );
};
