import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import CaseBattleCard from './CaseBattleCard';
import CaseEditor from './CaseEditor';
import CaseBrowser from './CaseBrowser';
import '../styles/buttons.css';

export default function CreateBattlePage() {
  const navigate = useNavigate();
  const { refreshUser } = useContext(AuthContext);
  const socket = useSocket(null); // Connect to global socket (no specific room)
  const [battles, setBattles] = useState([]);
  const [, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCaseEditor, setShowCaseEditor] = useState(false);
  const [showCaseBrowser, setShowCaseBrowser] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]); // Now an array for multiple cases
  const [selectedCaseObjects, setSelectedCaseObjects] = useState([]); // Track full case objects with prices
  const [selectedMode, setSelectedMode] = useState('normal');
  const [selectedTeamSize, setSelectedTeamSize] = useState(1); // 1, 2, or 3 for normal/crazy; 2, 3, 4, 6 for group

  // Fetch available battles
  const fetchBattles = async () => {
    setLoading(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/case-battles' || 'http://localhost:3000/case-battles');
      const data = await res.json();
      setBattles(data.battles || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching battles:', err);
      setError('Failed to load battles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBattles();
  }, []);

  // Listen for caseBattleEnded socket event to refresh battles
  useEffect(() => {
    if (!socket) return;

    const handleBattleEnded = (data) => {
      console.log('[CreateBattlePage] Battle ended, removing from list:', data?.battle?.id);
      // Remove the ended battle from the list immediately
      setBattles(prev => prev.filter(b => b.id !== data?.battle?.id));
    };

    socket.on('caseBattleEnded', handleBattleEnded);

    return () => {
      socket.off('caseBattleEnded', handleBattleEnded);
    };
  }, [socket]);

  const handleCreateBattle = async () => {
    try {
      // Cases are now REQUIRED (multiple cases allowed)
      if (selectedCaseIds.length === 0) {
        setError('Please select at least one case before creating a battle');
        return;
      }

      const payload = { 
        mode: selectedMode,
        teamSize: selectedTeamSize,
        caseIds: selectedCaseIds  // Send array of case IDs
      };
      console.log('[CaseBattle Create] Sending payload:', payload);
      const res = await api.post('/case-battles/create', payload);
      if (res.success) {
        console.log('[CaseBattle Create] Battle created successfully, refreshing user...');
        setBattles([res.battle, ...battles]);
        setError(null);
        setSelectedCaseIds([]); // Clear selection
        setSelectedMode('normal');
        setSelectedTeamSize(1); // Reset team size
        // Refresh user balance after creating battle
        const updatedUser = await refreshUser();
        console.log('[CaseBattle Create] User refreshed, new balance:', updatedUser?.balance);
        // Navigate to the battle detail page
        navigate(`/case-battles/${res.battle.id}`);
      }
    } catch (err) {
      console.error('Error creating battle:', err);
      // Handle specific error messages from backend
      if (err.error === 'Insufficient balance') {
        setError('💰 Not enough balance! Your cases cost more than you have.');
      } else if (err.error) {
        setError(err.error);
      } else {
        setError(err.message || 'Failed to create battle');
      }
    }
  };

  const handleSelectCase = (caseObj) => {
    // Add case to array (allow duplicates - same case multiple times)
    setSelectedCaseIds([...selectedCaseIds, caseObj._id]);
    setSelectedCaseObjects([...selectedCaseObjects, caseObj]);
    // Don't close browser - let them select more
  };

  const removeSelectedCase = (index) => {
    setSelectedCaseIds(selectedCaseIds.filter((_, i) => i !== index));
    setSelectedCaseObjects(selectedCaseObjects.filter((_, i) => i !== index));
  };

  const closeCaseBrowser = () => {
    setShowCaseBrowser(false);
  };

  const handleCaseSaved = () => {
    setShowCaseEditor(false);
    // Refresh battles in case usage count changed
    fetchBattles();
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Hero Header Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
          border: '1px solid rgba(0, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '30px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
        }}>
          <h1 style={{
            margin: '0 0 6px 0',
            color: '#fff',
            fontSize: '28px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00ffff, #ffd700)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            ⚔️ CREATE BATTLE
          </h1>
          <p style={{
            color: '#aaa',
            margin: '0',
            fontSize: '12px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            Set up a new case battle and challenge other players
          </p>
        </div>

        {/* Back to Battles Link */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => navigate('/case-battles')}
            style={{
              background: 'transparent',
              color: '#00ffff',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(0, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            ← Back to Battles
          </button>
        </div>

        {/* Main Content Grid: Left (Controls) + Right (Battles) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '30px', alignItems: 'flex-start' }}>
          {/* LEFT PANEL: Battle Creation Controls */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(15, 15, 30, 0.8) 100%)',
            border: '1px solid rgba(0, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '24px',
            position: 'sticky',
            top: '20px',
          }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                color: '#00ffff',
                fontSize: '14px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                margin: '0 0 16px 0',
              }}>
                ⚙️ Battle Settings
              </h3>

              {/* Battle Cost Display */}
              <div style={{
                backgroundColor: 'rgba(0, 255, 255, 0.1)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Battle Cost
                </div>
                <div style={{ color: '#00ffff', fontSize: '18px', fontWeight: 700 }}>
                  ${(selectedCaseObjects.reduce((sum, c) => sum + (c.calculatedPrice || 0), 0)).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Battle Mode Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                color: '#9fb',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '10px',
                letterSpacing: '0.5px',
              }}>
                Battle Mode
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { value: 'normal', icon: '⚔️', label: 'Normal' },
                  { value: 'crazy', icon: '🔥', label: 'Crazy' },
                  { value: 'group', icon: '👥', label: 'Group' },
                ].map((modeOption) => (
                  <button
                    key={modeOption.value}
                    onClick={() => setSelectedMode(modeOption.value)}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: selectedMode === modeOption.value
                        ? modeOption.value === 'normal'
                          ? 'rgba(0, 255, 255, 0.2)'
                          : modeOption.value === 'crazy'
                          ? 'rgba(255, 100, 100, 0.2)'
                          : 'rgba(100, 200, 100, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: `2px solid ${
                        selectedMode === modeOption.value
                          ? modeOption.value === 'normal'
                            ? '#00ffff'
                            : modeOption.value === 'crazy'
                            ? '#ff6464'
                            : '#64c864'
                          : 'rgba(255, 255, 255, 0.1)'
                      }`,
                      color: selectedMode === modeOption.value
                        ? modeOption.value === 'normal'
                          ? '#00ffff'
                          : modeOption.value === 'crazy'
                          ? '#ff6464'
                          : '#64c864'
                        : '#ccc',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textAlign: 'left',
                    }}
                  >
                    {modeOption.icon} {modeOption.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Size Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                color: '#9fb',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '10px',
                letterSpacing: '0.5px',
              }}>
                {selectedMode === 'group' ? '👥 Players' : '🎯 Team Size'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {(selectedMode === 'normal' || selectedMode === 'crazy'
                  ? [
                      { value: 1, label: '1v1' },
                      { value: 2, label: '2v2' },
                      { value: 3, label: '3v3' },
                    ]
                  : [
                      { value: 2, label: '2P' },
                      { value: 3, label: '3P' },
                      { value: 4, label: '4P' },
                      { value: 6, label: '6P' },
                    ]
                ).map((sizeOption) => (
                  <button
                    key={sizeOption.value}
                    onClick={() => setSelectedTeamSize(sizeOption.value)}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: selectedTeamSize === sizeOption.value
                        ? 'rgba(100, 255, 100, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: `2px solid ${
                        selectedTeamSize === sizeOption.value
                          ? '#64ff64'
                          : 'rgba(255, 255, 255, 0.1)'
                      }`,
                      color: selectedTeamSize === sizeOption.value ? '#64ff64' : '#ccc',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {sizeOption.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleCreateBattle}
                disabled={selectedCaseIds.length === 0}
                style={{
                  padding: '16px',
                  background: selectedCaseIds.length === 0 ? 'rgba(100, 100, 100, 0.5)' : 'linear-gradient(135deg, #00ffff, #ffd700)',
                  border: 'none',
                  color: '#000',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: selectedCaseIds.length === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  opacity: selectedCaseIds.length === 0 ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (selectedCaseIds.length > 0) {
                    e.target.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCaseIds.length > 0) {
                    e.target.style.transform = 'scale(1)';
                  }
                }}
              >
                ⚡ CREATE BATTLE ⚡
              </button>
              <button
                onClick={() => setShowCaseBrowser(!showCaseBrowser)}
                style={{
                  padding: '12px',
                  backgroundColor: showCaseBrowser ? 'rgba(255, 100, 100, 0.2)' : 'rgba(52, 152, 219, 0.2)',
                  border: `1px solid ${showCaseBrowser ? 'rgba(255, 100, 100, 0.4)' : 'rgba(52, 152, 219, 0.4)'}`,
                  color: showCaseBrowser ? '#ff6464' : '#3498db',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                🎁 {showCaseBrowser ? 'Hide Cases' : 'Browse Cases'}
              </button>
              <button
                onClick={() => setShowCaseEditor(!showCaseEditor)}
                style={{
                  padding: '12px',
                  backgroundColor: showCaseEditor ? 'rgba(255, 100, 100, 0.2)' : 'rgba(155, 89, 182, 0.2)',
                  border: `1px solid ${showCaseEditor ? 'rgba(255, 100, 100, 0.4)' : 'rgba(155, 89, 182, 0.4)'}`,
                  color: showCaseEditor ? '#ff6464' : '#b968ce',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                ✏️ {showCaseEditor ? 'Close' : 'Create Case'}
              </button>
              {selectedCaseIds.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedCaseIds([]);
                    setSelectedCaseObjects([]);
                  }}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#ef4444',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  ✕ Clear All
                </button>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Selected Cases Display */}
          <div>
            {/* Error Message */}
            {error && (
              <div style={{
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                border: '1px solid rgba(231, 76, 60, 0.3)',
                color: '#e74c3c',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '13px',
                fontWeight: 600,
              }}>
                ❌ {error}
              </div>
            )}

            {/* Case Browser Panel */}
            {showCaseBrowser && (
              <div style={{
                backgroundColor: 'rgba(52, 152, 219, 0.05)',
                border: '1px solid rgba(52, 152, 219, 0.2)',
                borderRadius: '12px',
                padding: '24px',
              }}>
                <CaseBrowser 
                  onSelectCase={handleSelectCase}
                  selectedCaseIds={selectedCaseIds}
                  onRemoveCase={removeSelectedCase}
                  onClose={closeCaseBrowser}
                />
              </div>
            )}

            {/* Case Editor Panel */}
            {showCaseEditor && (
              <div style={{
                backgroundColor: 'rgba(155, 89, 182, 0.05)',
                border: '1px solid rgba(155, 89, 182, 0.2)',
                borderRadius: '12px',
                padding: '24px',
              }}>
                <CaseEditor onSave={handleCaseSaved} onClose={() => setShowCaseEditor(false)} />
              </div>
            )}

            {/* Selected Cases Display */}
            {!showCaseEditor && !showCaseBrowser && (
              <div>
                <div style={{
                  color: '#9fb',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '16px',
                  fontWeight: 600,
                }}>
                  📦 SELECTED CASES ({selectedCaseIds.length})
                </div>
                {selectedCaseIds.length > 0 ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '16px',
                  }}>
                    {selectedCaseObjects.map((caseObj, index) => (
                      <div
                        key={index}
                        style={{
                          position: 'relative',
                          backgroundColor: 'rgba(0, 255, 255, 0.05)',
                          border: '1px solid rgba(0, 255, 255, 0.2)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.5)';
                          e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Case Image */}
                        {caseObj.image && (
                          <img 
                            src={caseObj.image} 
                            alt={caseObj.name}
                            style={{
                              width: '100%',
                              height: '100px',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        )}
                        
                        {/* Case Info */}
                        <div style={{ padding: '12px' }}>
                          <div style={{
                            color: '#00ffff',
                            fontSize: '12px',
                            fontWeight: 700,
                            marginBottom: '6px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {caseObj.name}
                          </div>
                          <div style={{
                            color: '#ffd700',
                            fontSize: '13px',
                            fontWeight: 700,
                            marginBottom: '8px',
                          }}>
                            ${(caseObj.calculatedPrice || 0).toFixed(2)}
                          </div>
                          
                          {/* Remove Button */}
                          <button
                            onClick={() => removeSelectedCase(index)}
                            style={{
                              width: '100%',
                              padding: '6px',
                              backgroundColor: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              color: '#ef4444',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              textTransform: 'uppercase',
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = 'rgba(239, 68, 68, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 40px',
                    color: '#666',
                    backgroundColor: 'rgba(0, 255, 255, 0.05)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(0, 255, 255, 0.1)',
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>🎁</div>
                    <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0' }}>No Cases Selected</p>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Browse cases or create new ones to get started</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
