import React from 'react';
import { motion } from 'framer-motion';
import UserAvatar from '../../../components/UserAvatar';

interface WheelSeatProps {
  seatNumber: number;
  multiplier: number;
  occupied: boolean;
  userId?: string;
  username?: string;
  profileImage?: string;
  betAmount?: number;
  isSelected: boolean;
  isMySeat: boolean;
  canBet: boolean;
  angle: number; // Position angle around the wheel (0-360)
  onSelect: () => void;
}

const WheelSeat: React.FC<WheelSeatProps> = ({
  seatNumber,
  multiplier,
  occupied,
  userId,
  username,
  profileImage,
  betAmount,
  isSelected,
  isMySeat,
  canBet,
  angle,
  onSelect,
}) => {
  // Calculate position using polar coordinates
  const radius = 48; // percentage from center - increased to move seats further out
  const x = 50 + radius * Math.cos((angle - 90) * (Math.PI / 180));
  const y = 50 + radius * Math.sin((angle - 90) * (Math.PI / 180));

  return (
    <motion.div
      className="absolute z-20"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
      }}
      whileHover={!occupied && canBet ? { scale: 1.1 } : {}}
      whileTap={!occupied && canBet ? { scale: 0.95 } : {}}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!occupied && canBet) {
            console.log('Seat clicked:', seatNumber, 'occupied:', occupied, 'canBet:', canBet);
            onSelect();
          }
        }}
        className={`relative w-16 h-20 rounded-xl transition-all ${
          (!occupied && canBet) ? 'cursor-pointer' : 'cursor-default'
        } ${
          isMySeat
            ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-4 border-green-300 shadow-xl shadow-green-500/50'
            : isSelected
            ? 'bg-gradient-to-br from-yellow-500 to-orange-500 border-4 border-yellow-300 shadow-xl shadow-yellow-500/50'
            : occupied
            ? 'bg-gradient-to-br from-gray-700 to-gray-900 border-4 border-gray-600 opacity-75'
            : 'bg-gradient-to-br from-purple-600 to-blue-700 border-4 border-purple-400 hover:border-cyan-400 shadow-xl cursor-pointer'
        }`}
      >
        {/* Seat number */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full border-2 border-white flex items-center justify-center z-10 shadow-lg">
          <span className="text-white text-xs font-black">{seatNumber + 1}</span>
        </div>

        {/* Chair back */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-lg border-2 border-gray-700" />

        {/* Content */}
        <div className="flex flex-col items-center justify-center h-full p-1">
          {occupied && username ? (
            <>
              {/* Player avatar */}
              <div className="mb-1">
                <UserAvatar user={{ username, profileImage, _id: userId }} size={28} />
              </div>
              {/* Bet amount */}
              <div className="text-white text-[10px] font-bold bg-black/50 px-1.5 py-0.5 rounded">
                ${betAmount?.toFixed(0)}
              </div>
            </>
          ) : (
            <>
              {/* Empty seat - show multiplier */}
              <div className="text-white text-xl font-black mb-1">
                {multiplier}x
              </div>
              <div className="text-[10px] text-white/60">Empty</div>
            </>
          )}
        </div>

        {/* Selection pulse */}
        {isSelected && (
          <motion.div
            className="absolute inset-0 rounded-2xl border-4 border-yellow-300"
            animate={{ scale: [1, 1.15, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* My seat badge */}
        {isMySeat && (
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
            <div className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-black shadow-lg">
              YOU
            </div>
          </div>
        )}
      </button>
    </motion.div>
  );
};

export default WheelSeat;
