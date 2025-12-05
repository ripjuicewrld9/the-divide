import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import html2canvas from 'html2canvas';
import { formatCurrency } from '../utils/format';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DivideDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const cardRef = useRef(null);

  const [divide, setDivide] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [betAmount, setBetAmount] = useState('');
  const [selectedSide, setSelectedSide] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Fetch divide details
  useEffect(() => {
    const fetchDivide = async () => {
      try {
        const data = await api.get(`/api/divides/${id}`);
        setDivide(data);
        if (data.endTime) {
          const delta = Math.floor((new Date(data.endTime) - Date.now()) / 1000);
          setSeconds(Math.max(0, delta));
        }
      } catch (err) {
        console.error('Failed to fetch divide:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDivide();
  }, [id]);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await api.get(`/api/divides/${id}/comments`);
        setComments(data || []);
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      }
    };
    fetchComments();
  }, [id]);

  // Timer countdown
  useEffect(() => {
    if (!divide?.endTime || divide.status !== 'active') return;
    const interval = setInterval(() => {
      const delta = Math.floor((new Date(divide.endTime) - Date.now()) / 1000);
      setSeconds(Math.max(0, delta));
    }, 1000);
    return () => clearInterval(interval);
  }, [divide]);

  const formatTime = (s) => {
    if (s <= 0) return "Ended";
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    return `${minutes}m ${secs}s`;
  };

  const handleVote = async () => {
    if (!user) return alert('Please log in');
    if (!selectedSide) return alert('Select a side');
    const amount = parseFloat(betAmount);
    if (!amount || amount <= 0) return alert('Enter a valid amount');

    setSubmitting(true);
    try {
      await api.post('/Divides/vote', {
        divideId: divide._id || divide.id,
        side: selectedSide,
        boostAmount: amount,
      });
      // Refresh divide
      const updated = await api.get(`/api/divides/${id}`);
      setDivide(updated);
      setBetAmount('');
      setSelectedSide(null);
    } catch (err) {
      alert(err.message || 'Failed to place bet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) return alert('Please log in');
    if (!newComment.trim()) return;

    try {
      const comment = await api.post(`/api/divides/${id}/comments`, { text: newComment });
      setComments([comment, ...comments]);
      setNewComment('');
    } catch (err) {
      alert(err.message || 'Failed to post comment');
    }
  };

  const handleCommentLike = async (commentId) => {
    if (!user) return alert('Please log in');
    try {
      await api.post(`/api/divides/${id}/comments/${commentId}/like`);
      const updated = await api.get(`/api/divides/${id}/comments`);
      setComments(updated || []);
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleCommentDislike = async (commentId) => {
    if (!user) return alert('Please log in');
    try {
      await api.post(`/api/divides/${id}/comments/${commentId}/dislike`);
      const updated = await api.get(`/api/divides/${id}/comments`);
      setComments(updated || []);
    } catch (err) {
      console.error('Dislike failed:', err);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#16161a',
        scale: 2,
      });
      canvas.toBlob(async (blob) => {
        if (navigator.share && navigator.canShare({ files: [new File([blob], 'divide.png', { type: 'image/png' })] })) {
          await navigator.share({
            title: divide?.title,
            text: `Check out this divide: ${divide?.title}`,
            files: [new File([blob], 'divide.png', { type: 'image/png' })],
          });
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'divide.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#888' }}>
        Loading...
      </div>
    );
  }

  if (!divide) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#888' }}>
        <p>Divide not found</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '1rem', padding: '8px 16px', background: '#e53935', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
          Go Back
        </button>
      </div>
    );
  }

  const total = (divide.votesA || 0) + (divide.votesB || 0) || 1;
  const votesHidden = divide.votesA === null || divide.votesA === undefined;
  const leftPct = votesHidden ? null : Math.round(((divide.votesA || 0) / total) * 100);
  const rightPct = votesHidden ? null : 100 - leftPct;

  // Chart data - only shown when divide has ended
  const chartData = {
    labels: (divide.voteHistory || []).map((h, i) => {
      const d = new Date(h.timestamp);
      return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    }),
    datasets: [
      {
        label: divide.optionA,
        data: (divide.voteHistory || []).map(h => h.shortsA),
        borderColor: '#e53935',
        backgroundColor: 'rgba(229, 57, 53, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: divide.optionB,
        data: (divide.voteHistory || []).map(h => h.shortsB),
        borderColor: '#1e88e5',
        backgroundColor: 'rgba(30, 136, 229, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#888' } },
      title: { display: false },
    },
    scales: {
      x: { ticks: { color: '#666' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#666' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#e0e0e0' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: '16px', fontSize: '14px' }}
      >
        ← Back to Divides
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        {/* Main content */}
        <div>
          {/* Divide Card for snapshot */}
          <div ref={cardRef} style={{ background: '#16161a', borderRadius: '12px', padding: '20px', border: '1px solid #2a2a30', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {divide.category || 'Other'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: divide.status === 'active' ? '#4ade80' : '#e53935' }}>
                {divide.status === 'active' ? formatTime(seconds) : 'Ended'}
              </span>
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '16px', lineHeight: '1.3' }}>
              {divide.title}
            </h1>

            {/* Options */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1, background: 'rgba(229, 57, 53, 0.15)', border: '1px solid rgba(229, 57, 53, 0.3)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#e0e0e0', marginBottom: '4px' }}>{divide.optionA}</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#ff5252' }}>{votesHidden ? '??' : `${leftPct}%`}</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(30, 136, 229, 0.15)', border: '1px solid rgba(30, 136, 229, 0.3)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#e0e0e0', marginBottom: '4px' }}>{divide.optionB}</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#42a5f5' }}>{votesHidden ? '??' : `${rightPct}%`}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#888' }}>
                Vol: <span style={{ color: '#e53935', fontWeight: '600' }}>${divide.pot?.toFixed(2) || '0.00'}</span>
              </span>
              <button onClick={handleShare} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', padding: '6px 12px', color: '#888', cursor: 'pointer', fontSize: '12px' }}>
                📤 Share
              </button>
            </div>
          </div>

          {/* Chart - only shown when divide ended */}
          {divide.status !== 'active' && divide.voteHistory && divide.voteHistory.length > 0 && (
            <div style={{ background: '#16161a', borderRadius: '12px', padding: '20px', border: '1px solid #2a2a30', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#888', marginBottom: '16px' }}>Vote History</h3>
              <div style={{ height: '300px' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {divide.status === 'active' && (
            <div style={{ background: '#16161a', borderRadius: '12px', padding: '20px', border: '1px solid #2a2a30', marginBottom: '20px', textAlign: 'center', color: '#666' }}>
              <p>📊 Vote history chart will be revealed when this divide ends</p>
            </div>
          )}

          {/* RADICAL TRANSPARENCY SECTION - Only shown when divide has ended */}
          {divide.status !== 'active' && (
            <div style={{ background: '#16161a', borderRadius: '12px', border: '1px solid #2a2a30', marginBottom: '20px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid #2a2a30',
                background: 'linear-gradient(135deg, rgba(229, 57, 53, 0.1) 0%, rgba(30, 136, 229, 0.1) 100%)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🔍</span>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: 0 }}>FULL TRANSPARENCY REPORT</h3>
                    <p style={{ fontSize: '10px', color: '#888', margin: '4px 0 0 0' }}>Every bet, every payout, fully auditable</p>
                  </div>
                </div>
              </div>

              <div style={{ padding: '20px' }}>
                {/* Final Amounts Per Side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ 
                    background: 'rgba(229, 57, 53, 0.1)', 
                    border: `2px solid ${divide.winnerSide === 'A' ? '#4ade80' : 'rgba(229, 57, 53, 0.3)'}`,
                    borderRadius: '10px', 
                    padding: '16px',
                    position: 'relative',
                  }}>
                    {divide.winnerSide === 'A' && (
                      <div style={{ 
                        position: 'absolute', top: '-8px', right: '-8px', 
                        background: '#4ade80', color: '#000', 
                        padding: '2px 8px', borderRadius: '12px', 
                        fontSize: '9px', fontWeight: '700' 
                      }}>
                        ✓ WINNER
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>{divide.optionA}</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#ff5252' }}>
                      ${formatCurrency(divide.totalA || divide.votesA || 0, 2)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                      {(() => {
                        const totalPot = (divide.totalA || divide.votesA || 0) + (divide.totalB || divide.votesB || 0);
                        const pct = totalPot > 0 ? (((divide.totalA || divide.votesA || 0) / totalPot) * 100).toFixed(1) : 0;
                        return `${pct}% of total pot`;
                      })()}
                    </div>
                  </div>
                  <div style={{ 
                    background: 'rgba(30, 136, 229, 0.1)', 
                    border: `2px solid ${divide.winnerSide === 'B' ? '#4ade80' : 'rgba(30, 136, 229, 0.3)'}`,
                    borderRadius: '10px', 
                    padding: '16px',
                    position: 'relative',
                  }}>
                    {divide.winnerSide === 'B' && (
                      <div style={{ 
                        position: 'absolute', top: '-8px', right: '-8px', 
                        background: '#4ade80', color: '#000', 
                        padding: '2px 8px', borderRadius: '12px', 
                        fontSize: '9px', fontWeight: '700' 
                      }}>
                        ✓ WINNER
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>{divide.optionB}</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#42a5f5' }}>
                      ${formatCurrency(divide.totalB || divide.votesB || 0, 2)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                      {(() => {
                        const totalPot = (divide.totalA || divide.votesA || 0) + (divide.totalB || divide.votesB || 0);
                        const pct = totalPot > 0 ? (((divide.totalB || divide.votesB || 0) / totalPot) * 100).toFixed(1) : 0;
                        return `${pct}% of total pot`;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Pot Breakdown */}
                <div style={{ 
                  background: '#0d0d0f', 
                  borderRadius: '10px', 
                  padding: '16px', 
                  marginBottom: '20px',
                  border: '1px solid #1a1a1a',
                }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>
                    💰 Pot Distribution
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#888' }}>Total Pot</span>
                      <span style={{ color: '#fff', fontWeight: '700' }}>${formatCurrency(divide.pot || 0, 2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#888' }}>House Fee (2.5%)</span>
                      <span style={{ color: '#f87171' }}>-${formatCurrency((divide.pot || 0) * 0.025, 2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#888' }}>Creator Pool (0.5%)</span>
                      <span style={{ color: '#fbbf24' }}>-${formatCurrency((divide.pot || 0) * 0.005, 2)}</span>
                    </div>
                    <div style={{ height: '1px', background: '#2a2a30', margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#4ade80', fontWeight: '600' }}>Winners Received (97%)</span>
                      <span style={{ color: '#4ade80', fontWeight: '700' }}>${formatCurrency((divide.pot || 0) * 0.97, 2)}</span>
                    </div>
                  </div>
                </div>

                {/* All Bets - Timestamped Transaction Log */}
                {divide.voteHistory && divide.voteHistory.length > 0 && (
                  <div style={{ 
                    background: '#0d0d0f', 
                    borderRadius: '10px', 
                    padding: '16px', 
                    border: '1px solid #1a1a1a',
                  }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>
                      📋 All Bets ({divide.voteHistory.length} total)
                    </h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #2a2a30' }}>
                            <th style={{ padding: '8px 4px', textAlign: 'left', color: '#666', fontWeight: '600' }}>Time</th>
                            <th style={{ padding: '8px 4px', textAlign: 'left', color: '#666', fontWeight: '600' }}>User</th>
                            <th style={{ padding: '8px 4px', textAlign: 'center', color: '#666', fontWeight: '600' }}>Side</th>
                            <th style={{ padding: '8px 4px', textAlign: 'right', color: '#666', fontWeight: '600' }}>Amount</th>
                            <th style={{ padding: '8px 4px', textAlign: 'center', color: '#666', fontWeight: '600' }}>Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...divide.voteHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((vote, i) => {
                            const isWinner = vote.side === divide.winnerSide;
                            const timestamp = new Date(vote.timestamp);
                            const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            const dateStr = timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
                            
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                <td style={{ padding: '8px 4px', color: '#666' }}>
                                  <div>{dateStr}</div>
                                  <div style={{ fontSize: '10px' }}>{timeStr}</div>
                                </td>
                                <td style={{ padding: '8px 4px', color: '#e0e0e0', fontFamily: 'monospace' }}>
                                  {vote.username || vote.oddsMultiplier?.username || `User ${(vote.oddsMultiplier?.oddsAt || '').toString().slice(-4)}`}
                                </td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                                  <span style={{ 
                                    display: 'inline-block',
                                    padding: '2px 8px', 
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    background: vote.side === 'A' ? 'rgba(229, 57, 53, 0.2)' : 'rgba(30, 136, 229, 0.2)',
                                    color: vote.side === 'A' ? '#ff5252' : '#42a5f5',
                                  }}>
                                    {vote.side === 'A' ? divide.optionA : divide.optionB}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#fff', fontWeight: '600', fontFamily: 'monospace' }}>
                                  ${formatCurrency(vote.amount, 2)}
                                </td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                                  {isWinner ? (
                                    <span style={{ color: '#4ade80', fontWeight: '600' }}>✓ WON</span>
                                  ) : (
                                    <span style={{ color: '#f87171', fontWeight: '600' }}>✗ LOST</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <div style={{ background: '#16161a', borderRadius: '12px', padding: '20px', border: '1px solid #2a2a30' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#888', marginBottom: '16px' }}>Comments ({comments.length})</h3>

            {/* New comment form */}
            <form onSubmit={handleComment} style={{ marginBottom: '20px' }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={user ? "Add a comment..." : "Log in to comment"}
                disabled={!user}
                maxLength={500}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  background: '#0d0d0f',
                  border: '1px solid #2a2a30',
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  fontSize: '13px',
                  resize: 'vertical',
                  marginBottom: '8px',
                }}
              />
              <button
                type="submit"
                disabled={!user || !newComment.trim()}
                style={{
                  background: '#e53935',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: user && newComment.trim() ? 'pointer' : 'default',
                  opacity: user && newComment.trim() ? 1 : 0.5,
                }}
              >
                Post Comment
              </button>
            </form>

            {/* Comments list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {comments.map((c) => {
                const userLiked = user && (c.likedBy || []).includes(user.id);
                const userDisliked = user && (c.dislikedBy || []).includes(user.id);
                const hasReacted = userLiked || userDisliked;

                return (
                  <div key={c._id} style={{ background: '#0d0d0f', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#888' }}>{c.username}</span>
                      <span style={{ fontSize: '11px', color: '#555' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#d0d0d0', marginBottom: '8px', lineHeight: '1.4' }}>{c.text}</p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => handleCommentLike(c._id)}
                        disabled={hasReacted}
                        style={{
                          background: userLiked ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
                          border: 'none',
                          color: userLiked ? '#4ade80' : '#666',
                          cursor: hasReacted ? 'default' : 'pointer',
                          fontSize: '12px',
                          opacity: userDisliked ? 0.4 : 1,
                        }}
                      >
                        👍 {c.likes || 0}
                      </button>
                      <button
                        onClick={() => handleCommentDislike(c._id)}
                        disabled={hasReacted}
                        style={{
                          background: userDisliked ? 'rgba(248, 113, 113, 0.2)' : 'transparent',
                          border: 'none',
                          color: userDisliked ? '#f87171' : '#666',
                          cursor: hasReacted ? 'default' : 'pointer',
                          fontSize: '12px',
                          opacity: userLiked ? 0.4 : 1,
                        }}
                      >
                        👎 {c.dislikes || 0}
                      </button>
                    </div>
                  </div>
                );
              })}
              {comments.length === 0 && (
                <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>No comments yet. Be the first!</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Betting Area */}
        <div style={{ position: 'sticky', top: '24px', alignSelf: 'start' }}>
          <div style={{ background: '#16161a', borderRadius: '12px', padding: '20px', border: '1px solid #2a2a30' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#888', marginBottom: '16px' }}>Place Your Bet</h3>

            {divide.status !== 'active' ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>This divide has ended</p>
            ) : (
              <>
                {/* Side selection */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    onClick={() => setSelectedSide('A')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: selectedSide === 'A' ? '2px solid #e53935' : '1px solid #2a2a30',
                      background: selectedSide === 'A' ? 'rgba(229, 57, 53, 0.2)' : '#0d0d0f',
                      color: selectedSide === 'A' ? '#ff5252' : '#888',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                    }}
                  >
                    {divide.optionA}
                  </button>
                  <button
                    onClick={() => setSelectedSide('B')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: selectedSide === 'B' ? '2px solid #1e88e5' : '1px solid #2a2a30',
                      background: selectedSide === 'B' ? 'rgba(30, 136, 229, 0.2)' : '#0d0d0f',
                      color: selectedSide === 'B' ? '#42a5f5' : '#888',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                    }}
                  >
                    {divide.optionB}
                  </button>
                </div>

                {/* Amount input */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>Amount ($)</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#0d0d0f',
                      border: '1px solid #2a2a30',
                      borderRadius: '8px',
                      color: '#e0e0e0',
                      fontSize: '14px',
                    }}
                  />
                  {user && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#555', marginTop: '4px' }}>
                      Balance: ${(user.balance / 100).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Submit button */}
                <button
                  onClick={handleVote}
                  disabled={!user || !selectedSide || !betAmount || submitting}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: selectedSide === 'A' ? 'linear-gradient(135deg, #e53935 0%, #c62828 100%)'
                      : selectedSide === 'B' ? 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)'
                      : '#2a2a30',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: user && selectedSide && betAmount && !submitting ? 'pointer' : 'default',
                    opacity: user && selectedSide && betAmount && !submitting ? 1 : 0.5,
                  }}
                >
                  {submitting ? 'Placing Bet...' : 'Place Bet'}
                </button>

                {!user && (
                  <p style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginTop: '12px' }}>
                    Log in to place a bet
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
