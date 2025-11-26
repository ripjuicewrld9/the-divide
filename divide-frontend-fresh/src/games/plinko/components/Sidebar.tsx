import React from 'react';
import { RiskLevel } from '../types';
import { rowCountOptions, type RowCount } from '../lib/constants';

interface SidebarProps {
  betAmount: number;
  onBetAmountChange: (amount: number) => void;
  betMode: 'manual' | 'auto';
  onBetModeChange: (mode: 'manual' | 'auto') => void;
  riskLevel: RiskLevel;
  onRiskLevelChange: (level: RiskLevel) => void;
  rowCount: RowCount;
  onRowCountChange: (rows: RowCount) => void;
  autoBetCount: number;
  onAutoBetCountChange: (count: number) => void;
  isAutoRunning: boolean;
  onDropBall: () => void;
  onAutobet: () => void;
  balance: number;
  disabled: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  betAmount,
  onBetAmountChange,
  betMode,
  onBetModeChange,
  riskLevel,
  onRiskLevelChange,
  rowCount,
  onRowCountChange,
  autoBetCount,
  onAutoBetCountChange,
  isAutoRunning,
  onDropBall,
  onAutobet,
  balance,
  disabled,
}) => {
  // Responsive: use mobile-friendly layout and larger touch targets
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;
  return (
    <div
      className={
        isMobile
          ? 'flex flex-col gap-6 p-4 w-full max-w-full rounded-lg shadow-lg bg-gradient-to-b from-gray-900 to-gray-800'
          : 'flex flex-col gap-5 p-3 lg:max-w-80'
      }
      style={
        isMobile
          ? { minWidth: 0, border: '1px solid rgba(0,255,255,0.1)' }
          : { background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(15, 15, 30, 0.8) 100%)', border: '1px solid rgba(0, 255, 255, 0.1)' }
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
        {(['manual', 'auto'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onBetModeChange(mode)}
            disabled={isAutoRunning}
            className={
              isMobile
                ? `flex-1 rounded-full py-4 text-base font-bold transition ${
                    betMode === mode ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-cyan-700'
                  } ${isAutoRunning ? 'opacity-50 cursor-not-allowed' : ''}`
                : `flex-1 rounded-full py-2 text-sm font-medium text-white transition ${
                    betMode === mode ? 'text-white' : 'text-slate-400 hover:text-white'
                  } ${isAutoRunning ? 'opacity-50 cursor-not-allowed' : ''}`
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
        <div className={isMobile ? 'flex gap-2' : 'flex'}>
          <div className="relative flex-1">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => onBetAmountChange(parseFloat(e.target.value) || 0)}
              disabled={isAutoRunning}
              min="0"
              step="0.01"
              className={isMobile ? 'w-full rounded-l-xl border-2 py-4 pr-2 pl-10 text-lg text-white disabled:opacity-50' : 'w-full rounded-l-md border-2 py-2 pr-2 pl-7 text-sm text-white disabled:opacity-50'}
              style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
            />
            <div className={isMobile ? 'absolute top-3 left-4 text-cyan-400 select-none text-lg' : 'absolute top-2 left-3 text-slate-500 select-none'} aria-hidden="true">$</div>
          </div>
          <button
            onClick={() => onBetAmountChange(betAmount / 2)}
            disabled={isAutoRunning}
            className={isMobile ? 'px-6 py-4 font-bold text-white text-lg rounded-xl hover:opacity-80 disabled:opacity-50 bg-yellow-500/30' : 'px-4 font-bold text-white hover:opacity-80 disabled:opacity-50'}
            style={isMobile ? {} : { background: 'rgba(255, 215, 0, 0.2)' }}
          >
            1/2
          </button>
          <button
            onClick={() => onBetAmountChange(betAmount * 2)}
            disabled={isAutoRunning}
            className={isMobile ? 'px-6 py-4 font-bold text-white text-lg rounded-xl hover:opacity-80 disabled:opacity-50 bg-cyan-500/30' : 'rounded-r-md px-4 font-bold text-white hover:opacity-80 disabled:opacity-50'}
            style={isMobile ? {} : { background: 'rgba(0, 255, 255, 0.2)' }}
          >
            2×
          </button>
        </div>
      </div>

      {/* Risk Level */}
      <div>
        <label className={isMobile ? 'text-lg font-bold text-cyan-300 mb-2 block' : 'text-sm font-medium text-slate-300'}>Risk</label>
        <select
          value={riskLevel}
          onChange={(e) => onRiskLevelChange(e.target.value as RiskLevel)}
          disabled={disabled}
          className={isMobile ? 'w-full rounded-xl border-2 py-4 px-4 text-lg text-white disabled:opacity-50' : 'w-full rounded-md border-2 py-2 px-2 text-white disabled:opacity-50'}
          style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Row Count */}
      <div>
        <label className={isMobile ? 'text-lg font-bold text-cyan-300 mb-2 block' : 'text-sm font-medium text-slate-300'}>Rows</label>
        <select
          value={rowCount}
          onChange={(e) => onRowCountChange(parseInt(e.target.value) as RowCount)}
          disabled={disabled}
          className={isMobile ? 'w-full rounded-xl border-2 py-4 px-4 text-lg text-white disabled:opacity-50' : 'w-full rounded-md border-2 py-2 px-2 text-white disabled:opacity-50'}
          style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
        >
          {rowCountOptions.map((rows) => (
            <option key={rows} value={rows}>
              {rows}
            </option>
          ))}
        </select>
      </div>

      {/* Auto Bet Count */}
      {betMode === 'auto' && (
        <div>
          <label className={isMobile ? 'text-lg font-bold text-cyan-300 mb-2 block' : 'text-sm font-medium text-slate-300'}>
            Number of Bets (0 = infinite)
          </label>
          <input
            type="number"
            value={autoBetCount}
            onChange={(e) => onAutoBetCountChange(Math.max(0, parseInt(e.target.value) || 0))}
            disabled={isAutoRunning}
            min="0"
            className={isMobile ? 'w-full rounded-xl border-2 py-4 px-4 text-lg text-white disabled:opacity-50' : 'w-full rounded-md border-2 py-2 px-2 text-white disabled:opacity-50'}
            style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
          />
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={betMode === 'manual' ? onDropBall : onAutobet}
        disabled={disabled || betAmount <= 0 || betAmount > balance}
        className={
          isMobile
            ? 'rounded-xl py-5 font-extrabold text-lg text-slate-900 transition w-full mt-2 shadow-lg'
            : 'rounded-md py-3 font-semibold text-slate-900 transition'
        }
        style={{
          background: betMode === 'manual'
            ? 'linear-gradient(135deg, #00ffff, #ffd700)'
            : isAutoRunning
              ? 'linear-gradient(135deg, #ffd700, #ff8c00)'
              : 'linear-gradient(135deg, #00ffff, #ffd700)',
          opacity: (disabled || betAmount <= 0 || betAmount > balance) ? 0.5 : 1,
          cursor: (disabled || betAmount <= 0 || betAmount > balance) ? 'not-allowed' : 'pointer'
        }}
      >
        {betMode === 'manual' ? 'Drop Ball' : isAutoRunning ? 'Stop Autobet' : 'Start Autobet'}
      </button>
    </div>
  );
};

export default Sidebar;
