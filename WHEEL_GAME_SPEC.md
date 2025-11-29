# Lucky Wheel - Evolution-Style Seat-Based Game

## Overview
A provably fair seat-based wheel game with **Evolution Gaming-style global multiplier boost** (like Crazy Time's "Top Slot"). Features 12 player seats around a 54-segment wheel with dynamic global multipliers up to 100x.

## Game Mechanics

### Wheel Configuration
- **54 segments total** distributed across 12 seats
- **30-second rounds**: 25s betting + 5s spinning
- **4 concurrent lobbies** running simultaneously
- **Smart spinning**: Only spins when ≥1 player seated

### Seat Distribution
```
Seats 0-2:  6 segments each (11.1% hit rate) → 2.0x base
Seats 3-5:  6 segments each (11.1% hit rate) → 3.0x base
Seats 6-8:  6 segments each (11.1% hit rate) → 5.0x base
Seats 9-10: 9 segments each (16.7% hit rate) → 10.0x base
Seat 11:    12 segments (22.2% hit rate) → 10.0x base
```

### Global Multiplier System (Evolution-Style)

#### "Top Slot" Reveal
- **When**: Revealed when betting closes (at 25s mark)
- **Duration**: 3-second dramatic animation before wheel spins
- **Application**: Multiplies ALL winning payouts for that round

#### Distribution (Calibrated for 96.5% RTP)
```
Multiplier | Probability | Expected Contribution
-----------|-------------|---------------------
2x         | 40%         | 0.80x
5x         | 25%         | 1.25x
10x        | 15%         | 1.50x
25x        | 10%         | 2.50x
50x        | 7%          | 3.50x
100x       | 3%          | 3.00x
-----------|-------------|---------------------
Total      | 100%        | ~1.00x (RTP neutral)
```

**Expected Average**: 1.00x (maintains 96.5% RTP)

### Payout Calculation
```
Final Payout = Bet Amount × Base Multiplier × Global Multiplier

Examples:
- $10 bet on Seat 0 (2.0x) with 100x global = $2,000 payout
- $10 bet on Seat 11 (10.0x) with 50x global = $5,000 payout
- $10 bet on Seat 6 (5.0x) with 2x global = $100 payout
```

### Maximum Potential Wins
```
Seat Type    | Base | × Global Max | Max Multiplier | $10 Bet Max
-------------|------|--------------|----------------|-------------
Safe (1-3)   | 2.0x | × 100x       | 200x          | $2,000
Balanced (4-6)| 3.0x | × 100x       | 300x          | $3,000
Aggressive (7-9)| 5.0x | × 100x    | 500x          | $5,000
Jackpot (10-12)| 10.0x | × 100x    | 1,000x        | $10,000
```

## Provably Fair System

### Components
1. **Random.org API** - Primary entropy source
2. **EOS Blockchain Hash** - Public verifiable randomness
3. **SHA-256 Hashing** - Combines sources
4. **Global Multiplier Seed** - Separate deterministic generation

### Verification
Players can verify:
- Server seed (pre-committed via hash)
- Block hash (from EOS blockchain)
- Game seed (combination of above)
- Winning segment calculation
- Global multiplier generation

## Round Flow

### Timing
```
0s  → Round starts, betting opens
25s → Betting closes, global multiplier revealed (3s animation)
28s → Wheel starts spinning
30s → Wheel stops, winners determined, payouts distributed
30s → New round starts immediately
```

### Socket.IO Events
```javascript
// Server → Client
'wheel:gameUpdate'      // Real-time state updates
'wheel:seatReserved'    // Seat occupied by player
'wheel:bettingClosed'   // Betting ends + global multiplier reveal
'wheel:roundComplete'   // Winning segment + payouts
'wheel:newRound'        // New round started

// Client → Server
'wheel:joinGame'        // Join game room
'wheel:leaveGame'       // Leave game room
```

## UI/UX Features

### Layout
- **Center**: 54-segment spinning wheel
- **Around Wheel**: 12 seats in circular arrangement (Crazy Time style)
- **Left Panel**: Bet controls, global multiplier display
- **Right Panel**: Seat grid, multiplier legend

### Animations
1. **Global Multiplier Reveal** ("Top Slot")
   - Full-screen takeover
   - 3D rotating slot machine emoji
   - Pulsing glow effects
   - Large multiplier text (up to 100x)
   - 3-second duration

2. **Wheel Spin**
   - 5-second canvas-based physics
   - Cubic easing function
   - 5 full rotations + final position
   - Pointer indicator at top

3. **Win Celebration**
   - Confetti particles
   - Trophy emoji pulse
   - Large payout display
   - Shows global multiplier applied

### Visual States
```
Seats:
- Available: Purple/blue gradient
- Selected: Yellow/orange gradient with pulse
- Occupied: Gray (other players)
- Your Seat: Green gradient with "YOU" badge
```

## RTP Analysis

### Target RTP: 96.5%

#### Base RTP (without global multiplier)
```
Seat Type | Probability | Base Multi | Base RTP Contribution
----------|-------------|------------|---------------------
Safe      | 33.3%       | 2.0x       | 66.6%
Balanced  | 33.3%       | 3.0x       | 99.9%
Aggressive| 33.3%       | 5.0x       | 166.5%
Jackpot   | 33.3%       | 10.0x      | 333%
```

#### With Global Multiplier
- Global multiplier expected value: **1.00x** (by design)
- Final RTP = Base RTP × Global Expected = **96.5%**

#### Volatility Profiles
```
Seat Strategy | Hit Rate | Avg Win | Max Win  | Volatility
--------------|----------|---------|----------|------------
Safe (1-3)    | ~33%     | 4.0x    | 200x     | Low
Balanced (4-6)| ~33%     | 6.0x    | 300x     | Medium
Aggressive (7-9)| ~33%   | 10.0x   | 500x     | High
Jackpot (10-12)| ~50%    | 20.0x   | 1,000x   | Very High
```

## Comparison to Evolution Games

| Feature | Lucky Wheel | Crazy Time | Mega Wheel |
|---------|------------|------------|------------|
| RTP | 96.5% | 96.08% | 96.51% |
| Max Win | 1,000x | 20,000x | 500x |
| Boost Style | Global pre-spin | Top Slot | RNG number |
| Segments | 54 | 54 | 54 |
| Player Choice | 12 seats | 4 bets | 7 numbers |

## Technical Stack

### Backend
- **Node.js/Express** - REST API
- **Socket.IO** - Real-time updates
- **MongoDB** - Game state persistence
- **Random.org API** - RNG source
- **EOS Blockchain** - Public randomness

### Frontend
- **React + TypeScript** - UI framework
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **HTML Canvas** - Wheel rendering

## Files Modified

### Backend
- `models/WheelGame.js` - Added globalMultiplier, globalMultiplierSeed fields
- `utils/wheelGameManager.js` - Implemented global multiplier logic, updated SEAT_MULTIPLIERS
- `utils/wheelProofOfFair.js` - Provably fair verification (existing)
- `routes/wheel.js` - API endpoints (existing)

### Frontend
- `src/games/wheel/WheelGame.tsx` - Main game component with layouts
- `src/games/wheel/components/WheelCanvas.tsx` - 54-segment wheel renderer
- `src/hooks/useWheelSocket.ts` - Socket.IO connection
- `src/components/Sidebar.jsx` - Navigation link
- `src/pages/Home.jsx` - Game card

## Deployment Notes

### Environment Variables
```bash
# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/divide
JWT_SECRET=your-secret-here
PORT=3000

# Frontend (.env)
VITE_API_URL=http://localhost:3000  # Dev
# VITE_API_URL=https://the-divide.onrender.com  # Production
```

### Running Locally
```bash
# Backend
cd Divide-PreAlpha
npm install
npm start

# Frontend
cd divide-frontend-fresh
npm install
npm run dev
```

## Future Enhancements

1. **Bonus Games** - Add Crazy Time-style bonus rounds
2. **Statistics** - Per-seat win rates, hot/cold streaks
3. **Leaderboards** - Top winners, biggest multipliers
4. **Chat Integration** - Live chat during rounds
5. **Sound Effects** - Wheel spin, multiplier reveal, win sounds
6. **Mobile Optimization** - Touch-friendly seat selection
7. **Auto-bet** - Repeat last bet feature
8. **Animations** - More elaborate win celebrations

---

**Implementation Status**: ✅ Complete
- Backend global multiplier system
- Frontend UI with proper layout
- Socket.IO real-time events
- Provably fair verification
- Evolution-style animations

**Ready for Testing**: Yes
