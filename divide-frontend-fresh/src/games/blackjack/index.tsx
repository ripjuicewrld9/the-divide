import React, { useEffect } from 'react';
import { BlackjackGame } from './components/BlackjackGame';
import { useGameStore } from './store';

export const BlackjackPage: React.FC = () => {
  const initGame = useGameStore((state) => state.initGame);

  useEffect(() => {
    initGame();
  }, [initGame]);

  return <BlackjackGame />;
};

export default BlackjackPage;
