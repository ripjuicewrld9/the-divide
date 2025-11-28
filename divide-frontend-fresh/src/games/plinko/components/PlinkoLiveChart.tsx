import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

interface PlinkoLiveChartProps {
  onClose: () => void;
}

export const PlinkoLiveChart: React.FC<PlinkoLiveChartProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [liveRounds, setLiveRounds] = useState<any[] | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [chartPos, setChartPos] = useState(() => {
    try {
      const v = localStorage.getItem('plinkoLiveChartPos');
      return v ? JSON.parse(v) : { left: 40, top: 120 };
    } catch {
      return { left: 40, top: 120 };
    }
  });

  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const nx = e.clientX - dragOffsetRef.current.x;
      const ny = e.clientY - dragOffsetRef.current.y;
      setChartPos({ left: Math.max(8, nx), top: Math.max(8, ny) });
    }
    function onUp() {
      if (draggingRef.current) {
        draggingRef.current = false;
        try {
          localStorage.setItem('plinkoLiveChartPos', JSON.stringify(chartPos));
        } catch {
          /* ignore */
        }
      }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [chartPos]);

  async function fetchRounds() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${(import.meta as any).env.VITE_API_URL || 'http://localhost:3000'}/plinko/rounds?limit=200`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      const rounds = data?.rounds || [];
      setLiveRounds(rounds);
      setLiveError(null);
    } catch (err: any) {
      setLiveError(err?.message || String(err));
      setLiveRounds([]);
    }
  }

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout | null = null;

    fetchRounds();
    timer = setInterval(() => {
      if (mounted) fetchRounds();
    }, 5000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  // Calculate stats from rounds
  const stats = React.useMemo(() => {
    if (!liveRounds || liveRounds.length === 0) {
      return { totalBet: 0, totalWon: 0, profit: 0, roundCount: 0 };
    }

    let totalBet = 0;
    let totalWon = 0;

    liveRounds.forEach((round) => {
      totalBet += round.betAmount || 0;
      totalWon += round.winnings || 0;
    });

    return {
      totalBet,
      totalWon,
      profit: totalWon - totalBet,
      roundCount: liveRounds.length,
    };
  }, [liveRounds]);

  return (
    <div
      role="dialog"
      aria-label="Live Chart"
      style={{
        position: 'fixed',
        left: chartPos.left,
        top: chartPos.top,
        zIndex: 2000,
        cursor: 'default',
      }}
    >
      <div
        onMouseDown={(e) => {
          draggingRef.current = true;
          dragOffsetRef.current = {
            x: e.clientX - chartPos.left,
            y: e.clientY - chartPos.top,
          };
          e.preventDefault();
        }}
        style={{
          width: 420,
          background: 'linear-gradient(135deg, #071021, #0b1420)',
          border: '1px solid rgba(148, 0, 0, 0.08)',
          padding: 8,
          borderRadius: 8,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 6,
          }}
        >
          <div style={{ color: '#9fe', fontWeight: 700 }}>Live Chart</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              className="btn small"
              title="Refresh live rounds"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  setRefreshing(true);
                  await fetchRounds();
                } catch {
                } finally {
                  setRefreshing(false);
                }
              }}
              style={{
                width: 34,
                height: 28,
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #00ffff, #ffd700)',
                color: '#1a1a1a',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {refreshing ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g>
                    <path
                      d="M21 12a9 9 0 1 0-3.03 6.97"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <animateTransform
                      attributeName="transform"
                      attributeType="XML"
                      type="rotate"
                      from="0 12 12"
                      to="360 12 12"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </g>
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 12a9 9 0 1 0-3.03 6.97"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 3v6h-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose && onClose();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '1.2em',
                padding: '0 8px',
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div
          style={{ width: 420, minHeight: 180, padding: 12 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {liveError ? (
            <div style={{ color: '#f77' }}>
              Failed to load rounds: {String(liveError)}
            </div>
          ) : liveRounds == null ? (
            <div>Loading...</div>
          ) : user == null ? (
            <div>Log in to view your recent rounds.</div>
          ) : liveRounds.length === 0 ? (
            <div>No recent rounds.</div>
          ) : (
            <div style={{ color: '#fff' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    background: 'rgba(0, 255, 255, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 255, 255, 0.2)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#9fe', marginBottom: '4px' }}>
                    Total Bet
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#00ffff' }}>
                    ${(stats.totalBet / 100).toFixed(2)}
                  </div>
                </div>
                <div
                  style={{
                    background: 'rgba(255, 215, 0, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#fd7', marginBottom: '4px' }}>
                    Total Won
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ffd700' }}>
                    ${(stats.totalWon / 100).toFixed(2)}
                  </div>
                </div>
                <div
                  style={{
                    background:
                      stats.profit >= 0
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${
                      stats.profit >= 0
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(239, 68, 68, 0.2)'
                    }`,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: stats.profit >= 0 ? '#6ee7b7' : '#fca5a5',
                      marginBottom: '4px',
                    }}
                  >
                    Profit/Loss
                  </div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      color: stats.profit >= 0 ? '#10b981' : '#ef4444',
                    }}
                  >
                    {stats.profit >= 0 ? '+' : ''}${(stats.profit / 100).toFixed(2)}
                  </div>
                </div>
                <div
                  style={{
                    background: 'rgba(148, 163, 184, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '4px' }}>
                    Rounds
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#94a3b8' }}>
                    {stats.roundCount}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.875rem', color: '#9ca3af', textAlign: 'center' }}>
                Last {liveRounds.length} rounds • Auto-refresh every 5s
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlinkoLiveChart;
