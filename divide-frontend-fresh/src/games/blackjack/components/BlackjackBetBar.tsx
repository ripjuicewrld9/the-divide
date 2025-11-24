import React from 'react';

interface BlackjackBetBarProps {
  betAmount: number;
  onBetAmountChange: (amount: number) => void;
  balance: number;
  disabled?: boolean;
  currentMode: 'main' | 'perfectPairs' | 'twentyPlusThree' | 'blazingSevens' | null;
  onModeChange: (mode: 'main' | 'perfectPairs' | 'twentyPlusThree' | 'blazingSevens') => void;
}

export const BlackjackBetBar: React.FC<BlackjackBetBarProps> = ({
  betAmount,
  onBetAmountChange,
  balance,
  disabled = false,
  currentMode,
  onModeChange,
}) => {
  const handleHalf = () => {
    const v = Math.max(0.01, betAmount / 2);
    onBetAmountChange(Number(v.toFixed(2)));
  };

  const handleDouble = () => {
    const v = betAmount * 2;
    const maxBet = balance / 100; // balance is in cents
    const capped = Math.min(v, maxBet);
    onBetAmountChange(Number(capped.toFixed(2)));
  };

  const handleMax = () => {
    const maxBet = balance / 100; // balance is in cents
    onBetAmountChange(Number(maxBet.toFixed(2)));
  };

  return (
    <div className="space-y-3 p-4 rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
      {/* Bet Mode Selection */}
      <div>
        <label className="text-sm font-medium text-slate-300 mb-2 block">Bet On</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onModeChange('main')}
            disabled={disabled}
            className={`px-3 py-2 rounded-md text-sm font-bold transition-all ${
              currentMode === 'main' ? 'text-white' : 'text-slate-400 hover:text-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={currentMode === 'main' ? { background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(255, 215, 0, 0.1))' } : { background: 'rgba(255, 255, 255, 0.05)' }}
          >
            Main Bet
          </button>
          <button
            onClick={() => onModeChange('perfectPairs')}
            disabled={disabled}
            className={`px-3 py-2 rounded-md text-sm font-bold transition-all ${
              currentMode === 'perfectPairs' ? 'text-white' : 'text-slate-400 hover:text-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={currentMode === 'perfectPairs' ? { background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(255, 215, 0, 0.1))' } : { background: 'rgba(255, 255, 255, 0.05)' }}
          >
            Perfect Pairs
          </button>
          <button
            onClick={() => onModeChange('twentyPlusThree')}
            disabled={disabled}
            className={`px-3 py-2 rounded-md text-sm font-bold transition-all ${
              currentMode === 'twentyPlusThree' ? 'text-white' : 'text-slate-400 hover:text-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={currentMode === 'twentyPlusThree' ? { background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(255, 215, 0, 0.1))' } : { background: 'rgba(255, 255, 255, 0.05)' }}
          >
            21+3
          </button>
          <button
            onClick={() => onModeChange('blazingSevens')}
            disabled={disabled}
            className={`px-3 py-2 rounded-md text-sm font-bold transition-all ${
              currentMode === 'blazingSevens' ? 'text-white' : 'text-slate-400 hover:text-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={currentMode === 'blazingSevens' ? { background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(255, 215, 0, 0.1))' } : { background: 'rgba(255, 255, 255, 0.05)' }}
          >
            Blazing 7s
          </button>
        </div>
      </div>

      {/* Bet Amount Input */}
      <div>
        <label className="text-sm font-medium text-slate-300">Bet Amount (${betAmount.toFixed(2)})</label>
        <div className="flex gap-1 mt-1">
          <div className="relative flex-1">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => onBetAmountChange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              min="0"
              step="0.01"
              className="w-full rounded-l-md border-2 py-2 pr-2 pl-7 text-sm text-white disabled:opacity-50"
              style={{ borderColor: 'rgba(0, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)' }}
            />
            <div className="absolute top-2 left-3 text-slate-500 select-none" aria-hidden="true">$</div>
          </div>
          <button
            onClick={handleHalf}
            disabled={disabled}
            className="px-3 font-bold text-white hover:opacity-80 disabled:opacity-50 rounded-md"
            style={{ background: 'rgba(255, 215, 0, 0.2)' }}
          >
            1/2
          </button>
          <button
            onClick={handleDouble}
            disabled={disabled}
            className="px-3 font-bold text-white hover:opacity-80 disabled:opacity-50 rounded-md"
            style={{ background: 'rgba(0, 255, 255, 0.2)' }}
          >
            2×
          </button>
          <button
            onClick={handleMax}
            disabled={disabled}
            className="px-3 font-bold text-white hover:opacity-80 disabled:opacity-50 rounded-md"
            style={{ background: 'rgba(0, 255, 255, 0.2)' }}
          >
            Max
          </button>
        </div>
      </div>
    </div>
  );
};
