import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000');

export default function SecuritySettings({ isOpen, onClose }) {

  const [activeTab, setActiveTab] = useState('password');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [twoFactorMessage, setTwoFactorMessage] = useState({ type: '', text: '' });
  const [settingUp2FA, setSettingUp2FA] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disable2FACode, setDisable2FACode] = useState('');

  useEffect(() => {
    if (isOpen) {
      check2FAStatus();
    }
  }, [isOpen]);

  const check2FAStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/security/2fa/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTwoFactorEnabled(data.enabled);
    } catch (err) {
      console.error('Failed to check 2FA status:', err);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setChangingPassword(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/security/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.message });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSetup2FA = async () => {
    setTwoFactorMessage({ type: '', text: '' });
    setSettingUp2FA(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/security/2fa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to setup 2FA');
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setTwoFactorMessage({ type: 'info', text: 'Scan the QR code with your authenticator app' });
    } catch (err) {
      setTwoFactorMessage({ type: 'error', text: err.message });
    } finally {
      setSettingUp2FA(false);
    }
  };

  const handleEnable2FA = async (e) => {
    e.preventDefault();
    setTwoFactorMessage({ type: '', text: '' });

    if (!verificationCode || verificationCode.length !== 6) {
      setTwoFactorMessage({ type: 'error', text: 'Please enter a 6-digit code' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/security/2fa/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token: verificationCode })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to enable 2FA');
      }

      setBackupCodes(data.backupCodes);
      setTwoFactorEnabled(true);
      setTwoFactorMessage({ type: 'success', text: '2FA enabled! Save your backup codes in a safe place.' });
      setQrCode('');
      setSecret('');
      setVerificationCode('');
    } catch (err) {
      setTwoFactorMessage({ type: 'error', text: err.message });
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setTwoFactorMessage({ type: '', text: '' });

    if (!disablePassword) {
      setTwoFactorMessage({ type: 'error', text: 'Password required' });
      return;
    }

    setDisabling2FA(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/security/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: disablePassword, token: disable2FACode })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      setTwoFactorEnabled(false);
      setTwoFactorMessage({ type: 'success', text: '2FA disabled successfully' });
      setDisablePassword('');
      setDisable2FACode('');
      setBackupCodes([]);
    } catch (err) {
      setTwoFactorMessage({ type: 'error', text: err.message });
    } finally {
      setDisabling2FA(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(0, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 255, 255, 0.15)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#fff' }}>
            🔒 Security Settings
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
              fontSize: '18px'
            }}
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
          <button
            onClick={() => setActiveTab('password')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'password' ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'password' ? '2px solid #00ffff' : '2px solid transparent',
              color: activeTab === 'password' ? '#00ffff' : '#9ca3af',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Change Password
          </button>
          <button
            onClick={() => setActiveTab('2fa')}
            style={{
              padding: '12px 24px',
              background: activeTab === '2fa' ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === '2fa' ? '2px solid #00ffff' : '2px solid transparent',
              color: activeTab === '2fa' ? '#00ffff' : '#9ca3af',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Two-Factor Auth
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1
        }}>
          {activeTab === 'password' && (
            <div>
              <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '14px' }}>
                Change your account password. Make sure it's at least 6 characters long.
              </p>

              <form onSubmit={handleChangePassword}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {passwordMessage.text && (
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    background: passwordMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${passwordMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: passwordMessage.type === 'success' ? '#10b981' : '#ef4444',
                    fontSize: '14px'
                  }}>
                    {passwordMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={changingPassword}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: changingPassword ? 'rgba(100, 100, 100, 0.3)' : 'linear-gradient(135deg, #00ffff, #00ccff)',
                    border: 'none',
                    borderRadius: '8px',
                    color: changingPassword ? '#666' : '#000',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: changingPassword ? 'not-allowed' : 'pointer'
                  }}
                >
                  {changingPassword ? 'Changing Password...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}

          {activeTab === '2fa' && (
            <div>
              {!twoFactorEnabled && !qrCode && (
                <div>
                  <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '14px' }}>
                    Two-factor authentication adds an extra layer of security to your account. You'll need to enter a code from your authenticator app when logging in.
                  </p>

                  <button
                    onClick={handleSetup2FA}
                    disabled={settingUp2FA}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: settingUp2FA ? 'rgba(100, 100, 100, 0.3)' : 'linear-gradient(135deg, #00ffff, #00ccff)',
                      border: 'none',
                      borderRadius: '8px',
                      color: settingUp2FA ? '#666' : '#000',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: settingUp2FA ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {settingUp2FA ? 'Setting up...' : 'Enable Two-Factor Authentication'}
                  </button>
                </div>
              )}

              {qrCode && !twoFactorEnabled && (
                <div>
                  <p style={{ color: '#9ca3af', marginBottom: '16px', fontSize: '14px' }}>
                    1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>

                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <img src={qrCode} alt="2FA QR Code" style={{ maxWidth: '250px', borderRadius: '8px' }} />
                  </div>

                  <div style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    marginBottom: '24px'
                  }}>
                    <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>
                      Or enter this code manually:
                    </p>
                    <code style={{
                      display: 'block',
                      color: '#00ffff',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all'
                    }}>
                      {secret}
                    </code>
                  </div>

                  <p style={{ color: '#9ca3af', marginBottom: '16px', fontSize: '14px' }}>
                    2. Enter the 6-digit code from your app to verify:
                  </p>

                  <form onSubmit={handleEnable2FA}>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      required
                      maxLength={6}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '18px',
                        textAlign: 'center',
                        letterSpacing: '8px',
                        fontFamily: 'monospace',
                        outline: 'none',
                        marginBottom: '16px'
                      }}
                    />

                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'linear-gradient(135deg, #00ffff, #00ccff)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Verify and Enable
                    </button>
                  </form>
                </div>
              )}

              {twoFactorEnabled && (
                <div>
                  <div style={{
                    padding: '16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '24px'
                  }}>
                    <p style={{ color: '#10b981', margin: 0, fontSize: '14px' }}>
                      ✅ Two-factor authentication is enabled
                    </p>
                  </div>

                  {backupCodes.length > 0 && (
                    <div style={{
                      padding: '16px',
                      background: 'rgba(255, 193, 7, 0.1)',
                      border: '1px solid rgba(255, 193, 7, 0.3)',
                      borderRadius: '8px',
                      marginBottom: '24px'
                    }}>
                      <p style={{ color: '#ffc107', marginBottom: '12px', fontWeight: 600 }}>
                        ⚠️ Save Your Backup Codes
                      </p>
                      <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '12px' }}>
                        These codes can be used to access your account if you lose your device. Save them in a safe place. You won't be able to see them again.
                      </p>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        fontFamily: 'monospace',
                        fontSize: '14px'
                      }}>
                        {backupCodes.map((code, i) => (
                          <div key={i} style={{
                            padding: '8px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '4px',
                            color: '#00ffff',
                            textAlign: 'center'
                          }}>
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p style={{ color: '#9ca3af', marginBottom: '16px', fontSize: '14px' }}>
                    To disable two-factor authentication, enter your password and a 2FA code:
                  </p>

                  <form onSubmit={handleDisable2FA}>
                    <div style={{ marginBottom: '16px' }}>
                      <input
                        type="password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        placeholder="Your password"
                        required
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <input
                        type="text"
                        value={disable2FACode}
                        onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit code"
                        maxLength={6}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '18px',
                          textAlign: 'center',
                          letterSpacing: '8px',
                          fontFamily: 'monospace',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={disabling2FA}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: disabling2FA ? 'rgba(100, 100, 100, 0.3)' : 'rgba(239, 68, 68, 0.8)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: disabling2FA ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {disabling2FA ? 'Disabling...' : 'Disable Two-Factor Auth'}
                    </button>
                  </form>
                </div>
              )}

              {twoFactorMessage.text && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  marginTop: '16px',
                  background: twoFactorMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
                              twoFactorMessage.type === 'info' ? 'rgba(59, 130, 246, 0.1)' :
                              'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${twoFactorMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 
                                       twoFactorMessage.type === 'info' ? 'rgba(59, 130, 246, 0.3)' :
                                       'rgba(239, 68, 68, 0.3)'}`,
                  color: twoFactorMessage.type === 'success' ? '#10b981' : 
                         twoFactorMessage.type === 'info' ? '#3b82f6' :
                         '#ef4444',
                  fontSize: '14px'
                }}>
                  {twoFactorMessage.text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


