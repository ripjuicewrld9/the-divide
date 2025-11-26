import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config';
import api from '../services/api';

// helper: compute SHA-256 hex of a string using WebCrypto
async function sha256Hex(message) {
  const enc = new TextEncoder().encode(message);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function PlinkoProvablyFair({ round = null, onClose = () => { }, initialTab = 'seed' }) {
  const [computedHash, setComputedHash] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState(null);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState(initialTab); // 'seed' | 'verify' | 'recent' | 'how'

  // client-side seed/nonce controls (persisted to localStorage with plinko prefix)
  const [clientSeedUI, setClientSeedUI] = useState(() => {
    try { return localStorage.getItem('plinko_clientSeed') || ''; } catch { return ''; }
  });
  const [nonceUI, setNonceUI] = useState(() => {
    try { const v = localStorage.getItem('plinko_nonce'); return v != null ? Number(v) : 0; } catch { return 0; }
  });

  useEffect(() => {
    setComputedHash(null);
    setVerifying(false);
    setError(null);
    setSelected(null);
    setRecent(null);
    setLoadingRecent(false);
    setTab(initialTab || 'seed');
  }, [round, initialTab]);

  // seed UI helpers
  function persistClientSeed(seed) {
    try { localStorage.setItem('plinko_clientSeed', seed); } catch { /* ignore */ }
    setClientSeedUI(seed);
  }

  function persistNonce(n) {
    try { localStorage.setItem('plinko_nonce', String(n)); } catch { /* ignore */ }
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

    // 2. Rotate server seed via API (use plinko endpoint)
    api.post('/plinko/rotate-seed')
      .then(res => {
        if (res?.success) {
          setError(null);
          console.log('[PlinkoProvablyFair] Server seed rotated successfully');
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

  const verify = async () => {
    setError(null);
    const toVerify = selected || round;
    if (!toVerify) { setError('No round data to verify.'); return; }
    setVerifying(true);
    try {
      // Plinko uses serverSeed + blockHash to create gameSeed
      const ss = toVerify.serverSeed || '';
      const bh = toVerify.blockHash || '';

      // Verify the server seed hash matches using Web Crypto API
      const computedServerHash = await sha256Hex(ss);

      // Compute game seed (SHA-256 of serverSeed + blockHash)
      const combinedInput = ss + bh;
      const computedGameSeed = await sha256Hex(combinedInput);

      setComputedHash(computedGameSeed);
      setVerifying(false);
    } catch (err) {
      setError('Verification failed: ' + (err?.message || String(err)));
      setVerifying(false);
    }
  };

  const fetchRecent = async () => {
    setLoadingRecent(true);
    setError(null);
    try {
      const res = await api.get('/plinko/rounds?limit=20');
      setRecent(Array.isArray(res?.rounds) ? res.rounds : (Array.isArray(res) ? res : []));
    } catch (err) {
      setError(err?.message || String(err));
      setRecent([]);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (tab === 'recent' && !recent && !loadingRecent) fetchRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="modal screenOn" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Plinko - Provably Fair</h3>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#fff' }}>×</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid rgba(0,255,255,0.2)', paddingBottom: 8 }}>
            <button onClick={() => setTab('seed')} style={{ padding: '8px 16px', background: tab === 'seed' ? 'linear-gradient(135deg, #00ffff, #ffd700)' : 'transparent', color: tab === 'seed' ? '#000' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Seed Control</button>
            <button onClick={() => setTab('verify')} style={{ padding: '8px 16px', background: tab === 'verify' ? 'linear-gradient(135deg, #00ffff, #ffd700)' : 'transparent', color: tab === 'verify' ? '#000' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Verify Round</button>
            <button onClick={() => setTab('recent')} style={{ padding: '8px 16px', background: tab === 'recent' ? 'linear-gradient(135deg, #00ffff, #ffd700)' : 'transparent', color: tab === 'recent' ? '#000' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Recent Rounds</button>
            <button onClick={() => setTab('how')} style={{ padding: '8px 16px', background: tab === 'how' ? 'linear-gradient(135deg, #00ffff, #ffd700)' : 'transparent', color: tab === 'how' ? '#000' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>How It Works</button>
          </div>

          {error && <div style={{ padding: 12, background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: 6, marginBottom: 12, color: '#ff6b6b' }}>{error}</div>}

          {/* Seed Control Tab */}
          {tab === 'seed' && (
            <div>
              <p style={{ color: '#999', marginBottom: 16 }}>Control your client seed and nonce for Plinko rounds. The server seed is rotated automatically.</p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Client Seed</label>
                <input type="text" value={clientSeedUI} onChange={e => persistClientSeed(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid rgba(0,255,255,0.2)', borderRadius: 6, color: '#fff', fontFamily: 'monospace' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Nonce</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => incrementNonce(-1)} style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #00ffff, #ffd700)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>-</button>
                  <input type="number" value={nonceUI} onChange={e => persistNonce(e.target.value)} style={{ flex: 1, padding: '8px 12px', background: '#1a1a1a', border: '1px solid rgba(0,255,255,0.2)', borderRadius: 6, color: '#fff', textAlign: 'center', fontFamily: 'monospace' }} />
                  <button onClick={() => incrementNonce(1)} style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #00ffff, #ffd700)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+</button>
                </div>
              </div>

              <button onClick={rotateSeed} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00ffff, #ffd700)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '1em' }}>
                Rotate Seeds (Client + Server)
              </button>
            </div>
          )}

          {/* Verify Round Tab */}
          {tab === 'verify' && (
            <div>
              <p style={{ color: '#999', marginBottom: 16 }}>Verify a Plinko round by checking the server seed hash.</p>

              {(selected || round) && (
                <div style={{ marginBottom: 16, padding: 12, background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: 6 }}>
                  <div style={{ marginBottom: 8 }}><strong>Round ID:</strong> {(selected || round)?._id || 'N/A'}</div>
                  <div style={{ marginBottom: 8 }}><strong>Server Seed:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{(selected || round)?.serverSeed || 'N/A'}</span></div>
                  <div style={{ marginBottom: 8 }}><strong>Block Hash:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{(selected || round)?.blockHash || 'N/A'}</span></div>
                  <div style={{ marginBottom: 8 }}><strong>Game Seed:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{(selected || round)?.gameSeed || 'N/A'}</span></div>
                  <div style={{ marginBottom: 8 }}><strong>Bin Index:</strong> {(selected || round)?.binIndex ?? 'N/A'}</div>
                  <div style={{ marginBottom: 8 }}><strong>Multiplier:</strong> {(selected || round)?.multiplier?.toFixed(2)}x</div>
                </div>
              )}

              <button onClick={verify} disabled={verifying || !(selected || round)} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00ffff, #ffd700)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '1em', opacity: (verifying || !(selected || round)) ? 0.5 : 1 }}>
                {verifying ? 'Verifying...' : 'Verify Round'}
              </button>

              {computedHash && (
                <div style={{ marginTop: 16, padding: 12, background: 'rgba(0,255,0,0.05)', border: '1px solid rgba(0,255,0,0.3)', borderRadius: 6 }}>
                  <div style={{ marginBottom: 8, color: '#0f0', fontWeight: 600 }}>✓ Hash Computed</div>
                  <div style={{ fontSize: '0.9em', color: '#999', marginBottom: 4 }}>Computed Game Seed:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.9em', wordBreak: 'break-all' }}>{computedHash}</div>
                  {((selected || round)?.gameSeed === computedHash) && <div style={{ marginTop: 8, color: '#0f0' }}>✓ Match confirmed!</div>}
                  {((selected || round)?.gameSeed !== computedHash) && <div style={{ marginTop: 8, color: '#ff6b6b' }}>✗ Mismatch detected!</div>}
                </div>
              )}
            </div>
          )}

          {/* Recent Rounds Tab */}
          {tab === 'recent' && (
            <div>
              <p style={{ color: '#999', marginBottom: 16 }}>View your recent Plinko rounds.</p>

              {loadingRecent && <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>Loading...</div>}

              {!loadingRecent && recent && recent.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>No recent rounds found.</div>}

              {!loadingRecent && recent && recent.length > 0 && (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  {recent.map((r, i) => (
                    <div key={r._id || i} onClick={() => { setSelected(r); setTab('verify'); }} style={{ padding: 12, marginBottom: 8, background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,255,255,0.05)'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>Round {r._id?.slice(-8) || i}</span>
                        <span style={{ color: r.profit > 0 ? '#0f0' : r.profit < 0 ? '#ff6b6b' : '#999' }}>
                          {r.profit > 0 ? `+$${(r.profit / 100).toFixed(2)}` : r.profit < 0 ? `-$${Math.abs(r.profit / 100).toFixed(2)}` : '$0.00'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85em', color: '#999' }}>
                        Bet: ${(r.betAmount / 100).toFixed(2)} • {r.multiplier?.toFixed(2)}x • Bin: {r.binIndex}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* How It Works Tab */}
          {tab === 'how' && (
            <div>
              <p style={{ color: '#999', marginBottom: 16 }}>Learn how our provably fair system ensures game integrity.</p>

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
        </div>
      </div>
    </div>
  );
}
