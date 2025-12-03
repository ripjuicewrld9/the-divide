import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ComingSoon({ gameName = 'This game' }) {
  const navigate = useNavigate();
  
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)',
      }}
    >
      <div 
        className="text-center p-8 rounded-2xl max-w-md w-full"
        style={{
          background: 'rgba(26, 26, 46, 0.8)',
          border: '1px solid rgba(255, 102, 0, 0.3)',
          boxShadow: '0 0 30px rgba(255, 102, 0, 0.1)',
        }}
      >
        {/* Icon */}
        <div 
          className="text-6xl mb-4"
          style={{
            filter: 'grayscale(50%)',
          }}
        >
          🚧
        </div>
        
        {/* Title */}
        <h1 
          className="text-2xl font-bold mb-2"
          style={{
            background: 'linear-gradient(135deg, #ff6600, #ff8833)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Coming Soon
        </h1>
        
        {/* Message */}
        <p className="text-gray-400 mb-6">
          {gameName} is not yet available on mobile devices. Please use a desktop browser to access this game.
        </p>
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-lg font-bold text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, #ff6600 0%, #cc4400 100%)',
            boxShadow: '0 4px 15px rgba(255, 102, 0, 0.3)',
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
