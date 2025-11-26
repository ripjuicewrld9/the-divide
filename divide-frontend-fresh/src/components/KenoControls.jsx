import React, { useState } from 'react';
import { API_BASE } from '../config';

export default function KenoControls({ betAmount, setBetAmount, risk, setRisk, onPlay, onRandom, onClear, isDrawing, balance = 0, autoPlay, setAutoPlay, startAutoPlay, stopAutoPlay, autoRunning, autoRemaining, autoRounds, setAutoRounds }) {
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
          ? 'flex flex-col gap-6 p-4 w-full max-w-full rounded-lg shadow-lg bg-gradient-to-b from-gray-900 to-gray-800'
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
            ? 'flex gap-2 rounded-full p-2 bg-black/40'
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
                ? `flex-1 rounded-full py-4 text-base font-bold transition ${
                    betMode === mode ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-cyan-700'
                  } ${autoRunning || isDrawing ? 'opacity-50 cursor-not-allowed' : ''}`
                : `flex-1 rounded-full py-2 text-sm font-medium transition ${
                    betMode === mode ? 'text-white' : 'text-slate-400 hover:text-white'
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
      <div>
        <label className={isMobile ? 'text-lg font-bold text-cyan-300 mb-2 block' : 'text-sm font-medium text-slate-300'}>
          Bet Amount (${betAmount.toFixed(2)})
        </label>
        <div className={isMobile ? 'flex gap-2' : 'flex gap-1'}>
          <div className="relative flex-1">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
              disabled={autoRunning || isDrawing}
              min="0"
              step="0.01"
              className={isMobile ? 'w-full rounded-l-xl border-2 py-4 pr-2 pl-10 text-lg text-white disabled:opacity-50' : 'w-full rounded-l-md border-2 py-2 pr-2 pl-7 text-sm text-white disabled:opacity-50'}
              style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
            />
            <div className={isMobile ? 'absolute top-3 left-4 text-cyan-400 select-none text-lg' : 'absolute top-2 left-3 text-slate-500 select-none'} aria-hidden="true">$</div>
          </div>
          <button
            onClick={handleHalf}
            disabled={autoRunning || isDrawing}
            className={isMobile ? 'px-6 py-4 font-bold text-white text-lg rounded-xl hover:opacity-80 disabled:opacity-50 bg-yellow-500/30' : 'px-3 font-bold text-white hover:opacity-80 disabled:opacity-50 rounded-md'}
            style={isMobile ? {} : { background: 'rgba(255, 215, 0, 0.2)' }}
          >
            1/2
          </button>
          <button
            onClick={handleMax}
            disabled={autoRunning || isDrawing}
            className={isMobile ? 'px-6 py-4 font-bold text-white text-lg rounded-xl hover:opacity-80 disabled:opacity-50 bg-cyan-500/30' : 'px-3 font-bold text-white hover:opacity-80 disabled:opacity-50 rounded-md'}
            style={isMobile ? {} : { background: 'rgba(0, 255, 255, 0.2)' }}
          >
            Max
          </button>
        </div>
      </div>

      {/* Risk Level */}
      <div>
        <label className={isMobile ? 'text-lg font-bold text-cyan-300 mb-2 block' : 'text-sm font-medium text-slate-300'}>Risk</label>
        <select
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          disabled={autoRunning || isDrawing}
          className={isMobile ? 'w-full rounded-xl border-2 py-4 px-4 text-lg text-white disabled:opacity-50' : 'w-full rounded-md border-2 py-2 px-3 text-white disabled:opacity-50'}
          style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
        >
          <option value="classic">Classic</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Quick Actions */}
      <div className={isMobile ? 'flex gap-4' : 'flex gap-2'}>
        <button
          onClick={() => { onRandom && onRandom(); }}
          disabled={autoRunning || isDrawing}
          className={isMobile ? 'flex-1 px-6 py-4 font-extrabold rounded-xl text-white text-lg disabled:opacity-50 bg-cyan-500/30' : 'flex-1 px-3 py-2 font-semibold rounded-md text-white text-sm disabled:opacity-50'}
          style={isMobile ? {} : { background: 'rgba(0, 255, 255, 0.15)', border: '1px solid rgba(0, 255, 255, 0.3)' }}
        >
          Auto Pick
        </button>
        <button
          onClick={onClear}
          disabled={autoRunning || isDrawing}
          className={isMobile ? 'flex-1 px-6 py-4 font-extrabold rounded-xl text-white text-lg disabled:opacity-50 bg-yellow-500/30' : 'flex-1 px-3 py-2 font-semibold rounded-md text-white text-sm disabled:opacity-50'}
          style={isMobile ? {} : { background: 'rgba(0, 255, 255, 0.15)', border: '1px solid rgba(0, 255, 255, 0.3)' }}
        >
          Clear
        </button>
      </div>

      {/* Auto Bet Count */}
      {betMode === 'auto' && (
        <div>
          <label className={isMobile ? 'text-lg font-bold text-cyan-300 mb-2 block' : 'text-sm font-medium text-slate-300'}>
            Rounds (0 = infinite)
          </label>
          <input
            type="number"
            value={autoRounds}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (v === '') return setAutoRounds('');
              const n = Number(v);
              if (!Number.isNaN(n)) setAutoRounds(n);
            }}
            disabled={autoRunning || isDrawing}
            min="0"
            className={isMobile ? 'w-full rounded-xl border-2 py-4 px-4 text-lg text-white disabled:opacity-50' : 'w-full rounded-md border-2 py-2 px-3 text-white disabled:opacity-50'}
            style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
          />
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handlePlayClick}
        disabled={betAmount <= 0 || betAmount > balance || isDrawing}
        className={
          isMobile
            ? 'rounded-xl py-5 font-extrabold text-lg text-slate-900 transition w-full mt-2 shadow-lg'
            : 'rounded-md py-3 font-semibold text-slate-900 transition'
        }
        style={{
          background: betMode === 'manual' || !autoRunning
            ? 'linear-gradient(135deg, #00ffff, #ffd700)'
            : 'linear-gradient(135deg, #ffd700, #ff8c00)',
          opacity: (betAmount <= 0 || betAmount > balance || isDrawing) ? 0.5 : 1,
          cursor: (betAmount <= 0 || betAmount > balance || isDrawing) ? 'not-allowed' : 'pointer'
        }}
      >
        {isDrawing ? 'Drawing...' : (betMode === 'manual' ? 'Play' : (autoRunning ? `Stop (${autoRemaining})` : `Auto (${autoRounds === '' ? '∞' : autoRounds})`))}
      </button>
    </div>
  );
}
