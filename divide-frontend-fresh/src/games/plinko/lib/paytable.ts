export type Risk = 'low' | 'medium' | 'high';
export type Rows = 8 | 12 | 16;

export const PAYTABLE = {
  low: {
    8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    12: [8.1, 3, 1.3, 1.1, 0.7, 0.5, 0.7, 1.1, 1.3, 3, 8.1, 8.1, 8.1],
    16: [16, 5.6, 2.1, 1.3, 1, 0.7, 0.5, 0.7, 1, 1.3, 2.1, 5.6, 16, 16, 16, 16, 16],
  },
  medium: {
    8: [29, 4.6, 1.9, 1.3, 0.4, 1.3, 1.9, 4.6, 29],
    12: [43, 10, 3, 1.5, 0.7, 0.5, 0.4, 0.5, 0.7, 1.5, 3, 10, 43],
    16: [110, 24, 8.1, 3, 1.4, 0.9, 0.5, 0.4, 0.5, 0.9, 1.4, 3, 8.1, 24, 110, 110, 110],
  },
  high: {
    8: [130, 26, 5.6, 1.6, 0.3, 1.6, 5.6, 26, 130],
    12: [170, 41, 11, 3, 1, 0.4, 0.2, 0.4, 1, 3, 11, 41, 170],
    16: [1000, 130, 26, 8.1, 3, 1.3, 0.7, 0.5, 0.2, 0.5, 0.7, 1.3, 3, 8.1, 26, 130, 1000],
  },
} as const;

export const getRisks = (risk: Risk): Rows => {
  return risk === 'low' ? 8 : risk === 'medium' ? 12 : 16;
};

export const getPaytable = (risk: Risk): number[] => {
  const rows = getRisks(risk);
  return PAYTABLE[risk][rows];
};

export const getMultiplierColor = (multiplier: number): string => {
  if (multiplier >= 100) return 'from-purple-500 to-pink-500';
  if (multiplier >= 10) return 'from-yellow-500 to-orange-500';
  if (multiplier >= 2) return 'from-green-500 to-emerald-500';
  return 'from-red-600 to-red-800';
};
