import React, { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../config';
import api from '../services/api';

export default function KenoGrid({ playerNumbers = [], onToggle = () => {}, drawnNumbers = [], matches = [], autoDraw = false, onRevealComplete = () => {}, instantReveal = false, risk = 'classic', selectionOrder = [] }) {
  // Server uses numbers 1..40
  const nums = Array.from({ length: 40 }, (_, i) => i + 1);

  // Normalize playerNumbers to a Set
  const selectedSet = new Set(
    Array.isArray(playerNumbers) ? playerNumbers.map((n) => Number(n)) : Object.keys(playerNumbers || {}).map((k) => Number(k))
  );

  const drawnSet = new Set(Array.isArray(drawnNumbers) ? drawnNumbers.map(Number) : []);
  const matchSet = new Set(Array.isArray(matches) ? matches.map(Number) : []);

  // audio refs (point to backend static files served from server root)
  const pickSound = useRef(null);
  const matchSound = useRef(null);
  const creditSound = useRef(null);

  // revealedNumbers controls the sequential reveal animation
  const [revealedNumbers, setRevealedNumbers] = useState([]);
  const revealTimerRef = useRef(null);

  // paytables for lookup of per-hit multipliers (lazy-loaded)
  const [paytables, setPaytables] = useState(null);
  const [paytablesError, setPaytablesError] = useState(null);
  // which selection pill (number) is currently hovered — used to show 1-in-N
  const [hoveredPick, setHoveredPick] = useState(null);

  // fetch paytables lazily when there is at least one selection and we haven't loaded them yet
  useEffect(() => {
    const spots = selectedSet.size;
    if (spots === 0) return; // nothing to show
    if (paytables || paytablesError) return; // already tried
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/keno/paytables');
        if (!mounted) return;
        setPaytables(res?.paytables || {});
      } catch (e) {
        if (!mounted) return;
        setPaytablesError(e?.message || String(e));
        setPaytables({});
      }
    })();
    return () => { mounted = false; };
  }, [selectedSet.size, paytables, paytablesError]);

  // combinatorics helpers (BigInt for safety)
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

  function hyperProb(s, k) {
    if (s <= 0) return 0;
    if (k < 0 || k > s) return 0;
    const total = C(40, 10);
    const ways = C(s, k) * C(40 - s, 10 - k);
    return ways / total;
  }

  function formatPct(p) {
    // p is probability in [0,1]
    if (!p || p === 0) return '0%';
    const pct = p * 100;
    if (pct >= 0.000001) return `${pct.toFixed(6)}%`;
    // otherwise show scientific + 1-in-N approximation
    const sci = pct.toExponential(3);
    const oneIn = Math.round(1 / p);
    return `${sci}% (~1 in ${oneIn.toLocaleString()})`;
  }

  useEffect(() => {
    // setup audio objects once
    try {
      // Use root-relative sound paths so audio loads from the same origin
      // that serves the UI (Vite dev server or backend static).
      pickSound.current = new Audio('/sounds/click.wav');
      matchSound.current = new Audio('/sounds/ding.wav');
      creditSound.current = new Audio('/sounds/bell.wav');
      if (creditSound.current) creditSound.current.volume = 0.6;

      // unlock audio on first user interaction (improves autoplay behavior)
      const unlock = () => {
        try {
          [pickSound.current, matchSound.current, creditSound.current].forEach((a) => {
            if (!a) return;
            a.muted = false;
            a.currentTime = 0;
            a.play().then(() => a.pause()).catch(() => {/* ignore audio errors */});
          });
        } catch {
          /* ignore audio unlock errors */
        }
      };

      // listen for multiple user gesture types to maximize chance audio unlock
      document.addEventListener('click', unlock, { once: true });
      document.addEventListener('pointerdown', unlock, { once: true });
      document.addEventListener('keydown', unlock, { once: true });
    } catch {
      // ignore audio creation errors
    }
    return () => {
      // cleanup: stop and clear all audio
      try {
        [pickSound.current, matchSound.current, creditSound.current].forEach((a) => {
          if (a) {
            a.pause();
            a.currentTime = 0;
          }
        });
      } catch {
        /* ignore cleanup errors */
      }
      pickSound.current = null;
      matchSound.current = null;
      creditSound.current = null;
    };
  }, []);

  useEffect(() => {
    // when drawnNumbers changes, reveal them sequentially
    if (!Array.isArray(drawnNumbers) || drawnNumbers.length === 0) {
      setRevealedNumbers([]);
      if (revealTimerRef.current) { clearInterval(revealTimerRef.current); revealTimerRef.current = null; }
      return;
    }
    // reset and start revealing (or show instantly if instantReveal)
    if (revealTimerRef.current) { clearInterval(revealTimerRef.current); revealTimerRef.current = null; }
    if (instantReveal) {
      // show all drawn numbers immediately and play sounds quickly
      setRevealedNumbers(Array.isArray(drawnNumbers) ? drawnNumbers.map(Number) : []);
      try {
        // play pick and match sounds quickly for each drawn number
        (Array.isArray(drawnNumbers) ? drawnNumbers.map(Number) : []).forEach((num) => {
          try { if (pickSound.current) { pickSound.current.currentTime = 0; pickSound.current.play().catch(() => {/* ignore */}); } } catch { /* ignore audio errors */ }
          if (matchSet.has(num)) {
            try { if (matchSound.current) { matchSound.current.currentTime = 0; matchSound.current.play().catch(() => {/* ignore */}); } } catch { /* ignore audio errors */ }
          }
          try { console.debug('[KenoGrid] instantReveal', { num: Number(num), isSelected: selectedSet.has(Number(num)), isMatch: matchSet.has(Number(num)) }); } catch { /* ignore console errors */ }
        });
      } catch {
        /* ignore instant reveal errors */
      }
      // in instant mode we do NOT call onRevealComplete (hook handles applying results immediately)
      return;
    }

    let idx = 0;
  // Reveal interval (ms). Lower value = faster reveal. Kept >0 to allow visuals.
  const REVEAL_MS = 140; // faster reveal interval (previously 220)
    // clear current revealed and start interval
    setRevealedNumbers([]);
    revealTimerRef.current = setInterval(() => {
      const num = Number(drawnNumbers[idx]);
      setRevealedNumbers((r) => {
        // play pick sound (reset time to allow rapid replays)
        try { if (pickSound.current) { pickSound.current.currentTime = 0; pickSound.current.play().catch(() => {/* ignore */}); } } catch { /* ignore audio errors */ }
        // if match, play match sound
        if (matchSet.has(Number(num))) {
          try { if (matchSound.current) { matchSound.current.currentTime = 0; matchSound.current.play().catch(() => {/* ignore */}); } } catch { /* ignore audio errors */ }
        }
        return [...r, Number(num)];
      });
      // DEBUG: log reveal step and current selection/match state
      try { console.debug('[KenoGrid] reveal step', { idx, num: Number(num), isSelected: selectedSet.has(Number(num)), isMatch: matchSet.has(Number(num)) }); } catch { /* ignore console errors */ }
      idx += 1;
      if (idx >= drawnNumbers.length) {
        clearInterval(revealTimerRef.current);
        revealTimerRef.current = null;
        // notify parent that reveal/animations finished
        try { onRevealComplete && onRevealComplete(); } catch { /* ignore */ }
      }
    }, REVEAL_MS);

    return () => {
      if (revealTimerRef.current) {
        clearInterval(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      // Stop any playing audio when cleaning up the reveal effect
      try {
        [pickSound.current, matchSound.current, creditSound.current].forEach((a) => {
          if (a) {
            a.pause();
            a.currentTime = 0;
          }
        });
      } catch {
        /* ignore cleanup errors */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(drawnNumbers), JSON.stringify(matches), instantReveal]);

  return (
    <div className={`grid-wrapper ${autoDraw ? 'auto-draw' : ''}`}>
      <div className="keno-grid">
        {nums.map((num) => {
          const isSelected = selectedSet.has(num);
          const _isDrawn = drawnSet.has(num);
          const isMatch = matchSet.has(num);
          // normalize revealedNumbers types by using a Set of Numbers for fast lookup
          const revealedSet = new Set(Array.isArray(revealedNumbers) ? revealedNumbers.map(Number) : []);
          const isRevealed = revealedSet.has(num);
          return (
            <div
              key={num}
              className={`rect ${isSelected ? 'selected' : ''} ${isRevealed ? 'drawn' : ''} ${isMatch && isRevealed ? 'matched' : ''}`}
              onClick={() => onToggle(num)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onToggle(num);
              }}
            >
              {/* hide the text when a match has been revealed */}
              <span className="text" style={{ display: isMatch && isRevealed ? 'none' : undefined }}>{num}</span>
              {isMatch && isRevealed ? (
                <img src="/keno.png" className="diamond-img" alt="match" aria-hidden />
              ) : null}
            </div>
          );
        })}
      </div>
      {/* Selected numbers summary (shows multiplier if that tile is hit) */}
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
        <div className="selection-list">
          {(() => {
            const filtered = selectionOrder.filter(n => selectedSet.has(n));
            // dedupe while preserving order in case of accidental duplicates
            const orderedUnique = Array.from(new Set(filtered));
            const spots = orderedUnique.length;
            return orderedUnique.map((num, idx) => {
            const tableForSpots = paytables?.[risk]?.[spots] || {};
            // multiplier if exactly 'orderIndex' hits (for nth-selected tile)
            const orderIndex = idx + 1;
            const mult1 = tableForSpots?.[orderIndex];
            // multiplier if all selected spots hit
            const _multAll = tableForSpots?.[spots];
            // build tooltip showing all multipliers available for this spots count
            const mapping = Object.keys(tableForSpots).sort((a,b)=>Number(a)-Number(b)).map(k => {
              const p = hyperProb(spots, Number(k));
              return `${k}: ${Number(tableForSpots[k]).toFixed(3)}x (${formatPct(p)})`;
            }).join('  |  ');
            const pct = (10 / 40); // chance a given number is drawn (0..1)
            // probability for this specific orderIndex outcome
            const thisP = hyperProb(spots, orderIndex);
            const oneIn = thisP > 0 ? `1 in ${Math.round(1 / thisP).toLocaleString()}` : '-';
            const title = mapping
              ? `${mapping}\nChance this number is drawn: ${formatPct(pct)}\nThis outcome (${orderIndex} hits) chance: ${formatPct(thisP)} (${oneIn})`
              : `Chance this number is drawn: ${formatPct(pct)}\nThis outcome (${orderIndex} hits) chance: ${formatPct(thisP)} (${oneIn})`;
            return (
              <div key={num} className={`selection-item ${hoveredPick === num ? 'hovered' : ''}`} title={title} onMouseEnter={() => setHoveredPick(num)} onMouseLeave={() => setHoveredPick(null)}>
                <div className="sel-num">{orderIndex}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="sel-multi" title={title}>{hoveredPick === num ? (thisP ? oneIn : '-') : (mult1 ? `${Number(mult1).toFixed(2)}x` : '-')}</div>
                </div>
              </div>
            );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
