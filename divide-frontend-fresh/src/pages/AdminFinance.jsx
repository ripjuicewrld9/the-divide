import React, { useEffect, useState } from 'react';
import { formatCurrency } from '../utils/format';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { API_BASE } from '../config';

export default function AdminFinance() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/admin/finance`, {
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!mounted) return;
        setData(json);
      } catch (err) {
        console.error('Failed to load admin finance', err);
        setError(err.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#fff' }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: '#ff6666' }}>Error: {error}</div>;

  const k = data.keno || {};
  const d = data.divides || {};
  const g = data.global || {};

  return (
    <div style={{ padding: 20, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Finance — Keno & Divides</h2>
        <div>
          <button onClick={() => navigate('/admin')} style={{ marginRight: 8 }}>Back</button>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      </div>

      <section style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#0b0b0b', padding: 16, borderRadius: 8 }}>
          <h3>Keno (money in / money out)</h3>
          <div>Total rounds: {k.rounds || 0}</div>
          <div>Money in (handle): ${formatCurrency(k.moneyIn || 0, 2)}</div>
          <div>Money out (player payouts): ${formatCurrency(k.moneyOut || 0, 2)}</div>
          <div>Net: ${formatCurrency(k.net || 0, 2)}</div>
        </div>

        <div style={{ background: '#0b0b0b', padding: 16, borderRadius: 8 }}>
          <h3>Divides (money in / money out)</h3>
          <div>Total rounds: {d.rounds || 0}</div>
          <div>Money in (handle/pots): ${formatCurrency(d.moneyIn || 0, 2)}</div>
          <div>Money out (paid to winners): ${formatCurrency(d.moneyOut || 0, 2)}</div>
          <div>Net: ${formatCurrency(d.net || 0, 2)}</div>
        </div>

        <div style={{ background: '#0b0b0b', padding: 16, borderRadius: 8 }}>
          <h3>Global pots</h3>
          <div>Jackpot amount: ${formatCurrency(g.jackpotAmount || 0, 2)}</div>
          <div>House total: ${formatCurrency(g.houseTotal || 0, 2)}</div>
          <div style={{ marginTop: 6, fontSize: '0.95em', color: '#ddd' }}>Keno Reserve: ${formatCurrency((typeof g.kenoReserve !== 'undefined' ? g.kenoReserve : g.houseTotal) || 0, 2)}</div>
        </div>

        <div style={{ background: '#0b0b0b', padding: 16, borderRadius: 8 }}>
          <h3>Token Wallets</h3>
          {Array.isArray(data.wallets) && data.wallets.length > 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {data.wallets.map((w) => (
                <div key={w.id} style={{ padding: 8, background: '#071218', borderRadius: 6 }}>
                  <div style={{ fontWeight: 700, color: '#e6fffa' }}>{w.id} <span style={{ fontSize: 12, color: '#9fb', marginLeft: 8 }}>({w.kind})</span></div>
                  <div style={{ fontSize: 13, color: '#cfe' }}>DC balance: {Number(w.dcBalance || 0).toLocaleString()} DC</div>
                  <div style={{ fontSize: 13, color: '#cfe' }}>USD balance: ${formatCurrency(Number(w.usdBalance || 0), 2)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#999' }}>No token wallets found.</div>
          )}
        </div>

        <div style={{ background: '#0b0b0b', padding: 16, borderRadius: 8 }}>
          <h3>Notes</h3>
          <ul>
            <li>Money In = handle (bets / pots). Money Out = payouts to players.</li>
            <li>Global pots (jackpot/house) are shown separately and are not double-counted here.</li>
            <li>Divides paidOut is persisted when a divide ends for accurate historical reporting.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
