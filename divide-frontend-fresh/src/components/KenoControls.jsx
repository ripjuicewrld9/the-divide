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

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(15, 15, 30, 0.8) 100%)', border: '1px solid rgba(0, 255, 255, 0.1)', width: '100%', maxWidth: '320px' }}>
      {/* Bet Mode Toggle */}
      <div className="flex gap-1 rounded-full p-1" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
        {['manual', 'auto'].map((mode) => (
          <button
            key={mode}
            onClick={() => setBetMode(mode)}
            disabled={autoRunning || isDrawing}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
              betMode === mode ? 'text-white' : 'text-slate-400 hover:text-white'
            } ${autoRunning || isDrawing ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={betMode === mode ? { background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(255, 215, 0, 0.1))' } : {}}
          >
            {mode === 'manual' ? 'Manual' : 'Auto'}
          </button>
        ))}
      </div>

      {/* Bet Amount */}
      <div>
        <label className="text-sm font-medium text-slate-300">Bet Amount (${betAmount.toFixed(2)})</label>
        <div className="flex gap-1">
          <div className="relative flex-1">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
              disabled={autoRunning || isDrawing}
              min="0"
              step="0.01"
              className="w-full rounded-l-md border-2 py-2 pr-2 pl-7 text-sm text-white disabled:opacity-50"
              style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
            />
            <div className="absolute top-2 left-3 text-slate-500 select-none" aria-hidden="true">$</div>
          </div>
          <button
            onClick={handleHalf}
            disabled={autoRunning || isDrawing}
            className="px-3 font-bold text-white hover:opacity-80 disabled:opacity-50 rounded-md"
            style={{ background: 'rgba(255, 215, 0, 0.2)' }}
          >
            1/2
          </button>
          <button
            onClick={handleMax}
            disabled={autoRunning || isDrawing}
            className="px-3 font-bold text-white hover:opacity-80 disabled:opacity-50 rounded-md"
            style={{ background: 'rgba(0, 255, 255, 0.2)' }}
          >
            Max
          </button>
        </div>
      </div>

      {/* Risk Level */}
      <div>
        <label className="text-sm font-medium text-slate-300">Risk</label>
        <select
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          disabled={autoRunning || isDrawing}
          className="w-full rounded-md border-2 py-2 px-3 text-white disabled:opacity-50"
          style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
        >
          <option value="classic">Classic</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => { onRandom && onRandom(); }}
          disabled={autoRunning || isDrawing}
          className="flex-1 px-3 py-2 font-semibold rounded-md text-white text-sm disabled:opacity-50"
          style={{ background: 'rgba(0, 255, 255, 0.15)', border: '1px solid rgba(0, 255, 255, 0.3)' }}
        >
          Auto Pick
        </button>
        <button
          onClick={onClear}
          disabled={autoRunning || isDrawing}
          className="flex-1 px-3 py-2 font-semibold rounded-md text-white text-sm disabled:opacity-50"
          style={{ background: 'rgba(0, 255, 255, 0.15)', border: '1px solid rgba(0, 255, 255, 0.3)' }}
        >
          Clear
        </button>
      </div>

      {/* Auto Bet Count */}
      {betMode === 'auto' && (
        <div>
          <label className="text-sm font-medium text-slate-300">Rounds (0 = infinite)</label>
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
            className="w-full rounded-md border-2 py-2 px-3 text-white disabled:opacity-50"
            style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
          />
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handlePlayClick}
        disabled={betAmount <= 0 || betAmount > balance || isDrawing}
        className="rounded-md py-3 font-semibold text-slate-900 transition"
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
