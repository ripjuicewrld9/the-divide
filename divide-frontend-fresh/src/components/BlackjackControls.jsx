import React, { useState } from 'react';

export default function BlackjackControls({ balance, onPlaceBet, onUndo, onClear }) {
  const [betAmount, setBetAmount] = useState(1);
  const [betHistory, setBetHistory] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(balance);

  function handleBetChange(e) {
    const value = Math.max(0.01, Number(e.target.value));
    setBetAmount(value);
  }

  function handlePlaceBet() {
    if (betAmount > currentBalance) return;
    setBetHistory([...betHistory, betAmount]);
    setCurrentBalance(currentBalance - betAmount);
    if (onPlaceBet) onPlaceBet(betAmount);
  }

  function handleUndo() {
    if (betHistory.length === 0) return;
    const lastBet = betHistory[betHistory.length - 1];
    setBetHistory(betHistory.slice(0, -1));
    setCurrentBalance(currentBalance + lastBet);
    if (onUndo) onUndo(lastBet);
  }

  function handleClear() {
    const totalRefund = betHistory.reduce((a, b) => a + b, 0);
    setBetHistory([]);
    setCurrentBalance(currentBalance + totalRefund);
    if (onClear) onClear(totalRefund);
  }

  return (
    <div className="blackjack-controls">
      <div>Balance: ${currentBalance.toFixed(2)}</div>
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={betAmount}
        onChange={handleBetChange}
      />
      <button onClick={handlePlaceBet} disabled={betAmount > currentBalance || betAmount < 0.01}>
        Place Bet (${betAmount})
      </button>
      <button onClick={handleUndo} disabled={betHistory.length === 0}>Undo</button>
      <button onClick={handleClear} disabled={betHistory.length === 0}>Clear</button>
    </div>
  );
}
