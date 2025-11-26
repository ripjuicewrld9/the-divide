import React from 'react';
import PlinkoGame from './components/PlinkoGame';

interface PlinkoPageProps {
  onOpenChat?: () => void;
}

export default function PlinkoPage({ onOpenChat }: PlinkoPageProps) {
  return <PlinkoGame onOpenChat={onOpenChat} />;
}
