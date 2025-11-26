import React, { useEffect } from 'react';
import { BlackjackGame } from './components/BlackjackGame';
import { useGameStore } from './store';

interface BlackjackPageProps {
  onOpenChat?: () => void;
}

export const BlackjackPage: React.FC<BlackjackPageProps> = ({ onOpenChat }) => {
  const initGame = useGameStore((state) => state.initGame);

  useEffect(() => {
    initGame();
  }, [initGame]);

  return <BlackjackGame onOpenChat={onOpenChat} />;
};

export default BlackjackPage;
