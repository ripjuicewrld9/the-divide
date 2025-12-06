import React, { useEffect, useState, useRef, useContext } from 'react';
import { formatCurrency } from '../utils/format';
import { AuthContext } from '../context/AuthContext';

function chooseImage(divide, side) {
  // Accept a few common field names for backwards-compatibility with various payloads
  const candidates = side === 'left'
    ? ['leftImage', 'leftImageUrl', 'imageA', 'image_left', 'optionAImage']
    : ['rightImage', 'rightImageUrl', 'imageB', 'image_right', 'optionBImage'];
  for (const k of candidates) {
    if (divide[k]) return divide[k];
  }
  return null;
}

export default function WideDivideModal({ divide, onClose, onVote }) {
  const [seconds, setSeconds] = useState(() => {
    if (!divide || !divide.endTime) return 0;
    return Math.max(0, Math.floor((new Date(divide.endTime) - Date.now()) / 1000));
  });

  const modalRef = useRef(null);
  const firstVoteRef = useRef(null);
  const [leftBroken, setLeftBroken] = useState(false);
  const [rightBroken, setRightBroken] = useState(false);
  const [hoverSide, setHoverSide] = useState(null);
  const [editingSide, setEditingSide] = useState(null);
  const [betAmount, setBetAmount] = useState('1');
  const [userVotedSide, setUserVotedSide] = useState(() => {
    try { return localStorage.getItem(`divideVote:${divide?._id || divide?.id}`); } catch { return null; }
  });
  const { user } = useContext(AuthContext);
  const isAdmin = user && user.role === 'admin';
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editMessage, setEditMessage] = useState('');

  useEffect(() => {
    if (!divide || !divide.endTime) return;
    const update = () => setSeconds(Math.max(0, Math.floor((new Date(divide.endTime) - Date.now()) / 1000)));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [divide]);

  useEffect(() => {
    // Escape to close
    const onKey = (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKey);
    // focus the first vote button when modal opens
    const btn = firstVoteRef.current;
    if (btn && typeof btn.focus === 'function') btn.focus();
    // hide any literal 'Close' buttons inside the modal content (defensive)
    try {
      const el = modalRef.current;
      if (el) {
        const btns = Array.from(el.querySelectorAll('button'));
        btns.forEach((b) => {
          try {
            if ((b.innerText || '').trim().toLowerCase() === 'close') b.style.display = 'none';
          } catch (errInner) { console.error('hide btn error', errInner); }
        });
      }
    } catch (err) { console.error('modal hide-close-buttons error', err); }
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Simple focus trap: keep Tab cycling inside modal
  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return;
    const el = modalRef.current;
    if (!el) return;
    const focusable = Array.from(el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter((n) => !n.disabled && n.getAttribute('aria-hidden') !== 'true');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };

  const formatTime = (s) => {
    if (s <= 0) return '00:00';
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    const sec = (s % 60).toString().padStart(2, '0');
    const min = minutes.toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  // init editForm when entering edit mode
  useEffect(() => {
    if (editMode && divide) {
      setEditForm({
        title: divide.title || '',
        optionA: divide.optionA || '',
        optionB: divide.optionB || '',
        imageA: divide.imageA || '',
        imageB: divide.imageB || '',
        soundA: divide.soundA || '',
        soundB: divide.soundB || '',
        status: divide.status || 'active',
        endTime: divide.endTime ? new Date(divide.endTime).toISOString().slice(0,16) : ''
      });
      setEditMessage('');
    }
  }, [editMode, divide]);

  if (!divide) return null;

  const leftImg = chooseImage(divide, 'left');
  const rightImg = chooseImage(divide, 'right');

  const l = Number(divide.votesA || 0);
  const r = Number(divide.votesB || 0);
  const total = (l + r) || 1;
  const leftPct = Math.round((l / total) * 100);
  const rightPct = Math.round((r / total) * 100);

  const potDisplay = typeof divide.pot === 'number' ? formatCurrency(divide.pot, 2) : divide.pot;


  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((p) => ({ ...p, [name]: value }));
  };

  const saveEdit = async () => {
    if (!editForm) return;
    setEditMessage('Saving...');
    try {
      const token = localStorage.getItem('token');
      const payload = { ...editForm };
      // allow server to parse ISO datetime
      if (payload.endTime) payload.endTime = new Date(payload.endTime).toISOString();
      const res = await fetch(`/Divides/${encodeURIComponent(divide._id || divide.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      setEditMessage('Saved');
      setEditMode(false);
      // rely on socket/newDivide to update parent list; close or refresh will reflect changes
    } catch (err) {
      console.error('Save edit failed', err);
      setEditMessage('Failed: ' + (err.message || 'error'));
    }
  };

  return (
    <div className="modal screenOn" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 960, width: '95%', padding: 24 }}
        ref={modalRef}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${divide.title || ''}`}
      >
        {/* hide any legacy 'Close' buttons that might be injected into modal content */}
        <style>{`.modal-content .btn-close{display:none !important;}`}</style>
        <div className="win-card" style={{ background: 'linear-gradient(180deg,#07121a,#04202a)', padding: 18 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              {leftImg && !leftBroken ? (
                <img src={leftImg} alt="left option" onError={() => setLeftBroken(true)} style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>{leftBroken ? 'Image failed to load' : null}</div>
              )}
              <div style={{ marginTop: 8, fontWeight: 800, color: '#ffd966' }}>{divide.optionA}</div>
            </div>

            <div style={{ width: 220, textAlign: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#a6eaff' }}>{divide.title}</div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <div style={{ fontWeight: 800, color: divide.colors?.[0] || '#fff' }}>{divide.votesA}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>VS</div>
                    <div style={{ fontWeight: 800, color: divide.colors?.[1] || '#fff' }}>{divide.votesB}</div>
                  </div>
                </div>
                {isAdmin ? (
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-small" onClick={() => setEditMode((s) => !s)} style={{ marginRight: 8 }}>{editMode ? 'Close Edit' : 'Edit'}</button>
                  </div>
                ) : null}
            </div>

            <div style={{ flex: 1, textAlign: 'center' }}>
              {rightImg && !rightBroken ? (
                <img src={rightImg} alt="right option" onError={() => setRightBroken(true)} style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>{rightBroken ? 'Image failed to load' : null}</div>
              )}
              <div style={{ marginTop: 8, fontWeight: 800, color: '#b8ffda' }}>{divide.optionB}</div>
            </div>
          </div>

          {/* Live duet chart removed per UI simplification */}

          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', width: 220 }}>
                {editingSide === 'left' ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" min="0" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} style={{ flex: 1, padding: 8 }} />
                    <button className="btn btn-large" onClick={(e) => { e.stopPropagation(); const amt = Number(betAmount)||0; if (amt<=0) return alert('Enter positive amount'); onVote(divide._id || divide.id, 'A', amt); try { localStorage.setItem(`divideVote:${divide._id || divide.id}`, 'A'); setUserVotedSide('A'); } catch(e){console.debug(e);} setEditingSide(null); }}>✔</button>
                  </div>
                ) : (
                  <button
                    ref={firstVoteRef}
                    className="btn btn-large"
                    style={{ width: '100%' }}
                    onMouseEnter={() => setHoverSide('left')}
                    onMouseLeave={() => setHoverSide(null)}
                    onClick={(e) => { e.stopPropagation(); if (userVotedSide && userVotedSide === 'B') { alert('You have already shorted the other side.'); return; } setEditingSide('left'); }}
                  >{(hoverSide === 'left' && divide.status !== 'active') ? `${leftPct}%` : divide.optionA}</button>
                )}
              </div>

            <div style={{ width: 360, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{divide.title}</div>
              <div style={{ marginTop: 8 }}>
                <div className={`timer ${seconds <= 30 ? 'timer-red' : ''}`} style={{ marginBottom: 6 }}>{formatTime(seconds)}</div>
                <div className="pot">Pot: ${potDisplay}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', width: 220 }}>
              {editingSide === 'right' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" min="0" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} style={{ flex: 1, padding: 8 }} />
                  <button className="btn btn-large" onClick={(e) => { e.stopPropagation(); const amt = Number(betAmount)||0; if (amt<=0) return alert('Enter positive amount'); onVote(divide._id || divide.id, 'B', amt); try { localStorage.setItem(`divideVote:${divide._id || divide.id}`, 'B'); setUserVotedSide('B'); } catch(e){console.debug(e);} setEditingSide(null); }}>✔</button>
                </div>
              ) : (
                <button
                  className="btn btn-large"
                  style={{ width: '100%' }}
                  onMouseEnter={() => setHoverSide('right')}
                  onMouseLeave={() => setHoverSide(null)}
                  onClick={(e) => { e.stopPropagation(); if (userVotedSide && userVotedSide === 'A') { alert('You have already shorted the other side.'); return; } setEditingSide('right'); }}
                >{(hoverSide === 'right' && divide.status !== 'active') ? `${rightPct}%` : divide.optionB}</button>
              )}
            </div>
          </div>
          {editMode && editForm ? (
            <div style={{ marginTop: 12, background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <input name="title" value={editForm.title} onChange={handleEditChange} style={{ padding: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input name="optionA" value={editForm.optionA} onChange={handleEditChange} style={{ flex: 1, padding: 8 }} />
                  <input name="optionB" value={editForm.optionB} onChange={handleEditChange} style={{ flex: 1, padding: 8 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input name="imageA" value={editForm.imageA} onChange={handleEditChange} placeholder="imageA" style={{ flex: 1, padding: 8 }} />
                  <input name="imageB" value={editForm.imageB} onChange={handleEditChange} placeholder="imageB" style={{ flex: 1, padding: 8 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input name="soundA" value={editForm.soundA} onChange={handleEditChange} placeholder="soundA" style={{ flex: 1, padding: 8 }} />
                  <input name="soundB" value={editForm.soundB} onChange={handleEditChange} placeholder="soundB" style={{ flex: 1, padding: 8 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input name="endTime" type="datetime-local" value={editForm.endTime} onChange={handleEditChange} style={{ flex: 1, padding: 8 }} />
                  <select name="status" value={editForm.status} onChange={handleEditChange} style={{ padding: 8 }}>
                    <option value="active">active</option>
                    <option value="ended">ended</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-small" onClick={saveEdit} style={{ background: '#0ff', padding: 8 }}>Save</button>
                  <button className="btn btn-small" onClick={() => setEditMode(false)} style={{ background: '#666', padding: 8 }}>Cancel</button>
                </div>
                <div style={{ color: '#9fd' }}>{editMessage}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
