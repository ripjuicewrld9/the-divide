import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import useWheelSocket from '../../hooks/useWheelSocket';
import NewWheelCanvas from './components/NewWheelCanvas.tsx';
import MobileGameHeader from '../../components/MobileGameHeader';

interface Seat {
  seatNumber: number;
  occupied: boolean;
  userId?: string;
  betAmount: number;
  flapperPosition: number;
}

interface BoostedSegment {
  segmentIndex: number;
  baseMultiplier: number;
  boostMultiplier: number;
  finalMultiplier: number;
}

interface SeatOutcome {
  seatNumber: number;
  segmentUnderFlapper: number;
  baseMultiplier: number;
  boostMultiplier: number;
  finalMultiplier: number;
  isOccupied: boolean;
  userId: string | null;
  betAmount: number;
  payout: number;
  isBoosted: boolean;
}

interface GameState {
  gameId: string;
  roundNumber: number;
  status: 'betting' | 'spinning' | 'completed';
  wheelSegments: number[]; // All 54 base multipliers
  seats: Seat[];
  boostedSegments: BoostedSegment[];
  seatOutcomes: SeatOutcome[];
  timeRemaining: number;
  bettingTimeRemaining: number;
  wheelStopPosition: number | null;
}

interface NewWheelGameProps {
  gameId: string;
  onOpenChat?: () => void;
}

export const NewWheelGame: React.FC<NewWheelGameProps> = ({ gameId, onOpenChat }) => {
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
  const [myOutcomes, setMyOutcomes] = useState<SeatOutcome[]>([]);
  const [showBoostReveal, setShowBoostReveal] = useState(false);
  const [revealedBoosts, setRevealedBoosts] = useState<BoostedSegment[]>([]);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;

  const ROUND_DURATION_MS = 30000;
  const BETTING_DURATION_MS = 25000;

  // Fetch game state
  const fetchGameState = useCallback(async () => {
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/wheel/game/${gameId}`);
      
      if (response.ok) {
        const data = await response.json();
        setGameState(data);
        setTimeLeft(data.timeRemaining);
        setBettingTimeLeft(data.bettingTimeRemaining);
      }
    } catch (error) {
      console.error('[NewWheelGame] Error fetching game state:', error);
    }
  }, [gameId]);

  // Initial fetch
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!socket) return;

    // Listen for seat reservations
    socket.on('wheel:seatReserved', (data: { seatNumber: number; userId: string; betAmount: number }) => {
      console.log('[NewWheelGame] Seat reserved:', data);
      fetchGameState();
    });

    // Listen for betting phase closing and boost reveal
    socket.on('wheel:bettingClosed', (data: { boostedSegments: BoostedSegment[]; message: string }) => {
      console.log('[NewWheelGame] Betting closed, boosted segments:', data.boostedSegments);
      setRevealedBoosts(data.boostedSegments);
      setShowBoostReveal(true);
      
      // Hide boost reveal after 3 seconds and start spin
      setTimeout(() => {
        setShowBoostReveal(false);
        setIsSpinning(true);
      }, 3000);
    });

    // Listen for round completion
    socket.on('wheel:roundComplete', (data: { wheelStopPosition: number; seatOutcomes: SeatOutcome[] }) => {
      console.log('[NewWheelGame] Round complete:', data);
      setIsSpinning(false);
      
      if (user && data.seatOutcomes) {
        const userOutcomes = data.seatOutcomes.filter((outcome: SeatOutcome) => 
          outcome.isOccupied && outcome.userId === user.id
        );
        
        if (userOutcomes.length > 0) {
          setMyOutcomes(userOutcomes);
          setShowWinAnimation(true);
          
          setTimeout(() => {
            setShowWinAnimation(false);
          }, 6000);
        }
      }
      
      fetchGameState();
    });

    // Listen for new round starting
    socket.on('wheel:newRound', (data: { roundNumber: number }) => {
      console.log('[NewWheelGame] New round started:', data);
      setIsSpinning(false);
      setShowWinAnimation(false);
      setShowBoostReveal(false);
      setSelectedSeat(null);
      setRevealedBoosts([]);
      setMyOutcomes([]);
      fetchGameState();
    });

    return () => {
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
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
      
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
      console.error('[NewWheelGame] Error reserving seat:', error);
      alert('Failed to reserve seat');
    } finally {
      setIsReservingSeat(false);
    }
  };

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0b0b]">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  const canBet = gameState.status === 'betting' && bettingTimeLeft > 0;
  const bettingProgress = (bettingTimeLeft / BETTING_DURATION_MS) * 100;

  // Get user's reserved seats
  const mySeats = gameState.seats.filter(s => s.userId === user?.id);

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      {/* @ts-ignore */}
      {isMobile && <MobileGameHeader title="Wheel" onOpenChat={onOpenChat} />}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            LUCKY WHEEL
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm md:text-base">
            <span className="text-gray-400">Round #{gameState.roundNumber}</span>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${canBet ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
              <span className="text-white font-bold uppercase">{gameState.status}</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <span className="text-cyan-400 font-mono text-xl font-bold">
              {(canBet ? bettingTimeLeft / 1000 : timeLeft / 1000).toFixed(1)}s
            </span>
          </div>

          {/* Betting Timer Bar */}
          {canBet && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-500 via-cyan-500 to-blue-500"
                  style={{ width: `${bettingProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Main Game Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Bet Controls */}
          <div className="space-y-4">
            {/* Bet Amount */}
            <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <span className="text-cyan-400">💰</span>
                Bet Amount
              </h3>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
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
                    className="bg-white/5 hover:bg-white/10 text-white rounded-lg py-2 text-sm font-semibold transition-colors border border-white/10"
                    disabled={!canBet}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Seat */}
            <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4">
              <h3 className="text-white font-bold mb-3">Selected Seat</h3>
              {selectedSeat !== null ? (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-400/30">
                    <div className="text-3xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                      Seat {selectedSeat + 1}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      Flapper #{selectedSeat + 1}
                    </div>
                  </div>
                  <motion.button
                    onClick={handleReserveSeat}
                    disabled={!canBet || isReservingSeat}
                    className={`w-full py-3 rounded-xl font-black text-lg transition-all ${
                      canBet
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                    whileHover={canBet ? { scale: 1.02 } : {}}
                    whileTap={canBet ? { scale: 0.98 } : {}}
                  >
                    {isReservingSeat ? 'RESERVING...' : `RESERVE - $${betAmount}`}
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
                <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                  <span>✓</span>
                  Your Seats ({mySeats.length})
                </h3>
                <div className="space-y-1 text-sm">
                  {mySeats.map(s => (
                    <div key={s.seatNumber} className="flex justify-between text-white">
                      <span>Seat {s.seatNumber + 1}</span>
                      <span className="text-cyan-400">${s.betAmount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Panel */}
            <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4">
              <h3 className="text-white font-bold mb-3 text-sm">How It Works</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <p>• Select and reserve a seat</p>
                <p>• 3-5 segments get random boosts</p>
                <p>• Wheel spins and stops</p>
                <p>• Your flapper determines your outcome</p>
                <p>• Win or lose based on segment multiplier!</p>
              </div>
            </div>
          </div>

          {/* Center: Wheel */}
          <div className="lg:col-span-1">
            <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6">
              <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                <div className="absolute inset-0">
                  <NewWheelCanvas
                    wheelSegments={gameState.wheelSegments}
                    boostedSegments={gameState.boostedSegments}
                    wheelStopPosition={gameState.wheelStopPosition}
                    seatOutcomes={gameState.seatOutcomes}
                    isSpinning={isSpinning}
                  />
                </div>
              </div>

              {/* Boost Legend (when boosted segments are active) */}
              {gameState.boostedSegments.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="text-yellow-400 font-bold text-sm mb-2">🎰 Boosted Segments</div>
                  <div className="space-y-1 text-xs">
                    {gameState.boostedSegments.map((boost, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-gray-400">Segment #{boost.segmentIndex}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white">{boost.baseMultiplier}x</span>
                          <span className="text-gray-500">×</span>
                          <span className="text-yellow-400 font-bold">{boost.boostMultiplier}x</span>
                          <span className="text-gray-500">=</span>
                          <span className="text-green-400 font-bold">{boost.finalMultiplier.toFixed(2)}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Seats Grid */}
          <div className="space-y-4">
            <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4">
              <h3 className="text-white font-bold mb-4 text-center flex items-center justify-center gap-2">
                <span>🎯</span>
                SEATS (8 Flappers)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {gameState.seats.map((seat, index) => {
                  const isSelected = selectedSeat === index;
                  const isOccupied = seat.occupied;
                  const isMySeat = seat.userId === user?.id;

                  return (
                    <motion.button
                      key={index}
                      onClick={() => !isOccupied && canBet && setSelectedSeat(index)}
                      disabled={isOccupied || !canBet}
                      whileHover={!isOccupied && canBet ? { scale: 1.05 } : {}}
                      whileTap={!isOccupied && canBet ? { scale: 0.95 } : {}}
                      className={`relative aspect-square rounded-xl border-2 transition-all ${
                        isMySeat
                          ? 'bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-400 shadow-lg shadow-green-500/30'
                          : isSelected
                          ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-400 shadow-lg shadow-cyan-500/30'
                          : isOccupied
                          ? 'bg-gradient-to-br from-gray-700/20 to-gray-800/20 border-gray-600 opacity-50 cursor-not-allowed'
                          : 'bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-400/30 hover:border-cyan-400 cursor-pointer'
                      }`}
                    >
                      {/* Seat number badge */}
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full border-2 border-white flex items-center justify-center z-10">
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                      </div>

                      {/* Seat content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                        <div className="text-2xl mb-1">📍</div>
                        <div className="text-xs text-gray-400">Flapper</div>
                        {isOccupied && seat.betAmount && (
                          <div className="text-sm text-cyan-400 mt-1 font-bold">
                            ${seat.betAmount.toFixed(0)}
                          </div>
                        )}
                      </div>

                      {/* Selection pulse */}
                      {isSelected && (
                        <motion.div
                          className="absolute inset-0 rounded-xl border-2 border-cyan-300"
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

            {/* Multiplier Distribution Info */}
            <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4">
              <h3 className="text-white font-bold mb-3 text-sm">Wheel Segments</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-red-400">-0.75x</span>
                  <span className="text-gray-500">15 segments</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-300">-0.5x</span>
                  <span className="text-gray-500">10 segments</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-400">-0.25x</span>
                  <span className="text-gray-500">5 segments</span>
                </div>
                <div className="border-t border-white/10 my-2"></div>
                <div className="flex justify-between">
                  <span className="text-green-400">+0.25x to +1x</span>
                  <span className="text-gray-500">12 segments</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-400">+1.5x to +5x</span>
                  <span className="text-gray-500">8 segments</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-400">+7.5x</span>
                  <span className="text-gray-500">1 segment</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400 font-bold">+25x</span>
                  <span className="text-gray-500">1 segment</span>
                </div>
                <div className="border-t border-white/10 my-2"></div>
                <div className="text-center text-yellow-400 font-bold text-sm">
                  + Random Boosts (10x-100x)!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Boost Reveal Animation */}
        <AnimatePresence>
          {showBoostReveal && revealedBoosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 200 }}
                className="relative max-w-2xl w-full mx-4"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 blur-3xl opacity-50 animate-pulse" />
                
                <div className="relative bg-gradient-to-br from-yellow-600/20 via-orange-600/20 to-red-600/20 border-4 border-yellow-400 rounded-3xl p-8 text-center">
                  <motion.div
                    animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                    transition={{ 
                      rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                      scale: { duration: 1, repeat: Infinity }
                    }}
                    className="text-6xl mb-4"
                  >
                    🎰
                  </motion.div>
                  
                  <div className="text-yellow-400 text-3xl md:text-4xl font-black mb-6">
                    {revealedBoosts.length} SEGMENTS BOOSTED!
                  </div>
                  
                  <div className="space-y-2">
                    {revealedBoosts.map((boost, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.2 }}
                        className="bg-black/60 border border-yellow-400/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <span className="text-white text-lg">Segment #{boost.segmentIndex}</span>
                        <div className="flex items-center gap-2 text-lg">
                          <span className="text-gray-400">{boost.baseMultiplier}x</span>
                          <span className="text-yellow-400">×</span>
                          <span className="text-yellow-400 font-bold">{boost.boostMultiplier}x</span>
                          <span className="text-yellow-400">=</span>
                          <span className="text-green-400 font-black text-2xl">
                            {boost.finalMultiplier.toFixed(2)}x
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="mt-6 text-cyan-400 text-xl font-bold">
                    Get Ready to Spin! 🎡
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win/Loss Animation */}
        <AnimatePresence>
          {showWinAnimation && myOutcomes.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowWinAnimation(false)}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: -50 }}
                className="relative max-w-2xl w-full"
              >
                <div className="bg-[#1a1a2e] border-4 border-cyan-400 rounded-3xl p-8">
                  <div className="text-center mb-6">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="text-6xl mb-4"
                    >
                      {myOutcomes.every(o => o.payout > 0) ? '🎉' : myOutcomes.every(o => o.payout < 0) ? '😢' : '🎲'}
                    </motion.div>
                    <div className="text-3xl font-black text-white mb-2">
                      YOUR RESULTS
                    </div>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {myOutcomes.map((outcome, i) => {
                      const isWin = outcome.payout > 0;
                      const isLoss = outcome.payout < 0;
                      
                      return (
                        <motion.div
                          key={i}
                          initial={{ x: -50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.2 }}
                          className={`p-4 rounded-xl border-2 ${
                            isWin 
                              ? 'bg-green-500/10 border-green-400' 
                              : isLoss 
                              ? 'bg-red-500/10 border-red-400'
                              : 'bg-gray-500/10 border-gray-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-bold">Seat {outcome.seatNumber + 1}</span>
                            <span className="text-gray-400">Segment #{outcome.segmentUnderFlapper}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-400">Multiplier:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white">{outcome.baseMultiplier}x</span>
                              {outcome.isBoosted && (
                                <>
                                  <span className="text-yellow-400">× {outcome.boostMultiplier}x</span>
                                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full font-bold">
                                    BOOSTED!
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <span className="text-gray-400">Bet: ${outcome.betAmount.toFixed(2)}</span>
                            <span className={`text-2xl font-black ${
                              isWin ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              {isWin ? '+' : ''}${outcome.payout.toFixed(2)}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="mt-6 pt-4 border-t-2 border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xl font-bold">Total:</span>
                      <span className={`text-4xl font-black ${
                        myOutcomes.reduce((sum, o) => sum + o.payout, 0) > 0 
                          ? 'text-green-400' 
                          : 'text-red-400'
                      }`}>
                        {myOutcomes.reduce((sum, o) => sum + o.payout, 0) > 0 ? '+' : ''}
                        ${myOutcomes.reduce((sum, o) => sum + o.payout, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowWinAnimation(false)}
                    className="w-full mt-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl"
                  >
                    CLOSE
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NewWheelGame;
