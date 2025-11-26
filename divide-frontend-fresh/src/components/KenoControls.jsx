import React, { useState } from 'react';
import { API_BASE } from '../config';

export default function KenoControls({ betAmount, setBetAmount, risk, setRisk, onPlay, onRandom, onClear, isDrawing, balance = 0, autoPlay, setAutoPlay, startAutoPlay, stopAutoPlay, autoRunning, autoRemaining, autoRounds, setAutoRounds, onShowLiveChart, onShowInfo }) {
  const [betMode, setBetMode] = useState('manual');

  const handleHalf = () => {
    const v = Math.max(0.01, Number(betAmount || 0) / 2);
    setBetAmount(Number(v.toFixed(2)));
  };

  const handleMax = () => {
    const v = Number(balance || 0);
    setBetAmount(Number((v > 0 ? v : 0).toFixed(2)));
  };

  const handleDouble = () => {
    const v = Number(betAmount || 0) * 2;
    const capped = balance ? Math.min(v, Number(balance)) : v;
    setBetAmount(Number(capped.toFixed(2)));
  };

  const handlePlayClick = () => {
    if (betMode === 'manual') {
      onPlay && onPlay();
    } else {
      if (autoRunning) {
        stopAutoPlay && stopAutoPlay();
      } else {
        startAutoPlay && startAutoPlay(autoRounds === '' ? '' : Number(autoRounds));
      }
    }
  };

  // Responsive: use mobile-friendly layout and larger touch targets
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;
  return (
    <div
      className={
        isMobile
          ? 'flex flex-col gap-2 p-2 w-full max-w-full rounded-lg shadow-lg bg-gradient-to-b from-gray-900 to-gray-800'
          : 'flex flex-col gap-4 p-4 rounded-lg'
      }
      style={
        isMobile
          ? { minWidth: 0, border: '1px solid rgba(0,255,255,0.1)' }
          : { background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(15, 15, 30, 0.8) 100%)', border: '1px solid rgba(0, 255, 255, 0.1)', width: '100%', maxWidth: '320px' }
      }
    >
      {/* Bet Mode Toggle */}
      <div
        className={
          isMobile
            ? 'order-3 flex gap-1 rounded-full p-1 bg-black/40'
            : 'flex gap-1 rounded-full p-1'
        }
        style={isMobile ? {} : { background: 'rgba(0, 0, 0, 0.5)' }}
      >
        {['manual', 'auto'].map((mode) => (
          <button
            key={mode}
            onClick={() => setBetMode(mode)}
            disabled={autoRunning || isDrawing}
            className={
              isMobile
                ? `flex-1 rounded-full py-2 text-sm font-bold transition ${betMode === mode ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-cyan-700'
                } ${autoRunning || isDrawing ? 'opacity-50 cursor-not-allowed' : ''}`
                : `flex-1 rounded-full py-2 text-sm font-medium transition ${betMode === mode ? 'text-white' : 'text-slate-400 hover:text-white'
                } ${autoRunning || isDrawing ? 'opacity-50 cursor-not-allowed' : ''}`
            }
            style={
              betMode === mode
                ? isMobile
                  ? { background: 'linear-gradient(135deg, #00ffff 60%, #ffd700 100%)' }
                  : { background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(255, 215, 0, 0.1))' }
                : {}
            }
          >
            {mode === 'manual' ? 'Manual' : 'Auto'}
          </button>
        ))}
      </div>

      {/* Bet Amount */}
      <div className={isMobile ? 'order-1' : ''}>
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium text-slate-400">Bet Amount</span>
          {isMobile && <span className="text-xs font-medium text-slate-400">Balance: ${balance.toFixed(2)}</span>}
        </div>
        <div className={isMobile ? 'flex gap-2' : 'flex gap-1'}>
          <div className="relative flex-1">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
              disabled={autoRunning || isDrawing}
              min="0"
              step="0.01"
              className={isMobile ? 'w-full rounded-l-md border border-slate-700 bg-slate-900 py-2 pl-3 pr-16 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none' : 'w-full rounded-l-md border-2 py-2 pr-2 pl-7 text-sm text-white disabled:opacity-50'}
              style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
            />
            <div className={isMobile ? 'absolute top-2 left-3 text-slate-500 select-none text-sm' : 'absolute top-2 left-3 text-slate-500 select-none'} aria-hidden="true">$</div>
          </div>
          <button
            onClick={handleHalf}
            disabled={autoRunning || isDrawing}
            className={isMobile ? 'px-3 py-2 font-bold text-white text-xs rounded bg-slate-800 hover:bg-slate-700' : 'px-4 font-bold text-white hover:opacity-80 disabled:opacity-50'}
            style={isMobile ? {} : { background: 'rgba(255, 215, 0, 0.2)' }}
          >
            1/2
          </button>
          <button
            onClick={handleDouble}
            disabled={autoRunning || isDrawing}
            className={isMobile ? 'px-3 py-2 font-bold text-white text-xs rounded bg-slate-800 hover:bg-slate-700' : 'rounded-r-md px-4 font-bold text-white hover:opacity-80 disabled:opacity-50'}
            style={isMobile ? {} : { background: 'rgba(0, 255, 255, 0.2)' }}
          >
            2×
          </button>
        </div>
      </div>

      {/* Risk Level */}
      <div className={isMobile ? 'order-2' : ''}>
        <div className="mb-1 text-xs font-medium text-slate-400">Risk</div>
        <select
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          disabled={autoRunning || isDrawing}
          className={isMobile ? 'w-full rounded-md border border-slate-700 bg-slate-900 py-2 px-3 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none' : 'w-full rounded-md border-2 py-2 px-2 text-white disabled:opacity-50'}
          style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
        >
          <option value="classic">Classic</option>
          <option value="low">Low Risk</option>
          <option value="high">High Risk</option>
        </select>
      </div>

      {/* Auto Bet Count */}
      {betMode === 'auto' && (
        <div className={isMobile ? 'order-4' : ''}>
          <div className="mb-1 text-xs font-medium text-slate-400">Number of Bets</div>
          <input
            type="number"
            value={autoRounds}
            onChange={(e) => setAutoRounds(e.target.value)}
            disabled={autoRunning || isDrawing}
            min="0"
            placeholder="0 = infinite"
            className={isMobile ? 'w-full rounded-md border border-slate-700 bg-slate-900 py-2 px-3 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none' : 'w-full rounded-md border-2 py-2 px-2 text-white disabled:opacity-50'}
            style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className={isMobile ? 'order-5 mt-1 flex flex-col gap-2' : 'flex gap-2'}>
        {betMode === 'manual' && (
          <>
            <button
              onClick={onRandom}
              disabled={autoRunning || isDrawing}
              className={isMobile ? 'flex-1 py-3 font-bold text-white text-sm rounded-lg bg-slate-700 hover:bg-slate-600' : 'flex-1 py-3 font-bold text-white rounded-md bg-slate-700 hover:bg-slate-600'}
            >
              Random
            </button>
            <button
              onClick={onClear}
              disabled={autoRunning || isDrawing}
              className={isMobile ? 'flex-1 py-3 font-bold text-white text-sm rounded-lg bg-slate-700 hover:bg-slate-600' : 'flex-1 py-3 font-bold text-white rounded-md bg-slate-700 hover:bg-slate-600'}
            >
              Clear
            </button>
          </>
        )}
      </div>

      <button
        onClick={handlePlayClick}
        disabled={(!autoRunning && isDrawing)}
        className={
          isMobile
            ? `order-first mb-2 w-full rounded-lg py-3 text-lg font-bold text-black shadow-[0_0_20px_rgba(0,255,255,0.3)] transition hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed ${autoRunning ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200'}`
            : `w-full rounded-lg py-3 text-base font-bold text-black shadow-[0_0_20px_rgba(0,255,255,0.3)] transition hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed ${autoRunning ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200'}`
        }
      >
        {autoRunning ? 'Stop Autobet' : betMode === 'manual' ? 'Bet' : 'Start Autobet'}
      </button>

      {/* Icon buttons - Chart and Fairness */}
      {(onShowLiveChart || onShowInfo) && (
        <div className={isMobile ? "order-last flex gap-4 justify-center mt-2 pt-2 border-t border-white/5" : "flex gap-4 justify-center mt-4 pt-3 border-t border-white/5"}>
          {onShowLiveChart && !isMobile && (
            <button
              onClick={onShowLiveChart}
              className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M18 9l-5 5-3-3-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <span className="text-xs">Chart</span>
            </button>
          )}
          {onShowInfo && (
            <button
              onClick={onShowInfo}
              className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M11.5 12h1v4h-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs">Fairness</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
