import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { isMobile } from '../utils/deviceDetect';
import useSocket from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';
import RuggedChart from './RuggedChart';
import RuggedControls from './RuggedControls';
import Countdown from './Countdown';
import LiveGamesFeed from './LiveGamesFeed';
import MobileGameHeader from './MobileGameHeader';
import RuggedLeaderboard from './RuggedLeaderboard';
import ProvenFairModal from './ProvenFairModal';

export default function RuggedGame({ onOpenChat }) {
  const socket = useSocket('rugged');
  // PURE RNG crash game frontend state
  // pool: current USD pool; jackpot: accumulated jackpot from crashes; crashed: boolean
  const [status, setStatus] = useState({ pool: 0, jackpot: 0, crashed: false, priceHistory: [] });
  const [positions, setPositions] = useState([]); // user's open positions: { id, entryAmount, entryPool }
  const [balance, setBalance] = useState(0);
  const { refreshUser, updateUser } = useAuth();

  // Additional UI state requested by the FAKE PRICE & % UP feature
  // local pool mirror (kept in sync with status.pool broadcasts)
  const [pool, setPool] = useState(0);
  // firstPrice: pool/1_000_000 when pool first reaches $100 (null until set)
  const [firstPrice, setFirstPrice] = useState(null);
  // per-user UI values
  const [myEntry, setMyEntry] = useState(0);
  const [myMultiplier, setMyMultiplier] = useState(1);
  const [myCashout, setMyCashout] = useState(0);
  const [players, setPlayers] = useState({});
  const [showProvenFair, setShowProvenFair] = useState(false);
  const [lastRngData, setLastRngData] = useState(null); // Store RNG rug pull data

  const LOCAL_KEY = 'rugged_priceHistory';
  // Display mapping: show a "fake stock price" where price = pool / DISPLAY_DIVISOR.
  // Example: DISPLAY_DIVISOR = 100000 => $51 -> 51/100000 = 0.00051 shown to user.
  const SERVER_TOTAL_SUPPLY = 100000000; // canonical server DC supply used to compute stored USD-per-DC
  const DISPLAY_DIVISOR = 100000; // divisor used for UX-friendly display price
  const DISPLAY_SCALE = SERVER_TOTAL_SUPPLY / DISPLAY_DIVISOR; // kept for reference (not applied if server already emits display units)
  const MIN_DISPLAY = 0.00001; // smallest non-zero display step (e.g. $1 -> 0.00001)

  const loadLocalHistory = () => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(p => ({ ...p, ts: new Date(p.ts) })) : [];
    } catch (e) {
      return [];
    }
  };

  const saveLocalHistory = (history) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(history));
    } catch (e) { }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      // load persisted price history from localStorage
      try {
        const ph = loadLocalHistory();
        if (ph && ph.length && mounted) {
          setStatus(prev => ({ ...prev, priceHistory: ph }));
        }
      } catch (e) { }
      // fetch user's open positions so they survive page reload
      try {
        const resp = await api.get('/rugged/positions').catch(() => null);
        if (resp && mounted && resp.positions) {
          // positions returned in dollars from server
          setPositions(resp.positions || []);
          // restore per-user UI: set myEntry from most recent position's prevPool (entryPool - entryAmount)
          try {
            const ps = resp.positions || [];
            if (ps.length > 0) {
              const last = ps[ps.length - 1];
              const prevPool = (Number(last.entryPool || 0) - Number(last.entryAmount || 0)) || 0;
              setMyEntry(prevPool);
              // ensure players.me is seeded
              setPlayers(prev => ({ ...prev, me: { amount: (prev.me?.amount || 0) + Number(last.entryAmount || 0), entry: prevPool } }));
            }
          } catch (e) { console.error('failed to restore positions UI state', e); }
        }
      } catch (e) { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, []);

  // mirror authoritative status.pool into a local `pool` state used by the UI
  useEffect(() => {
    setPool(Number(status.pool || 0));
  }, [status.pool]);

  // recompute per-user UI values when pool or myEntry change
  // Recompute per-user multiplier and cashout from authoritative positions and pool.
  // Use server math: per-position multiplier = currentPool / position.entryPool
  useEffect(() => {
    try {
      const p = Number(pool || 0);
      const ps = Array.isArray(positions) ? positions : [];
      const totalEntry = ps.reduce((s, it) => s + Number(it.entryAmount || 0), 0);
      if (!totalEntry || totalEntry <= 0) {
        setMyMultiplier(1);
        setMyCashout(0);
        return;
      }
      // cashout sum follows server's payout logic: entryAmount * (currentPool / entryPool)
      const cashoutSum = ps.reduce((s, it) => {
        const entryAmt = Number(it.entryAmount || 0);
        const entryPool = Number(it.entryPool || p || 1);
        const mult = entryPool > 0 ? (p / entryPool) : 1;
        return s + entryAmt * mult;
      }, 0);
      let mult = cashoutSum / totalEntry;
      // Guard: if user effectively owns the whole pool (within rounding),
      // show 1x to avoid small-unit rounding making it look >1x.
      const EPS_DOLLARS = 0.01; // 1 cent tolerance
      if (p > 0 && (totalEntry >= p - EPS_DOLLARS || totalEntry / p >= 0.999999)) {
        mult = 1;
      }
      setMyMultiplier(Number.isFinite(mult) ? Number(mult.toFixed(6)) : 1);
      setMyCashout(Number.isFinite(cashoutSum) ? Number(cashoutSum.toFixed(2)) : 0);
    } catch (e) {
      setMyMultiplier(1);
      setMyCashout(0);
    }
  }, [pool, positions]);

  // Debug info (visible when URL contains ?ruggedDebug=1)
  const debugEnabled = typeof window !== 'undefined' && window.location && window.location.search && window.location.search.indexOf('ruggedDebug=1') !== -1;
  const debugInfo = useMemo(() => {
    try {
      const p = Number(pool || 0);
      const ps = Array.isArray(positions) ? positions : [];
      const totalEntry = ps.reduce((s, it) => s + Number(it.entryAmount || 0), 0);
      const per = ps.map(it => {
        const entryAmt = Number(it.entryAmount || 0);
        const entryPool = Number(it.entryPool || p || 1);
        const mult = entryPool > 0 ? (p / entryPool) : 1;
        return { id: it.id, entryAmt, entryPool, mult, cashout: entryAmt * mult };
      });
      return { pool: p, totalEntry, per };
    } catch (e) { return null; }
  }, [pool, positions]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (data) => {
      // Expect server broadcasts like: { pool, jackpot, crashed }
      // prefer explicit price if provided by server, fall back to pool for legacy emits
      setStatus(prev => {
        // price broadcast: server sends USD-per-DC (server units). Convert to display units.
        // If price not provided, derive from pool. If neither provided, fall back to previous value.
        const totalSupply = SERVER_TOTAL_SUPPLY;
        // Server emits price in display units already (pool / DISPLAY_DIVISOR). Use prev.price as fallback.
        const serverPriceFallback = (prev && typeof prev.price !== 'undefined') ? Number(prev.price || 0) : 0;
        const serverPrice = Number(typeof data.price !== 'undefined' ? data.price : (typeof data.pool !== 'undefined' ? (Number(data.pool) / DISPLAY_DIVISOR) : serverPriceFallback));
        let priceVal = Number(serverPrice); // priceVal is in display units
        if (priceVal > 0 && priceVal < MIN_DISPLAY) priceVal = 0;
        let ph = (prev.priceHistory || []).concat({ ts: new Date(), price: priceVal }).slice(-500);
        // Trim trailing zeros so the visible line doesn't flatten when server emits zeros
        while (ph.length > 1 && Number(ph[ph.length - 1].price || 0) === 0) ph.pop();
        // persist to localStorage so refresh keeps the line
        saveLocalHistory(ph.map(p => ({ ts: p.ts instanceof Date ? p.ts.toISOString() : p.ts, price: p.price })));
        const newPool = typeof data.pool !== 'undefined' ? Number(data.pool) : prev.pool;
        return ({ ...prev, pool: newPool, jackpot: typeof data.jackpot !== 'undefined' ? Number(data.jackpot) : prev.jackpot, crashed: !!data.crashed, priceHistory: ph, price: priceVal });
      });
      if (typeof data.pool !== 'undefined') setPool(Number(data.pool));
    };
    const onTrade = (data) => {
      // append a trade point instantly unless market is paused
      setStatus(prev => {
        if (prev.rugged) return prev; // ignore trades during paused state
        // data.price is in display units already; clamp tiny values
        const serverPrice = Number(data.price || 0);
        let dispPrice = serverPrice;
        if (dispPrice > 0 && dispPrice < MIN_DISPLAY) dispPrice = 0;
        const ph = (prev.priceHistory || []).concat({ ts: new Date(data.ts || Date.now()), price: dispPrice, volume: data.volume }).slice(-500);
        saveLocalHistory(ph.map(p => ({ ts: p.ts instanceof Date ? p.ts.toISOString() : p.ts, price: p.price })));
        return { ...prev, price: dispPrice, priceHistory: ph };
      });
    };
    const onRug = (data) => {
      // Build a clearer notification message. If the rug was triggered by the JackpotDC
      // sale include the sale USD amount and a link to the server seed proof.
      
      // Store RNG data if this was an RNG-based rug pull (jackpot reason)
      if (data.reason === 'jackpot' || data.jackpotSupplySold) {
        setLastRngData(data);
      }
      
      try {
        let msg = `Rug pull occurred: ${data.reason || 'unknown'}`;
        if (data.reason === 'jackpot' || data.jackpotSupplySold) {
          const sold = data.jackpotSupplySold || 25000000;
          const usd = (typeof data.jackpotSaleUsd !== 'undefined') ? Number(data.jackpotSaleUsd).toFixed(2) : 'unknown';
          msg += `\n\nJackpotDC sold ${sold.toLocaleString()} DC for $${usd} and the proceeds were moved to the Jackpot wallet.`;
        }
        if (data.serverSeedLink) msg += `\n\nProof link: ${data.serverSeedLink}`;

        // Use confirm so user can optionally open the seed proof in a new tab
        const openProof = data.serverSeedLink ? window.confirm(msg + '\n\nOpen server seed proof now?') : window.alert(msg);
        if (openProof && data.serverSeedLink) window.open(data.serverSeedLink, '_blank');
      } catch (e) {
        // fallback alert
        alert('Rug pull occurred: ' + (data.reason || 'unknown'));
      }

      // update status to reflect rug state and add a zero price point to show the drop
      setStatus(prev => {
        const newHistory = [...(prev.priceHistory || []), { ts: new Date(), price: 0 }];
        saveLocalHistory(newHistory.map(p => ({ ts: p.ts instanceof Date ? p.ts.toISOString() : p.ts, price: p.price })));
        return { ...prev, rugged: true, ruggedCooldownUntil: data.ruggedCooldownUntil || prev.ruggedCooldownUntil || null, priceHistory: newHistory, price: 0 };
      });
      // Reset frontend fake-price and per-user UI state on crash
      setPool(0);
      setFirstPrice(null);
      setMyEntry(0);
      setMyMultiplier(1);
      setMyCashout(0);
      setPlayers({});

      // Try to fetch revealed seed info from server so user can verify the crash
      (async () => {
        try {
          const rev = await api.get('/rugged/reveal').catch(() => null);
          if (rev) {
            // Build a short human message with the committed hash and any revealed seeds
            let msg2 = `Server seed hash (commitment): ${rev.serverSeedHashed || 'N/A'}`;
            if (rev.revealed && rev.revealed.length) {
              msg2 += '\n\nRevealed seeds (most recent first):\n';
              rev.revealed.slice().reverse().forEach(r => { msg2 += `nonce=${r.nonce} seed=${r.seed} at ${new Date(r.revealedAt).toLocaleString()}\n`; });
            }
            // Offer user to copy or open a new tab with the proof details
            window.alert(msg2);
          }
        } catch (e) { console.error('Failed to fetch revealed seed info', e); }
      })();

      // refresh user holdings from server
      (async () => {
        try {
          const me = await api.get('/api/me');
          if (me) {
            setBalance(Number(me.balance || 0));
          }
        } catch (e) { console.error('failed to refresh /api/me after rug', e); }
      })();
    };
    socket.on('rugged:update', onUpdate);
    socket.on('rugged:rugPull', onRug);
    socket.on('rugged:trade', onTrade);
    const onRestart = (data) => {
      // admin-forced restart: reset pool and clear positions
      setStatus(prev => ({ ...prev, pool: 0, priceHistory: [], crashed: false, jackpot: 0 }));
      setPositions([]);
    };
    socket.on('rugged:restart', onRestart);
    return () => {
      socket.off('rugged:update', onUpdate);
      socket.off('rugged:rugPull', onRug);
      socket.off('rugged:trade', onTrade);
      socket.off('rugged:restart', onRestart);
    };
  }, [socket]);

  // baseline price for percent calculations: the first non-zero price in the
  // authoritative priceHistory (earliest point). Use this to compute "% from
  // start" relative to the pump start.
  const baselinePrice = useMemo(() => {
    try {
      const ph = Array.isArray(status.priceHistory) ? status.priceHistory : [];
      for (let i = 0; i < ph.length; i++) {
        const v = Number(ph[i]?.price || 0);
        if (v > 0) return v;
      }
      return null;
    } catch (e) { return null; }
  }, [status.priceHistory]);

  async function handleBuySell(data) {
    // Handle server responses if backend used. Expected shapes: { pool, jackpot, crashed, balance }
    if (!data) return;
    if (typeof data.pool !== 'undefined') {
      // pool from server is in dollars
      setStatus(prev => ({ ...prev, pool: Number(data.pool) }));
      setPool(Number(data.pool));
    }
    if (typeof data.jackpot !== 'undefined') setStatus(prev => ({ ...prev, jackpot: Number(data.jackpot) }));
    if (typeof data.crashed !== 'undefined') setStatus(prev => ({ ...prev, crashed: !!data.crashed }));
    if (typeof data.balance !== 'undefined') setBalance(Number(data.balance));
    // Also update global AuthContext so the header shows the new balance immediately
    try { updateUser && updateUser({ balance: Number(data.balance) }); } catch (e) { }
  }

  // PURE RNG frontend actions: buy into pool and sell all positions
  async function buyViaServer(usdAmount) {
    const usd = Number(usdAmount || 0);
    if (usd <= 0) return;
    try {
      const resp = await api.post('/rugged/buy', { usdAmount: usd });
      // resp may contain { crashed, pool, jackpot, balance, position, revealed }
      if (!resp) return;
      if (resp.crashed) {
        // server signaled crash
        setStatus(prev => ({ ...prev, pool: 0, jackpot: Number(resp.jackpot || prev.jackpot || 0), crashed: true }));
        setPositions([]);
        setPool(0);
        setFirstPrice(null);
        setMyEntry(0);
        setMyMultiplier(1);
        setMyCashout(0);
        setPlayers({});
        if (typeof resp.balance !== 'undefined') setBalance(Number(resp.balance));
        return;
      }
      // normal buy: reconcile with server state and position info
      const srvPool = Number(resp.pool || 0); // server sends dollars
      const srvJackpot = Number(resp.jackpot || 0);

      // If this is the first buy after a rug (pool was at/near zero), clear the chart history
      const wasAtZero = Number(pool || 0) <= 0.01;
      if (wasAtZero && srvPool > 0) {
        setStatus(prev => ({ ...prev, pool: srvPool, jackpot: srvJackpot, priceHistory: [], price: 0, rugged: false }));
        try { localStorage.removeItem(LOCAL_KEY); } catch (e) { }
      } else {
        // store pool as dollars
        setStatus(prev => ({ ...prev, pool: srvPool, jackpot: srvJackpot }));
      }
      setPool(srvPool);
      if (typeof resp.balance !== 'undefined') {
        setBalance(Number(resp.balance));
        try { updateUser && updateUser({ balance: Number(resp.balance) }); } catch (e) { }
      }
      // add created position if returned (position.entryPool is pool after buy)
      if (resp.position) {
        const pos = resp.position;
        setPositions(ps => ([...ps, pos]));
        // per UI, myEntry = pool before buy
        const prevPool = Number(pos.entryPool || 0) - Number(pos.entryAmount || 0);
        setMyEntry(prevPool);
        setPlayers(prev => ({ ...prev, me: { amount: (prev.me?.amount || 0) + pos.entryAmount, entry: prevPool } }));
        // set firstPrice when crossing $100
        if (!firstPrice && prevPool + pos.entryAmount >= 100) {
          setFirstPrice((prevPool + pos.entryAmount) / 1000000);
        }
      }
    } catch (e) { console.error('buyViaServer failed', e); alert('Buy failed'); }
  }

  async function sellAllPositions() {
    // support optional percent argument (0-100). If omitted, sell all.
    const percent = arguments.length > 0 ? Number(arguments[0]) : 100;
    if (!positions || positions.length === 0) return;
    try {
      const body = { percent: Number(percent || 100) };
      const resp = await api.post('/rugged/sell', body);
      if (!resp) return;
      // server returns { payout, pool, balance }
      if (typeof resp.pool !== 'undefined') {
        // server returns dollars
        const poolD = Number(resp.pool);
        setStatus(prev => ({ ...prev, pool: poolD }));
        setPool(poolD);
      }
      if (typeof resp.balance !== 'undefined') {
        setBalance(Number(resp.balance));
        try { updateUser && updateUser({ balance: Number(resp.balance) }); } catch (e) { }
      }
      // If server returned canonical updated positions, use them. Otherwise
      // fall back to client-side approximation for partial sells.
      if (resp.positions && Array.isArray(resp.positions)) {
        // server returns positions with dollars values already
        setPositions(resp.positions || []);
        // update players.me from returned positions
        try {
          const myTotal = (resp.positions || []).reduce((s, p) => s + Number(p.entryAmount || 0), 0);
          setPlayers(prev => ({ ...prev, me: myTotal > 0 ? { amount: myTotal, entry: (resp.positions[0]?.entryPool ? Number(resp.positions[0].entryPool || 0) : 0) } : undefined }));
        } catch (e) { /* ignore */ }
      } else {
        // Update positions locally to reflect partial sells. Server did not return positions, so approximate.
        const pct = Number(percent || 100);
        const fraction = Math.min(100, Math.max(0, pct)) / 100;
        if (fraction >= 1) {
          // sold all
          setPositions([]);
          setPlayers(prev => {
            const copy = { ...prev };
            delete copy.me;
            return copy;
          });
        } else {
          const newPositions = (positions || []).map(p => {
            const entryAmt = Number(p.entryAmount || 0);
            const keep = Number((entryAmt * (1 - fraction)).toFixed(2));
            if (keep <= 0) return null;
            return { ...p, entryAmount: keep };
          }).filter(Boolean);
          setPositions(newPositions);
          // update players.me if present
          setPlayers(prev => {
            const copy = { ...prev };
            if (copy.me) {
              const meAmt = Number(copy.me.amount || 0);
              const newAmt = Number((meAmt * (1 - fraction)).toFixed(2));
              if (newAmt <= 0) delete copy.me; else copy.me = { ...copy.me, amount: newAmt };
            }
            return copy;
          });
        }
      }

      if (resp.pool <= 0.01) {
        setStatus(prev => ({ ...prev, pool: 0, jackpot: +(prev.jackpot || 0), crashed: true }));
        setPool(0);
        setFirstPrice(null);
      }
    } catch (e) { console.error('sellAllPositions failed', e); alert('Sell failed'); }
  }
  return (
    <>
      {isMobile() ? (
      <div className="rugged-mobile-layout w-full max-w-md mx-auto px-2 py-2">
        {/* Mobile Header - only shows on mobile */}
        {/* Mobile Header - only shows on mobile */}
        <MobileGameHeader title="Rugged" onOpenChat={onOpenChat} className="md:hidden mb-4" />

        <div className="bg-gray-900 rounded-xl shadow-lg p-4 mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg text-cyan-400">Rugged Market</span>
              <span className="text-base text-white">Pool: <span className="font-bold">${Number(status.pool || 0).toFixed(2)}</span></span>
            </div>
            <span className="text-xs text-green-300">{(() => {
              const baselinePrice = status.priceHistory && status.priceHistory.length ? Number(status.priceHistory[0].price || 0) : null;
              const last = status.priceHistory && status.priceHistory.length ? Number(status.priceHistory[status.priceHistory.length - 1].price || 0) : null;
              const displayPrice = (last && last > 0) ? last : (Number(pool || 0) / DISPLAY_DIVISOR);
              if (!baselinePrice || baselinePrice <= 0) return 'N/A';
              const pct = ((displayPrice / baselinePrice) - 1) * 100;
              const sign = pct > 0 ? '+' : (pct < 0 ? '' : '');
              return `${sign}${pct.toFixed(2)}%`;
            })()}</span>
          </div>
          <div className="relative mt-3">
            <RuggedChart priceHistory={status.priceHistory || []} width={350} height={200} />
            {(status && status.rugged && status.ruggedCooldownUntil) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-gray-800 bg-opacity-80 p-2 rounded-lg pointer-events-auto">
                  <Countdown target={status.ruggedCooldownUntil} prefix="Time until next pump" />
                </div>
              </div>
            )}
          </div>
        </div >
        <div className="mb-4">
          <RuggedControls
            pool={status.pool}
            onBuy={(usd) => buyViaServer(usd)}
            onSellAll={(percent) => sellAllPositions(percent)}
            positions={positions}
            onRefresh={async () => {
              try {
                const data = await refreshUser();
                if (data) setBalance(Number(data.balance || 0));
              } catch (e) { console.error('refresh user failed', e); }
            }}
            balance={balance}
            rugged={status.crashed}
            myMultiplier={myMultiplier}
            myCashout={myCashout}
            debugEnabled={debugEnabled}
            debugInfo={debugInfo}
            onShowFairness={() => setShowProvenFair(true)}
          />
        </div>
        <div className="mb-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <RuggedLeaderboard />
          </div>
        </div>
        <div className="mb-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <LiveGamesFeed />
          </div>
        </div>
      </div >
    ) : (
      // Desktop layout
      <div style={{ maxWidth: 1100, margin: '12px auto', padding: 12, paddingBottom: 120 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/token-dc.png" alt="DC token" style={{ width: 36, height: 36 }} />
          <h2 style={{ margin: 0 }}>Rugged — Divide Coin (DC)</h2>
        </div>
        {/* removed debug server/timer panel per UX request */}
        {/* center chart shows the 'Time until next pump' countdown; banner removed to avoid duplication */}
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="stat-panel" style={{ background: 'linear-gradient(180deg,#041018,#08222a)', padding: 12, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#9fb' }}>Price</div>
                    {/* Display the canonical "fake" price as the primary Price value (pool / 1_000_000) */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#e6fffa' }}>${(() => {
                        // display price: prefer latest authoritative priceHistory point
                        const ph = Array.isArray(status.priceHistory) ? status.priceHistory : [];
                        const last = ph.length ? Number(ph[ph.length - 1].price || 0) : null;
                        const totalSupply = 100000000;
                        const numericPrice = (last && last > 0) ? last : (Number(pool || 0) / totalSupply) || 0;
                        // Format up to 6 decimal places but trim trailing zeros to avoid
                        // showing an extra insignificant 0 (e.g. 0.000360 -> 0.00036).
                        const rounded = Number.isFinite(numericPrice) ? numericPrice : 0;
                        if (rounded > 0 && rounded < MIN_DISPLAY) return `<${MIN_DISPLAY}`;
                        const fixed = rounded.toFixed(6);
                        // remove trailing zeros after decimal (e.g. 0.000360 -> 0.00036)
                        let out = fixed.replace(/0+$/, '').replace(/\.$/, '');
                        if (out === '') out = '0';
                        return out;
                      })()}</div>
                      <div style={{ fontSize: 14, color: '#ffd36a', fontWeight: 700 }}>
                        {(() => {
                          // compute displayed USD-per-DC price from canonical priceHistory
                          const ph = Array.isArray(status.priceHistory) ? status.priceHistory : [];
                          const last = ph.length ? Number(ph[ph.length - 1].price || 0) : null;
                          // fallback to deriving price from pool dollars if history missing
                          // Use DISPLAY_DIVISOR so UI price = pool / DISPLAY_DIVISOR (matches server-side display units)
                          const displayPrice = (last && last > 0) ? last : (Number(pool || 0) / DISPLAY_DIVISOR);
                          if (!baselinePrice || baselinePrice <= 0) return 'N/A';
                          const pct = ((displayPrice / baselinePrice) - 1) * 100;
                          const sign = pct > 0 ? '+' : (pct < 0 ? '' : '');
                          return `${sign}${pct.toFixed(2)}%`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12, position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <RuggedChart priceHistory={status.priceHistory || []} width={900} height={240} />
                    {
                      // show a centered countdown only during the cooldown between pumps (when market is paused)
                      (status && status.rugged && status.ruggedCooldownUntil) ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                          <div style={{ background: 'rgba(2,10,16,0.6)', padding: 12, borderRadius: 8, pointerEvents: 'auto' }}>
                            <Countdown target={status.ruggedCooldownUntil} prefix="Time until next pump" />
                          </div>
                        </div>
                      ) : null
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls directly below chart */}
          <div style={{ width: '100%' }}>
            <RuggedControls
              pool={status.pool}
              onBuy={(usd) => buyViaServer(usd)}
              onSellAll={(percent) => sellAllPositions(percent)}
              positions={positions}
              onRefresh={async () => {
                try {
                  const data = await refreshUser();
                  if (data) setBalance(Number(data.balance || 0));
                } catch (e) { console.error('refresh user failed', e); }
              }}
              balance={balance}
              rugged={status.crashed}
              myMultiplier={myMultiplier}
              myCashout={myCashout}
              debugEnabled={debugEnabled}
              debugInfo={debugInfo}
              onShowFairness={() => setShowProvenFair(true)}
            />
          </div>

          {/* Leaderboard */}
          <div style={{ marginTop: 24 }}>
            <div style={{
              background: 'rgba(11, 11, 11, 0.8)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <RuggedLeaderboard />
            </div>
          </div>

          {/* Live Games Feed */}
          <div style={{ marginTop: 16 }}>
            <div style={{
              background: 'rgba(11, 11, 11, 0.8)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <LiveGamesFeed />
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ProvenFair Modal - shows recent provably fair rug pulls */}
      {showProvenFair && createPortal(
        <ProvenFairModal 
          isOpen={showProvenFair} 
          onClose={() => setShowProvenFair(false)} 
          gameData={{
            game: 'Rugged',
            isRugged: true, // Flag to fetch reveal data
          }} 
        />,
        document.body
      )}
    </>
  );
}
