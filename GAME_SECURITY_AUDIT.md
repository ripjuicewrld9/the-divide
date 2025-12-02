# Game Security Audit - Server-Side Betting Implementation

## Summary

This document tracks the security audit of all betting games to ensure proper server-side balance management and prevent exploits related to client-side bet deduction and AuthContext synchronization.

## Critical Security Pattern

**CORRECT PATTERN:**

1. **Server deducts bet IMMEDIATELY** when user takes action (reserve seat, deal cards, etc.)
2. **Client plays animations** and displays outcome
3. **Server credits payout** after game completes

**VULNERABLE PATTERN (DO NOT USE):**

1. Client deducts bet locally
2. Server validates balance but doesn't deduct
3. AuthContext syncs every 5 seconds → overwrites local deduction
4. User gets payout without paying bet (EXPLOITABLE)

## Vulnerability Root Cause

`AuthContext` syncs user balance from server every 5 seconds. If bet is deducted client-side only:

- User places bet → local balance decreases
- AuthContext syncs → balance restored from server
- Game completes → payout credited
- **Result: User gets payout without paying bet**

## Game-by-Game Audit Results

### ✅ SECURE GAMES

#### Plinko

- **File:** `routes/plinko.js`
- **Endpoint:** `POST /api/plinko/play`
- **Pattern:** Atomic balance update (lines 137-138)
  ```javascript
  const newBalanceInCents = balanceInCents - betInCents + payoutInCents;
  user.balance = newBalanceInCents;
  ```
- **Status:** ✅ Secure - Bet and payout applied in single operation

#### Keno

- **File:** `server.js`
- **Endpoint:** `POST /keno/play`
- **Pattern:** Atomic balance update (line 3422)
  ```javascript
  const newBalanceCents = user.balance - betCents + winCents;
  user.balance = newBalanceCents;
  ```
- **Status:** ✅ Secure - Bet and payout applied in single operation

#### Rugged (Rug Pull)

- **File:** `routes/rugged-pure-rng.js`
- **Endpoint:** `POST /rugged/buy`
- **Pattern:** Immediate deduction (line 328)
  ```javascript
  user.balance = Number(user.balance || 0) - usdAmount;
  ```
- **Status:** ✅ Secure - Bet deducted when position purchased

#### Case Battles

- **File:** `routes/caseBattles.js`
- **Endpoints:**
  - `POST /case-battles/create` (line 190)
  - `POST /case-battles/join/:battleId` (line 352)
- **Pattern:** Immediate deduction when creating/joining
  ```javascript
  user.balance -= totalCostInCents; // or totalCost
  ```
- **Status:** ✅ Secure - Balance deducted before battle logic executes

#### Opinion Markets (Divides)

- **File:** `server.js`
- **Endpoint:** `POST /Divides/vote`
- **Pattern:** Immediate deduction when vote placed
- **Status:** ✅ Secure - Already followed correct pattern
- **Recent Fix:** Creator short position now counts correct dollar amount in percentages (not hardcoded "1")

### ✅ FIXED GAMES

#### Blackjack

- **Files:**
  - `routes/blackjack.js` (lines 32-85 NEW, 260-288 MODIFIED)
  - `divide-frontend-fresh/src/games/blackjack/components/BlackjackGame.tsx` (lines 275-342)
  - `divide-frontend-fresh/src/games/blackjack/store.ts` (lines 125-184)
- **Original Vulnerability:**
  - Client deducted bet in Zustand store (`placeBet()`)
  - Server only validated balance in `/game/save`
  - AuthContext sync overwrote local deduction
- **Fix Applied:**
  - Created new endpoint: `POST /api/blackjack/game/place-bet`
  - Server deducts bet when "Deal" clicked (BEFORE cards dealt)
  - Client calls place-bet endpoint, updates balance from response
  - Removed all local balance deductions from Zustand store
  - Modified `/game/save` to only credit payouts (bet already deducted)
- **Status:** ✅ Fixed - Bet deducted server-side before gameplay

#### Wheel Game

- **Files:**
  - `utils/wheelGameManager.js` (lines 256-276, 515-545)
- **Original Vulnerability:**
  - `reserveSeat()` only validated balance (line 263: "DO NOT deduct bet here")
  - Bet deducted in `executeRound()` AFTER spin completed (line 527)
  - AuthContext sync could overwrite pending bet
- **Fix Applied:**
  - Moved bet deduction from `executeRound()` to `reserveSeat()` (lines 264-269)
  - Added immediate user stats update (totalBets, wagered) when seat reserved
  - Modified `executeRound()` to only credit payouts (lines 531-537)
  - Removed duplicate stats tracking from executeRound
- **Code Changes:**

  ```javascript
  // OLD (VULNERABLE):
  async reserveSeat(...) {
    if (user.balance < betInCents) throw new Error('Insufficient balance');
    // DO NOT deduct bet here - will be deducted after spin completes
    seat.betAmount = betInCents;
  }

  // NEW (SECURE):
  async reserveSeat(...) {
    if (user.balance < betInCents) throw new Error('Insufficient balance');
    // Deduct bet immediately when seat is reserved (security fix)
    user.balance -= betInCents;
    user.totalBets = (user.totalBets || 0) + 1;
    user.wagered = (user.wagered || 0) + betInCents;
    await user.save();
    seat.betAmount = betInCents;
  }
  ```

- **Status:** ✅ Fixed - Bet deducted when seat reserved (before spin)

## Implementation Checklist for New Games

When adding a new betting game, ensure:

- [ ] **Server endpoint validates balance** (check `user.balance >= betAmount`)
- [ ] **Server deducts bet IMMEDIATELY** when action taken (not after outcome)
- [ ] **Update user stats** (totalBets, wagered) when bet deducted
- [ ] **Client receives updated balance** in endpoint response
- [ ] **Client updates AuthContext** or local state with server balance
- [ ] **Never deduct balance client-side only** (comments should warn future devs)
- [ ] **Credit payouts after game logic** completes
- [ ] **Update win/loss stats** (totalWins, totalWon, totalLosses) when crediting payout
- [ ] **Create ledger entry** for transaction tracking
- [ ] **Update house stats** via `updateHouseStats()` helper

## Testing Recommendations

To verify a game is secure:

1. **Place bet** (should see balance decrease immediately in AuthContext)
2. **Wait 5+ seconds** without finishing game (AuthContext syncs)
3. **Check balance** hasn't been restored (if restored = vulnerable)
4. **Complete game** (should see payout credited)
5. **Verify final balance** matches: `originalBalance - bet + payout`

## XP System Integration

All games award **2 XP per $1 wagered**:

- XP calculated from `user.wagered` which is updated when bet deducted
- Ensure `user.wagered` incremented by bet amount (in cents) when bet placed
- Do NOT increment wagered when payout credited (double-counting)

## Files Modified in Security Fix

### Backend

- `routes/blackjack.js` - Added place-bet endpoint, modified save endpoint
- `utils/wheelGameManager.js` - Moved bet deduction to reserveSeat
- `server.js` - Opinion Markets creator vote fix (separate issue)

### Frontend

- `divide-frontend-fresh/src/games/blackjack/components/BlackjackGame.tsx` - Call place-bet endpoint
- `divide-frontend-fresh/src/games/blackjack/store.ts` - Removed local balance deductions
- `divide-frontend-fresh/src/games/wheel/NewWheelGame.tsx` - Performance fixes (useMemo)
- `divide-frontend-fresh/src/games/wheel/components/NewWheelCanvas.tsx` - UI improvements

## Balance Display Optimization (Future Work)

To minimize delay showing updated balance without clogging system:

### Current Behavior

- AuthContext syncs every 5 seconds
- Game endpoints return new balance
- Client updates balance from game response

### Proposed Improvements

1. **Pause sync during gameplay:** Stop AuthContext sync when user in active game, resume after 10s idle
2. **Timestamp-based updates:** Add version/timestamp to balance updates, reject older syncs that would overwrite newer game updates
3. **Optimistic updates with rollback:** Show balance change immediately, rollback if server rejects
4. **WebSocket balance updates:** Emit balance changes via Socket.io for real-time sync across tabs

### Implementation Priority

- High: Ensure all games follow secure pattern (DONE)
- Medium: Add timestamp/version to balance updates
- Low: Implement smart sync pausing during gameplay

## Audit Completion Date

**December 2024**

All games audited and vulnerabilities fixed. Wheel and Blackjack had exploitable deferred bet deduction. All other games (Plinko, Keno, Rugged, Case Battles, Divides) already followed secure pattern.

---

**Always review entire project for consistency when implementing changes.**
