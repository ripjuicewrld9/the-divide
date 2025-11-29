import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store';
import { getHandValue, canSplit, canDoubleDown } from '../gameLogic';
import { PlayingCard, CardPlaceholder } from './PlayingCard';
import { HandDisplay } from './HandDisplay';
import { GameControls } from './GameControls';
import { PlayingActionButtons } from './GameControls';
import { ChipStack } from './ChipStack';
import { BettingArea } from './BettingArea';
import { BlackjackBetBar } from './BlackjackBetBar';
import { StreakIndicator } from './StreakIndicator';
import { RulesModal } from './RulesModal';
import { useAuth } from '../../../context/AuthContext';
import { WinOverlay } from './WinOverlay';
import LiveGamesFeed from '../../../components/LiveGamesFeed';
import BlackjackLeaderboard from '../../../components/BlackjackLeaderboard';
import BlackjackVerification from './BlackjackVerification';
import MobileGameHeader from '../../../components/MobileGameHeader';
import { BetHistory } from './BetHistory';
import { ActiveBetsDisplay } from './ActiveBetsDisplay';

interface BlackjackGameProps {
  onOpenChat?: () => void;
}

const saveBlackjackGameResult = async (gameState: any, token: string) => {
  try {
    const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';

    // Get the most recent round result
    const lastResult = gameState.roundResults[0];
    if (!lastResult) return;

    const gameId = (gameState as any).currentGameId;

    // If we have a gameId (provably fair session), save with full data
    if (gameId) {
      // Prepare player and dealer cards
      const playerHands = gameState.playerHands || [];
      const dealerHand = gameState.dealerHand || { cards: [] };

      const playerCards = playerHands[0]?.cards?.map((c: any) => `${c.rank}${c.suit}`) || [];
      const dealerCards = dealerHand.cards?.map((c: any) => `${c.rank}${c.suit}`) || [];

      const response = await fetch(`${apiUrl}/api/blackjack/game/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId,
          mainBet: lastResult.playerBet || 0,
          perfectPairsBet: lastResult.perfectPairsBet || 0,
          twentyPlusThreeBet: lastResult.twentyPlusThreeBet || 0,
          blazingSevensBet: lastResult.blazingSevensBet || 0,
          playerCards,
          dealerCards,
          playerTotal: lastResult.playerTotal || 0,
          dealerTotal: lastResult.dealerTotal || 0,
          mainResult: lastResult.outcome,
          mainPayout: lastResult.payout || 0,
          perfectPairsResult: lastResult.perfectPairsResult || null,
          perfectPairsPayout: lastResult.perfectPairsPayout || 0,
          twentyPlusThreeResult: lastResult.twentyPlusThreeResult || null,
          twentyPlusThreePayout: lastResult.twentyPlusThreePayout || 0,
          blazingSevenResult: lastResult.blazingSevenResult || null,
          blazingSevensPayout: lastResult.blazingSevensPayout || 0,
          balance: gameState.balance,
        }),
      });

      if (!response.ok) {
        console.error('[Blackjack] Failed to save game with provably fair:', response.statusText);
      } else {
        console.log('[Blackjack] Game saved with provably fair data');
      }
    } else {
      // Fallback: save for feed only (no provably fair data)
      const response = await fetch(`${apiUrl}/api/blackjack/save-for-feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mainBet: lastResult.playerBet || 0,
          mainResult: lastResult.outcome,
          mainPayout: lastResult.payout || 0,
          perfectPairsBet: lastResult.perfectPairsBet || 0,
          perfectPairsResult: lastResult.perfectPairsResult || null,
          perfectPairsPayout: lastResult.perfectPairsPayout || 0,
          twentyPlusThreeBet: lastResult.twentyPlusThreeBet || 0,
          twentyPlusThreeResult: lastResult.twentyPlusThreeResult || null,
          twentyPlusThreePayout: lastResult.twentyPlusThreePayout || 0,
          blazingSevensBet: lastResult.blazingSevensBet || 0,
          blazingSevenResult: lastResult.blazingSevenResult || null,
          blazingSevensPayout: lastResult.blazingSevensPayout || 0,
          playerTotal: lastResult.playerTotal,
          dealerTotal: lastResult.dealerTotal,
          balance: gameState.balance,
        }),
      });

      if (!response.ok) {
        console.error('[Blackjack] Failed to save game for feed:', response.statusText);
      }
    }
  } catch (error) {
    console.error('[Blackjack] Error saving game:', error);
  }
};

export const BlackjackGame: React.FC<BlackjackGameProps> = ({ onOpenChat }) => {
  // Device detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;
  const gameState = useGameStore();
  const { balance: userBalance, token, refreshUser, updateUser } = useAuth();
  const [showRules, setShowRules] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const balanceInitializedRef = useRef(false);
  const gameSavedRef = useRef(false);

  // Handler to show fairness modal
  const handleShowFairness = () => {
    setShowVerification(true);
  };

  // Initialize game balance with user balance - only once
  useEffect(() => {
    // Set initial balance only on first mount when user balance loads
    // Allow balance of 0 or greater (user might have 0 balance)
    if (!balanceInitializedRef.current && userBalance !== undefined && userBalance !== null) {
      gameState.setInitialBalance(userBalance);
      balanceInitializedRef.current = true;
    }
  }, [userBalance, gameState]); // Watch userBalance, but only set once

  // Sync game balance with user balance when returning to betting phase
  useEffect(() => {
    if (gameState.gamePhase === 'betting' && userBalance !== undefined && userBalance !== null) {
      // Don't sync if player has active bets - this would override visual deduction
      const hasActiveBets = gameState.playerHands.length > 0 && gameState.playerHands[0].bet > 0;
      if (hasActiveBets) return;
      
      // Only update balance if it changed significantly (more than current bet amounts)
      // This prevents fighting with other games' optimistic balance updates
      const difference = Math.abs(gameState.balance - userBalance);
      if (difference > 1) { // Only sync if difference is more than $1
        console.log('[Blackjack] Syncing balance:', gameState.balance, '->', userBalance);
        gameState.setInitialBalance(userBalance);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.gamePhase, userBalance]);

  // Save game when round ends and refresh user balance from server
  useEffect(() => {
    if (gameState.gamePhase === 'gameOver' && token && !gameSavedRef.current) {
      gameSavedRef.current = true;
      // Save game result to database for recent games feed
      saveBlackjackGameResult(gameState, token)
        .then(() => {
          // Refresh user data after save to get updated balance from server
          refreshUser();
        })
        .catch(err => {
          console.error('[Blackjack] Failed to save game:', err);
          // Still try to refresh user data even if save failed
          refreshUser();
        });
    } else if (gameState.gamePhase === 'betting') {
      // Reset save flag when new round starts
      gameSavedRef.current = false;
    }
  }, [gameState.gamePhase, token, refreshUser]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.gamePhase !== 'playing' && gameState.gamePhase !== 'insurance') return;

      const key = e.key.toUpperCase();
      switch (key) {
        case 'H':
          e.preventDefault();
          gameState.hit();
          break;
        case 'S':
          e.preventDefault();
          gameState.stand();
          break;
        case 'D':
          e.preventDefault();
          gameState.doubleDown();
          break;
        case 'P':
          e.preventDefault();
          gameState.split();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Handle next round
  const handleNextRound = useCallback(() => {
    // Hide win overlay when user advances to the next round
    setShowWinAnimation(false);
    setWinAmount(0);
    setVerificationResult(null);
    // Clear the current game ID for the new round
    delete (gameState as any).currentGameId;
    // Reset the game saved ref so next game can be saved
    gameSavedRef.current = false;
    gameState.resetGame();
  }, [gameState]);

  // Handle verification
  const handleVerify = useCallback(async () => {
    if (!token) return;

    setIsVerifying(true);
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
      // Fetch recent BLACKJACK games to get the last game ID
      const response = await fetch(`${apiUrl}/api/blackjack/games?limit=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch recent games');

      const data = await response.json();
      const lastGame = data.games?.[0];

      if (!lastGame || !lastGame._id) {
        setVerificationResult({
          valid: false,
          message: 'No recent blackjack game found to verify',
        });
        return;
      }

      // Now verify the game
      const verifyResponse = await fetch(`${apiUrl}/api/blackjack/game/${lastGame._id}/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!verifyResponse.ok) throw new Error('Verification failed');

      const verifyData = await verifyResponse.json();
      setVerificationResult(verifyData);
    } catch (error) {
      console.error('[Blackjack] Verification error:', error);
      setVerificationResult({
        valid: false,
        message: 'Verification error: ' + (error as Error).message,
      });
    } finally {
      setIsVerifying(false);
    }
  }, [token]);


  // Handle deal
  const handleDeal = useCallback(async () => {
    if (!token) {
      console.error('[Blackjack] No token available');
      return;
    }

    try {
      // Start a provably fair session before dealing
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/blackjack/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('[Blackjack] Failed to start session');
        return;
      }

      const sessionData = await response.json();
      console.log('[Blackjack] Session started:', sessionData.gameId);

      // Store gameId for later save
      (gameState as any).currentGameId = sessionData.gameId;

      // Increment nonce in localStorage to match backend
      try {
        const currentNonce = localStorage.getItem('blackjack_nonce');
        const nextNonce = currentNonce != null ? Number(currentNonce) + 1 : 1;
        localStorage.setItem('blackjack_nonce', String(nextNonce));
        console.log('[Blackjack] Nonce incremented to:', nextNonce);
      } catch (err) {
        console.error('[Blackjack] Error incrementing nonce:', err);
      }

      // Deal cards
      gameState.deal();
    } catch (error) {
      console.error('[Blackjack] Error starting session:', error);
    }
  }, [gameState, token]);

  // Whenever local gameState.balance changes (bet deduction or win), sync to global AuthContext
  useEffect(() => {
    if (updateUser && typeof gameState.balance === 'number') {
      updateUser({ balance: gameState.balance });
    }
  }, [gameState.balance]);

  // When a new round result appears, compute total won for that round and show overlay
  useEffect(() => {
    const latest = gameState.roundResults[0];
    if (!latest) {
      setShowWinAnimation(false);
      setWinAmount(0);
      return;
    }

    const ts = latest.timestamp;
    const roundGroup = gameState.roundResults.filter(r => r.timestamp === ts);

    // Compute total payout for the round (not net gain)
    // This shows what the player receives from the house
    let totalPayout = 0;
    let hadPush = false;
    for (const r of roundGroup) {
      totalPayout += (r.payout || 0) + (r.perfectPairsPayout || 0) + (r.twentyPlusThreePayout || 0) + (r.blazingSevensPayout || 0);
      if (r.outcome === 'push') hadPush = true;
    }

    if (totalPayout > 0) {
      setWinAmount(totalPayout);
      setShowWinAnimation(true);
    } else if (totalPayout === 0 && hadPush) {
      setWinAmount(0);
      setShowWinAnimation(true);
    } else {
      // loss or nothing worth showing
      setShowWinAnimation(false);
      setWinAmount(0);
    }
  }, [gameState.roundResults]);

  const currentHand = gameState.playerHands[gameState.currentHandIndex];
  const handValue = currentHand ? getHandValue(currentHand.cards).value : 0;
  const canHit = currentHand && handValue < 21;
  const canDouble = currentHand && canDoubleDown(currentHand.cards);
  const canSplitHand = currentHand && canSplit(currentHand.cards);
  return (
    <>
      <div
        className="relative flex min-h-dvh w-full flex-col overflow-x-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)',
        }}
      >
        {/* Mobile Header - only shows on mobile */}
        {/* Mobile Header - only shows on mobile */}
        <MobileGameHeader title="Blackjack" onOpenChat={onOpenChat} className="md:hidden" />

        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
        <BlackjackVerification
          isOpen={showVerification}
          onClose={() => {
            setShowVerification(false);
            setVerificationResult(null);
          }}
          verificationResult={verificationResult}
          onVerify={handleVerify}
          isVerifying={isVerifying}
        />
        <div className={isMobile ? 'flex-1 px-1 py-1 pb-4' : 'flex-1 px-5'}>
          <div className="mx-auto mt-2 max-w-xl min-w-[300px] drop-shadow-xl md:mt-10 lg:max-w-6xl">
            <div className="relative overflow-hidden rounded-lg">
              <div className={isMobile ? 'flex flex-col w-full gap-2' : 'flex flex-col lg:flex-row gap-4'}>
                {/* MAIN GAME AREA */}
                <div className="flex-1 relative" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(15, 15, 30, 0.8) 100%)',
                    position: 'relative',
                    border: '2px solid rgba(0, 255, 255, 0.2)',
                    padding: isMobile ? '0.25rem' : '0.5rem',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                  }}
                    className={isMobile ? "min-h-[50vh]" : "min-h-[60vh] md:min-h-[600px]"}
                  >
                    {/* Header with Balance - Hidden on Mobile */}
                    {!isMobile && (
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexShrink: 0,
                          paddingBottom: '0.25rem',
                        }}
                      >
                        <div>
                          <h1 className="blackjack-title" style={{ fontSize: '1.3rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #00ffff, #ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0' }}>
                            BLACKJACK
                          </h1>
                          <p style={{ color: '#cbd5e1', fontSize: '0.65rem', margin: '0' }}>Professional Casino</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <motion.button
                            onClick={() => setShowRules(true)}
                            style={{
                              padding: '0.35rem 0.7rem',
                              background: 'rgba(0, 255, 255, 0.2)',
                              color: 'white',
                              fontWeight: '600',
                              borderRadius: '0.35rem',
                              border: '1px solid rgba(0, 255, 255, 0.3)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              flexShrink: 0,
                            }}
                            whileHover={{ scale: 1.05, background: 'rgba(0, 255, 255, 0.3)' }}
                            whileTap={{ scale: 0.95 }}
                          >
                            📋 Rules
                          </motion.button>
                          <motion.button
                            onClick={() => setShowVerification(true)}
                            style={{
                              padding: '0.35rem 0.7rem',
                              background: 'rgba(255, 215, 0, 0.2)',
                              color: 'white',
                              fontWeight: '600',
                              borderRadius: '0.35rem',
                              border: '1px solid rgba(255, 215, 0, 0.3)',
                              cursor: 'pointer',
                            fontSize: '0.75rem',
                            flexShrink: 0,
                          }}
                          whileHover={{ scale: 1.05, background: 'rgba(255, 215, 0, 0.3)' }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }}>
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M11.5 12h1v4h-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Fairness
                        </motion.button>
                        </div>
                      </motion.div>
                    )}

                    {/* Game Table */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '0.5rem',
                        background: 'linear-gradient(to bottom, rgb(20, 83, 45), rgb(15, 78, 43))',
                        border: '2px solid #B8860B',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        padding: '0.4rem',
                        gap: '0.25rem',
                        flex: 1,
                        overflowY: 'auto',
                        minHeight: 0,
                        position: 'relative',
                      }}
                    >
                      {/* Win Animation Overlay */}
                      <WinOverlay 
                        amount={winAmount} 
                        visible={showWinAnimation}
                        onDismiss={() => setShowWinAnimation(false)}
                      />
                      
                      {/* Streak Indicator - Bottom Left Corner */}
                      <div style={{ position: 'absolute', left: '12px', bottom: '12px', zIndex: 10 }}>
                        <AnimatePresence>
                          <StreakIndicator
                            streakCount={gameState.streakCount}
                            streakType={gameState.streakType}
                          />
                        </AnimatePresence>
                      </div>

                      {/* Dealer */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-gray-400 text-xs font-semibold uppercase">Dealer</div>
                        <div className="flex gap-2 items-center justify-center h-24">
                          <AnimatePresence mode="popLayout">
                            {gameState.dealerHand.cards.map((card, index) => {
                              // Hide second card only if it's NOT an ace and we're still in playing/insurance phase
                              const shouldHideCard = index === 1 &&
                                (gameState.gamePhase === 'playing' || gameState.gamePhase === 'insurance') &&
                                card.rank !== 'A';

                              return (
                                <PlayingCard
                                  key={card.id}
                                  card={card}
                                  index={index}
                                  isDealer={true}
                                  isHidden={shouldHideCard}
                                  delay={index * 0.15}
                                />
                              );
                            })}
                          </AnimatePresence>
                        </div>
                        <div className="h-4 flex items-center justify-center">
                          {gameState.dealerHand.cards.length > 1 && (
                            <motion.div className="text-gray-400 text-xs font-semibold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={gameState.dealerHand.cards.length}>
                              {(() => {
                                // If second card is an ace and visible, show full hand value
                                const holeCard = gameState.dealerHand.cards[1];
                                const isHoleCardAce = holeCard && holeCard.rank === 'A';
                                const showFullValue = !(gameState.gamePhase === 'playing' || gameState.gamePhase === 'insurance') || isHoleCardAce;

                                return getHandValue(
                                  gameState.dealerHand.cards.slice(0, showFullValue ? gameState.dealerHand.cards.length : 1)
                                ).value;
                              })()}
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Table Center - Insurance Prompt, Win Animation, and Post-Game Actions */}
                      <div className="flex-1 flex items-center justify-center min-h-0" style={{ position: 'relative' }}>
                        {/* Center Content */}
                        <div className="flex flex-col items-center justify-center gap-4 w-full">
                          {gameState.gamePhase === 'insurance' ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="bg-blue-900 border-2 border-blue-400 rounded-lg p-3"
                            >
                              <div className="text-white font-bold mb-3 text-sm text-center">Dealer shows Ace - Insurance offered (2:1)</div>
                              <div className="flex gap-3">
                                <motion.button
                                  onClick={() => gameState.takeInsurance()}
                                  className="py-2 px-4 bg-green-600 hover:bg-green-500 text-white font-bold text-sm rounded-lg transition-colors"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  Yes
                                </motion.button>
                                <motion.button
                                  onClick={() => gameState.declineInsurance()}
                                  className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-bold text-sm rounded-lg transition-colors"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  Decline
                                </motion.button>
                              </div>
                            </motion.div>
                          ) : gameState.gamePhase === 'gameOver' ? (
                            <div className="flex flex-col items-center gap-3" style={{ width: 'min(400px, 90%)' }}>
                              {/* Post-Game Action Buttons */}
                              <motion.button
                                onClick={handleNextRound}
                                className={isMobile ? "w-full py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-sm rounded transition-colors" : "w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded transition-colors"}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                Next Round
                              </motion.button>
                              <motion.button
                                onClick={() => {
                                  gameState.resetGame();
                                  setTimeout(() => {
                                    gameState.redoBet();
                                  }, 50);
                                }}
                                disabled={!(gameState.lastBets && (gameState.lastBets.mainBet > 0 || gameState.lastBets.perfectPairs > 0 || gameState.lastBets.twentyPlusThree > 0 || gameState.lastBets.blazingSevens > 0))}
                                className={isMobile ? "w-full py-2 px-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded transition-colors" : "w-full py-3 px-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded transition-colors"}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                title="Place previous round's bets"
                              >
                                ↻ Redo Bet
                              </motion.button>
                            </div>
                          ) : (
                            <div className="text-gray-600 text-center">
                              <div className="text-2xl opacity-20">♠ ♥ ♣ ♦</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Player Hands */}
                      <div className={isMobile ? "flex flex-col items-center gap-1 min-h-[140px] justify-center mb-4" : "flex flex-col items-center gap-1 min-h-[140px] justify-center mb-16"} style={{ marginTop: '-20px' }}>
                        <div className="text-gray-400 text-xs font-semibold uppercase">Your Hands</div>
                        {gameState.playerHands.length === 0 ? (
                          <div className="text-center text-gray-500 text-xs flex items-center justify-center h-24"><p>Place a bet and click Deal</p></div>
                        ) : (
                          <div className="flex gap-3 justify-center flex-wrap h-24 items-end">
                            {gameState.playerHands.map((hand, index) => {
                              const handValue = getHandValue(hand.cards).value;
                              return (
                                <motion.div key={index} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-1">
                                  <div className="text-gray-400 text-xs font-semibold">{handValue}</div>
                                  <HandDisplay
                                    cards={hand.cards}
                                    label={`Hand ${gameState.playerHands.length > 1 ? index + 1 : ''}`}
                                    isCurrent={index === gameState.currentHandIndex}
                                    canAct={index === gameState.currentHandIndex && gameState.gamePhase === 'playing'}
                                  />
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Game Action Buttons Below Betting Area */}
                      <div className="px-2 py-2 h-14 flex items-center justify-center" style={{ marginTop: 'auto' }}>
                        {gameState.gamePhase === 'betting' && (
                          <motion.button
                            onClick={handleDeal}
                            disabled={!gameState.playerHands[0]?.bet || gameState.playerHands[0]?.bet === 0}
                            className={isMobile
                              ? "py-2 px-6 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded transition-colors"
                              : "py-3 px-8 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded transition-colors"}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{ fontSize: isMobile ? '0.875rem' : '1rem' }}
                          >
                            🎴 Deal
                          </motion.button>
                        )}
                      </div>
                    </motion.div>

                    {/* Playing Action Buttons - Below Game Table */}
                    {gameState.gamePhase === 'playing' && (
                      <div className="px-2 py-2 flex items-center justify-center">
                        <PlayingActionButtons
                          canHit={canHit}
                          canStand={true}
                          canDouble={canDouble}
                          canSplit={canSplitHand}
                          onHit={() => gameState.hit()}
                          onStand={() => gameState.stand()}
                          onDouble={() => gameState.doubleDown()}
                          onSplit={() => gameState.split()}
                        />
                      </div>
                    )}
                  </div >
                </div >

                {/* SIDEBAR */}
                < aside
                  className="w-full p-4 md:static md:w-[320px] md:p-4 border-t border-white/10 md:border-none flex flex-col"
                  style={{
                    background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.5)'
                  }}
                >
                  <div className="order-2 md:order-first">
                    <BlackjackBetBar
                      betAmount={gameState.betAmount}
                      onBetAmountChange={(amount) => gameState.setBetAmount(amount)}
                      balance={gameState.balance}
                      disabled={gameState.gamePhase !== 'betting'}
                      currentMode={gameState.betPlacementMode}
                      onModeChange={(mode) => gameState.setBetMode(mode)}
                      onShowFairness={handleShowFairness}
                    />
                  </div>

                  {/* Active Bets Display */}
                  <div className="mt-3 order-1 md:order-2">
                    <ActiveBetsDisplay
                      mainBet={gameState.playerHands[0]?.bet || 0}
                      perfectPairsBet={gameState.playerHands[0]?.sideBets.perfectPairs || 0}
                      twentyPlusThreeBet={gameState.playerHands[0]?.sideBets.twentyPlusThree || 0}
                      blazingSevensBet={gameState.playerHands[0]?.sideBets.blazingSevens || 0}
                      isMobile={isMobile}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 mt-4 order-3 md:order-last md:mt-4 mb-4 md:mb-0">
                    {gameState.gamePhase === 'betting' ? (
                      <>
                        <motion.button
                          onClick={() => gameState.placeBet()}
                          disabled={gameState.betAmount <= 0 || gameState.betAmount > gameState.balance || !gameState.betPlacementMode}
                          className={isMobile
                            ? "w-full py-2 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded transition-colors"
                            : "w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded transition-colors"}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Place Bet
                        </motion.button>
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => gameState.undoBet()}
                            disabled={gameState.playerHands[0]?.betPlacementOrder.length === 0}
                            className={isMobile
                              ? "flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded transition-colors"
                              : "flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded transition-colors"}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            title="Remove last placed bet"
                          >
                            ↶ Undo
                          </motion.button>
                          <motion.button
                            onClick={() => gameState.clearBets()}
                            disabled={gameState.playerHands[0]?.bet === 0 && gameState.playerHands[0]?.sideBets.perfectPairs === 0}
                            className={isMobile
                              ? "flex-1 py-1.5 px-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded transition-colors"
                              : "flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded transition-colors"}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            Clear
                          </motion.button>
                        </div>
                      </>
                    ) : gameState.gamePhase === 'gameOver' ? (
                      <>
                        {/* Post-game buttons moved to table center area */}
                      </>
                    ) : null}
                  </div>

                  {/* Streak Indicator - Moved to game UI area above player hands */}

                  {/* Bet History */}
                  <div className="mt-4 order-6">
                    <BetHistory history={gameState.roundResults} isMobile={isMobile} />
                  </div>
                </aside >
              </div >
            </div >
          </div >



          {/* Blackjack Leaderboard */}
          < div className="mx-auto mt-10 max-w-xl min-w-[300px] lg:max-w-7xl w-full" >
            <BlackjackLeaderboard />
          </div >

          {/* Live Games Feed */}
          < div className="mx-auto mt-10 max-w-xl min-w-[300px] lg:max-w-7xl w-full" >
            <div style={{
              background: 'rgba(11, 11, 11, 0.8)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <LiveGamesFeed maxGames={10} />
            </div>
          </div >
        </div >
      </div >
    </>
  );
};

export default BlackjackGame;
