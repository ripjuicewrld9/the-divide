import React, { useEffect, useRef, useState } from 'react';
import { usePlinkoStore } from '../store';
import { PlinkoEngine } from '../lib/PlinkoEngine';
import { PlinkoPathEngine } from '../lib/PlinkoPathEngine';
import { PlinkoPlaybackEngine } from '../lib/PlinkoPlaybackEngine';
import { PlinkoRecorder } from '../lib/PlinkoRecorder';
import { binPayouts, type RowCount, autoBetIntervalMs } from '../lib/constants';
import Sidebar from './Sidebar';
import BinsRow from './BinsRow';
import LastWins from './LastWins';
import PlinkoHUD from './PlinkoHUD';
import LiveGamesFeed from '../../../components/LiveGamesFeed';
import PlinkoLeaderboard from '../../../components/PlinkoLeaderboard';
import { loadRecordingsFromStorage, loadRecordingsFromDatabase, saveRecordingsToStorage, saveRecordingsToDatabase, serializeRecordings } from '../utils/recordingManager';

// Animation mode selection
const USE_PATH_ANIMATION = true;   // Path-based (refined physics)
const USE_PLAYBACK = false;        // Recorded physics playback

export const PlinkoGame: React.FC = () => {
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

  const [betMode, setBetMode] = useState<'manual' | 'auto'>('manual');
  const [autoBetCount, setAutoBetCount] = useState(0);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [binsWidthPercentage, setBinsWidthPercentage] = useState(1);
  const [isPlayingRound, setIsPlayingRound] = useState(false);

  // Load balance on component mount
  useEffect(() => {
    loadBalanceFromBackend();
  }, [loadBalanceFromBackend]);

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
      
      // Ball landed - use the game result passed with the ball, not from a ref
      if (gameResult) {
        // balanceAfter from API is already in dollars
        let newBalanceInDollars = gameResult.balanceAfter ?? 0;
        
        // Ensure it's a valid number
        if (typeof newBalanceInDollars !== 'number' || isNaN(newBalanceInDollars)) {
          newBalanceInDollars = 0;
        }
        
        // Update balance with the authoritative balance from backend (already in dollars)
        setBalance(newBalanceInDollars);
        
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
    
    try {
      lastBetAmountRef.current = betAmount;
      
      // Deduct bet immediately from display balance
      const currentBalance = typeof balance === 'number' && !isNaN(balance) ? balance : 0;
      setBalance(Math.max(0, currentBalance - betAmount));
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        // Refund on error
        const currentBalance = typeof balance === 'number' && !isNaN(balance) ? balance : 0;
        setBalance(currentBalance + betAmount);
        return;
      }

      // Call backend API to play a round
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/plinko/play`, {
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
        // Refund the bet if API call fails
        const currentBalance = typeof balance === 'number' && !isNaN(balance) ? balance : 0;
        setBalance(currentBalance + betAmount);
        return;
      }

      const result = await response.json();
      
      // Increment nonce in localStorage to match backend
      try {
        const currentNonce = localStorage.getItem('plinko_nonce');
        const nextNonce = currentNonce != null ? Number(currentNonce) + 1 : 1;
        localStorage.setItem('plinko_nonce', String(nextNonce));
      } catch (err) {
        console.error('[Plinko] Error incrementing nonce:', err);
      }
      
      // Ensure profit is always a valid number
      if (typeof result.profit !== 'number' || isNaN(result.profit)) {
        const payout = typeof result.payout === 'number' ? result.payout : 0;
        const betAmt = typeof result.betAmount === 'number' ? result.betAmount : betAmount;
        result.profit = payout - betAmt;
      }
      
      // Ensure profit is still a valid number
      if (typeof result.profit !== 'number' || isNaN(result.profit)) {
        result.profit = 0;
      }
      
      // Store result to be applied when ball lands in bin
      // (no need to store in ref anymore - it's passed with the ball)
      
      // Drop ball with the result from backend
      if (engineRef.current) {
        const ballCreated = engineRef.current.dropBall(betAmount, result.binIndex, result);
        // If ball wasn't created, the callback already fired and decremented counter
        // So we don't need to do anything here
        if (!ballCreated) {
          console.warn('[Plinko] Ball creation failed, counter already decremented by callback');
        }
      } else {
        // No engine available - refund
        console.error('[Plinko] No engine available');
        const currentBalance = typeof balance === 'number' && !isNaN(balance) ? balance : 0;
        setBalance(currentBalance + betAmount);
      }
    } catch (error) {
      console.error('Error playing round:', error);
      // Refund on error if balance was deducted
      const currentBalance = typeof balance === 'number' && !isNaN(balance) ? balance : 0;
      setBalance(currentBalance + betAmount);
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

  return (
    <div className="relative flex min-h-dvh w-full flex-col" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
      <div className="flex-1 px-5">
        {/* Auto-generation progress */}
        {autoGenerating && (
          <div className="mx-auto mb-4 max-w-7xl rounded-lg border-2 border-blue-500 bg-blue-500/10 p-4">
            <p className="text-center text-blue-200">
              🎬 Generating physics recordings for first time... {recordingProgress.current}/{recordingProgress.total} bins
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-700">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${(recordingProgress.current / recordingProgress.total) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-center text-sm text-gray-400">This only happens once and takes ~1 minute</p>
          </div>
        )}

        {/* Manual recording banner (hidden during auto-gen) */}
        {USE_PLAYBACK && !recordingsLoaded && !isRecording && !autoGenerating && (
          <div className="mx-auto mb-4 max-w-7xl rounded-lg border-2 border-yellow-500 bg-yellow-500/10 p-4">
            <p className="text-center text-yellow-200">
              ⚠️ No physics recordings found. 
              <button 
                onClick={handleRecordPhysics}
                className="ml-2 rounded bg-yellow-500 px-4 py-1 font-bold text-black hover:bg-yellow-400"
              >
                Record Physics Now
              </button>
            </p>
          </div>
        )}
        
        {isRecording && (
          <div className="mx-auto mb-4 max-w-7xl rounded-lg border-2 border-blue-500 bg-blue-500/10 p-4">
            <p className="text-center text-blue-200">
              🎬 Recording physics simulations... {recordingProgress.current + 1}/{recordingProgress.total} bins
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-700">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${(recordingProgress.current / recordingProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="mx-auto mt-5 max-w-xl min-w-[300px] drop-shadow-xl md:mt-10 lg:max-w-6xl" style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}>
          <nav className="w-full drop-shadow-lg rounded-t-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
              <h1 className="text-2xl font-bold text-white">Plinko</h1>
            </div>
          </nav>
          <div className="relative overflow-hidden rounded-b-lg">
            <div className="flex flex-col-reverse lg:w-full lg:flex-row">
              {/* Plinko Game Component */}
              <div className="flex-1 relative" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
                <div className="mx-auto flex h-full flex-col px-4 pb-4" style={{ maxWidth: '760px' }}>
                
                {/* HUD Bar */}
                <PlinkoHUD balance={balance} message="Drop a ball to play" />

                <div className="relative w-full" style={{ aspectRatio: '760 / 570' }}>
                  <canvas
                    ref={canvasRef}
                    width={760}
                    height={570}
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
                <BinsRow rowCount={rowCount} riskLevel={riskLevel} binsWidthPercentage={binsWidthPercentage} />
              </div>
            </div>

            {/* Sidebar */}
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
            />
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

      <div className="absolute top-[15%] left-[5%]">
        <LastWins />
      </div>
    </div>
  );
};

export default PlinkoGame;
