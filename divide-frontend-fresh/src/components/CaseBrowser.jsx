import React, { useState, useEffect } from 'react';

export default function CaseBrowser({ onSelectCase, selectedCaseIds, onRemoveCase, onClose }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or 'my'
  const [error, setError] = useState(null);
  const [selectedCaseModal, setSelectedCaseModal] = useState(null); // Track which case modal is open

  const fetchCases = async (filterType) => {
    setLoading(true);
    try {
      let url;
      if (filterType === 'my') {
        url = (import.meta.env.VITE_API_URL || '') + '/cases';
      } else {
        url = (import.meta.env.VITE_API_URL || '') + '/cases/public';
      }

      const res = await fetch(url, {
        headers: {
          Authorization: filterType === 'my' ? `Bearer ${localStorage.getItem('token')}` : undefined,
        },
      });
      const data = await res.json();
      setCases(data.cases || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching cases:', err);
      setError('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases(filter);
  }, [filter]);

  // Debug: log when modal opens
  useEffect(() => {
    if (selectedCaseModal && selectedCaseModal.items) {
      console.log('[CaseBrowser Modal] Case items:', selectedCaseModal.items.map(item => ({
        name: item.name,
        hasImage: !!item.image,
        imageLength: item.image?.length || 0,
        image: item.image ? item.image.substring(0, 50) : 'none'
      })));
    }
  }, [selectedCaseModal]);

  // Count how many times this case is selected
  const getCountForCase = (caseId) => {
    return selectedCaseIds.filter(id => id === caseId).length;
  };

  // Add one more of this case
  const handleAddCase = (caseObj) => {
    if (onSelectCase) {
      onSelectCase(caseObj);
    }
  };

  // Remove one of this case
  const handleRemoveCase = (caseId) => {
    if (onRemoveCase) {
      // Find the last index of this case and remove it
      const lastIndex = selectedCaseIds.lastIndexOf(caseId);
      if (lastIndex !== -1) {
        onRemoveCase(lastIndex);
      }
    }
  };

  return (
    <div style={{ 
      padding: '20px',
      backgroundColor: '#0f1419',
      color: '#ffffff',
      minHeight: '100vh',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0, color: '#ffc107', fontSize: '28px', fontWeight: 'bold', letterSpacing: '0.5px' }}>Case Browser</h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(231, 76, 60, 0.8)',
              color: 'white',
              border: '1px solid rgba(231, 76, 60, 0.5)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
            }}
          >
            ✕ Close
          </button>
        )}
      </div>

      <div style={{ marginBottom: '30px', display: 'flex', gap: '12px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '10px 24px',
            backgroundColor: filter === 'all' ? 'rgba(255, 193, 7, 0.25)' : 'rgba(255, 193, 7, 0.08)',
            color: filter === 'all' ? '#ffc107' : 'rgba(255, 193, 7, 0.5)',
            border: `1px solid ${filter === 'all' ? 'rgba(255, 193, 7, 0.4)' : 'rgba(255, 193, 7, 0.15)'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s ease',
          }}
        >
          Public Cases
        </button>
        <button
          onClick={() => setFilter('my')}
          style={{
            padding: '10px 24px',
            backgroundColor: filter === 'my' ? 'rgba(255, 193, 7, 0.25)' : 'rgba(255, 193, 7, 0.08)',
            color: filter === 'my' ? '#ffc107' : 'rgba(255, 193, 7, 0.5)',
            border: `1px solid ${filter === 'my' ? 'rgba(255, 193, 7, 0.4)' : 'rgba(255, 193, 7, 0.15)'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s ease',
          }}
        >
          My Cases
        </button>
      </div>

      {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
      {loading && <p style={{ color: 'rgba(255,255,255,0.7)' }}>Loading cases...</p>}

      {!loading && cases.length === 0 && <p style={{ color: 'rgba(255,255,255,0.5)' }}>No cases found.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
        {cases.map((caseObj) => (
          <div
            key={caseObj._id}
            style={{
              border: '1px solid rgba(255, 193, 7, 0.15)',
              backgroundColor: '#1a1f2e',
              borderRadius: '8px',
              padding: '18px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,215,0,0.05)',
              transition: 'all 0.3s ease',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.3)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,215,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.15)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,215,0,0.05)';
            }}
          >
            {caseObj.image && (
                  <div style={{ marginBottom: '8px', borderRadius: '4px', overflow: 'hidden' }}>
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
              </div>
            )}
            <h3 style={{ marginTop: 0, color: '#ffc107', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>{caseObj.name}</h3>
            {caseObj.description && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: '3px 0' }}>{caseObj.description}</p>}

            <div style={{ marginBottom: '15px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              <p style={{ margin: '4px 0' }}>
                <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Creator:</strong> <span style={{ color: 'rgba(255,255,255,0.6)' }}>{caseObj.creatorUsername}</span>
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Items:</strong> <span style={{ color: 'rgba(255,255,255,0.6)' }}>{caseObj.items.length}</span>
              </p>
              <p style={{ margin: '4px 0', fontSize: '14px', fontWeight: 'bold', color: '#ffc107' }}>
                💰 Cost: ${(caseObj.calculatedPrice || 0).toFixed(2)}
              </p>
              {caseObj.usageCount > 0 && (
                <p style={{ margin: '4px 0', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                  <strong>Used:</strong> {caseObj.usageCount} times
                </p>
              )}
            </div>

            {/* Show Items Button */}
            <button
              onClick={() => setSelectedCaseModal(caseObj)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '12px',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                color: '#ffc107',
                border: '1px solid rgba(255, 193, 7, 0.2)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease',
              }}
            >
              👁️ Show Items
            </button>

            {/* Add/Remove Buttons */}
            {getCountForCase(caseObj._id) > 0 ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleRemoveCase(caseObj._id)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    backgroundColor: 'rgba(231, 76, 60, 0.15)',
                    color: '#ff6b6b',
                    border: '1px solid rgba(231, 76, 60, 0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  − Remove
                </button>
                <button
                  onClick={() => handleAddCase(caseObj)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    backgroundColor: 'rgba(255, 193, 7, 0.2)',
                    color: '#ffc107',
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  + Add ({getCountForCase(caseObj._id)})
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleAddCase(caseObj)}
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: 'rgba(255, 193, 7, 0.2)',
                  color: '#ffc107',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                }}
              >
                + Add Case
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Items Modal */}
      {selectedCaseModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '2px solid rgba(255, 193, 7, 0.2)',
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '95vw',
            maxHeight: '95vh',
            overflowY: 'auto',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 215, 0, 0.1)',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '28px',
              paddingBottom: '16px',
              borderBottom: '1px solid rgba(255, 193, 7, 0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedCaseModal.image && (
                  <img
                    src={selectedCaseModal.image}
                    alt={selectedCaseModal.name}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '2px solid rgba(255, 193, 7, 0.3)',
                    }}
                  />
                )}
                <h2 style={{
                  margin: 0,
                  color: '#ffc107',
                  fontSize: '28px',
                  fontWeight: 'bold',
                }}>
                  {selectedCaseModal.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCaseModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '32px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  borderRadius: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
                  e.currentTarget.style.color = '#ffc107';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0)';
                  e.currentTarget.style.color = '#fff';
                }}
              >
                ✕
              </button>
            </div>

            {/* Items Grid - 3 columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}>
              {selectedCaseModal.items && selectedCaseModal.items.length > 0 ? (
                selectedCaseModal.items.map((item, idx) => {
                  const rarity = item.rarity || 'common';
                  const displayValue = (item.value || 0).toFixed(2);

                  const rarityLabels = {
                    common: 'Common',
                    uncommon: 'Uncommon',
                    rare: 'Rare',
                    epic: 'Epic',
                    legendary: 'Legendary',
                  };

                  const rarityColors = {
                    common: '#808080',
                    uncommon: '#1eff00',
                    rare: '#0070dd',
                    epic: '#a335ee',
                    legendary: '#ff8000',
                  };

                  const rarityGlowColors = {
                    common: 'rgba(128, 128, 128, 0.3)',
                    uncommon: 'rgba(30, 255, 0, 0.3)',
                    rare: 'rgba(0, 112, 221, 0.3)',
                    epic: 'rgba(163, 53, 238, 0.3)',
                    legendary: 'rgba(255, 128, 0, 0.3)',
                  };

                  // Debug log for each item
                  if (idx === 0) {
                    console.log('[Item Card] Item:', { name: item.name, hasImage: !!item.image, imageStart: item.image?.substring(0, 50) });
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#1a1f2e',
                        border: `2px solid ${rarityColors[rarity]}`,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = `0 0 20px ${rarityColors[rarity]}60, 0 12px 24px rgba(0, 0, 0, 0.3)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                      }}
                    >
                      {/* Item Image with Rarity Glow */}
                      <div style={{
                        position: 'relative',
                        backgroundColor: '#0a0a0a',
                        height: '160px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        {/* Rarity Glow Backdrop */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '120px',
                          height: '120px',
                          borderRadius: '50%',
                          backgroundColor: rarityGlowColors[rarity],
                          filter: 'blur(30px)',
                          zIndex: 0,
                        }} />

                        {/* Item Image */}
                        {item.image && item.image.length > 0 ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              padding: '12px',
                              zIndex: 1,
                              position: 'relative',
                            }}
                            onError={(e) => {
                              // If image fails to load, show fallback
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div style={{
                            fontSize: '48px',
                            zIndex: 1,
                          }}>
                            📦
                          </div>
                        )}
                      </div>

                      {/* Item Info */}
                      <div style={{
                        padding: '12px',
                        textAlign: 'center',
                      }}>
                        {/* Item Name */}
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          marginBottom: '8px',
                          color: '#fff',
                          minHeight: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                        }}>
                          {item.name}
                        </div>

                        {/* Item Value */}
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: '#1eff00',
                          marginBottom: '8px',
                        }}>
                          ${displayValue}
                        </div>

                        {/* Rarity Badge */}
                        <div style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: rarityColors[rarity],
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '4px',
                        }}>
                          {rarityLabels[rarity]}
                        </div>

                        {/* Drop Chance */}
                        <div style={{
                          fontSize: '10px',
                          color: 'rgba(255, 255, 255, 0.6)',
                        }}>
                          {(item.chance || 0).toFixed(2)}% chance
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '60px 40px',
                  color: '#666',
                }}>
                  No items in this case
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
