import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';
import KenoPnlChartWrapper from './KenoPnlChartWrapper';
import ProvablyFair from './ProvablyFair';

export default function KenoHUD({ balance, message, risk = 'classic' }) {
  // computeOdds is available from parent but not currently displayed
  const { user } = useAuth();
  const prevBal = useRef(balance);
  const [pulse, setPulse] = useState(false);
  const [showPaytables, setShowPaytables] = useState(false);

  // PnL tracking state — currently not displayed but kept for future integration
  // const [showPnl, setShowPnl] = useState(false);
  // const [pnlRounds, setPnlRounds] = useState(null);
  // const [pnlError, setPnlError] = useState(null);
  const [showLiveChart, setShowLiveChart] = useState(false);
  const [liveRounds, setLiveRounds] = useState(null);
  const [liveError, setLiveError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [liveChartResetTime, setLiveChartResetTime] = useState(Date.now()); // Track when user hit reset/refresh
  const [chartPos, setChartPos] = useState(() => {
    try { const v = localStorage.getItem('kenoLiveChartPos'); return v ? JSON.parse(v) : { left: 40, top: 120 }; } catch { return { left: 40, top: 120 }; }
  });
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  // effect: handle document mousemove/mouseup for dragging
  useEffect(() => {
    function onMove(e) {
      if (!draggingRef.current) return;
      const nx = e.clientX - dragOffsetRef.current.x;
      const ny = e.clientY - dragOffsetRef.current.y;
      setChartPos({ left: Math.max(8, nx), top: Math.max(8, ny) });
    }
    function onUp() {
      if (draggingRef.current) {
        draggingRef.current = false;
        try { localStorage.setItem('kenoLiveChartPos', JSON.stringify(chartPos)); } catch { /* ignore */ }
      }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [chartPos]);

  // effect: poll rounds while live chart is visible
  // fetchRounds is defined outside so it can be called by the manual Refresh button
  async function fetchRounds() {
    try {
      const res = await api.get('/keno/rounds?limit=200');
      // DEBUG: log server response shape to help diagnose live chart issues
      try { console.debug('[KENO HUD] /keno/rounds raw response', res); } catch { /* ignore */ }
      // Ensure we only display rounds that belong to the current user
      const rounds = res?.rounds || [];
      const uid = user?.id || user?._id || user?.userId;
      try { console.debug('[KENO HUD] fetched rounds count', rounds.length, 'user uid', uid); } catch { /* ignore */ }
      let filtered = [];
      if (uid) {
        filtered = rounds.filter(r => {
          const rid = r?.userId || r?.user || r?.user_id || (r.user && (r.user.id || r.user._id));
          return String(rid) === String(uid);
        });
        try { console.debug('[KENO HUD] filtered rounds count', filtered.length, 'firstRound', filtered[0] || null); } catch { /* ignore */ }
      } else {
        // No authenticated user yet — do not show global rounds; show empty until we have the user
        try { console.debug('[KENO HUD] no authenticated user yet; skipping rounds display'); } catch { /* ignore */ }
        filtered = [];
      }
      setLiveRounds(filtered);
      setLiveError(null);
    } catch (err) {
      setLiveError(err?.message || String(err));
      setLiveRounds([]);
    }
  }

  useEffect(() => {
    let mounted = true;
    let timer = null;
    if (showLiveChart) {
      // call immediately and then poll
      fetchRounds();
      timer = setInterval(() => { if (mounted) fetchRounds(); }, 5000);
    } else {
      setLiveRounds(null);
      setLiveError(null);
    }
    return () => { mounted = false; if (timer) clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLiveChart]);

  useEffect(() => {
    if (prevBal.current != null && balance != null && Number(balance) !== Number(prevBal.current)) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      return () => clearTimeout(t);
    }
    prevBal.current = balance;
  }, [balance]);

  const displayBalance = formatCurrency(balance, 2);

  // combinatorics helpers for probabilities in the paytables modal
  function C(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let num = 1n, den = 1n;
    for (let i = 1; i <= k; i++) {
      num *= BigInt(n - (k - i));
      den *= BigInt(i);
    }
    return Number(num / den);
  }

  // Probability helper functions for paytables (kept for reference; currently not used in UI)
  // function hyperProb(s, k) {
  //   if (s <= 0) return 0;
  //   if (k < 0 || k > s) return 0;
  //   const total = C(40, 10);
  //   const ways = C(s, k) * C(40 - s, 10 - k);
  //   return ways / total;
  // }

  // function formatPct(p) {
  //   if (!p || p === 0) return '0%';
  //   const pct = p * 100;
  //   if (pct >= 0.000001) return `${pct.toFixed(6)}%`;
  //   const sci = pct.toExponential(3);
  //   const oneIn = Math.round(1 / p);
  //   return `${sci}% (~1 in ${oneIn.toLocaleString()})`;
  // }

  // Responsive: use mobile-friendly layout and larger touch targets
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;
  return (
    <div className={isMobile ? 'top-info flex flex-col gap-4 mb-4 p-2 rounded-lg bg-gradient-to-b from-gray-900 to-gray-800 shadow-lg' : 'top-info'} style={isMobile ? { minWidth: 0 } : { marginBottom: 12 }}>
      <div className={isMobile ? 'flex items-center justify-between gap-4' : ''} style={isMobile ? {} : { display: 'flex', alignItems: 'center', gap: 12 }}>
      </div>
      <div className={isMobile ? 'message text-base text-gray-400' : 'message'} style={isMobile ? {} : { color: '#999' }}>{message}</div>
      <div className={isMobile ? 'flex gap-4 justify-center mt-2' : ''} style={isMobile ? {} : { display: 'flex', justifyContent: 'center', marginTop: 6 }}>
        <button
          className={isMobile ? 'hud-btn px-6 py-4 font-extrabold rounded-xl text-lg bg-cyan-500/30 text-gray-900' : 'hud-btn'}
          style={isMobile ? {} : { marginRight: 8, background: 'linear-gradient(135deg, #00ffff, #ffd700)', color: '#1a1a1a', fontWeight: 600 }}
          onClick={() => { setShowLiveChart(s => !s); }}
        >
          {showLiveChart ? 'Hide Live Chart' : 'Live Chart'}
        </button>
        <button
          className={isMobile ? 'hud-btn px-6 py-4 font-extrabold rounded-xl text-lg bg-yellow-500/30 text-gray-900' : 'hud-btn'}
          title="Info"
          aria-label="Info"
          onClick={() => { setShowPaytables(true); }}
          style={isMobile ? {} : { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #00ffff, #ffd700)', color: '#1a1a1a', fontWeight: 600 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 8h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11.5 12h1v4h-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {/* small spacer */}
      <div style={isMobile ? { height: 12 } : { height: 6 }} />

      {/* Paytables modal (simple) */}
      {showPaytables ? (
        <ProvablyFair initialTab={"paytables"} onClose={() => setShowPaytables(false)} risk={risk} />
      ) : null}

      {/* Live Chart floating panel (draggable) */}
      {showLiveChart ? (
        <div
          role="dialog"
          aria-label="Live Chart"
          style={{ position: 'fixed', left: chartPos.left, top: chartPos.top, zIndex: 2000, cursor: 'default' }}
        >
          <div
            onMouseDown={(e) => {
              draggingRef.current = true;
              dragOffsetRef.current = { x: e.clientX - chartPos.left, y: e.clientY - chartPos.top };
              e.preventDefault();
            }}
            style={{
              width: 420,
              background: 'linear-gradient(135deg,#071021, #0b1420)',
              border: '1px solid rgba(148,0,0,0.08)',
              padding: 8,
              borderRadius: 8,
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <div style={{ color: '#9fe', fontWeight: 700 }}>Live Chart</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {/* Compact icon-only refresh button with instant refresh and spinner */}
                <button
                  className="btn small"
                  title="Refresh live rounds and reset chart"
                  onClick={async () => {
                    try {
                      setRefreshing(true);
                      setLiveChartResetTime(Date.now()); // Reset tracking point NOW
                      await fetchRounds();
                    } catch {
                      // ignored: fetchRounds sets error state
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  style={{ width: 34, height: 28, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #00ffff, #ffd700)', color: '#1a1a1a', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  aria-label="Refresh live rounds"
                >
                  {refreshing ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g>
                        <path d="M21 12a9 9 0 1 0-3.03 6.97" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                      </g>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 12a9 9 0 1 0-3.03 6.97" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ width: 420, height: 180 }}>
              {liveError ? (
                <div style={{ color: '#f77', padding: 12 }}>Failed to load rounds: {String(liveError)}</div>
              ) : liveRounds == null ? (
                <div style={{ padding: 12 }}>Loading...</div>
              ) : (user == null) ? (
                <div style={{ padding: 12 }}>Log in to view your recent rounds.</div>
              ) : liveRounds.length === 0 ? (
                <div style={{ padding: 12 }}>No recent rounds.</div>
              ) : (
                <KenoPnlChartWrapper rounds={liveRounds} resetTime={liveChartResetTime} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// (no further helpers)
