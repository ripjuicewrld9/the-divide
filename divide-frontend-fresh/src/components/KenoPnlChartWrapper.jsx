import React, { useMemo } from 'react';
import KenoPnlChart from './KenoPnlChart';

// Wrapper to compute cumulative points from rounds and pass to KenoPnlChart
export default function KenoPnlChartWrapper({ rounds, resetTime = null }) {
  const points = useMemo(() => {
    // Filter rounds to only include those after the reset time
    const allRounds = rounds || [];
    let filtered = allRounds;
    if (resetTime != null) {
      const resetMs = typeof resetTime === 'number' ? resetTime : new Date(resetTime).getTime();
      filtered = allRounds.filter(r => {
        const roundTime = new Date(r.timestamp).getTime();
        return roundTime >= resetMs;
      });
    }
    
    const sorted = filtered.slice().sort((a,b)=> new Date(a.timestamp) - new Date(b.timestamp));
    let cumWager = 0;
    let cumProfit = 0;
    return sorted.map(r => {
      // Normalize bet amount: rounds historically stored betAmount in dollars,
      // but some imports or legacy data may store cents as integers. Detect
      // likely-cent values and convert to dollars.
      let bet = Number(r.betAmount || r.bet || 0);
      if (Number.isFinite(bet)) {
        // If bet looks like a large integer (e.g. 1000+ and no decimals),
        // it's probably cents — convert to dollars.
        if (bet >= 1000 && Math.abs(bet - Math.round(bet)) < 1e-9) {
          // treat as cents
          bet = bet / 100;
        }
      } else {
        bet = 0;
      }
      const win = Number(r.win || 0);
      // Ensure bet is non-negative (defensive); wager should never decrease.
      if (bet < 0) {
        try { console.warn('[KenoPnlChart] negative bet detected, clamping to 0', bet, r); } catch { /* ignore */ }
        bet = 0;
      }
      cumWager += bet;
      cumProfit += (win - bet);
      return { t: new Date(r.timestamp).getTime(), wager: cumWager, profit: cumProfit };
    });
  }, [rounds, resetTime]);

  // smaller size for live panel
  return <KenoPnlChart points={points} width={420} height={180} />;
}
