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

  const { global, games } = data;
  
  // Null safety: ensure games object exists and is not null
  const safeGames = games && typeof games === 'object' ? games : {};

  return (
    <div className="min-h-screen bg-[#0b0b0b] p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Admin Finance
          </h2>
          <p className="text-gray-400 mt-1">PnL & Jackpot Tracking</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition-colors font-bold"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Global Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#151515] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl">🎰</span>
          </div>
          <h3 className="text-gray-400 font-medium mb-2">Global Jackpot Pool</h3>
          <div className="text-4xl font-bold text-yellow-400">
            ${formatCurrency(global.jackpotAmount || 0, 2)}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Accumulated from 1% of all bets
          </div>
        </div>

        <div className="bg-[#151515] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl">🏠</span>
          </div>
          <h3 className="text-gray-400 font-medium mb-2">Total House Profit</h3>
          <div className="text-4xl font-bold text-emerald-400">
            ${formatCurrency(global.houseTotal || 0, 2)}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Net profit after payouts and jackpot fees
          </div>
        </div>
      </div>

      {/* Per-Game PnL Table */}
      <div className="bg-[#151515] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-bold">Game Performance (PnL)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-gray-400 text-sm uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Game</th>
                <th className="px-6 py-4 font-medium text-right">Handle (Bets)</th>
                <th className="px-6 py-4 font-medium text-right">Payouts (Wins)</th>
                <th className="px-6 py-4 font-medium text-right text-yellow-500">Jackpot Fee (1%)</th>
                <th className="px-6 py-4 font-medium text-right text-emerald-500">House Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Object.entries(safeGames).map(([gameKey, stats]) => (
                <tr key={gameKey} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold capitalize">{gameKey}</td>
                  <td className="px-6 py-4 text-right font-mono text-gray-300">
                    ${formatCurrency(stats.handle || 0, 2)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-red-400">
                    -${formatCurrency(stats.payouts || 0, 2)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-yellow-400">
                    ${formatCurrency(stats.jackpotFee || 0, 2)}
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-bold ${stats.houseProfit >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                    ${formatCurrency(stats.houseProfit || 0, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-white/5 font-bold">
              <tr>
                <td className="px-6 py-4">TOTAL</td>
                <td className="px-6 py-4 text-right text-gray-300">
                  ${formatCurrency(Object.values(safeGames).reduce((acc, g) => acc + (g?.handle || 0), 0), 2)}
                </td>
                <td className="px-6 py-4 text-right text-red-400">
                  -${formatCurrency(Object.values(safeGames).reduce((acc, g) => acc + (g?.payouts || 0), 0), 2)}
                </td>
                <td className="px-6 py-4 text-right text-yellow-400">
                  ${formatCurrency(Object.values(safeGames).reduce((acc, g) => acc + (g?.jackpotFee || 0), 0), 2)}
                </td>
                <td className="px-6 py-4 text-right text-emerald-400">
                  ${formatCurrency(Object.values(safeGames).reduce((acc, g) => acc + (g?.houseProfit || 0), 0), 2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Player Transactions Table */}
      <div className="bg-[#151515] border border-white/10 rounded-2xl overflow-hidden mt-8">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-bold">Player Transactions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div className="bg-white/5 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-5xl">💳</span>
            </div>
            <h4 className="text-gray-400 font-medium mb-2">Total GC Buys</h4>
            <div className="text-3xl font-bold text-cyan-400">
              ${formatCurrency(global.totalDeposited || 0, 2)}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Gold Coin purchases by players
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-5xl">💸</span>
            </div>
            <h4 className="text-gray-400 font-medium mb-2">Total Redemptions</h4>
            <div className="text-3xl font-bold text-purple-400">
              ${formatCurrency(global.totalRedemptionAmount || 0, 2)}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {global.totalRedemptions || 0} total withdrawals
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-[#151515] border border-white/10 rounded-xl p-6">
        <h3 className="font-bold text-gray-300 mb-2">How It Works</h3>
        <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
          <li><strong>Handle:</strong> Total amount wagered by players on each game.</li>
          <li><strong>Payouts:</strong> Total winnings paid out to players.</li>
          <li><strong>Jackpot Fee:</strong> 1% of every bet is deducted and added to the Global Jackpot Pool.</li>
          <li><strong>House Profit:</strong> The remaining 99% minus player payouts. Formula: <code>Handle - Payouts - Jackpot Fee</code>.</li>
          <li>Run <code>node scripts/initialize-house-stats.js</code> to recalculate statistics from existing game data.</li>
        </ul>
      </div>
    </div>
  );
}
