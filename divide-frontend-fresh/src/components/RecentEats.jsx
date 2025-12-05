import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || '';

export default function RecentEats() {
  const [eats, setEats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEats();
  }, []);

  const fetchEats = async () => {
    try {
      const res = await fetch(`${API}/api/divides/recent-eats`);
      if (res.ok) {
        const data = await res.json();
        setEats(data);
      }
    } catch (err) {
      console.error('Failed to fetch recent eats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '24px 0',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTopColor: 'rgba(255,255,255,0.4)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  if (eats.length === 0) return null;

  return (
    <div style={{
      marginBottom: '48px',
      overflow: 'hidden'
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        paddingLeft: '4px'
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)'
        }}>
          Recent Outcomes
        </span>
        <div style={{
          flex: 1,
          height: '1px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, transparent 100%)'
        }} />
      </div>

      {/* Scrollable container */}
      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        <AnimatePresence>
          {eats.map((eat, index) => (
            <motion.div
              key={eat._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/divides/${eat._id}`}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit'
                }}
              >
                <div style={{
                  minWidth: '240px',
                  background: 'rgba(255,255,255,0.02)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '16px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                >
                  {/* Question - truncated */}
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'rgba(255,255,255,0.9)',
                    letterSpacing: '-0.01em',
                    lineHeight: '1.4',
                    marginBottom: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {eat.question}
                  </div>

                  {/* Outcome */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    {/* Winner side */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: eat.winner === 'sideA' ? '#dc2626' : '#2563eb',
                        boxShadow: eat.winner === 'sideA' 
                          ? '0 0 8px rgba(220,38,38,0.5)' 
                          : '0 0 8px rgba(37,99,235,0.5)'
                      }} />
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: eat.winner === 'sideA' ? '#f87171' : '#60a5fa',
                        letterSpacing: '-0.01em'
                      }}>
                        {eat.winner === 'sideA' ? eat.sideALabel : eat.sideBLabel}
                      </span>
                    </div>

                    {/* Pot amount */}
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '500',
                      color: 'rgba(255,255,255,0.4)',
                      fontFamily: 'SF Mono, Monaco, monospace'
                    }}>
                      ${eat.pot?.toLocaleString() || 0}
                    </div>
                  </div>

                  {/* Time ago */}
                  <div style={{
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '500',
                      color: 'rgba(255,255,255,0.25)',
                      letterSpacing: '0.02em'
                    }}>
                      {formatTimeAgo(eat.endedAt)}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
