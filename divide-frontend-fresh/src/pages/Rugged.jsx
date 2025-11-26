import React from 'react';
import RuggedGame from '../components/RuggedGame';

export default function RuggedPage({ onOpenChat }) {
  return (
    <div>
      <RuggedGame onOpenChat={onOpenChat} />
    </div>
  );
}
