import React from 'react';
import { createPortal } from 'react-dom';
import '../styles/keno.css';
import useKeno from '../hooks/useKeno';
import KenoGrid from '../components/KenoGrid';
import KenoControls from '../components/KenoControls';
import KenoLiveChart from '../components/KenoLiveChart';
import ProvablyFair from '../components/ProvablyFair';
import KenoDebugOverlay from '../components/KenoDebugOverlay';
import KenoLeaderboard from '../components/KenoLeaderboard';
import LiveGamesFeed from '../components/LiveGamesFeed';
import MobileGameHeader from '../components/MobileGameHeader';
import { formatCurrency } from '../utils/format';

export default function KenoPage({ onOpenChat }) {
  const k = useKeno();
  const [showPF, setShowPF] = React.useState(false);
  const [showLiveChart, setShowLiveChart] = React.useState(false);

  return (
    <>
      <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
        {/* Mobile Header - only shows on mobile */}
        {/* Mobile Header - only shows on mobile */}
        <MobileGameHeader title="Keno" onOpenChat={onOpenChat} className="md:hidden" />

        <div className="flex-1 px-0 md:px-5 pb-4 md:pb-5">
          <div className="mx-auto mt-2 md:mt-5 max-w-xl min-w-[300px] md:drop-shadow-xl md:mt-10 lg:max-w-6xl">
            <nav className="hidden md:block w-full md:drop-shadow-lg rounded-t-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
              <div className="mx-auto flex h-12 md:h-14 max-w-7xl items-center justify-between px-3 md:px-5">
                <h1 className="text-xl md:text-2xl font-bold text-white">Keno</h1>
              </div>
            </nav>
            <div className="relative overflow-hidden rounded-b-lg">
              {/* Mobile: Column layout, Desktop: Row layout */}
              <div className="flex flex-col lg:flex-row">
                {/* Keno Game Component */}
                <div className="flex-1 relative order-1" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
                  <div className="mx-auto flex h-full flex-col px-0 md:px-4 pb-0 md:pb-4">
                    {/* HUD Removed */}
                    <KenoGrid playerNumbers={k.playerNumbers} onToggle={k.toggleNumber} drawnNumbers={k.drawnNumbers} matches={k.matches} autoDraw={k.isDrawing} onRevealComplete={k.onRevealComplete} risk={k.risk} selectionOrder={k.selectionOrder} />
                  </div>
                </div>

                {/* Sidebar - Below on mobile, side on desktop */}
                <aside className="order-2 w-full lg:w-80" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)' }}>
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

                    onShowLiveChart={() => setShowLiveChart(true)}
                    onShowInfo={() => setShowPF(true)}
                  />
                </aside>
              </div>
            </div>
          </div>

          {/* Persistent multiplier popup */}
          {k.popupData ? (
            <div className="modal screenOn no-overlay" onClick={() => k.closeResultPopup()}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: 24, position: 'relative' }}>
                {/* Mobile-friendly close button (X out) */}
                <button
                  aria-label="Close popup"
                  className="absolute top-2 right-2 text-2xl font-bold text-gray-500 hover:text-gray-900 focus:outline-none"
                  style={{ background: 'none', border: 'none', zIndex: 10, padding: '0 8px', lineHeight: 1 }}
                  onClick={(e) => { e.stopPropagation(); k.closeResultPopup(); }}
                >
                  ×
                </button>
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
                    <button className="btn-close" onClick={(e) => { e.stopPropagation(); setShowPF(true); }}>
                      {k.pendingResult && (k.pendingResult.roundId ? (`ID:${String(k.pendingResult.roundId).slice(-6)}`) : (k.pendingResult.serverSeedHashed ? k.pendingResult.serverSeedHashed.slice(0, 8) : 'Result'))}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {showPF && createPortal(
            <ProvablyFair round={k.pendingResult} onClose={() => setShowPF(false)} risk={k.risk} />,
            document.body
          )}

          {/* Live Chart Portal */}
          {showLiveChart && createPortal(
            <KenoLiveChart onClose={() => setShowLiveChart(false)} />,
            document.body
          )}

          {/* Leaderboard - Now visible on mobile */}
          <div className="mx-auto mt-10 max-w-xl min-w-[300px] lg:max-w-7xl">
            <KenoLeaderboard />
          </div>

          {/* Live Games Feed - Now visible on mobile */}
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

        {/* Keno debug overlay */}

      </div>
    </>
  );
}
