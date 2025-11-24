export type RiskLevel = 'low' | 'medium' | 'high';

export interface PlinkoConfig {
  riskLevel: RiskLevel;
  rows: number;
  multipliers: number[];
}

// Accurate Stake.com paytables (symmetric, color-coded by risk)
export const STAKE_PAYTABLES: Record<RiskLevel, Record<number, number[]>> = {
  low: {
    8: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    12: [8.1, 3.0, 1.3, 1.1, 0.7, 0.5, 0.7, 1.1, 1.3, 3.0, 8.1],
    16: [16, 5.6, 2.1, 1.3, 1.0, 0.7, 0.5, 0.7, 1.0, 1.3, 2.1, 5.6, 16],
  },
  medium: {
    8: [29, 4.6, 1.9, 1.3, 0.4, 1.3, 1.9, 4.6, 29],
    12: [43, 10, 3.0, 1.5, 0.7, 0.5, 0.4, 0.5, 0.7, 1.5, 3.0, 10, 43],
    16: [110, 24, 8.1, 3.0, 1.4, 0.9, 0.5, 0.4, 0.5, 0.9, 1.4, 3.0, 8.1, 24, 110],
  },
  high: {
    8: [130, 26, 5.6, 1.6, 0.3, 1.6, 5.6, 26, 130],
    12: [170, 41, 11, 3.0, 1.0, 0.4, 0.2, 0.4, 1.0, 3.0, 11, 41, 170],
    16: [1000, 130, 26, 8.1, 3.0, 1.3, 0.7, 0.5, 0.2, 0.5, 0.7, 1.3, 3.0, 8.1, 26, 130, 1000],
  },
};

export const PLINKO_CONFIGS: Record<RiskLevel, PlinkoConfig> = {
  low: { riskLevel: 'low', rows: 8, multipliers: STAKE_PAYTABLES.low[8] },
  medium: { riskLevel: 'medium', rows: 12, multipliers: STAKE_PAYTABLES.medium[12] },
  high: { riskLevel: 'high', rows: 16, multipliers: STAKE_PAYTABLES.high[16] },
};

export interface Peg {
  x: number;
  y: number;
  row: number;
  col: number;
}

export interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  trail: Array<{ x: number; y: number; opacity: number }>;
  finished: boolean;
  finalMultiplier?: number;
}

export interface ProvablyFairResult {
  clientSeed: string;
  serverSeed: string;
  serverSeedHash: string;
  eosBlockId: string;
  randomOrgSignature: string;
  finalBinIndex: number;
  outcome: number; // final multiplier
  verifiable: boolean;
}

export interface PlinkoGameState {
  balance: number;
  currentBet: number;
  riskLevel: RiskLevel;
  gamePhase: 'betting' | 'rolling' | 'settling' | 'gameOver';
  balls: Ball[];
  results: Array<{ bet: number; outcome: number; multiplier: number; timestamp: number }>;
  lastResult?: ProvablyFairResult;
  autoBetting: boolean;
  autoBetCount: number;
  autoBetRemaining: number;
  stopOnProfit?: number;
  stopOnLoss?: number;
}
