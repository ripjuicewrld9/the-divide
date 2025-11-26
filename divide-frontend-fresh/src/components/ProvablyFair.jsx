import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config';
import api from '../services/api';

// helper: compute SHA-256 hex of a string using WebCrypto
async function sha256Hex(message) {
  const enc = new TextEncoder().encode(message);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Keno uses a specific algorithm: Fisher-Yates shuffle with LCG seeded from gameSeed
function generateKenoDrawFromGameSeed(gameSeed) {
  // Convert hex seed to a number for seeding the PRNG
  const seedBigInt = BigInt('0x' + gameSeed);
  let state = Number(seedBigInt % BigInt(2147483647)); // JS safe integer

  // Simple LCG PRNG (Linear Congruential Generator)
  function random() {
    state = (state * 1103515245 + 12345) & 2147483647;
    return state / 2147483647;
  }

  // Create array of numbers 1-40
  const numbers = Array.from({ length: 40 }, (_, i) => i + 1);

  // Fisher-Yates shuffle
  for (let i = numbers.length - 1; i > numbers.length - 11; i--) {
    const j = Math.floor(random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }

  // Return the last 10 numbers (most shuffled), sorted
  return numbers.slice(30).sort((a, b) => a - b);
}

// client-side hashToNumbers (same algorithm as server mulberry32 seed derivation)
function hashToNumbersClient(hash, max, count) {
  const numbers = [];
  const seedHex = (hash && hash.length >= 8) ? hash.slice(0, 8) : '00000000';
  let seed = parseInt(seedHex, 16) >>> 0;
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(seed || 1);
  const maxAttempts = Math.max(1000, count * 20);
  let attempts = 0;
  while (numbers.length < count && attempts < maxAttempts) {
    const r = Math.floor(rand() * max) + 1;
    if (!numbers.includes(r)) numbers.push(r);
    attempts += 1;
  }
  if (numbers.length < count) {
    for (let i = 1; numbers.length < count && i <= max; i++) {
      if (!numbers.includes(i)) numbers.push(i);
    }
  }
  return numbers;
}

export default function ProvablyFair({ round = null, onClose = () => { }, initialTab = 'seed', risk: propRisk = 'classic' }) {
  const [computedHash, setComputedHash] = useState(null);
  const [computedDraw, setComputedDraw] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState(null);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState(initialTab); // 'paytables' | 'seed' | 'verify' | 'recent'
  const [paytables, setPaytables] = useState(null);
  const [paytablesError, setPaytablesError] = useState(null);
  const [expandedSpot, setExpandedSpot] = useState(null);
  const [selectedRisk, setSelectedRisk] = useState(() => {
    try {
      return localStorage.getItem('keno_selectedRisk') || propRisk || '';
    } catch {
      return propRisk || '';
    }
  });

  // client-side seed/nonce controls (persisted to localStorage)
  const [clientSeedUI, setClientSeedUI] = useState(() => {
    try { return localStorage.getItem('keno_clientSeed') || ''; } catch { return ''; }
  });
  const [nonceUI, setNonceUI] = useState(() => {
    try { const v = localStorage.getItem('keno_nonce'); return v != null ? Number(v) : 0; } catch { return 0; }
  });

  useEffect(() => {
    setComputedHash(null);
    setComputedDraw(null);
    setVerifying(false);
    setError(null);
    setSelected(null);
    setRecent(null);
    setLoadingRecent(false);
    setTab(initialTab || 'seed');
  }, [round, initialTab]);

  // combinatorics helpers (copied from HUD) for paytables display
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

  // probability helpers
  function hyperProb(s, k) {
    if (s <= 0) return 0;
    if (k < 0 || k > s) return 0;
    const total = C(40, 10);
    const ways = C(s, k) * C(40 - s, 10 - k);
    return ways / total;
  }

  // formatPct is not used here; keep implementation available if needed
  // function formatPct(p) { ... }

  // fetch paytables when needed
  const loadPaytables = async () => {
    setPaytablesError(null);
    setPaytables(null);
    try {
      const res = await api.get('/keno/paytables');
      setPaytables(res?.paytables || {});
    } catch (e) {
      console.error('Failed to load paytables', e);
      setPaytablesError(e?.message || String(e));
      setPaytables({});
    }
  };

  useEffect(() => {
    if (tab === 'paytables' && !paytables && !paytablesError) loadPaytables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === 'recent' && !recent && !loadingRecent) loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // when paytables or propRisk change, prefer stored selection, then propRisk, otherwise pick the first
  useEffect(() => {
    if (!paytables) return;
    const keys = Object.keys(paytables || {});
    if (!keys.length) return;
    let stored = null;
    try { stored = localStorage.getItem('keno_selectedRisk'); } catch { stored = null; }
    if (stored && keys.includes(stored)) {
      if (selectedRisk !== stored) setSelectedRisk(stored);
      return;
    }
    if (propRisk && keys.includes(propRisk)) {
      if (selectedRisk !== propRisk) setSelectedRisk(propRisk);
      return;
    }
    if (!selectedRisk || !keys.includes(selectedRisk)) setSelectedRisk(keys[0]);
  }, [paytables, propRisk, selectedRisk]);

  function persistSelectedRisk(r) {
    try { localStorage.setItem('keno_selectedRisk', r); } catch { /* ignore */ }
    setSelectedRisk(r);
  }

  // seed UI helpers
  function persistClientSeed(seed) {
    try { localStorage.setItem('keno_clientSeed', seed); } catch { /* ignore */ }
    setClientSeedUI(seed);
  }

  function persistNonce(n) {
    try { localStorage.setItem('keno_nonce', String(n)); } catch { /* ignore */ }
    setNonceUI(Number(n));
  }

  function rotateSeed() {
    // Rotate BOTH client seed (local) and server seed (via API)
    setError(null);

    // 1. Rotate client seed locally
    try {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
      persistClientSeed(hex);
      persistNonce(0);
    } catch {
      // fallback
      const fallback = Math.random().toString(36).slice(2, 18);
      persistClientSeed(fallback);
      persistNonce(0);
    }

    // 2. Rotate server seed via API
    api.post('/keno/rotate-seed')
      .then(res => {
        if (res?.success) {
          // Show success message
          setError(null);
          // Could show toast notification here
          console.log('[ProvablyFair] Server seed rotated successfully');
        } else {
          setError(res?.error || 'Failed to rotate server seed');
        }
      })
      .catch(err => {
        setError(err?.message || 'Failed to rotate server seed');
      });
  }

  function incrementNonce(delta) {
    const next = Math.max(0, (Number(nonceUI) || 0) + delta);
    persistNonce(next);
  }

  const verifyRound = async () => {
    setError(null);
    const toVerify = selected || round;
    if (!toVerify) { setError('No round data available'); return; }
    try {
      setVerifying(true);
      const { serverSeed, blockHash, gameSeed: existingGameSeed } = toVerify;

      // Keno uses gameSeed = SHA-256(serverSeed + blockHash)
      const combinedInput = serverSeed + blockHash;
      const computedGameSeed = await sha256Hex(combinedInput);
      setComputedHash(computedGameSeed);

      // Verify the gameSeed matches
      if (existingGameSeed && computedGameSeed !== existingGameSeed) {
        setError(`Game seed mismatch! Expected: ${existingGameSeed}, Got: ${computedGameSeed}`);
      }

      // Generate drawn numbers from the game seed
      const draw = generateKenoDrawFromGameSeed(computedGameSeed);
      setComputedDraw(draw);
    } catch (e) {
      setError(String(e));
    } finally {
      setVerifying(false);
    }
  };

  const loadRecent = async () => {
    setError(null);
    setLoadingRecent(true);
    try {
      const res = await api.get('/keno/rounds?limit=20');
      setRecent(res.rounds || []);
    } catch (e) {
      console.error('Failed to load recent rounds', e);
      setError(e?.message || String(e));
    } finally {
      setLoadingRecent(false);
    }
  };

  return (
    <div className="modal screenOn" onClick={() => onClose()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="modal-content w-full max-w-4xl bg-slate-900 rounded-xl p-4 md:p-6 overflow-y-auto max-h-[90vh] border border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2>Provably Fair</h2>

        {/* Tabs: Paytables | Client Seed UI | Verify | Recent rounds | How It Works */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }} role="tablist" aria-label="Provably fair tabs">
          <button role="tab" aria-selected={tab === 'paytables'} className={`btn small ${tab === 'paytables' ? 'active' : ''}`} onClick={() => setTab('paytables')}>Paytables</button>
          <button role="tab" aria-selected={tab === 'seed'} className={`btn small ${tab === 'seed' ? 'active' : ''}`} onClick={() => setTab('seed')}>Seed</button>
          <button role="tab" aria-selected={tab === 'verify'} className={`btn small ${tab === 'verify' ? 'active' : ''}`} onClick={() => setTab('verify')}>Verify</button>
          <button role="tab" aria-selected={tab === 'recent'} className={`btn small ${tab === 'recent' ? 'active' : ''}`} onClick={() => { setTab('recent'); if (!recent) loadRecent(); }}>Recent</button>
          <button role="tab" aria-selected={tab === 'how'} className={`btn small ${tab === 'how' ? 'active' : ''}`} onClick={() => setTab('how')}>How It Works</button>
        </div>

        {tab === 'paytables' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-none">
              <h3 className="mt-0 text-xl font-bold text-white">Keno Paytables</h3>
              <p className="text-sm text-gray-400 mb-4">Server-authoritative paytables. Choose risk to view specific table.</p>
            </div>

            {paytablesError ? (
              <div className="text-red-400">Failed to load paytables: {String(paytablesError)}</div>
            ) : !paytables || Object.keys(paytables).length === 0 ? (
              <div>Loading...</div>
            ) : (
              (() => {
                const risks = Object.keys(paytables || {});
                const risk = selectedRisk || risks[0] || 'classic';
                const table = paytables[risk] || {};
                // compute expected multiplier (per-spot) and RTP
                const perSpot = [];
                for (let s = 1; s <= 10; s++) {
                  let exp = 0;
                  const hits = table[s] || {};
                  for (let k = 0; k <= s; k++) {
                    const mult = hits[k] || 0;
                    const p = hyperProb(s, k);
                    exp += p * mult;
                  }
                  perSpot.push({ spots: s, expectedMultiplier: exp, rtp: exp * 100 });
                }

                return (
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 flex-none">
                      <div>
                        <strong className="text-red-500 capitalize text-lg">{risk}</strong>
                        <div className="text-gray-400 text-xs mt-1 hidden md:block">
                          Per-spot RTP: {perSpot.map(p => `${p.spots}:${p.rtp.toFixed(2)}%`).join(' | ')}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
                          {risks.map(rk => (
                            <button key={rk} className={`btn small capitalize whitespace-nowrap ${rk === risk ? 'active' : ''}`} onClick={() => persistSelectedRisk(rk)}>{rk}</button>
                          ))}
                        </div>
                        <div className="text-xs text-cyan-300">Tap a row to expand hits</div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 custom-scrollbar">
                      {perSpot.map(p => (
                        <div key={p.spots} className={`bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden transition-all ${expandedSpot === p.spots ? 'ring-1 ring-cyan-500/50' : ''}`}>
                          <div
                            className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-700/50"
                            onClick={() => setExpandedSpot(expandedSpot === p.spots ? null : p.spots)}
                          >
                            <div className="font-bold text-white">{p.spots} spots</div>
                            <div className="text-sm font-mono text-cyan-300 text-right">
                              {p.rtp.toFixed(2)}%
                            </div>
                          </div>

                          {expandedSpot === p.spots && (
                            <div className="bg-slate-900/50 p-2 border-t border-slate-700/50">
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {(table[p.spots] ? Object.entries(table[p.spots]) : []).map(([hits, mult]) => {
                                  const prob = hyperProb(p.spots, Number(hits));
                                  return (
                                    <div key={hits} className="flex flex-col items-center p-2 bg-slate-800 rounded border border-slate-700/50">
                                      <div className="text-xs text-gray-400">{hits} hits</div>
                                      <div className="text-sm font-bold text-white">{Number(mult).toFixed(2)}x</div>
                                      <div className="text-[10px] text-gray-500">{(prob * 100).toFixed(2)}%</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {tab === 'seed' && (
          <div>
            <h3 style={{ marginTop: 0 }}>Client Seed (local)</h3>
            <p style={{ fontSize: 13, color: '#ccc' }}>Your local client seed and nonce used for plays. Rotating the seed resets the nonce to 0.</p>
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 6 }}><strong>Client Seed</strong></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={clientSeedUI} onChange={(e) => persistClientSeed(e.target.value)} style={{ flex: 1, fontFamily: 'monospace' }} />
                <button className="btn-small" onClick={rotateSeed}>Rotate</button>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ marginBottom: 6 }}><strong>Nonce</strong></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn-small" onClick={() => incrementNonce(-1)}>-</button>
                  <input value={String(nonceUI)} onChange={(e) => persistNonce(e.target.value)} style={{ width: 100, textAlign: 'center' }} />
                  <button className="btn-small" onClick={() => incrementNonce(1)}>+</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'verify' && (
          <div>
            {(!round && !selected) ? (
              <div id="provably-fair-data"><p>No round data available to verify.</p></div>
            ) : (() => {
              const r = selected || round;
              return (
                <div id="provably-fair-data">
                  <div style={{ marginBottom: 8 }}><strong>Server Seed:</strong></div>
                  <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 10, color: '#e0e0e0' }}>{r.serverSeed}</div>

                  <div style={{ marginBottom: 8 }}><strong>Server Seed (next hashed):</strong></div>
                  <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 10, color: '#a6eaff' }}>{r.serverSeedHashed}</div>

                  <div style={{ marginBottom: 8 }}><strong>Client Seed:</strong></div>
                  <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 10 }}>{r.clientSeed}</div>

                  <div style={{ marginBottom: 8 }}><strong>Nonce:</strong> {String(r.nonce)}</div>

                  <div style={{ marginTop: 12, marginBottom: 8 }}><strong>Drawn Numbers (server):</strong></div>
                  <div style={{ fontFamily: 'monospace', marginBottom: 6 }}>{JSON.stringify(r.drawnNumbers)}</div>

                  <div style={{ marginTop: 12 }}>
                    <button className="btn-close" onClick={verifyRound} disabled={verifying}>{verifying ? 'Verifying…' : 'Verify Hash → Draw'}</button>
                  </div>

                  {computedHash ? (
                    <div style={{ marginTop: 12 }}>
                      <div><strong>Computed SHA-256</strong></div>
                      <div style={{ fontFamily: 'monospace', color: '#e0e0e0', wordBreak: 'break-all' }}>{computedHash}</div>
                      <div style={{ marginTop: 8 }}><strong>Computed Draw</strong></div>
                      <div style={{ fontFamily: 'monospace', color: '#e0e0e0' }}>{JSON.stringify(computedDraw)}</div>
                      <div style={{ marginTop: 8, color: (JSON.stringify(computedDraw) === JSON.stringify(r.drawnNumbers) ? '#b8ffda' : '#f77') }}>
                        {JSON.stringify(computedDraw) === JSON.stringify(r.drawnNumbers) ? 'Match — draw verified' : 'Mismatch — draw does not match'}
                      </div>
                    </div>
                  ) : null}

                  {error ? <div style={{ marginTop: 8, color: '#f77' }}>{error}</div> : null}
                </div>
              );
            })()}
          </div>
        )}

        {tab === 'recent' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Recent rounds</strong>
              <button className="btn-close" onClick={loadRecent} disabled={loadingRecent}>{loadingRecent ? 'Loading…' : 'Refresh'}</button>
            </div>
            <div style={{ marginTop: 8, maxHeight: 360, overflow: 'auto', paddingRight: 6 }}>
              {recent && recent.length === 0 ? <div style={{ color: '#999' }}>No recent rounds</div> : null}
              {recent && recent.map(r => (
                <div key={r._id} onClick={() => { setSelected(r); setComputedHash(null); setComputedDraw(null); setTab('verify'); }} style={{ padding: 8, borderRadius: 6, marginBottom: 6, cursor: 'pointer', background: selected && selected._id === r._id ? 'rgba(184,255,218,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: 13, color: '#e0e0e0' }}>{new Date(r.createdAt || r.ts || Date.now()).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: '#a6eaff' }}>{r.betAmount ? `Bet: ${r.betAmount}` : ''} {r.win ? ` • Win: ${r.win}` : ''}</div>
                </div>
              ))}
              {!recent ? (
                <div style={{ color: '#999', marginTop: 8 }}>
                  Click "Refresh" to load your recent rounds (requires login).
                </div>
              ) : null}
            </div>
          </div>
        )}

        {tab === 'how' && (
          <div>
            <h3 style={{ marginTop: 0 }}>How Provably Fair Works</h3>
            <p style={{ fontSize: 13, color: '#ccc', marginBottom: 16 }}>Learn how our provably fair system ensures game integrity.</p>

            <div style={{ padding: 16, background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: 6, marginBottom: 16 }}>
              <h4 style={{ marginTop: 0, marginBottom: 12, color: '#00ffff' }}>🔐 Provably Fair Process</h4>
              <ol style={{ margin: 0, paddingLeft: 20, color: '#ccc', lineHeight: 1.8 }}>
                <li><strong>Before Game:</strong> Server generates a random seed from Random.org and publishes its SHA256 hash</li>
                <li><strong>During Game:</strong> EOS blockchain provides an unpredictable block hash as external entropy</li>
                <li><strong>Game Seed:</strong> Server seed + Block hash are combined to create the final game seed</li>
                <li><strong>Result Generation:</strong> All outcomes are deterministically generated from this seed using a secure algorithm</li>
                <li><strong>After Game:</strong> The original server seed is revealed for verification</li>
                <li><strong>Verification:</strong> Anyone can verify that the hash matches the seed and replay the RNG locally</li>
              </ol>
            </div>

            <div style={{ padding: 16, background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 6 }}>
              <h4 style={{ marginTop: 0, marginBottom: 12, color: '#ffd700' }}>✨ Why This Matters</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#ccc', lineHeight: 1.8 }}>
                <li>You can verify that we didn't manipulate the outcome</li>
                <li>The blockchain hash ensures we can't predict results</li>
                <li>All outcomes are mathematically verifiable</li>
                <li>Complete transparency in game fairness</li>
              </ul>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'right', marginTop: 12 }}>
          <button className="btn-close" onClick={() => onClose()}>Close</button>
        </div>
      </div>
    </div>
  );
}
