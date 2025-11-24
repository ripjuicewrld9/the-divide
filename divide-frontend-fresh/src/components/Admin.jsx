import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';

export default function Admin({ onClose } = {}) {
  const { user } = useContext(AuthContext);
  const [divides, setDivides] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [form, setForm] = useState({
    title: "",
    optionA: "",
    optionB: "",
    imageA: "",
    imageB: "",
    // default to 10 minutes to avoid accidental multi-day defaults
    durationValue: 10,
    durationUnit: "minutes",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  // gunShots removed — we no longer provide per-game server-side gunshot audio

  const resolveUrl = (p) => {
    if (!p) return null;
    if (p.startsWith('http')) return p;
    return `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
  };

  // 🔹 Fetch existing divides
  useEffect(() => {
    fetch(`${API_BASE}/Divides`)
      .then((res) => res.json())
      .then((data) => setDivides(data))
      .catch((err) => console.error("Error fetching divides:", err));
    // gun-shots feature retired; no server call here
  }, []);

  // 🔹 Handle form input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSearch = async () => {
    setMessage('');
    if (!searchQuery || searchQuery.trim().length === 0) return setMessage('Enter search text');
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/api/image-search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      setSearchResults(data.items || []);
    } catch (err) {
      console.error('Image search failed', err);
      setMessage('Image search failed: ' + (err.message || 'Unknown'));
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleUseImage = (url, target) => {
    if (!url) return;
    setForm((prev) => ({ ...prev, [target]: url }));
    setMessage(`Set ${target} to selected image`);
  };

  // 🔹 Delete divide (admin)
  const handleDelete = async (divideId) => {
    if (!window.confirm('Delete this divide? This cannot be undone.')) return;
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) { setMessage('Not authenticated'); return; }
      const res = await fetch(`${API_BASE}/Divides/${divideId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      // parse response safely (some errors may return HTML from server)
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }
      if (!res.ok) throw new Error(data.error || data.raw || 'Delete failed');
      setDivides((prev) => prev.filter(d => d._id !== divideId && d.id !== divideId));
      setMessage('✅ Divide deleted');
    } catch (err) {
      console.error('Delete error', err);
      setMessage('❌ ' + err.message);
    }
  };

  // Recreate an ended divide (admin-only): duplicate it with a new id and fresh endTime
  const handleRecreate = async (divideId) => {
    if (!window.confirm('Recreate this divide? This will create a new divide with a new id.')) return;
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) { setMessage('Not authenticated'); return; }
      const res = await fetch(`${API_BASE}/Divides/${encodeURIComponent(divideId)}/recreate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const contentType = res.headers.get('content-type') || '';
      let parsed;
      try {
        if (contentType.includes('application/json')) parsed = await res.json();
        else parsed = await res.text();
      } catch (err) {
        parsed = null;
      }

      if (!res.ok) {
        const msg = parsed && typeof parsed === 'object' ? (parsed.error || JSON.stringify(parsed)) : parsed || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      // If server returned HTML/text instead of JSON, surface it and don't try to insert into list
      if (!contentType.includes('application/json')) {
        setMessage('✅ Divide recreated (server returned non-JSON response). Refresh divides to see it.');
        return;
      }

      // prepend new divide to local list
      setDivides((prev) => [parsed, ...prev]);
      setMessage('✅ Divide recreated');
    } catch (err) {
      console.error('Recreate error', err);
      setMessage('❌ ' + (err.message || 'Failed to recreate'));
    }
  };

  const handleEditClick = (d) => {
    setEditId(d._id || d.id);
    setEditForm({
      title: d.title || '',
      optionA: d.optionA || '',
      optionB: d.optionB || '',
      imageA: d.imageA || '',
      imageB: d.imageB || '',
      soundA: d.soundA || '',
      soundB: d.soundB || '',
      status: d.status || 'active',
      endTime: d.endTime || ''
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((p) => ({ ...p, [name]: value }));
  };

  const handleCancelEdit = () => { setEditId(null); setEditForm(null); };

  const handleSaveEdit = async (id) => {
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) { setMessage('Not authenticated'); return; }
      const res = await fetch(`${API_BASE}/Divides/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      setDivides((prev) => prev.map(d => (d._id === data._id || d.id === data._id || d.id === data.id ? { ...d, ...data } : d)));
      setMessage('✅ Saved');
      handleCancelEdit();
    } catch (err) {
      console.error('Save edit failed', err);
      setMessage('❌ ' + (err.message || 'Save failed'));
    }
  };

  // 🔹 Submit new divide to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("You must be logged in as admin to create divides.");
        setLoading(false);
        return;
      }

      // ensure durationValue is sent as a number and validate
      const payload = { ...form, durationValue: Number(form.durationValue || 0) };
      if (isNaN(payload.durationValue) || payload.durationValue <= 0) {
        setMessage('Invalid duration value');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/Divides`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create divide");

      setDivides((prev) => [...prev, data]);
      setMessage("✅ Divide created successfully!");
      setForm({
        title: "",
        optionA: "",
        optionB: "",
        imageA: "",
        imageB: "",
        durationValue: 1,
        durationUnit: "days",
      });
    } catch (err) {
      console.error(err);
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container" style={{ padding: "2rem", color: "#fff" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Admin Panel</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/admin/finance" style={{ color: '#0ff', textDecoration: 'none', marginRight: 8 }}>Finance</Link>
          <Link to="/admin/ledger" style={{ color: '#0ff', textDecoration: 'none', marginRight: 8 }}>Ledger</Link>
          <Link to="/admin/items" style={{ color: '#0ff', textDecoration: 'none', marginRight: 8 }}>Items</Link>
          <Link to="/admin/cases" style={{ color: '#0ff', textDecoration: 'none', marginRight: 8 }}>Cases</Link>
            <button onClick={async () => {
              if (!window.confirm('Force-restart the Rugged market now?')) return;
              setMessage('');
              try {
                const token = localStorage.getItem('token');
                if (!token) { setMessage('Not authenticated'); return; }
                const res = await fetch(`${resolveUrl('/admin/rugged/restart')}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                const txt = await res.text();
                if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
                setMessage('✅ Rugged market restarted');
              } catch (err) { console.error('Restart rugged failed', err); setMessage('❌ ' + (err.message || 'Failed')); }
            }} style={{ background: '#222', color:'#0ff', border: '1px solid rgba(0,255,255,0.06)', padding: '6px 10px', borderRadius: 6 }}>Force Rugged Restart</button>
          {onClose ? (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
          ) : null}
        </div>
      </div>

      {!user && (
        <p style={{ color: "#ff4444" }}>You must be logged in to use this page.</p>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "1rem",
          maxWidth: "500px",
          background: "#111",
          padding: "1.5rem",
          borderRadius: "0.75rem",
          boxShadow: "0 0 15px #0ff4",
        }}
      >
        <input
          type="text"
          name="title"
          placeholder="Divide Title"
          value={form.title}
          onChange={handleChange}
          required
          style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "none" }}
        />
        <input
          type="text"
          name="optionA"
          placeholder="Option A"
          value={form.optionA}
          onChange={handleChange}
          required
          style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "none" }}
        />
        <input
          type="text"
          name="optionB"
          placeholder="Option B"
          value={form.optionB}
          onChange={handleChange}
          required
          style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "none" }}
        />
        <input
          type="text"
          name="imageA"
          placeholder="Image URL A (optional)"
          value={form.imageA}
          onChange={handleChange}
          style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "none" }}
        />
        <input
          type="text"
          name="imageB"
          placeholder="Image URL B (optional)"
          value={form.imageB}
          onChange={handleChange}
          style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "none" }}
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="text" name="soundA" placeholder="Sound A (optional)" value={form.soundA || ''} onChange={handleChange} style={{ padding: '0.6rem', borderRadius: '0.5rem', border: 'none', flex: 1 }} />
          <input type="text" name="soundB" placeholder="Sound B (optional)" value={form.soundB || ''} onChange={handleChange} style={{ padding: '0.6rem', borderRadius: '0.5rem', border: 'none', flex: 1 }} />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search images (Google)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.6rem', borderRadius: '0.5rem', border: 'none', flex: 1 }}
          />
          <button type="button" onClick={handleImageSearch} disabled={searching} style={{ padding: '0.6rem', borderRadius: '0.5rem', border: 'none', background: '#0ff', cursor: 'pointer' }}>{searching ? 'Searching...' : 'Search'}</button>
        </div>

        {searchResults && searchResults.length > 0 && (
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: 8 }}>
            {searchResults.map((it, idx) => (
              <div key={idx} style={{ background: '#081018', padding: 6, borderRadius: 6, textAlign: 'center' }}>
                <a href={it.contextLink || it.link} target="_blank" rel="noreferrer">
                  <img src={it.thumbnail || it.link} alt={it.title || ''} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4 }} />
                </a>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button type="button" onClick={() => handleUseImage(it.link, 'imageA')} style={{ background: '#00cc66', color: '#002029', border: 'none', padding: '0.3rem 0.4rem', borderRadius: '0.35rem', cursor: 'pointer', fontWeight: 700 }}>Use as A</button>
                  <button type="button" onClick={() => handleUseImage(it.link, 'imageB')} style={{ background: '#ffcc00', color: '#002029', border: 'none', padding: '0.3rem 0.4rem', borderRadius: '0.35rem', cursor: 'pointer', fontWeight: 700 }}>Use as B</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* server-side gun-shots removed */}

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="number"
            name="durationValue"
            value={form.durationValue}
            onChange={handleChange}
            min="1"
            style={{
              width: "100px",
              padding: "0.6rem",
              borderRadius: "0.5rem",
              border: "none",
            }}
          />
          <select
            name="durationUnit"
            value={form.durationUnit}
            onChange={handleChange}
            style={{
              flex: 1,
              padding: "0.6rem",
              borderRadius: "0.5rem",
              border: "none",
            }}
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? "#444" : "#0ff",
            color: "#000",
            fontWeight: "bold",
            padding: "0.8rem",
            borderRadius: "0.75rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          {loading ? "Creating..." : "Create Divide"}
        </button>

        {message && <p style={{ color: "#0ff", marginTop: "0.5rem" }}>{message}</p>}
      </form>

      <div style={{ marginTop: "2rem" }}>
        <h2>Existing Divides</h2>
        {divides.length === 0 ? (
          <p>No divides yet.</p>
        ) : (
          <ul style={{ marginTop: "1rem" }}>
            {divides.map((d) => (
                  <li key={d._id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{d.title}</strong> — {d.optionA} vs {d.optionB}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleRecreate(d.id || d._id)}
                        style={{ background: '#00cc66', color: '#002029', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 700 }}
                      >Recreate</button>
                      <button
                        onClick={() => handleEditClick(d)}
                        style={{ background: '#66ccff', color: '#002029', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', cursor: 'pointer' }}
                      >Edit</button>
                      <button
                        onClick={() => handleDelete(d.id || d._id)}
                        style={{ background: '#ff4444', color: '#fff', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', cursor: 'pointer' }}
                      >Delete</button>
                    </div>
                  </li>
                ))}
          </ul>
        )}
      </div>

      {editId && editForm && (
        <div style={{ marginTop: 12, background: '#081018', padding: 12, borderRadius: 8 }}>
          <h3>Edit Divide</h3>
          <div style={{ display: 'grid', gap: 8, maxWidth: 640 }}>
            <input name="title" value={editForm.title} onChange={handleEditChange} placeholder="Title" style={{ padding: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input name="optionA" value={editForm.optionA} onChange={handleEditChange} placeholder="Option A" style={{ flex: 1, padding: 8 }} />
              <input name="optionB" value={editForm.optionB} onChange={handleEditChange} placeholder="Option B" style={{ flex: 1, padding: 8 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input name="imageA" value={editForm.imageA} onChange={handleEditChange} placeholder="Image A URL" style={{ flex: 1, padding: 8 }} />
              <input name="imageB" value={editForm.imageB} onChange={handleEditChange} placeholder="Image B URL" style={{ flex: 1, padding: 8 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input name="soundA" value={editForm.soundA} onChange={handleEditChange} placeholder="Sound A (path)" style={{ flex: 1, padding: 8 }} />
              <input name="soundB" value={editForm.soundB} onChange={handleEditChange} placeholder="Sound B (path)" style={{ flex: 1, padding: 8 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleSaveEdit(editId)} style={{ background: '#0ff', padding: 8, border: 'none', borderRadius: 6 }}>Save</button>
              <button onClick={handleCancelEdit} style={{ background: '#666', padding: 8, border: 'none', borderRadius: 6 }}>Cancel</button>
            </div>
            <div style={{ fontSize: 13, color: '#9fd' }}>{message}</div>
          </div>
        </div>
      )}
    </div>
  );
}
