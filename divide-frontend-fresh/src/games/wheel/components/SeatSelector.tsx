import React from 'react';
import { motion } from 'framer-motion';
import { SEAT_COLORS, SEAT_MULTIPLIERS } from '../constants';

interface Seat {
  seatNumber: number;
  occupied: boolean;
  userId?: string;
  betAmount?: number;
  segments: number[];
  multiplier: number;
}

interface SeatSelectorProps {
  seats: Seat[];
  selectedSeat: number | null;
  onSeatSelect: (seatNumber: number) => void;
  canSelect: boolean;
  currentUserId?: string;
}

const SeatSelector: React.FC<SeatSelectorProps> = ({
  seats,
  selectedSeat,
  onSeatSelect,
  canSelect,
  currentUserId,
}) => {
  const centerX = 250;
  const centerY = 250;
  const radius = 200;

  const getSeatPosition = (index: number) => {
    const angle = (index / 12) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { x, y };
  };

  return (
    <div className="relative w-full max-w-[500px] mx-auto" style={{ height: '500px' }}>
      {seats.map((seat, index) => {
        const pos = getSeatPosition(index);
        const isOccupied = seat.occupied;
        const isOwnSeat = seat.userId === currentUserId;
        const isSelected = selectedSeat === seat.seatNumber;

        return (
          <motion.button
            key={seat.seatNumber}
            onClick={() => !isOccupied && canSelect && onSeatSelect(seat.seatNumber)}
            disabled={isOccupied || !canSelect}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
              !isOccupied && canSelect ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
            }}
            whileHover={!isOccupied && canSelect ? { scale: 1.1 } : {}}
            whileTap={!isOccupied && canSelect ? { scale: 0.95 } : {}}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <div
              className={`relative w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 ${
                isSelected
                  ? 'border-yellow-400 shadow-lg shadow-yellow-400/50'
                  : isOwnSeat
                  ? 'border-green-400 shadow-lg shadow-green-400/50'
                  : isOccupied
                  ? 'border-gray-600'
                  : 'border-white/20 hover:border-white/40'
              }`}
              style={{
                background: isOccupied
                  ? 'linear-gradient(135deg, rgba(100, 116, 139, 0.3), rgba(71, 85, 105, 0.3))'
                  : `linear-gradient(135deg, ${SEAT_COLORS[seat.seatNumber]}40, ${SEAT_COLORS[seat.seatNumber]}20)`,
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="text-xs font-bold text-white">{seat.seatNumber + 1}</div>
              <div
                className="text-[10px] font-semibold"
                style={{ color: SEAT_COLORS[seat.seatNumber] }}
              >
                {seat.multiplier}x
              </div>
              {isOccupied && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap">
                  ${seat.betAmount?.toFixed(2)}
                </div>
              )}
            </div>
          </motion.button>
        );
      })}

      {/* Center info */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="text-sm text-gray-400">Select a Seat</div>
        <div className="text-xs text-gray-500 mt-1">
          {seats.filter(s => s.occupied).length}/12 Occupied
        </div>
      </div>
    </div>
  );
};

export default SeatSelector;
