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
import DivideResolutionAnimation from '../components/DivideResolutionAnimation';
import { SEODivide } from '../components/SEO';

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
  const [positionMode, setPositionMode] = useState('short'); // 'long' or 'short' - default short
  const [seconds, setSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showResolutionAnimation, setShowResolutionAnimation] = useState(false);
  const [userPosition, setUserPosition] = useState(null);

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

        // If divide has ended and has a winner, show animation
        // Check sessionStorage to avoid showing animation repeatedly
        const animationKey = `divide_animation_shown_${id}`;
        if (data.status !== 'active' && data.winnerSide && !sessionStorage.getItem(animationKey)) {
          // Find user's position in this divide
          if (user && data.voteHistory) {
            const userVotes = data.voteHistory.filter(v =>
              v.oddsMultiplier?.userId === user.id || v.userId === user.id
            );
            if (userVotes.length > 0) {
              const totalAmount = userVotes.reduce((sum, v) => sum + (v.amount || 0), 0);
              const userSide = userVotes[0].side;
              setUserPosition({ side: userSide, amount: totalAmount });
            }
          }

          setShowResolutionAnimation(true);
          sessionStorage.setItem(animationKey, 'true');
        }
      } catch (err) {
        console.error('Failed to fetch divide:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDivide();
  }, [id, user]);

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
    if (!positionMode) return alert('Select Long or Short');
    const amount = parseFloat(betAmount);
    if (!amount || amount <= 0) return alert('Enter a valid amount');

    // Map Long/Short + Side to actual betting side
    // Long A = money to B (expect A majority, B minority wins)
    // Short A = money to A (expect A minority wins)
    // Long B = money to A (expect B majority, A minority wins)
    // Short B = money to B (expect B minority wins)
    let actualSide;
    if (positionMode === 'long') {
      actualSide = selectedSide === 'A' ? 'B' : 'A';
    } else {
      actualSide = selectedSide;
    }

    setSubmitting(true);
    try {
      await api.post('/Divides/vote', {
        divideId: divide._id || divide.id,
        side: actualSide,
        boostAmount: amount,
      });
      // Refresh divide
      const updated = await api.get(`/api/divides/${id}`);
      setDivide(updated);
      setBetAmount('');
      setSelectedSide(null);
      setPositionMode(null);
    } catch (err) {
      alert(err.message || 'Failed to place position');
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
      {/* Resolution Animation */}
      <DivideResolutionAnimation
        isOpen={showResolutionAnimation}
        onClose={() => setShowResolutionAnimation(false)}
        divide={divide}
        userPosition={userPosition}
      />

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
          <SEODivide divide={divide} />
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
              <button onClick={handleShare} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', padding: '6px 12px', color: '#888', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px' }}><path fillRule="evenodd" d="M15.75 4.5a3 3 0 11.825 2.066l-8.421 4.679a3.002 3.002 0 010 1.51l8.421 4.679a3 3 0 11-.729 1.31l-8.421-4.678a3 3 0 110-4.132l8.421-4.679a3 3 0 01-.096-.755z" clipRule="evenodd" /></svg>
                Share
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
            <div style={{ background: '#16161a', borderRadius: '12px', padding: '20px', border: '1px solid #2a2a30', marginBottom: '20px', textAlign: 'center', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}><path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" /></svg>
              <p style={{ margin: 0 }}>Vote history chart will be revealed when this divide ends</p>
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
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px', color: '#888' }}><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" /></svg>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: 0 }}>FULL TRANSPARENCY REPORT</h3>
                    <p style={{ fontSize: '10px', color: '#888', margin: '4px 0 0 0' }}>Every short, every payout, fully auditable</p>
                  </div>
                </div>
                {divide.winnerSide && (
                  <button
                    onClick={() => setShowResolutionAnimation(true)}
                    style={{
                      background: 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(229, 57, 53, 0.3)',
                    }}
                  >
                    <span>🎬</span> Replay Result
                  </button>
                )}
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
                  <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#888', marginBottom: '12px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px' }}><path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" /><path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" /></svg>
                    Pot Distribution
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

                {/* All Shorts - Timestamped Transaction Log */}
                {divide.voteHistory && divide.voteHistory.length > 0 && (
                  <div style={{
                    background: '#0d0d0f',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #1a1a1a',
                  }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#888', marginBottom: '12px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px' }}><path fillRule="evenodd" d="M10.5 3A1.501 1.501 0 009 4.5h6A1.5 1.5 0 0013.5 3h-3zm-2.693.178A3 3 0 0110.5 1.5h3a3 3 0 012.694 1.678c.497.042.992.092 1.486.15 1.497.173 2.57 1.46 2.57 2.929V19.5a3 3 0 01-3 3H6.75a3 3 0 01-3-3V6.257c0-1.47 1.073-2.756 2.57-2.93.493-.057.989-.107 1.487-.15z" clipRule="evenodd" /></svg>
                      All Shorts ({divide.voteHistory.length} total)
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px' }}><path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z" /></svg>
                        {c.likes || 0}
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px' }}><path d="M15.73 5.25h1.035A7.465 7.465 0 0118 9.375a7.465 7.465 0 01-1.235 4.125h-.148c-.806 0-1.534.446-2.031 1.08a9.04 9.04 0 01-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 00-.322 1.672V21a.75.75 0 01-.75.75 2.25 2.25 0 01-2.25-2.25c0-1.152.26-2.243.723-3.218C7.74 15.724 7.366 15 6.748 15H3.622c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 011.5 12c0-2.848.992-5.464 2.649-7.521.388-.482.987-.729 1.605-.729H9.77a4.5 4.5 0 011.423.23l3.114 1.04a4.5 4.5 0 001.423.23zM21.669 13.773c.536-1.362.831-2.845.831-4.398 0-1.22-.182-2.398-.52-3.507-.26-.85-1.084-1.368-1.973-1.368H19.1c-.445 0-.72.498-.523.898.591 1.2.924 2.55.924 3.977a8.959 8.959 0 01-1.302 4.666c-.245.403.028.959.5.959h1.053c.832 0 1.612-.453 1.918-1.227z" /></svg>
                        {c.dislikes || 0}
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

        {/* Sidebar - Position Panel */}
        <div style={{ position: 'sticky', top: '24px', alignSelf: 'start' }}>
          <div style={{ background: '#16161a', borderRadius: '12px', padding: '20px', border: '1px solid #2a2a30' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#888', marginBottom: '16px' }}>Take a Position</h3>

            {divide.status !== 'active' ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>This divide has ended</p>
            ) : (
              <>
                {/* Toggle Switch */}
                {!selectedSide && (
                  <div style={{ marginBottom: '16px' }}>
                    <div
                      onClick={() => setPositionMode(positionMode === 'long' ? 'short' : 'long')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0',
                        background: 'rgba(0,0,0,0.4)',
                        borderRadius: '20px',
                        padding: '3px',
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.1)',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '17px',
                        background: positionMode === 'long'
                          ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
                          : 'transparent',
                        color: positionMode === 'long' ? '#000' : '#666',
                        fontSize: '12px',
                        fontWeight: '700',
                        textAlign: 'center',
                        transition: 'all 200ms ease',
                      }}>
                        📈 LONG
                      </div>
                      <div style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '17px',
                        background: positionMode === 'short'
                          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                          : 'transparent',
                        color: positionMode === 'short' ? '#fff' : '#666',
                        fontSize: '12px',
                        fontWeight: '700',
                        textAlign: 'center',
                        transition: 'all 200ms ease',
                      }}>
                        📉 SHORT
                      </div>
                    </div>

                    <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', lineHeight: 1.5, marginBottom: '12px' }}>
                      {positionMode === 'long'
                        ? 'Long = expect this side to be majority'
                        : 'Short = expect this side to be minority'
                      }
                      <span style={{ color: '#fbbf24', display: 'block' }}>Minority eats 97% of pot</span>
                    </div>

                    {/* Side Selection */}
                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '8px', textAlign: 'center' }}>
                      Select a side to {positionMode.toUpperCase()}:
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedSide('A')}
                        style={{
                          flex: 1,
                          padding: '14px 8px',
                          borderRadius: '8px',
                          border: '1px solid #2a2a30',
                          background: 'rgba(229, 57, 53, 0.1)',
                          color: '#ff5252',
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
                          padding: '14px 8px',
                          borderRadius: '8px',
                          border: '1px solid #2a2a30',
                          background: 'rgba(30, 136, 229, 0.1)',
                          color: '#42a5f5',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '13px',
                        }}
                      >
                        {divide.optionB}
                      </button>
                    </div>
                  </div>
                )}

                {/* Amount input */}
                {selectedSide && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      background: positionMode === 'long' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${positionMode === 'long' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '12px',
                    }}>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Your position:</div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: positionMode === 'long' ? '#4ade80' : '#ef4444',
                      }}>
                        {positionMode === 'long' ? '📈 LONG' : '📉 SHORT'} {selectedSide === 'A' ? divide.optionA : divide.optionB}
                      </div>
                    </div>

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
                )}

                {/* Submit buttons */}
                {selectedSide && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setSelectedSide(null);
                        setBetAmount('');
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #2a2a30',
                        background: 'transparent',
                        color: '#888',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVote}
                      disabled={!user || !betAmount || submitting}
                      style={{
                        flex: 2,
                        padding: '12px',
                        background: positionMode === 'long'
                          ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
                          : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: positionMode === 'long' ? '#000' : '#fff',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: user && betAmount && !submitting ? 'pointer' : 'default',
                        opacity: user && betAmount && !submitting ? 1 : 0.5,
                      }}
                    >
                      {submitting ? 'Confirming...' : (positionMode === 'long' ? '📈 Confirm Long' : '📉 Confirm Short')}
                    </button>
                  </div>
                )}

                {!user && (
                  <p style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginTop: '12px' }}>
                    Log in to take a position
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
