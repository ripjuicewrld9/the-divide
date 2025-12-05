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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-blue-400"><path d="M11.584 2.376a.75.75 0 01.832 0l9 6a.75.75 0 01-.832 1.248L12 3.901 3.416 9.624a.75.75 0 01-.832-1.248l9-6z" /><path fillRule="evenodd" d="M20.25 10.332v9.918H21a.75.75 0 010 1.5H3a.75.75 0 010-1.5h.75v-9.918a.75.75 0 01.634-.74A49.109 49.109 0 0112 9c2.59 0 5.134.202 7.616.592a.75.75 0 01.634.74zm-7.5 2.418a.75.75 0 00-1.5 0v6.75a.75.75 0 001.5 0v-6.75zm3-.75a.75.75 0 01.75.75v6.75a.75.75 0 01-1.5 0v-6.75a.75.75 0 01.75-.75zM9 12.75a.75.75 0 00-1.5 0v6.75a.75.75 0 001.5 0v-6.75z" clipRule="evenodd" /></svg>
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
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-400"><path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" /><path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" /></svg>
        House Revenue Breakdown
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total House Revenue */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10"><path d="M19.006 3.705a.75.75 0 00-.512-1.41L6 6.838V3a.75.75 0 00-.75-.75h-1.5A.75.75 0 003 3v4.93l-1.006.365a.75.75 0 00.512 1.41l16.5-6z" /><path fillRule="evenodd" d="M3.019 11.115L18 5.667V9.09l4.006 1.456a.75.75 0 11-.512 1.41l-.494-.18v8.474h.75a.75.75 0 010 1.5H2.25a.75.75 0 010-1.5H3v-9.129l.019-.006zM18 20.25v-9.565l1.5.545v9.02H18zm-9-6a.75.75 0 00-.75.75v4.5c0 .414.336.75.75.75h3a.75.75 0 00.75-.75V15a.75.75 0 00-.75-.75H9z" clipRule="evenodd" /></svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" /></svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10"><path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" /><path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" /><path d="M2.25 18a.75.75 0 000 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 00-.75-.75H2.25z" /></svg>
          </div>
          <h4 className="text-gray-400 font-medium text-sm mb-1">Withdrawal Fees</h4>
          <div className="text-3xl font-bold text-orange-400">
            ${formatCurrency(global.withdrawalFees || 0, 2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Tiered fee revenue</div>
        </div>
      </div>

      {/* Player Transactions */}
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-400"><path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" /></svg>
        Player Transactions
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10"><path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" /><path fillRule="evenodd" d="M1.5 9.75v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5H1.5zM6 12a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75A.75.75 0 016 12zm3 0a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6A.75.75 0 019 12z" clipRule="evenodd" /></svg>
          </div>
          <h4 className="text-gray-400 font-medium text-sm mb-1">Total Deposits</h4>
          <div className="text-3xl font-bold text-green-400">
            ${formatCurrency(global.totalDeposited || 0, 2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">GC purchases by players</div>
        </div>

        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10"><path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>
          </div>
          <h4 className="text-gray-400 font-medium text-sm mb-1">Total Withdrawals</h4>
          <div className="text-3xl font-bold text-red-400">
            ${formatCurrency(global.totalRedemptionAmount || 0, 2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">{global.totalRedemptions || 0} redemptions</div>
        </div>

        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10"><path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" /></svg>
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
        <h3 className="font-bold text-gray-300 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400"><path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" /><path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" /></svg>
          Economics Structure
        </h3>
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
