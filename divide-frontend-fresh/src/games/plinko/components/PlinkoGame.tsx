import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePlinkoStore } from '../store';
import { PlinkoEngine } from '../lib/PlinkoEngine';
import { PlinkoPathEngine } from '../lib/PlinkoPathEngine';
import { PlinkoPlaybackEngine } from '../lib/PlinkoPlaybackEngine';
import { PlinkoRecorder } from '../lib/PlinkoRecorder';
import { binPayouts, type RowCount, autoBetIntervalMs } from '../lib/constants';
import Sidebar from './Sidebar';
import BinsRow from './BinsRow';
import LastWins from './LastWins';
import { PlinkoLiveChart } from './PlinkoLiveChart';
import LiveGamesFeed from '../../../components/LiveGamesFeed';
import PlinkoLeaderboard from '../../../components/PlinkoLeaderboard';
import MobileGameHeader from '../../../components/MobileGameHeader';
import PlinkoProvablyFair from '../../../components/PlinkoProvablyFair';
import { loadRecordingsFromStorage, loadRecordingsFromDatabase, saveRecordingsToStorage, saveRecordingsToDatabase, serializeRecordings } from '../utils/recordingManager';
import { useAuth } from '../../../context/AuthContext';

// Animation mode selection
const USE_PATH_ANIMATION = true;   // Path-based (refined physics)
const USE_PLAYBACK = false;        // Recorded physics playback

interface PlinkoGameProps {
  onOpenChat?: () => void;
}

export const PlinkoGame: React.FC<PlinkoGameProps> = ({ onOpenChat }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PlinkoEngine | PlinkoPathEngine | PlinkoPlaybackEngine | null>(null);
  const autoBetIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBetAmountRef = useRef<number>(0);
  const activeBallsRef = useRef<number>(0);
  const lastDropTimeRef = useRef<number>(0);
  const [recordingsLoaded, setRecordingsLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState({ current: 0, total: 0 });
  const [autoGenerating, setAutoGenerating] = useState(false);

  const MAX_CONCURRENT_BALLS = 10; // Limit concurrent balls to prevent overload
  const MIN_DROP_INTERVAL = 100; // Minimum 100ms between drops

  const {
    balance,
    betAmount,
    riskLevel,
    rowCount,
    setBalance,
    setBetAmount,
    setRiskLevel,
    setRowCount,
    loadBalanceFromBackend,
    addWinRecord,
  } = usePlinkoStore();
  const { user, updateUser, setBalance: setAuthBalance } = useAuth();

  const [betMode, setBetMode] = useState<'manual' | 'auto'>('manual');
  const [autoBetCount, setAutoBetCount] = useState(0);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [binsWidthPercentage, setBinsWidthPercentage] = useState(1);
  const [isPlayingRound, setIsPlayingRound] = useState(false);
  const [showProvablyFair, setShowProvablyFair] = useState(false);
  const [showLiveChart, setShowLiveChart] = useState(false);
  const hasPendingRoundRef = useRef(false);

  // Sync balance from AuthContext on mount and when user.balance changes
  // BUT skip if we have a pending round (optimistic deduction in progress)
  useEffect(() => {
    if (user?.balance !== undefined && user.balance !== null && !hasPendingRoundRef.current) {
      const roundedBalance = Math.round(user.balance * 100) / 100;
      setBalance(roundedBalance);
    }
  }, [user?.balance, setBalance]);

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current) return;

    let engine: PlinkoEngine | PlinkoPathEngine | PlinkoPlaybackEngine;

    if (USE_PLAYBACK) {
      engine = new PlinkoPlaybackEngine(canvasRef.current, rowCount as RowCount);

      // Try to load recordings
      const loadRecordings = async () => {
        console.log(`🔍 Checking database for ${rowCount}-row recordings...`);

        // Try database first
        let recordings = await loadRecordingsFromDatabase(rowCount);

        if (recordings && engine instanceof PlinkoPlaybackEngine) {
          engine.loadRecordings(recordings);
          setRecordingsLoaded(true);
          console.log(`✅ Loaded ${rowCount}-row recordings from database`);
        } else {
          console.log(`⚠️ No recordings in database for ${rowCount} rows. Generating...`);
          setRecordingsLoaded(false);

          // Auto-generate if not found
          setAutoGenerating(true);
          try {
            const recorder = new PlinkoRecorder(rowCount as RowCount);
            const numBins = rowCount + 1;

            for (let binIndex = 0; binIndex < numBins; binIndex++) {
              setRecordingProgress({ current: binIndex, total: numBins });
              await recorder.recordBin(binIndex, undefined, true);
            }

            setRecordingProgress({ current: numBins, total: numBins });
            const newRecordings = recorder.getAllRecordings();

            // Save to database
            await saveRecordingsToDatabase(rowCount, newRecordings);

            if (engine instanceof PlinkoPlaybackEngine) {
              engine.loadRecordings(newRecordings);
              setRecordingsLoaded(true);
            }

            console.log(`✅ Generated and saved ${rowCount}-row recordings to database`);
          } catch (error) {
            console.error('Auto-generation failed:', error);
          } finally {
            setAutoGenerating(false);
            setRecordingProgress({ current: 0, total: 0 });
          }
        }
      };
      loadRecordings();
    } else if (USE_PATH_ANIMATION) {
      engine = new PlinkoPathEngine(canvasRef.current, rowCount as RowCount);
      setRecordingsLoaded(true);  // Path mode doesn't need recordings
    } else {
      engine = new PlinkoEngine(canvasRef.current, rowCount as RowCount, riskLevel);
      setRecordingsLoaded(true);  // Physics mode doesn't need recordings
    }

    engine.setOnBallInBin((binIndex, betAmount, gameResult) => {

      // Ball landed - update balance to the server's calculated balanceAfter
      if (gameResult && typeof gameResult.balanceAfter === 'number') {
        const roundedBalance = Math.round(gameResult.balanceAfter * 100) / 100;
        setBalance(roundedBalance);
        if (updateUser) updateUser({ balance: roundedBalance });
        hasPendingRoundRef.current = false; // Clear pending flag

        // Add win record for visual feedback
        addWinRecord({
          id: Math.random().toString(),
          betAmount: lastBetAmountRef.current,
          rowCount: rowCount as RowCount,
          binIndex: gameResult.binIndex,
          payout: { multiplier: gameResult.multiplier, value: gameResult.payout },
          profit: gameResult.profit,
        });
      }
    });
    engine.start();
    engineRef.current = engine;
    setBinsWidthPercentage(engine.binsWidthPercentage);

    return () => {
      engine.stop();
      if ('destroy' in engine && typeof engine.destroy === 'function') {
        engine.destroy();
      }
      engineRef.current = null;
    };
  }, [rowCount, riskLevel, setBalance]);

  // Update row count in engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setRowCount(rowCount as RowCount);
      setBinsWidthPercentage(engineRef.current.binsWidthPercentage);
    }
  }, [rowCount]);

  // Update risk level in engine
  useEffect(() => {
    if (engineRef.current && 'setRiskLevel' in engineRef.current) {
      engineRef.current.setRiskLevel(riskLevel);
    }
  }, [riskLevel]);

  // Safety cleanup: periodically check for stuck balls and remove the old manual counter sync
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (engineRef.current && 'balls' in engineRef.current) {
        const engine = engineRef.current as any;
        const activeBalls = engine.balls?.size || 0;

        // Just log if there are many balls for debugging
        if (activeBalls > MAX_CONCURRENT_BALLS) {
          console.warn(`[Plinko] High ball count detected: ${activeBalls}`);
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  const handleDropBall = async () => {
    // Get actual ball count from engine instead of using ref
    const getActiveBallCount = () => {
      if (engineRef.current && 'balls' in engineRef.current) {
        const engine = engineRef.current as any;
        return engine.balls?.size || 0;
      }
      return 0;
    };

    // Throttle: prevent spam by limiting concurrent balls and enforcing minimum interval
    const now = Date.now();
    const currentActiveBalls = getActiveBallCount();

    if (currentActiveBalls >= MAX_CONCURRENT_BALLS) {
      return; // Too many balls in flight
    }
    if (now - lastDropTimeRef.current < MIN_DROP_INTERVAL) {
      return; // Dropping too fast
    }

    // Only check bet validity
    if (betAmount <= 0 || isRecording) {
      return;
    }

    // Check balance at time of click - ensure it's a number
    const currentBalance = typeof balance === 'number' ? balance : 0;
    if (betAmount > currentBalance) {
      return;
    }

    // Update throttle tracking
    lastDropTimeRef.current = now;

    // Mark that we have a pending round
    hasPendingRoundRef.current = true;

    // DON'T deduct optimistically - server will deduct and return new balance immediately

    try {
      lastBetAmountRef.current = betAmount;

      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      // Call backend API to play a round (server deducts bet immediately)
      const response = await fetch(`${(import.meta as any).env.VITE_API_URL || ''}/api/plinko/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          betAmount: betAmount,
          riskLevel: riskLevel,
          rowCount: rowCount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from backend:', errorData);
        hasPendingRoundRef.current = false;
        return;
      }

      const result = await response.json();

      // Update balance from server response (bet already deducted)
      // Update both local store AND AuthContext so header reflects change immediately
      if (typeof result.balanceAfter !== 'undefined') {
        setBalance(result.balanceAfter);
        setAuthBalance(result.balanceAfter);
      }

      // Increment nonce in localStorage to match backend
      try {
        const currentNonce = localStorage.getItem('plinko_nonce');
        const nextNonce = currentNonce != null ? Number(currentNonce) + 1 : 1;
        localStorage.setItem('plinko_nonce', String(nextNonce));
      } catch (err) {
        console.error('[Plinko] Error incrementing nonce:', err);
      }

      // Ensure profit is a valid number
      if (typeof result.profit !== 'number' || isNaN(result.profit)) {
        const payout = typeof result.payout === 'number' ? result.payout : 0;
        const betAmt = typeof result.betAmount === 'number' ? result.betAmount : betAmount;
        result.profit = payout - betAmt;
      }

      // Drop ball with the result from backend
      // The ball callback will update balance to balanceAfter when it lands (after animation)
      if (engineRef.current) {
        engineRef.current.dropBall(betAmount, result.binIndex, result);
      }
    } catch (error) {
      console.error('Error playing round:', error);
      // Restore balance on error
      setBalance(prevBalance);
      hasPendingRoundRef.current = false;
    }
  };

  const handleAutobet = () => {
    if (betAmount <= 0 || betAmount > balance) return;

    if (!isAutoRunning) {
      setIsAutoRunning(true);
      autoBetIntervalRef.current = setInterval(() => {
        handleDropBall();
      }, autoBetIntervalMs);
    } else {
      setIsAutoRunning(false);
      if (autoBetIntervalRef.current) {
        clearInterval(autoBetIntervalRef.current);
      }
    }
  };

  // Record physics simulations
  const handleRecordPhysics = async () => {
    if (isRecording) return;

    setIsRecording(true);
    console.log('🎬 Starting physics recording...');

    try {
      const recorder = new PlinkoRecorder(rowCount as RowCount);
      const numBins = rowCount + 1;

      let completedBins = 0;
      for (let binIndex = 0; binIndex < numBins; binIndex++) {
        console.log(`Recording bin ${binIndex + 1}/${numBins}...`);
        setRecordingProgress({ current: completedBins, total: numBins });

        await recorder.recordBin(binIndex);
        completedBins++;
      }

      setRecordingProgress({ current: numBins, total: numBins });

      // Save recordings
      const recordings = recorder.getAllRecordings();
      saveRecordingsToStorage(recordings);

      // Load into current engine
      if (engineRef.current && engineRef.current instanceof PlinkoPlaybackEngine) {
        engineRef.current.loadRecordings(recordings);
        setRecordingsLoaded(true);
      }

      console.log('✅ Recording complete!');
      alert(`✅ Successfully recorded physics simulations!\n\nYou can now play with real physics animations.`);
    } catch (error) {
      console.error('Recording failed:', error);
      alert('❌ Recording failed. Check console for details.');
    } finally {
      setIsRecording(false);
      setRecordingProgress({ current: 0, total: 0 });
    }
  };

  // Device detection for layout separation
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;
  return (
    <>
      <div
        className={isMobile ? 'relative flex min-h-dvh w-full flex-col bg-gradient-to-b from-gray-900 to-gray-800' : 'relative flex min-h-dvh w-full flex-col'}
        style={isMobile ? {} : { background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}
      >
        {/* Mobile Header - only shows on mobile */}
        <MobileGameHeader title="Plinko" onOpenChat={onOpenChat} className="md:hidden" />

        <div className={isMobile ? 'flex-1 px-1 py-1 pb-4' : 'flex-1 px-5'}>
          <div className="mx-auto mt-2 max-w-xl min-w-[300px] drop-shadow-xl md:mt-10 lg:max-w-6xl" style={isMobile ? {} : { transform: 'scale(0.9)', transformOrigin: 'top center' }}>
            <div className="relative overflow-hidden rounded-lg">
              <div className={isMobile ? 'flex flex-col w-full gap-2' : 'flex flex-col-reverse lg:w-full lg:flex-row'}>
                {/* Plinko Game Component */}
                <div className={isMobile ? 'w-full relative bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl shadow-lg p-1' : 'flex-1 relative'} style={isMobile ? {} : { background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
                  <div className={isMobile ? 'mx-auto flex h-full flex-col px-0 pb-1' : 'mx-auto flex h-full flex-col px-4 pb-4'} style={{ maxWidth: '760px' }}>
                    <div className={isMobile ? 'flex flex-row items-start w-full gap-2' : 'flex flex-row items-start w-full gap-4'}>
                      {/* Canvas and bins stacked vertically, LastWins beside */}
                      <div className={isMobile ? 'flex flex-col flex-1' : 'flex flex-col flex-1'}>
                        <div className={isMobile ? 'relative w-full' : 'relative w-full'} style={isMobile ? { aspectRatio: '760 / 570' } : { aspectRatio: '760 / 570' }}>
                          <canvas
                            ref={canvasRef}
                            width={760}
                            height={570}
                            className="absolute inset-0 h-full w-full"
                          />
                        </div>
                        <div className={isMobile ? 'w-full' : 'w-full'}>
                          <BinsRow rowCount={rowCount} riskLevel={riskLevel} binsWidthPercentage={binsWidthPercentage} />
                        </div>
                      </div>
                      {/* LastWins: Multiplier stack, always visible and beside the game */}
                      <div className={isMobile ? 'flex-shrink-0 flex flex-col justify-start items-center min-w-[48px]' : 'flex-shrink-0 flex flex-col justify-start items-center min-w-[56px]'}>
                        <LastWins winCount={4} />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Sidebar below game on mobile, right on desktop */}
                <div className={isMobile ? 'w-full' : ''}>
                  <Sidebar
                    betAmount={betAmount}
                    onBetAmountChange={setBetAmount}
                    betMode={betMode}
                    onBetModeChange={setBetMode}
                    riskLevel={riskLevel}
                    onRiskLevelChange={setRiskLevel}
                    rowCount={rowCount}
                    onRowCountChange={setRowCount}
                    autoBetCount={autoBetCount}
                    onAutoBetCountChange={setAutoBetCount}
                    isAutoRunning={isAutoRunning}
                    onDropBall={handleDropBall}
                    onAutobet={handleAutobet}
                    balance={balance}
                    disabled={isAutoRunning}
                    onShowLiveChart={() => setShowLiveChart(true)}
                    onShowProvablyFair={() => { console.log('Fairness clicked'); setShowProvablyFair(true); }}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Plinko Leaderboard */}
          <div className="mx-auto mt-10 max-w-xl min-w-[300px] lg:max-w-7xl">
            <PlinkoLeaderboard />
          </div>
          {/* Live Games Feed */}
          <div className="mx-auto mt-10 max-w-xl min-w-[300px] lg:max-w-7xl">
            <div style={{
              background: 'rgba(11, 11, 11, 0.8)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <LiveGamesFeed maxGames={10} />
            </div>
          </div>
        </div>
        {/* Remove floating LastWins panel for desktop, now always visible near game */}
      </div>

      {/* Provably Fair modal - rendered via Portal to escape any parent clipping */}
      {showProvablyFair && createPortal(
        <PlinkoProvablyFair onClose={() => setShowProvablyFair(false)} initialTab="seed" />,
        document.body
      )}

      {/* Live Chart - rendered via Portal */}
      {showLiveChart && createPortal(
        <PlinkoLiveChart onClose={() => setShowLiveChart(false)} />,
        document.body
      )}
    </>
  );
};

export default PlinkoGame;
