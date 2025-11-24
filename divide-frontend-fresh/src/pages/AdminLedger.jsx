import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { API_BASE } from '../config';

function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.join(',') + '\n';
  const lines = rows.map(r => keys.map(k => {
    const v = r[k] === null || r[k] === undefined ? '' : r[k];
    if (typeof v === 'object') return '"' + JSON.stringify(v).replace(/"/g, '""') + '"';
    return '"' + String(v).replace(/"/g, '""') + '"';
  }).join(','));
  return header + lines.join('\n');
}

export default function AdminLedger() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ type: '', userId: '', from: '', to: '' });
  const [error, setError] = useState('');

  const fetchPage = async (p = page, l = limit, f = filters) => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      q.set('page', p);
      q.set('limit', l);
      if (f.type) q.set('type', f.type);
      if (f.userId) q.set('userId', f.userId);
      if (f.from) q.set('from', f.from);
      if (f.to) q.set('to', f.to);
      const res = await api.get('/admin/ledger?' + q.toString());
      setItems(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setLimit(res.limit || l);
    } catch (err) {
      console.error('Failed to load ledger', err);
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPage(1, limit, filters); }, []);

  const onSearch = () => { fetchPage(1, limit, filters); };
  const onExport = () => {
    const csv = toCSV(items.map(i => ({
      createdAt: i.createdAt,
      type: i.type,
      amount: i.amount,
      userId: i.userId || '',
      divideId: i.divideId || '',
      roundId: i.roundId || '',
      meta: i.meta || {}
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_page_${page}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 20, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Ledger — Admin</h2>
        <div>
          <button onClick={() => window.location.href = '/admin'} style={{ marginRight: 8 }}>Back</button>
          <button onClick={() => fetchPage(1, limit, filters)} style={{ marginRight: 8 }}>Refresh</button>
          <button onClick={onExport}>Export CSV (page)</button>
        </div>
      </div>

      <div style={{ marginTop: 12, background: '#0b0b0b', padding: 12, borderRadius: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="type (e.g. keno_bet)" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} />
          <input placeholder="userId (optional)" value={filters.userId} onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))} />
          <input type="date" placeholder="from" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          <input type="date" placeholder="to" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          <button onClick={onSearch}>Search</button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading ? <div>Loading...</div> : (
          <>
            <div style={{ marginBottom: 8 }}>Showing {items.length} of {total} rows (page {page})</div>
            <div style={{ overflowX: 'auto', background: '#060606', padding: 8, borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #222' }}>
                    <th style={{ padding: 6 }}>Date</th>
                    <th style={{ padding: 6 }}>Type</th>
                    <th style={{ padding: 6 }}>Amount</th>
                    <th style={{ padding: 6 }}>User</th>
                    <th style={{ padding: 6 }}>Divide</th>
                    <th style={{ padding: 6 }}>Round</th>
                    <th style={{ padding: 6 }}>Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r._id} style={{ borderBottom: '1px solid #111' }}>
                      <td style={{ padding: 6 }}>{new Date(r.createdAt).toLocaleString()}</td>
                      <td style={{ padding: 6 }}>{r.type}</td>
                      <td style={{ padding: 6 }}>{r.amount}</td>
                      <td style={{ padding: 6 }}>{r.userId || ''}</td>
                      <td style={{ padding: 6 }}>{r.divideId || ''}</td>
                      <td style={{ padding: 6 }}>{r.roundId || ''}</td>
                      <td style={{ padding: 6 }}><pre style={{ margin: 0 }}>{JSON.stringify(r.meta || {})}</pre></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button disabled={page <= 1} onClick={() => fetchPage(page - 1, limit, filters)}>Prev</button>
              <button disabled={(page * limit) >= total} onClick={() => fetchPage(page + 1, limit, filters)}>Next</button>
            </div>
          </>
        )}
        {error && <div style={{ color: '#ff6666' }}>{error}</div>}
      </div>
    </div>
  );
}
