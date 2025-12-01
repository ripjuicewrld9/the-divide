import React from 'react';
import { useParams } from 'react-router-dom';
import { NewWheelGame } from './NewWheelGame';

export default function WheelPage() {
  const { gameId } = useParams<{ gameId: string }>();

  if (!gameId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0b0b]">
        <div className="text-white text-xl">Invalid game ID</div>
      </div>
    );
  }

  return <NewWheelGame gameId={gameId} />;
}
