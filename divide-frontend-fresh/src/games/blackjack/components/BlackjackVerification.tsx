import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

interface BlackjackVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  verificationResult?: {
    valid: boolean;
    message: string;
    serverSeed?: string;
    serverHash?: string;
    blockHash?: string;
    gameSeed?: string;
  };
  onVerify?: () => Promise<void>;
  isVerifying?: boolean;
}

interface BlackjackGame {
  _id: string;
  mainBet: number;
  totalProfit: number;
  mainResult: string;
  playerFinalHand?: { value: number; cards: string[] };
  dealerFinalHand?: { value: number; cards: string[] };
  createdAt: string;
  verified?: boolean;
}

export const BlackjackVerification: React.FC<BlackjackVerificationProps> = ({
  isOpen,
  onClose,
  verificationResult,
  onVerify,
  isVerifying = false,
}) => {
  const [tab, setTab] = useState<'seed' | 'verify' | 'recent' | 'how'>('seed');
  const [recentGames, setRecentGames] = useState<BlackjackGame[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client seed and nonce controls (persisted to localStorage with blackjack prefix)
  const [clientSeedUI, setClientSeedUI] = useState(() => {
    try { return localStorage.getItem('blackjack_clientSeed') || ''; } catch { return ''; }
  });
  const [nonceUI, setNonceUI] = useState(() => {
    try { const v = localStorage.getItem('blackjack_nonce'); return v != null ? Number(v) : 0; } catch { return 0; }
  });

  useEffect(() => {
    setError(null);
  }, [isOpen]);

  // Seed UI helpers
  function persistClientSeed(seed: string) {
    try { localStorage.setItem('blackjack_clientSeed', seed); } catch { /* ignore */ }
    setClientSeedUI(seed);
  }

  function persistNonce(n: number | string) {
    try { localStorage.setItem('blackjack_nonce', String(n)); } catch { /* ignore */ }
    setNonceUI(Number(n));
  }

  function rotateSeed() {
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
    
    // 2. Note: Blackjack server seed rotates automatically on each game
    setError(null);
  }

  function incrementNonce(delta: number) {
    const next = Math.max(0, (Number(nonceUI) || 0) + delta);
    persistNonce(next);
  }

  const fetchRecent = async () => {
    setLoadingRecent(true);
    setError(null);
    try {
      const res = await api.get('/blackjack/games?limit=20');
      setRecentGames(Array.isArray(res?.games) ? res.games : (Array.isArray(res) ? res : []));
    } catch (err: any) {
      setError(err?.message || String(err));
      setRecentGames([]);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (tab === 'recent' && recentGames.length === 0 && !loadingRecent) fetchRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        margin: 0,
        padding: 0
      }}
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: 900, 
          width: '90%', 
          maxHeight: '90vh', 
          overflow: 'auto',
          background: '#1a1a1a',
          borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(0, 255, 255, 0.2)'
        }}
      >
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Blackjack - Provably Fair</h3>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#fff' }}>×</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid rgba(0,255,255,0.2)', paddingBottom: 8 }}>
            <button onClick={() => setTab('seed')} style={{ padding: '8px 16px', background: tab === 'seed' ? 'linear-gradient(135deg, #00ffff, #ffd700)' : 'transparent', color: tab === 'seed' ? '#000' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Seed Control</button>
            <button onClick={() => setTab('verify')} style={{ padding: '8px 16px', background: tab === 'verify' ? 'linear-gradient(135deg, #00ffff, #ffd700)' : 'transparent', color: tab === 'verify' ? '#000' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Verify Game</button>
            <button onClick={() => setTab('recent')} style={{ padding: '8px 16px', background: tab === 'recent' ? 'linear-gradient(135deg, #00ffff, #ffd700)' : 'transparent', color: tab === 'recent' ? '#000' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Recent Rounds</button>
            <button onClick={() => setTab('how')} style={{ padding: '8px 16px', background: tab === 'how' ? 'linear-gradient(135deg, #00ffff, #ffd700)' : 'transparent', color: tab === 'how' ? '#000' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>How It Works</button>
          </div>

          {error && <div style={{ padding: 12, background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: 6, marginBottom: 12, color: '#ff6b6b' }}>{error}</div>}

          {/* Seed Control Tab */}
          {tab === 'seed' && (
            <div>
              <p style={{ color: '#999', marginBottom: 16 }}>Control your client seed and nonce for Blackjack games. The server seed rotates automatically with each new game session.</p>
              
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
                Rotate Client Seed
              </button>

              <div style={{ marginTop: 16, padding: 12, background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: 6, fontSize: '0.9em', color: '#999' }}>
                <strong style={{ color: '#00ffff' }}>Note:</strong> The server seed automatically rotates when you start a new Blackjack game session, ensuring each game has unique entropy.
              </div>
            </div>
          )}

          {/* Verify Game Tab */}
          {tab === 'verify' && (
            <div>
              <p style={{ color: '#999', marginBottom: 16 }}>Verify your last Blackjack game using provably fair cryptographic verification.</p>

              {isVerifying && (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                  Verifying game fairness...
                </div>
              )}

              {!isVerifying && verificationResult?.message && !verificationResult.valid && (
                <div style={{ padding: 12, background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: 6, marginBottom: 12, color: '#ff6b6b' }}>
                  {verificationResult.message}
                </div>
              )}

              {!isVerifying && verificationResult && verificationResult.valid && (
                <div>
                  {/* Server Hash */}
                  {verificationResult.serverHash && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Server Seed Hash (Published Before Game)</label>
                      <div style={{ padding: '8px 12px', background: '#1a1a1a', border: '1px solid rgba(0,255,255,0.2)', borderRadius: 6, color: '#fbbf24', fontFamily: 'monospace', fontSize: '0.9em', wordBreak: 'break-all' }}>
                        {verificationResult.serverHash}
                      </div>
                    </div>
                  )}

                  {/* Block Hash */}
                  {verificationResult.blockHash && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>EOS Block Hash (External Entropy)</label>
                      <div style={{ padding: '8px 12px', background: '#1a1a1a', border: '1px solid rgba(0,255,255,0.2)', borderRadius: 6, color: '#10b981', fontFamily: 'monospace', fontSize: '0.9em', wordBreak: 'break-all' }}>
                        {verificationResult.blockHash}
                      </div>
                    </div>
                  )}

                  {/* Game Seed */}
                  {verificationResult.gameSeed && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Game Seed (Revealed After Game)</label>
                      <div style={{ padding: '8px 12px', background: '#1a1a1a', border: '1px solid rgba(0,255,255,0.2)', borderRadius: 6, color: '#ec4899', fontFamily: 'monospace', fontSize: '0.9em', wordBreak: 'break-all' }}>
                        {verificationResult.gameSeed}
                      </div>
                    </div>
                  )}

                  {/* Verification Status */}
                  <div style={{ marginTop: 16, padding: 12, background: 'rgba(0,255,0,0.05)', border: '1px solid rgba(0,255,0,0.3)', borderRadius: 6 }}>
                    <div style={{ marginBottom: 8, color: '#0f0', fontWeight: 600 }}>✓ Verified Fair</div>
                    <div style={{ fontSize: '0.9em', color: '#999' }}>This game result is cryptographically verifiable</div>
                  </div>
                </div>
              )}

              {!isVerifying && !verificationResult && onVerify && (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                  <p>Click the button below to verify your last Blackjack game</p>
                </div>
              )}

              {!verificationResult && onVerify && (
                <button 
                  onClick={onVerify} 
                  disabled={isVerifying} 
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00ffff, #ffd700)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '1em', opacity: isVerifying ? 0.5 : 1 }}
                >
                  {isVerifying ? 'Verifying...' : 'Verify Last Game'}
                </button>
              )}
            </div>
          )}

          {/* Recent Rounds Tab */}
          {tab === 'recent' && (
            <div>
              <p style={{ color: '#999', marginBottom: 16 }}>View your recent Blackjack games.</p>
              
              {loadingRecent && <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>Loading...</div>}
              
              {!loadingRecent && recentGames.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>No recent games found.</div>}
              
              {!loadingRecent && recentGames.length > 0 && (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  {recentGames.map((game, i) => (
                    <div 
                      key={game._id || i} 
                      style={{ 
                        padding: 12, 
                        marginBottom: 8, 
                        background: 'rgba(0,255,255,0.05)', 
                        border: `1px solid ${game.verified ? 'rgba(0,255,0,0.3)' : 'rgba(0,255,255,0.2)'}`, 
                        borderRadius: 6, 
                        transition: 'all 0.2s' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>
                          {game.mainResult === 'win' && '🏆'} 
                          {game.mainResult === 'bust' && '💥'} 
                          {game.mainResult === 'push' && '🤝'} 
                          {' '}{game.mainResult?.toUpperCase() || 'Unknown'}
                        </span>
                        <span style={{ color: game.totalProfit > 0 ? '#0f0' : game.totalProfit < 0 ? '#ff6b6b' : '#999' }}>
                          {game.totalProfit > 0 ? `+$${game.totalProfit.toFixed(2)}` : game.totalProfit < 0 ? `-$${Math.abs(game.totalProfit).toFixed(2)}` : 'Push'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85em', color: '#999', marginBottom: 4 }}>
                        Bet: ${game.mainBet?.toFixed(2) || '0.00'}
                      </div>
                      {game.playerFinalHand && game.dealerFinalHand && (
                        <div style={{ fontSize: '0.85em', color: '#999' }}>
                          Player: {game.playerFinalHand.value} | Dealer: {game.dealerFinalHand.value}
                        </div>
                      )}
                      {game.verified && (
                        <div style={{ fontSize: '0.75em', color: '#0f0', marginTop: 4 }}>✓ Verified</div>
                      )}
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
                  <li><strong>Card Generation:</strong> All cards are deterministically generated from this seed using a secure algorithm</li>
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
};

export default BlackjackVerification;
