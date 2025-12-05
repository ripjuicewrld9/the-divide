import React, { useState, useEffect, useCallback } from 'react';
import UserAvatar from './UserAvatar';

export default function GlobalLeaderboard() {
  const [topWins, setTopWins] = useState([]);
  const [loading, setLoading] = useState(true);

  // Map game names to colors and icons
  const getGameStyle = (gameName) => {
    const styleMap = {
      'Keno': { color: '#ffd700', gradient: 'linear-gradient(135deg, #ffd700 0%, #ff8800 100%)', icon: '' },
      'Plinko': { color: '#a78bfa', gradient: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)', icon: '' },
      'Blackjack': { color: '#ff6b6b', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)', icon: '' },
      'Case Battle': { color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', icon: '' }
    };
    return styleMap[gameName] || { color: '#00ffff', gradient: 'linear-gradient(135deg, #00ffff 0%, #0088ff 100%)', icon: '' };
  };

  const fetchTopWins = useCallback(async () => {
    try {
      const url = (import.meta.env.VITE_API_URL || '') + '/api/top-wins';
      const response = await fetch(url);
      const data = await response.json();
      setTopWins(data.topWins || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching top wins:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopWins();
    const interval = setInterval(fetchTopWins, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchTopWins]);

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center text-gray-500 text-sm">Loading top wins...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-black/40 to-black/20 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <h2 className="text-lg font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="url(#trophy-gradient)" className="w-5 h-5">
            <defs>
              <linearGradient id="trophy-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#facc15" />
                <stop offset="50%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>
            <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a.75.75 0 000 1.5h12.17a.75.75 0 000-1.5h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.707 6.707 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.22 49.22 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
          </svg>
          Top 5 Wins
        </h2>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">
          By Multiplier
        </div>
      </div>

      {/* Leaderboard Items */}
      <div className="space-y-2">
        {topWins.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            No wins yet. Be the first!
          </div>
        ) : (
          topWins.map((win, idx) => {
            const gameStyle = getGameStyle(win.game);
            const rank = idx + 1;
            const rankColors = {
              1: 'from-yellow-400 to-yellow-600',
              2: 'from-gray-300 to-gray-500',
              3: 'from-orange-400 to-orange-600'
            };
            const rankColor = rankColors[rank] || 'from-gray-600 to-gray-800';

            return (
              <div
                key={win._id || idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-all"
              >
                {/* Rank Badge */}
                <div className={`flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br ${rankColor} flex items-center justify-center text-xs font-bold text-black`}>
                  {rank}
                </div>

                {/* User Avatar & Name */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <UserAvatar user={{ username: win.username, profileImage: win.profileImage }} size={28} />
                  <span className="text-xs font-medium text-white truncate">{win.username}</span>
                </div>

                {/* Game Label */}
                <div 
                  className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
                  style={{
                    background: gameStyle.gradient,
                    color: '#000'
                  }}
                >
                  {win.icon} {win.game}
                </div>

                {/* Multiplier */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    {win.multiplierDisplay}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    ${(win.payout || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
