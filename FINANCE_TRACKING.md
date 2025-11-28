# House Finance Tracking System

## Overview

The admin finance dashboard now tracks real profit/loss data for all games with proper accounting for:

- Player bets (handle)
- Player payouts (winnings)
- Jackpot fees (1% of all bets)
- House profit (remaining 99% minus payouts)

## How It Works

### Fee Structure

- **1%** of every bet → Global Jackpot Pool
- **99%** of every bet → House pool (minus player payouts)
- **House Profit** = Total Bets - Total Payouts - Jackpot Fees

### Tracked Games

- Plinko
- Blackjack
- Keno
- Rugged
- Mines
- Divides

## Database Schema

The `House` model (`models/House.js`) now tracks per-game statistics:

```javascript
{
  id: 'global',
  houseTotal: Number,  // Total house profit across all games
  plinko: {
    totalBets: Number,
    totalPayouts: Number,
    jackpotFees: Number,
    houseProfit: Number
  },
  blackjack: { /* same structure */ },
  keno: { /* same structure */ },
  // ... etc
}
```

All amounts are stored in **cents** (e.g., $10.00 = 1000).

## Initial Setup

Run this script to initialize the House document with statistics from all existing game data:

```bash
node scripts/initialize-house-stats.js
```

This will:

1. Calculate totals from all Plinko, Blackjack, Keno, Mines, and Divides games
2. Apply the 1% jackpot fee retroactively
3. Calculate house profit for each game
4. Update the global jackpot pool
5. Save all statistics to the database

## Ongoing Tracking

### Option 1: Manual Updates (Current)

After running games, periodically re-run the initialization script to update stats:

```bash
node scripts/initialize-house-stats.js
```

### Option 2: Real-Time Tracking (Future Enhancement)

To track statistics in real-time, add this call to each game's bet/payout logic:

```javascript
// In game route/endpoint after processing bet and payout
await updateHouseStats(gameName, betAmount, payoutAmount);
```

Where:

- `gameName`: 'plinko', 'blackjack', 'keno', 'rugged', 'mines', or 'divides'
- `betAmount`: Total bet in cents
- `payoutAmount`: Total payout in cents (0 if player lost)

The `updateHouseStats()` helper function (in `server.js`) automatically:

- Records the bet
- Records the payout
- Calculates and applies 1% jackpot fee
- Updates house profit
- Adds jackpot fee to global jackpot pool

## API Endpoint

### GET `/admin/finance` (Admin Only)

Returns:

```json
{
  "global": {
    "jackpotAmount": 12450.5,
    "houseTotal": 54320.0
  },
  "games": {
    "plinko": {
      "handle": 15000.0,
      "payouts": 14200.0,
      "jackpotFee": 150.0,
      "houseProfit": 650.0
    },
    "blackjack": {
      /* ... */
    }
    // ... other games
  }
}
```

All amounts returned in **dollars** (converted from cents).

## Admin Dashboard

Access at `/admin/finance` to view:

- Global jackpot pool
- Total house profit
- Per-game profit/loss breakdown
- Handle, payouts, jackpot fees per game

## Notes

- **Accuracy**: The initialization script calculates from actual game records, ensuring accurate historical data
- **Jackpot Pool**: The 1% fee ensures the jackpot grows with platform activity
- **House Edge**: Each game's natural house edge + jackpot fee determines profitability
- **Future**: Consider implementing real-time tracking by integrating `updateHouseStats()` into game routes

## Migration Checklist

- [x] Updated House model schema
- [x] Created initialization script
- [x] Updated /admin/finance endpoint
- [x] Updated AdminFinance UI component
- [ ] Integrate real-time tracking (optional enhancement)
- [ ] Test with production data
- [ ] Deploy and run initialization script
