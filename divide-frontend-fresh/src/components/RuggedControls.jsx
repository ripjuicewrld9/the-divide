import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import Countdown from './Countdown';

// Rugged Controls for PURE RNG crash game.
// Keeps visual layout but changes semantics: buy USD into pool, sell to cash out your positions.
export default function RuggedControls({ pool = 0, onBuy, onSellAll, positions = [], onRefresh, balance = 0, rugged = false, myMultiplier = 1, myCashout = 0, debugEnabled = false, debugInfo = null }) {
  const [mode, setMode] = useState('buy'); // 'buy' or 'sell'
  // value: when buy -> USD amount; when sell -> percent (0-100)
  const [value, setValue] = useState(1);
  const [loading, setLoading] = useState(false);

  // human-friendly conversion label shown under the amount input
  const conversionLabel = useMemo(() => {
    const val = Number(value || 0);
    if (mode === 'buy') {
      if (!val || val <= 0) return '';
      return `Adds $${val.toFixed(2)} to pool`;
    }
    if (!val || val <= 0) return '';
    return `Sell ${val}% of open positions`;
  }, [mode, value]);

  useEffect(() => { if (mode === 'buy') setValue(1); else setValue(100); }, [mode]);

  const maxBuy = Number(balance || 0);

  function applyHalf() {
    if (mode === 'buy') setValue(Number(Math.max(0.01, (value || 0) / 2).toFixed(2)));
    else setValue(Number(Math.max(1, Math.floor((value || 0) / 2))));
  }
  function applyMax() { if (mode === 'buy') setValue(Number(maxBuy.toFixed(2))); else setValue(100); }
  function applyDouble() { if (mode === 'buy') setValue(Number(Math.min(maxBuy, (value || 0) * 2).toFixed(2))); else setValue(Number(Math.min(100, Math.floor((value || 0) * 2)))); }

  async function doAction() {
    try {
      setLoading(true);
      if (mode === 'buy') {
        const usd = Number(value || 0);
        if (usd <= 0) return alert('Enter an amount to buy');
        if (rugged) return alert('Market is paused — buys are disabled right now');
        // call handler which should reconcile with server
        try { await onBuy && onBuy(usd); } catch (e) { console.error(e); alert('Buy failed'); }
      } else {
        // Sell all positions
        if (!positions || positions.length === 0) return alert('No open positions to sell');
        const pct = Number(value || 0);
        if (!isFinite(pct) || pct <= 0) return alert('Enter a percent to sell');
        try { await onSellAll && onSellAll(pct); } catch (e) { console.error(e); alert('Sell failed'); }
      }
    } catch (e) {
      console.error('rugged action error', e);
      alert(e?.error || e?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  const marketPaused = !!rugged;

  // aggregated stats
  const totalPositionValue = positions.reduce((s, p) => s + p.entryAmount, 0);

  return (
    <div className="bottom-controls" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div
            className={`mode-toggle ${mode === 'sell' ? 'sell' : 'buy'}`}
            role="switch"
            aria-checked={mode === 'sell'}
            tabIndex={0}
            onClick={() => setMode(mode === 'buy' ? 'sell' : 'buy')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMode(mode === 'buy' ? 'sell' : 'buy'); } }}
            title="Toggle Buy / Sell"
          >
            <div className="labels"><span className="lbl">Buy</span><span className="lbl">Sell</span></div>
            <div className="knob" />
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="clean-input"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
              min={mode === 'buy' ? 0.01 : 0}
              step={mode === 'buy' ? 0.01 : 1}
              style={{ width: 140 }}
              disabled={marketPaused}
            />
            <span
              role="img"
              aria-label={mode === 'buy' ? 'Input is USD' : 'Sell mode'}
              title={mode === 'buy' ? 'Enter USD to add to pool (Buy mode)' : 'Sell mode: Sell all positions to cash out.'}
              style={{ marginLeft: 8, fontSize: 13, color: '#9fb', cursor: 'help' }}
            >
              ⓘ
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="range"
                  min={0}
                  max={mode === 'buy' ? Math.max(1, maxBuy) : 100}
                  value={value || 0}
                  onChange={(e) => setValue(Number(e.target.value))}
                  style={{ width: '100%', accentColor: mode === 'buy' ? '#00aaff' : '#ff6b7a' }}
                  disabled={marketPaused}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777' }}>
                  <div>{mode === 'buy' ? '$0' : '0%'}</div>
                  <div>{mode === 'buy' ? `$${Math.max(1, maxBuy).toFixed(2)}` : '100%'}</div>
                </div>
              </div>
              {conversionLabel ? (
                <div style={{ fontSize: 12, color: '#99c', marginTop: 6 }}>{conversionLabel}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn btn-small" onClick={() => !marketPaused && applyHalf()} disabled={marketPaused}>1/2</button>
        <button className="btn btn-small" onClick={() => !marketPaused && applyMax()} disabled={marketPaused}>Max</button>
        <button className="btn btn-small" onClick={() => !marketPaused && applyDouble()} disabled={marketPaused}>2x</button>
        <button
          className={`btn btn-play ${mode === 'sell' ? 'sell' : 'buy'} ${loading ? 'disabled' : ''}`}
          onClick={doAction}
          disabled={loading || marketPaused}
        >{loading ? '...' : (marketPaused ? 'Market paused' : (mode === 'buy' ? 'Buy' : 'Sell All'))}</button>
      </div>

      <div style={{ width: 260 }}>
        <div className="stat-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#9fb' }}>Positions</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{positions.length}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#777', marginBottom: 12 }}>
            <span>Committed</span>
            <span style={{ color: '#fff' }}>${totalPositionValue.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#9fb', marginBottom: 4 }}>Multiplier</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#00ffff' }}>{Number(myMultiplier || 1).toFixed(2)}x</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#9fb', marginBottom: 4 }}>Cashout</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>${Number(myCashout || 0).toFixed(2)}</div>
            </div>
          </div>
          {debugEnabled && debugInfo ? (
            <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 6, fontSize: 12 }}>
              <div style={{ color: '#9fb' }}>Debug</div>
              <div>Pool: ${Number(debugInfo.pool || 0).toFixed(2)}</div>
              <div>Total entry: ${Number(debugInfo.totalEntry || 0).toFixed(2)}</div>
              <div style={{ marginTop: 6 }}>Per-position:</div>
              <div style={{ maxHeight: 120, overflow: 'auto' }}>
                {debugInfo.per.map((r, i) => (
                  <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', padding: '4px 0' }}>
                    <div>id: {String(r.id || '').slice(-6)}</div>
                    <div>entryAmt: ${r.entryAmt.toFixed(2)} entryPool: ${r.entryPool.toFixed(2)}</div>
                    <div>mult: {Number(r.mult).toFixed(6)} cashout: ${Number(r.cashout).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
