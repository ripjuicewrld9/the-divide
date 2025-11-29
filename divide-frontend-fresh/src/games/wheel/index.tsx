import React from 'react';
import { useParams } from 'react-router-dom';
import { WheelGame } from './WheelGame';

export default function WheelPage() {
  const { gameId } = useParams<{ gameId: string }>();

  if (!gameId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0a0a14] to-[#1a1a2e]">
        <div className="text-white text-xl">Invalid game ID</div>
      </div>
    );
  }

  return <WheelGame gameId={gameId} />;
}
