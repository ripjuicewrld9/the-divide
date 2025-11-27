import { useCallback, useRef, useState, useEffect } from 'react';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { API_BASE } from '../config';
// paytables are now computed server-side; do not import client paytables to avoid exposing them

// Keno uses numbers 1..40 on the server
const kenoNums = Array.from({ length: 40 }, (_, i) => i + 1);

function generateSeed(length = 32) {
  const array = new Uint8Array(Math.max(1, Math.floor(length / 2)));
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export default function useKeno() {
  const [playerNumbers, setPlayerNumbers] = useState(() => ({})); // map of number->true
  const [selectionOrder, setSelectionOrder] = useState(() => []); // preserves order of picks
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const { user, refreshUser } = useAuth();
  const [balance, setBalance] = useState(() => (user ? Number(user.balance || 0) : 0));
  const [message, setMessage] = useState('Select numbers and bet');
  const [pendingResult, setPendingResult] = useState(null); // server result held until animations finish
  const [popupData, setPopupData] = useState(null); // { multiplier, win }
  const [autoPlay, setAutoPlay] = useState(false);
  // default empty so the input appears blank; starting autoplay will fall back to 10
  const [autoRounds, setAutoRounds] = useState('');
  const autoAbortRef = useRef(false);
  const autoCloseNextRef = useRef(false); // when true, next applyServerResult should auto-close popup (used by autoplay)
  const autoplayPausedOnWinRef = useRef(false); // when true, autoplay is paused waiting for user to clear win popup
  const roundCompleteResolveRef = useRef(null);
  // when true, play() will NOT perform optimistic per-round deduction because
  // startAutoPlay will reserve the total funds up-front. This avoids overlapping
  // optimistic deductions during autoplay and keeps the UI consistent.
  const autoplaySkipOptimisticRef = useRef(false);
  const autoReserveRoundsRef = useRef(0);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoRemaining, setAutoRemaining] = useState(0);
  // instant-play feature removed: use standard animated reveal flow only
  const [betAmount, setBetAmount] = useState(1.0);
  const [risk, setRisk] = useState('classic');
  const [multiplier, setMultiplier] = useState(0);
  const nonceRef = useRef(0);
  const pickTimerRef = useRef(null);
  const inFlightRef = useRef(false);
  // preloaded audio refs to improve playback reliability
  const clickAudioRef = useRef(null);
  const bellAudioRef = useRef(null);
  const guncockAudioRef = useRef(null);
  // ensure local balance follows global auth user when it changes
  useEffect(() => {
    if (user && typeof user.balance === 'number') setBalance(Number(user.balance));
  }, [user]);

  // initialize nonce from localStorage if present
  useEffect(() => {
    try {
      const v = localStorage.getItem('keno_nonce');
      nonceRef.current = v != null ? Number(v) : 0;
    } catch {
      nonceRef.current = 0;
    }
  }, []);

  // preload common sounds once on mount to avoid repeated creation and
  // improve reliability on some browsers (autoplay policies / creation costs)
  useEffect(() => {
    try {
      // Use root-relative sound paths so audio loads from the same origin
      // that serves the UI (Vite dev server or backend static).
      try {
        const sClick = new Audio('/sounds/click.wav');
        sClick.preload = 'auto';
        try { sClick.load(); } catch { /* ignore */ }
        clickAudioRef.current = sClick;
      } catch { clickAudioRef.current = null; }
      try {
        const sBell = new Audio('/sounds/bell.wav');
        sBell.preload = 'auto';
        try { sBell.load(); } catch { /* ignore */ }
        bellAudioRef.current = sBell;
      } catch { bellAudioRef.current = null; }
      try {
        const sGun = new Audio('/sounds/guncock.wav');
        sGun.preload = 'auto';
        try { sGun.load(); } catch { /* ignore */ }
        guncockAudioRef.current = sGun;
      } catch { guncockAudioRef.current = null; }
    } catch { /* ignore */ }
    return () => {
      // allow GC by removing references
      clickAudioRef.current = null;
      bellAudioRef.current = null;
      guncockAudioRef.current = null;
    };
  }, []);

  // helper: get client seed from localStorage (fallback to generated)
  function getClientSeed() {
    try { return localStorage.getItem('keno_clientSeed') || generateSeed(); } catch { return generateSeed(); }
  }

  function persistNonceValue(val) {
    try { localStorage.setItem('keno_nonce', String(val)); } catch { /* ignore localStorage failures */ }
  }

  function playGuncock() {
    try {
      if (guncockAudioRef.current) {
        try { guncockAudioRef.current.currentTime = 0; guncockAudioRef.current.play().catch(() => { }); return; } catch { /* ignore audio playback errors */ }
      }
      // fallback to trying common extensions
      const candidates = ['/sounds/guncock.wav', '/sounds/guncock.mp3', '/sounds/guncock'];
      for (const url of candidates) {
        try {
          const a = new Audio(url);
          a.currentTime = 0;
          const p = a.play();
          if (!p) continue;
          p.then(() => { }).catch(() => { });
          return;
        } catch { /* ignore per-candidate audio failures */ }
      }
    } catch { /* ignore */ }
  }

  // cleanup any active pick timer on unmount
  useEffect(() => {
    return () => {
      if (pickTimerRef.current) {
        clearInterval(pickTimerRef.current);
        pickTimerRef.current = null;
      }
    };
  }, []);

  const toggleNumber = useCallback((num) => {
    setPlayerNumbers((p) => {
      const copy = { ...p };
      const count = Object.keys(copy).length;
      if (copy[num]) {
        delete copy[num];
        setSelectionOrder((s) => s.filter(x => x !== num));
      } else {
        // enforce max 10 selections
        if (count >= 10) {
          setMessage('Max 10 numbers can be selected');
          return copy;
        }
        copy[num] = true;
        setSelectionOrder((s) => [...s, num]);
      }
      return copy;
    });
  }, []);

  const clear = useCallback(() => {
    // clear selections and any visible results (diamonds/popup)
    setPlayerNumbers({});
    setSelectionOrder([]);
    setDrawnNumbers([]);
    setMatches([]);
    setPendingResult(null);
    setPopupData(null);
    setMultiplier(0);
    setMessage('Select numbers and bet');
  }, []);

  const randomPick = useCallback(() => {
    // sequentially reveal 10 random picks instead of setting all at once
    if (pickTimerRef.current) {
      clearInterval(pickTimerRef.current);
      pickTimerRef.current = null;
    }
    const picks = kenoNums.slice().sort(() => Math.random() - 0.5).slice(0, 10);
    // start with empty selection
    setPlayerNumbers({});
    setSelectionOrder([]);
    let idx = 0;
    pickTimerRef.current = setInterval(() => {
      if (idx >= picks.length) {
        clearInterval(pickTimerRef.current);
        pickTimerRef.current = null;
        return;
      }
      const n = picks[idx];
      // play a small pick/draw sound for each auto-picked number
      try {
        if (clickAudioRef.current) {
          try { clickAudioRef.current.currentTime = 0; clickAudioRef.current.play().catch(() => { }); }
          catch { /* fallback below */ }
        } else {
          const s = new Audio('/sounds/click.wav');
          s.currentTime = 0;
          s.play().catch(() => { });
        }
      } catch {
        // ignore any errors during random pick audio playback
      }
      // add current pick to selection state
      try {
        setPlayerNumbers((p) => ({ ...p, [n]: true }));
        setSelectionOrder((s) => [...s, n]);
      } catch { /* ignore state update errors */ }
      idx += 1;
    }, 140);
  }, []);

  const [computeOdds, setComputeOdds] = useState({ spots: 0, multiplier: 0 });

  // fetch expected multiplier from server whenever spots or risk changes
  useEffect(() => {
    const spots = Object.keys(playerNumbers).length;
    setComputeOdds({ spots, multiplier: 0 });
    // don't call server when no spots selected (avoids 400/404 noise)
    if (spots === 0) return;
    (async () => {
      try {
        const res = await api.get(`/keno/odds?risk=${encodeURIComponent(risk)}&spots=${spots}`);
        if (res && typeof res.expectedMultiplier !== 'undefined') {
          setComputeOdds({ spots, multiplier: Number(res.expectedMultiplier) });
        }
      } catch {
        // ignore — leave multiplier as 0
      }
    })();
  }, [playerNumbers, risk]);

  // called by the grid when reveal animations finish
  const applyServerResult = useCallback(async (data, { autoClosePopup = false, keepDrawn = false } = {}) => {
    if (!data) return;
    // apply payout and update balance
    if (typeof data.balance === 'number') {
      console.log('[KENO] applyServerResult: server balance', data.balance, 'win', data.win, 'mult', data.multiplier);
      setBalance(Number(data.balance));
      try { if (typeof refreshUser === 'function') await refreshUser(); } catch { /* ignore refreshUser errors */ }
    }
    setMessage(data.win > 0 ? `You won $${formatCurrency(Number(data.win), 2)}!` : 'No win this round');

    // play bell only when a monetary win occurred
    try {
      if (Number(data.win || 0) > 0) {
        if (bellAudioRef.current) {
          try { bellAudioRef.current.currentTime = 0; bellAudioRef.current.play().catch(() => { }); }
          catch { try { const bell = new Audio('/sounds/bell.wav'); bell.currentTime = 0; bell.play().catch(() => { }); } catch { /* ignore */ } }
        } else {
          try { const bell = new Audio('/sounds/bell.wav'); bell.currentTime = 0; bell.play().catch(() => { }); } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }

    const mult = Number(data.multiplier || 0);
    if (mult > 0) {
      setPopupData({ multiplier: mult, win: Number(data.win || 0) });
      // autoplay behavior: if autoplay is active and autoClosePopup requested,
      // pause autoplay on wins so the player can clear the popup manually.
      if (autoClosePopup && autoPlay && Number(data.win || 0) > 0) {
        // mark that autoplay is paused awaiting user confirmation; do NOT
        // resolve the round promise here — wait until user clears popup.
        autoplayPausedOnWinRef.current = true;
        // leave popup visible until user clicks Continue (closeResultPopup will resume autoplay)
      } else if (autoClosePopup) {
        // non-winning autoplay rounds or autoplay disabled: auto-close after short delay
        setTimeout(() => {
          setPopupData(null);
          setPendingResult(null);
          setDrawnNumbers([]);
          setMatches([]);
          setMultiplier(0);
          // resolve round completion if autoplay is awaiting
          try {
            if (typeof roundCompleteResolveRef.current === 'function') {
              console.log('[KENO] resolving roundComplete (autoClosePopup)');
              roundCompleteResolveRef.current();
            }
          } catch (e) { console.error('[KENO] error resolving round promise', e); }
          roundCompleteResolveRef.current = null;
        }, 450);
      } else {
        // popup shown and waiting for user; resolve immediately to let caller know server result applied
        try {
          if (typeof roundCompleteResolveRef.current === 'function') {
            console.log('[KENO] resolving roundComplete (popup shown)');
            roundCompleteResolveRef.current();
          }
        } catch (e) { console.error('[KENO] error resolving round promise', e); }
        roundCompleteResolveRef.current = null;
      }
    } else {
      if (keepDrawn) {
        // keep the drawn numbers/diamonds visible until user clears or starts a new round
        setPendingResult(data);
        // resolve round completion immediately (no popup to wait for)
        try {
          if (typeof roundCompleteResolveRef.current === 'function') {
            console.log('[KENO] resolving roundComplete (keepDrawn)');
            roundCompleteResolveRef.current();
          }
        } catch (e) { console.error('[KENO] error resolving round promise', e); }
        roundCompleteResolveRef.current = null;
        // do not clear drawnNumbers/matches — caller already set them
        // keep multiplier as-is
      } else {
        // no popup — clear pending result and reset drawn state
        setPendingResult(null);
        setDrawnNumbers([]);
        setMatches([]);
        setMultiplier(0);
        // resolve round completion immediately
        try {
          if (typeof roundCompleteResolveRef.current === 'function') {
            console.log('[KENO] resolving roundComplete (no popup)');
            roundCompleteResolveRef.current();
          }
        } catch (e) { console.error('[KENO] error resolving round promise', e); }
        roundCompleteResolveRef.current = null;
      }
    }
  }, [refreshUser, autoPlay]);


  const play = useCallback(async () => {
    // prevent starting a new round while one is already in progress
    if (inFlightRef.current) {
      setMessage('Round already in progress');
      return;
    }

    // standard animated flow continues below

    // ensure animation mode (not instant reveal)
    // if a previous result is still pending (diamonds shown), clear it and start new round
    if (pendingResult) {
      setPendingResult(null);
      setPopupData(null);
      setDrawnNumbers([]);
      setMatches([]);
      setMultiplier(0);
    }
    // build picks from playerNumbers but ensure deduplication while preserving order
    const rawPicks = Object.keys(playerNumbers).map(Number);
    const seen = new Set();
    const picks = [];
    for (const p of rawPicks) {
      if (!seen.has(p)) { seen.add(p); picks.push(p); }
    }
    if (picks.length === 0) { setMessage('Select at least one number'); return; }
    if (betAmount <= 0) { setMessage('Invalid bet'); return; }
    // optimistic UI: deduct bet immediately so players see the balance decrease
    const prevBalance = balance;
    if (autoplaySkipOptimisticRef.current) {
      if (autoReserveRoundsRef.current <= 0) { setMessage('Autoplay reserve exhausted'); return; }
      autoReserveRoundsRef.current = Math.max(0, autoReserveRoundsRef.current - 1);
      console.log('[KENO] autoplay: skipping per-round optimistic deduct (anim), reserve remaining', autoReserveRoundsRef.current);
    } else {
      if (prevBalance < betAmount) { playGuncock(); setMessage('Insufficient balance'); return; }
      setBalance(Number((prevBalance - betAmount).toFixed(2)));
    }
    // mark request in-flight synchronously to avoid double submissions
    inFlightRef.current = true;
    setIsDrawing(true);
    setMessage('Drawing...');

    // Safety timeout: if reveal doesn't complete within 30 seconds, unlock
    const safetyTimeout = setTimeout(() => {
      if (inFlightRef.current) {
        console.warn('[KENO] Safety timeout: clearing inFlight lock after 30s');
        inFlightRef.current = false;
        setIsDrawing(false);
        setMessage('Round timed out - please try again');
      }
    }, 30000);

    // prepare idempotency params outside the try so retry can reuse them
    const clientSeedToUse = getClientSeed();
    const currentNonce = nonceRef.current;
    console.log('[KENO] play request: nonce', currentNonce, 'picks', picks.length, 'bet', betAmount, 'risk', risk);
    try {
      const body = { betAmount: Number(betAmount), playerNumbers: picks, clientSeed: clientSeedToUse, nonce: currentNonce, risk };
      const data = await api.post('/keno/play', body);
      console.log('[KENO] API response received:', data);
      if (!data || typeof data.drawnNumbers === 'undefined') {
        setMessage(data?.error || 'Play failed');
        // restore optimistic balance
        setBalance(prevBalance);
        // clear drawing flag since this round did not start properly
        setIsDrawing(false);
        inFlightRef.current = false;
        clearTimeout(safetyTimeout);
        return;
      }
      // Prefer authoritative server-provided 'balanceAfterBet' for UI hold state
      try {
        if (typeof data.balanceAfterBet !== 'undefined') {
          setBalance(Number(data.balanceAfterBet));
        }
      } catch { /* ignore */ }
      // store server result but don't apply payout yet — wait for animations to finish
      // Normalize drawnNumbers and matches to numbers to avoid string/number mismatches
      const normDrawn = Array.isArray(data.drawnNumbers) ? data.drawnNumbers.map(Number) : [];
      const normMatches = Array.isArray(data.matches) ? data.matches.map(Number) : [];
      const pending = { ...data, drawnNumbers: normDrawn, matches: normMatches, request: body };
      // DEBUG: log server result and client picks to help diagnose mismatch issues
      try {
        console.debug('[KENO] play response', { picks, drawnNumbers: normDrawn, matches: normMatches, nonce: currentNonce });
      } catch { /* ignore */ }
      setPendingResult(pending);
      setDrawnNumbers(normDrawn);
      setMatches(normMatches);
      setMultiplier(Number(data.multiplier || 0));
      // persist nonce after successful request — prefer server-provided authoritative value when present
      try {
        if (typeof data.kenoNonce !== 'undefined') {
          console.log('[KENO] server provided nonce', data.kenoNonce, '(was', nonceRef.current, ')');
          nonceRef.current = Number(data.kenoNonce);
        } else {
          const newNonce = Number(currentNonce) + 1;
          console.log('[KENO] incrementing nonce from', currentNonce, 'to', newNonce);
          nonceRef.current = newNonce;
        }
        persistNonceValue(nonceRef.current);
      } catch { /* ignore nonce persistence errors */ }
      // do not update balance or show win now — will apply after reveal completes
      // Clear safety timeout since we got a valid response
      clearTimeout(safetyTimeout);
    } catch (err) {
      console.error('keno play error', err);
      const errorMsg = err?.error || err?.message || 'Server error';
      setMessage(errorMsg);
      // Retry once idempotently to see if server processed the request
      try {
        const retryBody = { betAmount: Number(betAmount), playerNumbers: picks, clientSeed: clientSeedToUse, nonce: currentNonce, risk };
        const retry = await api.post('/keno/play', retryBody);
        if (retry && typeof retry.drawnNumbers !== 'undefined') {
          // treat as success (normalize and set pending result)
          const normDrawn = Array.isArray(retry.drawnNumbers) ? retry.drawnNumbers.map(Number) : [];
          const normMatches = Array.isArray(retry.matches) ? retry.matches.map(Number) : [];
          const pendingRetry = { ...retry, drawnNumbers: normDrawn, matches: normMatches, request: retryBody };
          try { console.debug('[KENO] play retry response', { picks, drawnNumbers: normDrawn, matches: normMatches, nonce: currentNonce }); } catch { /* ignore */ }
          setPendingResult(pendingRetry);
          setDrawnNumbers(normDrawn);
          setMatches(normMatches);
          setMultiplier(Number(retry.multiplier || 0));
          try {
            if (typeof retry.kenoNonce !== 'undefined') nonceRef.current = Number(retry.kenoNonce);
            else nonceRef.current = Number(currentNonce) + 1;
            persistNonceValue(nonceRef.current);
          } catch { /* ignore */ }
          try { if (typeof retry.balanceAfterBet !== 'undefined') setBalance(Number(retry.balanceAfterBet)); } catch { /* ignore */ }
          // keep inFlight true until reveal completes
          return;
        }
      } catch (err2) {
        console.error('[KENO] retry failed', err2);
      }
      // If retry failed or returned nothing, restore optimistic balance and clear flags
      setBalance(prevBalance);
      inFlightRef.current = false;
      setIsDrawing(false);
    }
  }, [playerNumbers, betAmount, risk, pendingResult, balance]);


  const onRevealComplete = useCallback(async () => {
    if (!pendingResult) return;
    console.log('[KENO] onRevealComplete called — pendingResult present, win', pendingResult?.win, 'mult', pendingResult?.multiplier);
    const shouldAutoClose = !!autoCloseNextRef.current;
    // keepDrawn should be true for manual, non-instant plays (so results remain
    // visible on the grid until the player starts a new round). When autoplay or
    // instant (lightning) mode is active, we allow auto-close/clearing as before.
    const keepDrawn = !shouldAutoClose && !autoPlay;
    await applyServerResult(pendingResult, { autoClosePopup: shouldAutoClose, keepDrawn });
    // reset the auto-close flag after handling so subsequent manual rounds behave normally
    autoCloseNextRef.current = false;
    // keep pendingResult until user closes popup (if any)
    // mark draw complete so Play becomes available again
    try { setIsDrawing(false); } catch { /* ignore */ }
    // clear in-flight lock so player can start next round
    try { inFlightRef.current = false; } catch { /* ignore */ }
  }, [pendingResult, applyServerResult, autoPlay]);

  const closeResultPopup = useCallback(() => {
    // Close the result popup. For manual play we keep the drawn numbers visible
    // (the grid still shows the draw). If autoplay was paused because of a
    // win, resume autoplay by resolving the waiting round promise and
    // clearing the pending result/draw so the autoplay loop can continue.
    setPopupData(null);
    setMessage('Select numbers and bet');

    if (autoplayPausedOnWinRef.current) {
      // clear the paused flag and clear the visible draw so autoplay can proceed
      autoplayPausedOnWinRef.current = false;
      setPendingResult(null);
      setDrawnNumbers([]);
      setMatches([]);
      setMultiplier(0);
      try {
        if (typeof roundCompleteResolveRef.current === 'function') {
          console.log('[KENO] resuming autoplay after user closed win popup');
          roundCompleteResolveRef.current();
        }
      } catch (e) { console.error('[KENO] error resolving round promise on resume', e); }
      roundCompleteResolveRef.current = null;
    }
  }, []);

  // instant play removed — use `play()` and autoplay flows instead
  // autoplay: run N rounds back-to-back, auto-closing popups
  const startAutoPlay = useCallback(async (rounds = 10) => {
    // Clear any previous pending result so autoplay starts fresh.
    if (pendingResult) {
      console.log('[KENO] startAutoPlay: clearing pending result to start autoplay');
      setPendingResult(null);
      setPopupData(null);
      setDrawnNumbers([]);
      setMatches([]);
      setMultiplier(0);
    }

    // Normalize rounds: allow blank/'' to mean unlimited autoplay. If a
    // caller passes Infinity or 0/negative, handle gracefully.
    const isUnlimited = rounds === '' || rounds === Infinity || rounds === 'Infinity' || rounds <= 0 ? true : false;
    const roundsCount = isUnlimited ? Infinity : Number(rounds || 0);
    if (!isUnlimited && (!Number.isFinite(roundsCount) || roundsCount <= 0)) return;

    // Mark UI state
    setAutoRounds(rounds);
    setAutoPlay(true);
    setAutoRunning(true);
    setAutoRemaining(isUnlimited ? Infinity : roundsCount);
    autoAbortRef.current = false;

    // If finite rounds, reserve total funds up-front and skip per-round optimistic deductions
    if (!isUnlimited) {
      const totalReserve = Number((betAmount * roundsCount).toFixed(2));
      if (balance < totalReserve) {
        setMessage('Insufficient balance for autoplay');
        // revert running flags
        setAutoPlay(false); setAutoRunning(false); setAutoRemaining(0);
        return;
      }
      setBalance((b) => Number((b - totalReserve).toFixed(2)));
      autoplaySkipOptimisticRef.current = true;
      autoReserveRoundsRef.current = roundsCount;
    } else {
      // unlimited autoplay: do not reserve funds; run per-round checks instead
      autoplaySkipOptimisticRef.current = false;
      autoReserveRoundsRef.current = 0;
    }

    // Play loop: support both finite and unlimited runs
    if (isUnlimited) {
      while (!autoAbortRef.current) {
        const picks = Object.keys(playerNumbers).map(Number);
        if (picks.length === 0) { setMessage('Select numbers to autoplay'); break; }
        // ensure autoplay uses auto-close behavior
        autoCloseNextRef.current = true;

        // If unlimited (no upfront reserve) ensure player has balance before each round
        if (!autoplaySkipOptimisticRef.current && balance < betAmount) {
          setMessage('Insufficient balance to continue autoplay');
          break;
        }

        await new Promise((resolveRound) => {
          roundCompleteResolveRef.current = resolveRound;
          play().catch(() => {
            // ignore play errors; they're logged in the play function
            try { resolveRound(); } catch { /* ignore */ }
          });
        });

        // small pause between rounds
        await new Promise((r) => setTimeout(r, 300));
      }
    } else {
      for (let i = 0; i < roundsCount; i++) {
        if (autoAbortRef.current) break;
        const picks = Object.keys(playerNumbers).map(Number);
        if (picks.length === 0) { setMessage('Select numbers to autoplay'); break; }
        autoCloseNextRef.current = true;
        await new Promise((resolveRound) => {
          roundCompleteResolveRef.current = resolveRound;
          play().catch(() => {
            // ignore play errors; they're logged in the play function
            try { resolveRound(); } catch { /* ignore */ }
          });
        });
        setAutoRemaining((r) => Math.max(0, r - 1));
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    // Clear reservation mode if any and refresh authoritative balance
    autoplaySkipOptimisticRef.current = false;
    autoReserveRoundsRef.current = 0;
    try { if (typeof refreshUser === 'function') await refreshUser(); } catch (e) { console.error('[KENO] refreshUser after autoplay failed', e); }
    setAutoPlay(false);
    setAutoRunning(false);
    setAutoRemaining(0);
  }, [play, playerNumbers, pendingResult, balance, betAmount, refreshUser]);

  const stopAutoPlay = useCallback(() => {
    autoAbortRef.current = true;
    // clear reservation mode and sync with server so UI balance reflects reality
    autoplaySkipOptimisticRef.current = false;
    autoReserveRoundsRef.current = 0;
    try { if (typeof refreshUser === 'function') refreshUser(); } catch { /* ignore */ }
    setAutoPlay(false);
    setAutoRunning(false);
    setAutoRemaining(0);
  }, [refreshUser]);

  return {
    playerNumbers,
    selectionOrder,
    drawnNumbers,
    matches,
    isDrawing,
    balance,
    message,
    betAmount,
    setBetAmount,
    risk,
    setRisk,
    toggleNumber,
    clear,
    randomPick,
    computeOdds,
    play,
    multiplier,
    // UI hooks
    popupData,
    onRevealComplete,
    closeResultPopup,
    // expose pending server result for provably-fair UI or debugging
    pendingResult,
    // instant/autoplay
    // instant-play removed
    startAutoPlay,
    stopAutoPlay,
    autoPlay,
    setAutoPlay,
    autoRunning,
    autoRemaining,
    autoRounds,
    setAutoRounds
  };
}
