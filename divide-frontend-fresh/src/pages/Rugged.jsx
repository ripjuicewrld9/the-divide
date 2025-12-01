import React from 'react';
import { useAuth } from '../context/AuthContext';
import RuggedGame from '../components/RuggedGame';

export default function RuggedPage({ onOpenChat }) {
  const { user } = useAuth();
  
  // Only admin can access Rugged game
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0b0b]">
        <div className="text-center max-w-md p-8 bg-[#1a1a2e] border border-white/10 rounded-xl">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
            COMING SOON
          </h1>
          <p className="text-gray-400">
            The Rugged game is currently in development and will be available soon!
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <RuggedGame onOpenChat={onOpenChat} />
    </div>
  );
}
