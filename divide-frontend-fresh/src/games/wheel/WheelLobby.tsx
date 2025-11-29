import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface WheelGameInfo {
  gameId: string;
  roundNumber: number;
  status: 'betting' | 'spinning' | 'completed';
  occupiedSeats: number;
  totalSeats: number;
  timeRemaining: number;
}

export const WheelLobby: React.FC = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<WheelGameInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchGames = async () => {
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/wheel/games`);
      
      if (response.ok) {
        const data = await response.json();
        setGames(data.games);
      }
    } catch (error) {
      console.error('[WheelLobby] Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0a0a14] to-[#1a1a2e]">
        <div className="text-white text-xl">Loading games...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a14] to-[#1a1a2e] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Lucky Wheel Games</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <motion.div
              key={game.gameId}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/wheel/${game.gameId}`)}
              className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Game {game.gameId.slice(0, 8)}</h3>
                  <p className="text-gray-400 text-sm">Round #{game.roundNumber}</p>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  game.status === 'betting' ? 'bg-green-500/20 text-green-400' :
                  game.status === 'spinning' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {game.status.toUpperCase()}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Players</span>
                  <span className="text-white font-semibold">{game.occupiedSeats}/{game.totalSeats}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Time Left</span>
                  <span className="text-white font-semibold">{formatTime(game.timeRemaining)}</span>
                </div>
                
                <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-100"
                    style={{ width: `${(game.occupiedSeats / game.totalSeats) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {games.length === 0 && (
          <div className="text-center text-gray-400 mt-12">
            <p className="text-xl">No active games at the moment</p>
            <p className="text-sm mt-2">Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WheelLobby;
