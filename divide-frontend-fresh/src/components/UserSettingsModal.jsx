import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence } from 'framer-motion';
import UserAvatar from './UserAvatar';

export default function UserSettingsModal({ isOpen, onClose }) {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('settings');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.profileImage || '');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const presetAvatars = [
    '/profilesvg/account-avatar-profile-user-svgrepo-com.svg',
    '/profilesvg/account-avatar-profile-user-3-svgrepo-com.svg',
    '/profilesvg/account-avatar-profile-user-4-svgrepo-com.svg',
    '/profilesvg/account-avatar-profile-user-5-svgrepo-com.svg',
    '/profilesvg/account-avatar-profile-user-6-svgrepo-com.svg',
    '/profilesvg/account-avatar-profile-user-7-svgrepo-com.svg',
    '/profilesvg/account-avatar-profile-user-10-svgrepo-com.svg',
    '/profilesvg/account-avatar-profile-user-11-svgrepo-com.svg',
    '/profilesvg/account-avatar-profile-user-12-svgrepo-com.svg',
    '/profilesvg/account-avatar-profile-user-13-svgrepo-com.svg',
    '/profilesvg/account-avatar-profile-user-14-svgrepo-com.svg',
    '/profilesvg/account-avatar-profile-user-16-svgrepo-com.svg',
  ];

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
      formData.append('profileImage', selectedFile); // Changed key to match server expectation if using multer
      const token = localStorage.getItem('token');
      // Note: File upload still needs the specific endpoint if it handles multipart/form-data
      // Assuming /api/user/upload-profile-image exists as seen in server.js
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/user/upload-profile-image`, {
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
      // Update context
      updateUser({ profileImage: data.profileImage });
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
  const [selectedSvg, setSelectedSvg] = useState('');

  const handleSelectSvg = async (svgPath) => {
    setSelectedSvg(svgPath);
    setPreviewUrl(svgPath);
    setSelectedFile(null);
    try {
      setUploading(true);
      setMessage({ type: '', text: '' });

      // Use updateUser from context which handles PATCH /api/me
      await updateUser({ profileImage: svgPath });

      setMessage({ type: 'success', text: 'Profile image updated successfully!' });
      setTimeout(() => {
        // No reload needed really, but keeping for consistency if desired
        // window.location.reload();
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
              background: 'linear-gradient(135deg, #ff3232, #cc2828)',
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
                  background: activeTab === tab ? 'rgba(0, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0)',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #00ffff' : '2px solid rgba(0, 0, 0, 0)',
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
                    { label: 'Total Wagered', value: `$${(user?.wagered || 0).toFixed(2)}`, icon: 'money' },
                    { label: 'Total Won', value: `$${(user?.totalWon || 0).toFixed(2)}`, icon: 'trophy' },
                    { label: 'Total Deposited', value: `$${(user?.totalDeposited || 0).toFixed(2)}`, icon: 'download' },
                    { label: 'Total Withdrawn', value: `$${(user?.totalWithdrawn || 0).toFixed(2)}`, icon: 'upload' }
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
                      <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                        {stat.icon === 'money' && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#22c55e" style={{ width: '28px', height: '28px' }}><path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" /><path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" /><path d="M2.25 18a.75.75 0 000 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 00-.75-.75H2.25z" /></svg>}
                        {stat.icon === 'trophy' && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f59e0b" style={{ width: '28px', height: '28px' }}><path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a.75.75 0 000 1.5h12.17a.75.75 0 000-1.5h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.707 6.707 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.22 49.22 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" /></svg>}
                        {stat.icon === 'download' && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" style={{ width: '28px', height: '28px' }}><path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>}
                        {stat.icon === 'upload' && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#a855f7" style={{ width: '28px', height: '28px' }}><path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>}
                      </div>
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
                        {presetAvatars.map((svg, idx) => (
                          <button
                            key={svg}
                            onClick={() => handleSelectSvg(svg)}
                            style={{
                              border: selectedSvg === svg ? '2px solid #00ffff' : '1px solid #333',
                              borderRadius: '8px',
                              padding: '8px',
                              background: selectedSvg === svg ? 'rgba(0,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                              cursor: 'pointer',
                              outline: 'none',
                              transition: 'all 0.2s',
                              width: 56,
                              height: 56,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title={svg}
                          >
                            <img src={svg} alt={svg} style={{ width: 40, height: 40, objectFit: 'contain' }} />
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
                      background: uploading || !selectedFile ? 'rgba(100, 100, 100, 0.3)' : 'linear-gradient(135deg, #ff3232, #cc2828)',
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
