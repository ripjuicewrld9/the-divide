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
  onShowLiveChart?: () => void;
  onShowProvablyFair?: () => void;
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
  onShowLiveChart,
  onShowProvablyFair,
}) => {
  // Responsive: use mobile-friendly layout and larger touch targets
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;

  return (
    <div
      className={
        isMobile
          ? 'flex flex-col gap-3 p-4 w-full max-w-full rounded-lg shadow-lg bg-gradient-to-b from-gray-900 to-gray-800'
          : 'flex flex-col gap-5 p-3 lg:max-w-80'
      }
      style={
        isMobile
          ? { minWidth: 0, border: '1px solid rgba(0,255,255,0.1)' }
          : { background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(15, 15, 30, 0.8) 100%)', border: '1px solid rgba(0, 255, 255, 0.1)' }
      }
    >
      {/* Bet Button - Top on Mobile */}
      <button
        onClick={betMode === 'manual' ? onDropBall : onAutobet}
        disabled={disabled && betMode === 'manual'}
        className={
          isMobile
            ? `order-first mb-3 w-full rounded-lg py-4 text-xl font-bold text-black shadow-[0_0_20px_rgba(0,255,255,0.3)] transition hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed ${isAutoRunning ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200'}`
            : `mt-6 w-full rounded-lg py-3 text-base font-bold text-black shadow-[0_0_20px_rgba(0,255,255,0.3)] transition hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed ${isAutoRunning ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200'}`
        }
      >
        {betMode === 'manual' ? 'Drop Ball' : isAutoRunning ? 'Stop Autobet' : 'Start Autobet'}
      </button>

      {/* Bet Amount Input */}
      <div className={isMobile ? 'order-1' : ''}>
        <div className="flex justify-between mb-1">
          <span className={isMobile ? "text-sm font-medium text-slate-400" : "text-xs font-medium text-slate-400"}>Bet Amount</span>
          {isMobile && <span className="text-sm font-medium text-slate-400">Balance: ${balance.toFixed(2)}</span>}
        </div>
        <div className="relative">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => onBetAmountChange(Number(e.target.value))}
            disabled={disabled}
            className={
              isMobile
                ? 'w-full rounded-md border border-slate-700 bg-slate-900 py-3 pl-3 pr-20 text-base font-bold text-white focus:border-cyan-500 focus:outline-none'
                : 'w-full rounded-md border border-slate-700 bg-slate-900 py-2 pl-3 pr-16 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none'
            }
          />
          <div className="absolute right-1 top-1 flex gap-1">
            <button
              onClick={() => onBetAmountChange(Number((Math.max(0.01, betAmount / 2)).toFixed(2)))}
              disabled={disabled}
              className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              ½
            </button>
            <button
              onClick={() => {
                const doubled = betAmount * 2;
                const capped = balance ? Math.min(doubled, Number(balance)) : doubled;
                onBetAmountChange(Number(capped.toFixed(2)));
              }}
              disabled={disabled}
              className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              2×
            </button>
          </div>
        </div>
      </div>

      {/* Risk Level & Rows */}
      <div className={isMobile ? 'order-2 flex flex-col gap-3' : ''}>
        <div className={isMobile ? 'flex-1' : ''}>
          <div className={isMobile ? "mb-1 text-sm font-medium text-slate-400" : "mb-1 text-xs font-medium text-slate-400"}>Risk</div>
          <select
            value={riskLevel}
            onChange={(e) => onRiskLevelChange(e.target.value as any)}
            disabled={disabled}
            className={
              isMobile
                ? 'w-full rounded-md border border-slate-700 bg-slate-900 py-3 px-3 text-base font-bold text-white focus:border-cyan-500 focus:outline-none'
                : 'w-full rounded-md border border-slate-700 bg-slate-900 py-2 px-3 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none'
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className={isMobile ? 'flex-1' : 'mt-4'}>
          <div className={isMobile ? "mb-1 text-sm font-medium text-slate-400" : "mb-1 text-xs font-medium text-slate-400"}>Rows</div>
          <select
            value={rowCount}
            onChange={(e) => onRowCountChange(Number(e.target.value) as any)}
            disabled={disabled}
            className={
              isMobile
                ? 'w-full rounded-md border border-slate-700 bg-slate-900 py-3 px-3 text-base font-bold text-white focus:border-cyan-500 focus:outline-none'
                : 'w-full rounded-md border border-slate-700 bg-slate-900 py-2 px-3 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none'
            }
          >
            {[8, 9, 10, 11, 12, 13, 14, 15, 16].map((rows) => (
              <option key={rows} value={rows}>
                {rows}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bet Mode Toggle */}
      <div
        className={
          isMobile
            ? 'order-3 flex gap-1 rounded-full p-1 bg-black/40'
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
                ? `flex-1 rounded-full py-3 text-base font-bold transition ${betMode === mode ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-cyan-700'
                } ${isAutoRunning ? 'opacity-50 cursor-not-allowed' : ''}`
                : `flex-1 rounded-full py-2 text-sm font-medium text-white transition ${betMode === mode ? 'text-white' : 'text-slate-400 hover:text-white'
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

      {/* Auto Bet Count (only in auto mode) */}
      {betMode === 'auto' && (
        <div className={isMobile ? 'order-4' : 'mt-4'}>
          <div className={isMobile ? "mb-1 text-sm font-medium text-slate-400" : "mb-1 text-xs font-medium text-slate-400"}>Number of Bets</div>
          <input
            type="number"
            value={autoBetCount}
            onChange={(e) => onAutoBetCountChange(Number(e.target.value))}
            disabled={isAutoRunning}
            className={
              isMobile
                ? 'w-full rounded-md border border-slate-700 bg-slate-900 py-3 px-3 text-base font-bold text-white focus:border-cyan-500 focus:outline-none'
                : 'w-full rounded-md border border-slate-700 bg-slate-900 py-2 px-3 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none'
            }
          />
        </div>
      )}

      {/* Icon buttons - Chart and Fairness */}
      {(onShowLiveChart || onShowProvablyFair) && (
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
          {onShowProvablyFair && (
            <button
              onClick={(e) => { e.stopPropagation(); onShowProvablyFair(); }}
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
};

export default Sidebar;
