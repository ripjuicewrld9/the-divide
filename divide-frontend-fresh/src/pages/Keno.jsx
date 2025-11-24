import React from 'react';
import '../styles/keno.css';
import useKeno from '../hooks/useKeno';
import KenoGrid from '../components/KenoGrid';
import KenoControls from '../components/KenoControls';
import KenoHUD from '../components/KenoHUD';
import ProvablyFair from '../components/ProvablyFair';
import KenoDebugOverlay from '../components/KenoDebugOverlay';
import KenoLeaderboard from '../components/KenoLeaderboard';
import LiveGamesFeed from '../components/LiveGamesFeed';
import { formatCurrency } from '../utils/format';

export default function KenoPage() {
  const k = useKeno();
  const [showPF, setShowPF] = React.useState(false);
  return (
    <>
    <div className="relative flex min-h-dvh w-full flex-col" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
      <div className="flex-1 px-5">
        <div className="mx-auto mt-5 max-w-xl min-w-[300px] drop-shadow-xl md:mt-10 lg:max-w-6xl" style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}>
          <nav className="w-full drop-shadow-lg rounded-t-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
              <h1 className="text-2xl font-bold text-white">Keno</h1>
            </div>
          </nav>
          <div className="relative overflow-hidden rounded-b-lg">
            <div className="flex flex-col-reverse lg:w-full lg:flex-row">
              {/* Keno Game Component */}
              <div className="flex-1 relative" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
                <div className="mx-auto flex h-full flex-col px-4 pb-4">
                  <KenoHUD balance={k.balance} message={k.message} computeOdds={k.computeOdds} risk={k.risk} />
                  <KenoGrid playerNumbers={k.playerNumbers} onToggle={k.toggleNumber} drawnNumbers={k.drawnNumbers} matches={k.matches} autoDraw={k.isDrawing} onRevealComplete={k.onRevealComplete} risk={k.risk} selectionOrder={k.selectionOrder} />
                </div>
              </div>

              {/* Sidebar */}
              <aside style={{ width: '320px', background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
                <KenoControls
              betAmount={k.betAmount}
              setBetAmount={k.setBetAmount}
              risk={k.risk}
              setRisk={k.setRisk}
              onPlay={k.play}
              onRandom={k.randomPick}
              onClear={k.clear}
              isDrawing={k.isDrawing}
              balance={k.balance}
              
              autoPlay={k.autoPlay}
              setAutoPlay={k.setAutoPlay}
              startAutoPlay={k.startAutoPlay}
              stopAutoPlay={k.stopAutoPlay}
              autoRunning={k.autoRunning}
              autoRemaining={k.autoRemaining}
              autoRounds={k.autoRounds}
              setAutoRounds={k.setAutoRounds}
            />
          </aside>
            </div>
          </div>
        </div>

        {/* Persistent multiplier popup — shown after animations complete until user clicks */}
        {k.popupData ? (
          <div className="modal screenOn no-overlay" onClick={() => k.closeResultPopup()}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: 24 }}>
              <div className="win-card">
                <div className="win-header">Round Result</div>
                <div className="win-body">
                  <div className="hits">
                    <div className="hits-num">{(k.matches || []).length}</div>
                    <div className="hits-label">Tiles Hit</div>
                  </div>
                  <div className="multiplier">
                    <div className="mult-num">{k.popupData.multiplier.toFixed(2)}x</div>
                    <div className="mult-label">Multiplier</div>
                  </div>
                  <div className="amount">
                    <div className="amt-num">${formatCurrency(k.popupData.win || 0, 2)}</div>
                    <div className="amt-label">Payout</div>
                  </div>
                </div>
                  <div className="win-actions">
                    {/* Show round id (short) or a short hash if available; clicking opens the Provably Fair modal */}
                    <button className="btn-close" onClick={(e) => { e.stopPropagation(); setShowPF(true); }}>
                      {k.pendingResult && (k.pendingResult.roundId ? (`ID:${String(k.pendingResult.roundId).slice(-6)}`) : (k.pendingResult.serverSeedHashed ? k.pendingResult.serverSeedHashed.slice(0,8) : 'Result'))}
                    </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {showPF ? (
          <ProvablyFair round={k.pendingResult} onClose={() => setShowPF(false)} risk={k.risk} />
        ) : null}

        {/* Keno Leaderboard */}
        <div className="mx-auto mt-10 max-w-xl min-w-[300px] lg:max-w-7xl">
          <KenoLeaderboard />
        </div>

        {/* Live Games Feed */}
        <div className="mx-auto mt-10 max-w-xl min-w-[300px] lg:max-w-7xl">
          <div style={{
            background: 'rgba(11, 11, 11, 0.8)',
            border: '1px solid rgba(0, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <LiveGamesFeed />
          </div>
        </div>
      </div>

        {/* Footer intentionally left minimal (info button removed) */}
        {/* Keno debug overlay (shows last server result) */}
        <KenoDebugOverlay result={k.pendingResult} picks={k.selectionOrder || Object.keys(k.playerNumbers || {}).map(Number)} />
    </div>
    </>
  );
}
