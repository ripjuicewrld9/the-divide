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

  if (loading) return <div className="p-8 text-white">Loading...</div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!data) return <div className="p-8 text-white">No data available</div>;

  const { global } = data;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold" style={{ 
            background: 'linear-gradient(90deg, #ff1744 0%, #2979ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Admin Finance
          </h2>
          <p className="text-gray-400 mt-1">Revenue & Treasury Tracking</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 rounded-lg bg-[#111] border border-[#1a1a1a] hover:bg-[#161616] transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg font-bold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)' }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Live Treasury - Hero Card */}
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-[#2979ff]/30 rounded-2xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#2979ff]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#ff1744]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🏦</span>
            <h3 className="text-gray-300 font-medium text-lg">Live Treasury</h3>
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-full animate-pulse">LIVE</span>
          </div>
          <div className="text-5xl font-black mb-2" style={{ 
            background: 'linear-gradient(90deg, #4ade80 0%, #22d3ee 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            ${formatCurrency(global.treasury || 0, 2)}
          </div>
          <p className="text-gray-500 text-sm">
            Total money on platform (Deposits - Withdrawals)
          </p>
          <div className="mt-4 flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">Total Deposited:</span>
              <span className="text-green-400 font-bold ml-2">${formatCurrency(global.totalDeposited || 0, 2)}</span>
            </div>
            <div>
              <span className="text-gray-500">Total Withdrawn:</span>
              <span className="text-red-400 font-bold ml-2">${formatCurrency(global.totalWithdrawn || 0, 2)}</span>
            </div>
            <div>
              <span className="text-gray-500">User Balances:</span>
              <span className="text-blue-400 font-bold ml-2">${formatCurrency(global.totalUserBalances || 0, 2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <h3 className="text-xl font-bold text-white mb-4">💰 House Revenue Breakdown</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total House Revenue */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-4xl">🏠</span>
          </div>
          <h4 className="text-gray-400 font-medium text-sm mb-1">Total House Revenue</h4>
          <div className="text-3xl font-bold text-emerald-400">
            ${formatCurrency(global.houseTotal || 0, 2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">All-time earnings</div>
        </div>

        {/* Pot Fees (2.5%) */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-4xl">🎯</span>
          </div>
          <h4 className="text-gray-400 font-medium text-sm mb-1">Pot Fees (2.5%)</h4>
          <div className="text-3xl font-bold text-blue-400">
            ${formatCurrency(global.potFees || 0, 2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">From Divide pots</div>
        </div>

        {/* Creator Pool Kept */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-4xl">👤</span>
          </div>
          <h4 className="text-gray-400 font-medium text-sm mb-1">Creator Pool Kept</h4>
          <div className="text-3xl font-bold text-purple-400">
            ${formatCurrency(global.creatorPoolKept || 0, 2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Unclaimed from 0.5%</div>
        </div>

        {/* Withdrawal Fees */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-4xl">💸</span>
          </div>
          <h4 className="text-gray-400 font-medium text-sm mb-1">Withdrawal Fees</h4>
          <div className="text-3xl font-bold text-orange-400">
            ${formatCurrency(global.withdrawalFees || 0, 2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Tiered fee revenue</div>
        </div>
      </div>

      {/* Player Transactions */}
      <h3 className="text-xl font-bold text-white mb-4">📊 Player Transactions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-4xl">💳</span>
          </div>
          <h4 className="text-gray-400 font-medium text-sm mb-1">Total Deposits</h4>
          <div className="text-3xl font-bold text-green-400">
            ${formatCurrency(global.totalDeposited || 0, 2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">GC purchases by players</div>
        </div>

        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-4xl">🏧</span>
          </div>
          <h4 className="text-gray-400 font-medium text-sm mb-1">Total Withdrawals</h4>
          <div className="text-3xl font-bold text-red-400">
            ${formatCurrency(global.totalRedemptionAmount || 0, 2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">{global.totalRedemptions || 0} redemptions</div>
        </div>

        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-4xl">👥</span>
          </div>
          <h4 className="text-gray-400 font-medium text-sm mb-1">Total User Balances</h4>
          <div className="text-3xl font-bold text-cyan-400">
            ${formatCurrency(global.totalUserBalances || 0, 2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Sum of all balances</div>
        </div>
      </div>

      {/* Economics Breakdown */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6">
        <h3 className="font-bold text-gray-300 mb-4">📈 Economics Structure</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-bold text-white mb-2">Divide Pot Split</h4>
            <ul className="text-sm text-gray-500 space-y-1">
              <li className="flex justify-between"><span>Winners (minority)</span><span className="text-emerald-400 font-bold">97%</span></li>
              <li className="flex justify-between"><span>House fee</span><span className="text-blue-400 font-bold">2.5%</span></li>
              <li className="flex justify-between"><span>Creator pool</span><span className="text-purple-400 font-bold">0.5%</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-2">Withdrawal Fees</h4>
            <ul className="text-sm text-gray-500 space-y-1">
              <li className="flex justify-between"><span>Under $1,000</span><span className="text-orange-400 font-bold">2%</span></li>
              <li className="flex justify-between"><span>$1k - $10k</span><span className="text-orange-400 font-bold">1.5%</span></li>
              <li className="flex justify-between"><span>$10k - $50k</span><span className="text-orange-400 font-bold">1%</span></li>
              <li className="flex justify-between"><span>$50k - $250k</span><span className="text-orange-400 font-bold">0.5%</span></li>
              <li className="flex justify-between"><span>$250k+</span><span className="text-green-400 font-bold">FREE</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
