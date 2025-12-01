import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import useWheelSocket from '../../hooks/useWheelSocket';
import WheelCanvas from './components/WheelCanvas';
import UserAvatar from '../../components/UserAvatar';
import { ROUND_DURATION_MS, BETTING_DURATION_MS } from './constants';
import MobileGameHeader from '../../components/MobileGameHeader';

interface Seat {
  seatNumber: number;
  occupied: boolean;
  userId?: string;
  username?: string;
  profileImage?: string;
  betAmount?: number;
  segments: number[];
  multiplier: number;
}

interface GameState {
  gameId: string;
  roundNumber: number;
  status: 'betting' | 'spinning' | 'completed';
  seats: Seat[];
  timeRemaining: number;
  bettingTimeRemaining: number;
  winningSegment: number | null;
  winningSeats: any[];
}

interface WheelGameProps {
  gameId: string;
  onOpenChat?: () => void;
}

export const WheelGame: React.FC<WheelGameProps> = ({ gameId, onOpenChat }) => {
  const { user, token } = useAuth();
  const socket = useWheelSocket(gameId);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(5);
  const [isReservingSeat, setIsReservingSeat] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [bettingTimeLeft, setBettingTimeLeft] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [globalMultiplier, setGlobalMultiplier] = useState(1);
  const [showMultiplierReveal, setShowMultiplierReveal] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;

  // Fetch game state
  const fetchGameState = useCallback(async () => {
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/wheel/state/${gameId}`);
      
      if (response.ok) {
        const data = await response.json();
        setGameState(data);
        setTimeLeft(data.timeRemaining);
        setBettingTimeLeft(data.bettingTimeRemaining);
      }
    } catch (error) {
      console.error('[WheelGame] Error fetching game state:', error);
    }
  }, [gameId]);

  // Initial fetch
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!socket) return;

    // Listen for game state updates
    socket.on('wheel:gameUpdate', (data: GameState) => {
      console.log('[WheelGame] Game update received:', data);
      setGameState(data);
      setTimeLeft(data.timeRemaining);
      setBettingTimeLeft(data.bettingTimeRemaining);
    });

    // Listen for seat reservations
    socket.on('wheel:seatReserved', (data: { seatNumber: number; userId: string; betAmount: number }) => {
      console.log('[WheelGame] Seat reserved:', data);
      fetchGameState();
    });

    // Listen for betting phase closing
    socket.on('wheel:bettingClosed', (data: { globalMultiplier: number; message: string }) => {
      console.log('[WheelGame] Betting closed, global multiplier:', data.globalMultiplier);
      setGlobalMultiplier(data.globalMultiplier);
      setShowMultiplierReveal(true);
      
      // Hide multiplier reveal after 3 seconds and start spin
      setTimeout(() => {
        setShowMultiplierReveal(false);
        setIsSpinning(true);
      }, 3000);
    });

    // Listen for round completion
    socket.on('wheel:roundComplete', (data: { winningSegment: number; globalMultiplier: number; winningSeats: any[] }) => {
      console.log('[WheelGame] Round complete:', data);
      setIsSpinning(false);
      setGlobalMultiplier(data.globalMultiplier);
      
      if (user && data.winningSeats) {
        const userWin = data.winningSeats.find((s: any) => s.userId === user._id);
        if (userWin) {
          setWinAmount(userWin.finalPayout);
          setShowWinAnimation(true);
          
          setTimeout(() => {
            setShowWinAnimation(false);
          }, 5000);
        }
      }
    });

    // Listen for new round starting
    socket.on('wheel:newRound', (data: { roundNumber: number }) => {
      console.log('[WheelGame] New round started:', data);
      setIsSpinning(false);
      setShowWinAnimation(false);
      setShowMultiplierReveal(false);
      setSelectedSeat(null);
      setGlobalMultiplier(1);
      fetchGameState();
    });

    return () => {
      socket.off('wheel:gameUpdate');
      socket.off('wheel:seatReserved');
      socket.off('wheel:bettingClosed');
      socket.off('wheel:roundComplete');
      socket.off('wheel:newRound');
    };
  }, [socket, user, fetchGameState]);

  // Local timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 100));
      setBettingTimeLeft(prev => Math.max(0, prev - 100));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Handle seat reservation
  const handleReserveSeat = async () => {
    if (!token || selectedSeat === null || isReservingSeat) return;

    try {
      setIsReservingSeat(true);
      const apiUrl = (import.meta as any).env.VITE_API_URL || '';
      
      const response = await fetch(`${apiUrl}/api/wheel/reserve-seat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId,
          seatNumber: selectedSeat,
          betAmount,
        }),
      });

      if (response.ok) {
        await fetchGameState();
        setSelectedSeat(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to reserve seat');
      }
    } catch (error) {
      console.error('[WheelGame] Error reserving seat:', error);
      alert('Failed to reserve seat');
    } finally {
      setIsReservingSeat(false);
    }
  };

  // Handle spin start
  useEffect(() => {
    if (gameState?.status === 'spinning' && !isSpinning) {
      setIsSpinning(true);
    }
  }, [gameState?.status, isSpinning]);

  // Handle spin complete
  const handleSpinComplete = () => {
    setIsSpinning(false);
    
    if (gameState?.winningSeats && user) {
      const userWin = gameState.winningSeats.find(s => s.userId === user._id);
      if (userWin) {
        setWinAmount(userWin.payout);
        setShowWinAnimation(true);
      }
    }
  };

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0a0a14] to-[#1a1a2e]">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  const canBet = gameState.status === 'betting' && bettingTimeLeft > 0;
  const progress = (timeLeft / ROUND_DURATION_MS) * 100;
  const bettingProgress = (bettingTimeLeft / BETTING_DURATION_MS) * 100;

  // Get user's reserved seats
  const mySeats = gameState.seats.filter(s => s.userId === user?._id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a14] via-[#1a1a2e] to-[#0a0a14]">
      {isMobile && <MobileGameHeader />}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
            LUCKY WHEEL
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm md:text-base">
            <span className="text-gray-400">Round #{gameState.roundNumber}</span>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${canBet ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
              <span className="text-white font-bold">{gameState.status === 'betting' ? 'BETTING' : 'SPINNING'}</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <span className="text-cyan-400 font-mono text-xl font-bold">
              {(canBet ? bettingTimeLeft / 1000 : timeLeft / 1000).toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Main Game Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Seat Info & Controls */}
          <div className="space-y-4">
            {/* Global Multiplier Display */}
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400 rounded-xl p-4">
              <div className="text-center">
                <div className="text-yellow-400 text-sm font-bold mb-1">GLOBAL MULTIPLIER</div>
                <motion.div
                  className="text-5xl font-black text-white"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {globalMultiplier}x
                </motion.div>
                <div className="text-xs text-gray-400 mt-1">Applied to ALL wins!</div>
              </div>
            </div>

            {/* Bet Controls */}
            <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <h3 className="text-white font-bold mb-3">Bet Amount</h3>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                min="1"
                step="1"
                className="w-full bg-black/60 border border-white/20 rounded-lg px-4 py-3 text-white text-xl font-bold focus:border-cyan-400 focus:outline-none mb-3"
                disabled={!canBet}
              />
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 25, 50].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    className="bg-white/10 hover:bg-white/20 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
                    disabled={!canBet}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Seat */}
            <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <h3 className="text-white font-bold mb-3">Selected Seat</h3>
              {selectedSeat !== null ? (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-400/30">
                    <div className="text-3xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                      Seat {selectedSeat + 1}
                    </div>
                    <div className="text-white text-xl font-bold mt-1">
                      Base: {gameState.seats[selectedSeat].multiplier}x
                    </div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400">Potential Win</div>
                    <div className="text-green-400 text-2xl font-bold">
                      ${(betAmount * gameState.seats[selectedSeat].multiplier * globalMultiplier).toFixed(2)}
                    </div>
                  </div>
                  <motion.button
                    onClick={handleReserveSeat}
                    disabled={!canBet || isReservingSeat}
                    className={`w-full py-3 rounded-xl font-black text-lg transition-all ${
                      canBet
                        ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                    whileHover={canBet ? { scale: 1.02 } : {}}
                    whileTap={canBet ? { scale: 0.98 } : {}}
                  >
                    {isReservingSeat ? 'RESERVING...' : 'RESERVE SEAT'}
                  </motion.button>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8 text-sm">
                  Click a seat to select
                </div>
              )}
            </div>

            {/* My Seats */}
            {mySeats.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <h3 className="text-green-400 font-bold mb-2">Your Seats ({mySeats.length})</h3>
                <div className="space-y-1 text-sm">
                  {mySeats.map(s => (
                    <div key={s.seatNumber} className="flex justify-between text-white">
                      <span>Seat {s.seatNumber + 1}</span>
                      <span>${s.betAmount?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center: Wheel */}
          <div className="lg:col-span-1">
            <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                <div className="absolute inset-0">
                  {/* Outer decorative ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
                  
                  {/* Glow effect */}
                  <div className="absolute inset-4 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 blur-2xl opacity-20 animate-pulse" />
                  
                  {/* Wheel container */}
                  <div className="absolute inset-8">
                    <WheelCanvas
                      winningSegment={gameState.winningSegment}
                      isSpinning={isSpinning}
                      onSpinComplete={handleSpinComplete}
                    />
                  </div>

                  {/* Center indicator */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-800 rounded-full border-4 border-yellow-400 shadow-2xl flex items-center justify-center z-20">
                    <motion.div
                      animate={isSpinning ? { rotate: 360 } : {}}
                      transition={isSpinning ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                      className="text-3xl"
                    >
                      {isSpinning ? '🎰' : '🎯'}
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Seats Grid */}
          <div className="space-y-4">
            <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <h3 className="text-white font-bold mb-4 text-center">SEATS</h3>
              <div className="grid grid-cols-3 gap-3">
                {gameState.seats.map((seat, index) => {
                  const isSelected = selectedSeat === index;
                  const isOccupied = seat.occupied;
                  const isMySeat = seat.userId === user?._id;

                  return (
                    <motion.button
                      key={index}
                      onClick={() => !isOccupied && canBet && setSelectedSeat(index)}
                      disabled={isOccupied || !canBet}
                      whileHover={!isOccupied && canBet ? { scale: 1.05 } : {}}
                      whileTap={!isOccupied && canBet ? { scale: 0.95 } : {}}
                      className={`relative aspect-square rounded-xl border-3 transition-all ${
                        isMySeat
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400 shadow-lg shadow-green-500/50'
                          : isSelected
                          ? 'bg-gradient-to-br from-yellow-500 to-orange-500 border-yellow-400 shadow-lg shadow-yellow-500/50'
                          : isOccupied
                          ? 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600 opacity-50 cursor-not-allowed'
                          : 'bg-gradient-to-br from-purple-600 to-blue-600 border-purple-400 hover:border-cyan-400 shadow-lg cursor-pointer'
                      }`}
                    >
                      {/* Seat number badge */}
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full border-2 border-white flex items-center justify-center z-10">
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                      </div>

                      {/* Flapper display */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                        <div className="text-white text-2xl font-black">
                          {seat.multiplier}x
                        </div>
                        {isOccupied && seat.betAmount && (
                          <div className="text-xs text-white/80 mt-1">
                            ${seat.betAmount.toFixed(0)}
                          </div>
                        )}
                      </div>

                      {/* Selection pulse */}
                      {isSelected && (
                        <motion.div
                          className="absolute inset-0 rounded-xl border-4 border-yellow-300"
                          animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}

                      {/* My seat indicator */}
                      {isMySeat && (
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                          <div className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            YOU
                          </div>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Multiplier Legend */}
            <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <h3 className="text-white font-bold mb-3 text-sm">Base Multipliers</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Seats 1-3:</span>
                  <span className="text-green-400 font-semibold">2.0x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Seats 4-6:</span>
                  <span className="text-blue-400 font-semibold">3.0x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Seats 7-9:</span>
                  <span className="text-purple-400 font-semibold">5.0x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Seats 10-12:</span>
                  <span className="text-yellow-400 font-semibold">10.0x</span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="text-center text-cyan-400 font-bold">
                    × Global Multiplier
                  </div>
                  <div className="text-center text-xs text-gray-500 mt-1">
                    Up to 100x boost!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Multiplier Reveal Animation ("Top Slot" style) */}
        <AnimatePresence>
          {showMultiplierReveal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 200 }}
                className="relative"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 blur-3xl opacity-50 animate-pulse" />
                
                <div className="relative bg-gradient-to-br from-yellow-600 via-orange-600 to-red-600 border-8 border-yellow-300 rounded-3xl p-16 text-center shadow-2xl">
                  <motion.div
                    animate={{ 
                      rotateY: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ 
                      rotateY: { duration: 2, repeat: Infinity, ease: "linear" },
                      scale: { duration: 1, repeat: Infinity }
                    }}
                    className="text-9xl mb-6"
                  >
                    🎰
                  </motion.div>
                  
                  <div className="text-white text-5xl font-black mb-4 tracking-wider">
                    GLOBAL MULTIPLIER
                  </div>
                  
                  <motion.div
                    animate={{ 
                      scale: [1, 1.15, 1],
                      textShadow: [
                        "0 0 20px rgba(255,255,255,0.5)",
                        "0 0 40px rgba(255,255,255,0.8)",
                        "0 0 20px rgba(255,255,255,0.5)"
                      ]
                    }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="text-white text-9xl font-black mb-4"
                  >
                    {globalMultiplier}x
                  </motion.div>
                  
                  <div className="text-yellow-200 text-2xl font-bold">
                    Applied to ALL wins this round!
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win Animation */}
        <AnimatePresence>
          {showWinAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowWinAnimation(false)}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
                className="relative"
              >
                <div className="bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 border-4 border-yellow-400 rounded-3xl p-12 text-center shadow-2xl">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-7xl mb-4"
                  >
                    🎉
                  </motion.div>
                  <div className="text-yellow-400 text-5xl font-black mb-2">WINNER!</div>
                  <div className="text-white text-6xl font-black">
                    +${winAmount.toFixed(2)}
                  </div>
                  <div className="text-gray-400 text-xl mt-4">
                    {globalMultiplier}x Global Multiplier Applied!
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WheelGame;
