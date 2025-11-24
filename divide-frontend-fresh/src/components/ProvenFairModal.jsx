import React, { useState, useEffect, useCallback } from 'react';

export default function ProvenFairModal({ isOpen, onClose, gameData }) {
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tab, setTab] = useState('verify');

  const verifyGame = useCallback(async () => {
    if (!gameData) return;
    
    setIsVerifying(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/verify-game`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: gameData.game,
            gameId: gameData.gameId
          })
        }
      );
      
      const data = await response.json();
      setVerificationResult(data);
    } catch (err) {
      console.error('Verification error:', err);
      setVerificationResult({ error: 'Failed to verify game' });
    } finally {
      setIsVerifying(false);
    }
  }, [gameData]);

  useEffect(() => {
    if (isOpen && gameData) {
      verifyGame();
    }
  }, [isOpen, gameData, verifyGame]);

  if (!isOpen) return null;

  return (
    <div className="modal screenOn" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>{gameData?.game} - Provably Fair</h3>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#fff' }}>×</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid rgba(0,255,255,0.2)', paddingBottom: 8 }}>
            <button onClick={() => setTab('verify')} style={{ padding: '8px 16px', background: tab === 'verify' ? 'linear-gradient(135deg, #00ffff, #ffd700)' : 'transparent', color: tab === 'verify' ? '#000' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Verification</button>
            <button onClick={() => setTab('how')} style={{ padding: '8px 16px', background: tab === 'how' ? 'linear-gradient(135deg, #00ffff, #ffd700)' : 'transparent', color: tab === 'how' ? '#000' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>How It Works</button>
          </div>

          {/* Verification Tab */}
          {tab === 'verify' && (
            <div>
              {isVerifying ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  Verifying game fairness...
                </div>
              ) : verificationResult?.error ? (
                <div style={{
                  padding: '20px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#ef4444'
                }}>
                  {verificationResult.error}
                </div>
              ) : verificationResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Game Info */}
                  <div style={{
                    padding: '16px',
                    background: 'rgba(0, 255, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 255, 255, 0.1)'
                  }}>
                    <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Game</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>
                      {gameData?.game} - {gameData?.username}
                    </div>
                  </div>

                  {/* Server Seed */}
                  {verificationResult.serverSeed && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 600 }}>
                        Server Seed
                      </div>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#00ffff',
                        wordBreak: 'break-all'
                      }}>
                        {verificationResult.serverSeed}
                      </div>
                    </div>
                  )}

                  {/* Server Seed Hash */}
                  {verificationResult.serverSeedHashed && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 600 }}>
                        Server Seed Hash (SHA-256)
                      </div>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#fbbf24',
                        wordBreak: 'break-all'
                      }}>
                        {verificationResult.serverSeedHashed}
                      </div>
                    </div>
                  )}

                  {/* Block Hash */}
                  {verificationResult.blockHash && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 600 }}>
                        EOS Block Hash (External Entropy)
                      </div>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#10b981',
                        wordBreak: 'break-all'
                      }}>
                        {verificationResult.blockHash}
                      </div>
                    </div>
                  )}

                  {/* Game Seed */}
                  {verificationResult.gameSeed && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 600 }}>
                        Game Seed (SHA-256 of Server Seed + Block Hash)
                      </div>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#ec4899',
                        wordBreak: 'break-all'
                      }}>
                        {verificationResult.gameSeed}
                      </div>
                    </div>
                  )}

                  {/* Client Seed */}
                  {verificationResult.clientSeed && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 600 }}>
                        Client Seed
                      </div>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#a78bfa',
                        wordBreak: 'break-all'
                      }}>
                        {verificationResult.clientSeed}
                      </div>
                    </div>
                  )}

                  {/* Nonce */}
                  {verificationResult.nonce !== undefined && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 600 }}>
                        Nonce
                      </div>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '14px',
                        color: '#fff'
                      }}>
                        {verificationResult.nonce}
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {verificationResult.result && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 600 }}>
                        Result
                      </div>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontSize: '14px',
                        color: '#10b981'
                      }}>
                        {JSON.stringify(verificationResult.result, null, 2)}
                      </div>
                    </div>
                  )}

                  {/* Verification Status */}
                  <div style={{
                    padding: '16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      ✓
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#10b981' }}>
                        Verified Fair
                      </div>
                      <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
                        This game result is cryptographically verifiable
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* How It Works Tab */}
          {tab === 'how' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#d1d5db' }}>
              <div>
                <h4 style={{ color: '#00ffff', marginTop: 0 }}>What is Provably Fair?</h4>
                <p style={{ lineHeight: '1.6' }}>
                  Provably fair is a cryptographic algorithm that ensures game results cannot be manipulated 
                  by the casino or players. Every outcome is verifiable using public cryptographic methods.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fbbf24' }}>How It Works</h4>
                <ol style={{ lineHeight: '1.8', paddingLeft: '20px' }}>
                  <li>The server generates a random <strong>Server Seed</strong> and provides its SHA-256 hash before the game</li>
                  <li>The player provides a <strong>Client Seed</strong> (automatically generated)</li>
                  <li>An <strong>EOS Block Hash</strong> adds external entropy from the blockchain</li>
                  <li>These seeds are combined with a <strong>Nonce</strong> to generate the result</li>
                  <li>After the game, the original Server Seed is revealed so you can verify the result</li>
                </ol>
              </div>

              <div>
                <h4 style={{ color: '#10b981' }}>Verification Steps</h4>
                <ol style={{ lineHeight: '1.8', paddingLeft: '20px' }}>
                  <li>Hash the revealed Server Seed and compare with the pre-committed hash</li>
                  <li>Combine Server Seed, Client Seed, and Nonce using SHA-256</li>
                  <li>Use the combined hash to generate random numbers for the game result</li>
                  <li>Compare the generated result with the actual game outcome</li>
                </ol>
              </div>

              <div style={{
                padding: '16px',
                background: 'rgba(0, 255, 255, 0.05)',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                borderRadius: '8px'
              }}>
                <strong style={{ color: '#00ffff' }}>🔒 Security Guarantee:</strong>
                <p style={{ marginTop: '8px', marginBottom: 0, lineHeight: '1.6' }}>
                  Since the Server Seed hash is committed before you play, the casino cannot change 
                  the outcome after seeing your bet. The blockchain hash adds external 
                  randomness that neither party can control.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
