import React, { useEffect } from 'react';
import { BlackjackGame } from './components/BlackjackGame';
import { useGameStore } from './store';
import { useAuth } from '../../context/AuthContext';

interface BlackjackPageProps {
  onOpenChat?: () => void;
}

export const BlackjackPage: React.FC<BlackjackPageProps> = ({ onOpenChat }) => {
  const initGame = useGameStore((state) => state.initGame);
  const { user } = useAuth();

  useEffect(() => {
    // Initialize game with user's current balance to avoid showing 0
    initGame(user?.balance ?? 0);
  }, [initGame, user?.balance]);

  return <BlackjackGame onOpenChat={onOpenChat} />;
};

export default BlackjackPage;
