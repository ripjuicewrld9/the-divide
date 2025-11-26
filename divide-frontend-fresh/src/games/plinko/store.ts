import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { binPayouts, DEFAULT_BALANCE, type RowCount } from './lib/constants';
import type { RiskLevel } from './types';

export interface WinRecord {
  id: string;
  betAmount: number;
  rowCount: RowCount;
  binIndex: number;
  payout: {
    multiplier: number;
    value: number;
  };
  profit: number;
}

export interface ProvablyFairResult {
  clientSeed: string;
  serverSeed: string;
  serverSeedHash: string;
  eosBlockId: string;
  randomOrgSignature: string;
  finalBinIndex: number;
  outcome: number;
  verifiable: boolean;
}

interface PlinkoGameState {
  balance: number;
  betAmount: number;
  riskLevel: RiskLevel;
  rowCount: RowCount;
  winRecords: WinRecord[];
  totalProfitHistory: number[];
  betAmountOfExistingBalls: Record<string, number>;
  animationEnabled: boolean;
  isLoadingBalance: boolean;

  // Actions
  setBetAmount: (amount: number) => void;
  setRiskLevel: (level: RiskLevel) => void;
  setRowCount: (rows: RowCount) => void;
  setBalance: (balance: number) => void;
  dropBall: (betAmount: number) => void;
  settleRound: (binIndex: number, multiplier: number, betAmountUsed: number) => void;
  addWinRecord: (record: WinRecord) => void;
  setAnimationEnabled: (enabled: boolean) => void;
  resetGame: () => void;
  loadBalanceFromBackend: () => Promise<void>;
}

export const usePlinkoStore = create<PlinkoGameState>()(
  persist(
    (set, get) => ({
      balance: 0,
      betAmount: 0,
      riskLevel: 'low' as RiskLevel,
      rowCount: 8 as RowCount,
      winRecords: [],
      totalProfitHistory: [0],
      betAmountOfExistingBalls: {},
      animationEnabled: true,
      isLoadingBalance: false,

      setBetAmount: (amount) => {
        set({ betAmount: Math.max(0, amount) });
      },

      setRiskLevel: (level) => {
        set({ riskLevel: level });
      },

      setRowCount: (rows) => {
        set({ rowCount: rows });
      },

      setBalance: (balance) => {
        set({ balance: Math.max(0, balance ?? 0) });
      },

      dropBall: (betAmount) => {
        const { balance } = get();
        if (betAmount > 0 && betAmount <= balance) {
          set((state) => {
            const newBalance = (state.balance || 0) - betAmount;
            return {
              balance: isNaN(newBalance) ? 0 : Math.max(0, newBalance),
              betAmountOfExistingBalls: {
                ...state.betAmountOfExistingBalls,
                [Math.random().toString()]: betAmount,
              },
            };
          });
        }
      },

      settleRound: (binIndex, multiplier, betAmountUsed) => {
        const { riskLevel, rowCount } = get();
        const payoutValue = betAmountUsed * multiplier;
        const profit = payoutValue - betAmountUsed;

        const record: WinRecord = {
          id: Math.random().toString(),
          betAmount: betAmountUsed,
          rowCount,
          binIndex,
          payout: { multiplier, value: payoutValue },
          profit,
        };

        set((state) => {
          const newBalance = (state.balance || 0) + (payoutValue || 0);
          return {
            balance: isNaN(newBalance) ? 0 : Math.max(0, newBalance),
            betAmountOfExistingBalls: {},
            winRecords: [...state.winRecords, record],
            totalProfitHistory: [...state.totalProfitHistory, (state.totalProfitHistory[state.totalProfitHistory.length - 1] || 0) + profit],
          };
        });
      },

      addWinRecord: (record) => {
        set((state) => ({
          winRecords: [...state.winRecords, record],
          totalProfitHistory: [...state.totalProfitHistory, (state.totalProfitHistory[state.totalProfitHistory.length - 1] || 0) + record.profit],
        }));
      },

      setAnimationEnabled: (enabled) => {
        set({ animationEnabled: enabled });
      },

      loadBalanceFromBackend: async () => {
        try {
          set({ isLoadingBalance: true });
          const token = localStorage.getItem('token');
          if (!token) {
            console.warn('[PlinkoStore] No token in localStorage, cannot load balance');
            set({ balance: 0, isLoadingBalance: false });
            return;
          }

          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            const balanceInDollars = typeof data.balance === 'number' && !isNaN(data.balance) ? data.balance : 0;
            set({ balance: Math.max(0, balanceInDollars), isLoadingBalance: false });
          } else {
            set({ isLoadingBalance: false });
          }
        } catch (error) {
          set({ isLoadingBalance: false });
        }
      },

      resetGame: () => {
        set({
          balance: 0,
          betAmount: 0,
          riskLevel: 'low' as RiskLevel,
          rowCount: 8 as RowCount,
          winRecords: [],
          totalProfitHistory: [0],
          betAmountOfExistingBalls: {},
        });
      },
    }),
    {
      name: 'plinko-game-state',
    }
  )
);
