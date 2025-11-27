import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence } from 'framer-motion';
import UserAvatar from './UserAvatar';

export default function UserSettingsModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('settings');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.profileImage || '');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfileImage = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      setMessage({ type: '', text: '' });
      const formData = new FormData();
      formData.append('file', selectedFile);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
      setMessage({ type: 'success', text: 'Profile image updated successfully!' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  // Preloaded SVG selection
  const [svgOptions, setSvgOptions] = useState([]);
  const [selectedSvg, setSelectedSvg] = useState('');
  useEffect(() => {
    async function fetchSvgs() {
      try {
        const res = await fetch('/profilesvg');
        if (!res.ok) return;
        const parser = new DOMParser();
        const html = await res.text();
        // Parse directory listing (works in dev, for prod use a manifest)
        const doc = parser.parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));
        const files = links.map(a => a.getAttribute('href')).filter(f => f && f.endsWith('.svg'));
        setSvgOptions(files);
      } catch {}
    }
    fetchSvgs();
  }, []);

  const handleSelectSvg = async (svgPath) => {
    setSelectedSvg(svgPath);
    setPreviewUrl(`/profilesvg/${svgPath}`);
    setSelectedFile(null);
    try {
      setUploading(true);
      setMessage({ type: '', text: '' });
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/profile-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imagePath: `/profilesvg/${svgPath}` })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
      setMessage({ type: 'success', text: 'Profile image updated successfully!' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}
        onClick={onClose}
      >
        <div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(135deg, #0b0b0b 0%, #1a1a2e 100%)',
            border: '1px solid rgba(0, 255, 255, 0.2)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #00ffff, #00ccff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              User Profile
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              ✕
            </button>
          </div>

          {/* Tab Navigation */}
          <div style={{
            padding: '0 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            gap: '8px'
          }}>
            {['profile', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 24px',
                  background: activeTab === tab ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #00ffff' : '2px solid transparent',
                  color: activeTab === tab ? '#00ffff' : '#9ca3af',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1
          }}>
            {activeTab === 'profile' && (
              <div>
                {/* Profile Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  marginBottom: '32px',
                  padding: '24px',
                  background: 'rgba(0, 255, 255, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 255, 255, 0.1)'
                }}>
                  <UserAvatar user={user} size={80} />
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700, color: '#fff' }}>
                      {user?.username}
                    </h3>
                    <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                      Balance: <span style={{ color: '#00ffff', fontWeight: 700 }}>${(user?.balance || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', textTransform: 'capitalize' }}>
                      Role: {user?.role || 'user'}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                  Statistics
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  {[
                    { label: 'Total Wagered', value: '$0.00', icon: '💰' },
                    { label: 'Total Won', value: '$0.00', icon: '🎉' },
                    { label: 'Total Deposited', value: '$0.00', icon: '📥' },
                    { label: 'Total Withdrawn', value: '$0.00', icon: '📤' }
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '20px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{stat.icon}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {stat.label}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#00ffff' }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                  Profile Settings
                </h4>

                {/* Profile Image Setting */}
                <div style={{
                  padding: '24px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#9ca3af',
                      marginBottom: '8px'
                    }}>
                      Profile Image
                    </label>
                    
                    {/* File Upload Button */}
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        id="profile-image-upload"
                      />
                      <label
                        htmlFor="profile-image-upload"
                        style={{
                          display: 'inline-block',
                          padding: '12px 24px',
                          background: 'rgba(0, 255, 255, 0.1)',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '8px',
                          color: '#00ffff',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)';
                        }}
                      >
                        📁 Choose Image File
                      </label>
                      {selectedFile && (
                        <div style={{ 
                          marginTop: '8px', 
                          fontSize: '12px', 
                          color: '#9ca3af' 
                        }}>
                          Selected: {selectedFile.name}
                        </div>
                      )}
                    </div>

                    {/* Preloaded SVG Options */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>Or select a preloaded avatar:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {svgOptions.map((svg, idx) => (
                          <button
                            key={svg}
                            onClick={() => handleSelectSvg(svg)}
                            style={{
                              border: selectedSvg === svg ? '2px solid #00ffff' : '1px solid #333',
                              borderRadius: '8px',
                              padding: '6px',
                              background: selectedSvg === svg ? 'rgba(0,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                              cursor: 'pointer',
                              outline: 'none',
                              transition: 'all 0.2s',
                              width: 48,
                              height: 48,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title={svg}
                          >
                            <img src={`/profilesvg/${svg}`} alt={svg} style={{ width: 32, height: 32, borderRadius: 6 }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  {previewUrl && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Preview:</div>
                      <UserAvatar user={{ username: user?.username, profileImage: previewUrl }} size={64} />
                    </div>
                  )}

                  {/* Message */}
                  {message.text && (
                    <div style={{
                      padding: '12px',
                      marginBottom: '16px',
                      background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      borderRadius: '8px',
                      color: message.type === 'success' ? '#10b981' : '#ef4444',
                      fontSize: '13px'
                    }}>
                      {message.text}
                    </div>
                  )}

                  <button
                    onClick={handleUpdateProfileImage}
                    disabled={uploading || !selectedFile}
                    style={{
                      padding: '12px 24px',
                      background: uploading || !selectedFile ? 'rgba(100, 100, 100, 0.3)' : 'linear-gradient(135deg, #00ffff, #00ccff)',
                      border: 'none',
                      borderRadius: '8px',
                      color: uploading || !selectedFile ? '#666' : '#000',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Update Profile Image'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
