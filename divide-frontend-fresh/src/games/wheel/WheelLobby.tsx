import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface LobbyInfo {
  lobbyId: string;
  roundNumber: number;
  status: 'betting' | 'spinning' | 'completed';
  occupiedSeats: number;
  totalSeats: number;
  timeRemaining: number;
}

const LOBBY_IDS = ['lobby-1', 'lobby-2', 'lobby-3', 'lobby-4'];

export const WheelLobby: React.FC = () => {
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState<LobbyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLobbies();
    const interval = setInterval(fetchLobbies, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchLobbies = async () => {
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/wheel/lobbies`);
      
      if (response.ok) {
        const data = await response.json();
        setLobbies(data.lobbies || []);
      }
    } catch (error) {
      console.error('[WheelLobby] Error fetching lobbies:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return '0s';
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const getLobbyNumber = (lobbyId: string) => {
    return lobbyId.replace('lobby-', '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0b0b]">
        <div className="text-white text-xl">Loading lobbies...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Lucky Wheel
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Choose a lobby to join • 8 flappers • 54 segments • Boost multipliers up to 100x
          </p>
        </div>
        
        {/* Lobby Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {LOBBY_IDS.map((lobbyId) => {
            const lobby = lobbies.find(l => l.lobbyId === lobbyId);
            const lobbyNumber = getLobbyNumber(lobbyId);
            
            return (
              <motion.div
                key={lobbyId}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/wheel/${lobbyId}`)}
                className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 cursor-pointer hover:border-cyan-500/30 transition-colors"
              >
                {/* Lobby Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-black text-white">Lobby {lobbyNumber}</h3>
                    <p className="text-gray-400 text-sm">
                      {lobby ? `Round #${lobby.roundNumber}` : 'Initializing...'}
                    </p>
                  </div>
                  
                  {lobby && (
                    <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                      lobby.status === 'betting' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      lobby.status === 'spinning' 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                        'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {lobby.status}
                    </div>
                  )}
                </div>
                
                {lobby ? (
                  <div className="space-y-4">
                    {/* Players */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Players</span>
                      <span className="text-white font-bold">
                        {lobby.occupiedSeats}/{lobby.totalSeats}
                      </span>
                    </div>
                    
                    {/* Time Remaining */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Time Left</span>
                      <span className={`font-bold ${
                        lobby.timeRemaining > 10000 ? 'text-green-400' :
                        lobby.timeRemaining > 5000 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {formatTime(lobby.timeRemaining)}
                      </span>
                    </div>
                    
                    {/* Occupancy Progress Bar */}
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${(lobby.occupiedSeats / lobby.totalSeats) * 100}%` }}
                      />
                    </div>
                    
                    {/* Join Button */}
                    <div className="pt-2">
                      <div className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-lg text-center transition-colors">
                        Join Lobby
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p className="text-sm">Loading lobby data...</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
        
        {/* Game Info */}
        <div className="mt-8 bg-[#1a1a2e] border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-black text-white mb-4">How to Play</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-cyan-400 font-bold mb-1">1. Choose Your Seat</div>
              <p className="text-gray-400">Select one of 8 flappers around the wheel</p>
            </div>
            <div>
              <div className="text-purple-400 font-bold mb-1">2. Place Your Bet</div>
              <p className="text-gray-400">Each seat receives an outcome every spin</p>
            </div>
            <div>
              <div className="text-pink-400 font-bold mb-1">3. Watch the Spin</div>
              <p className="text-gray-400">3-5 segments get boosted up to 100x!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WheelLobby;
