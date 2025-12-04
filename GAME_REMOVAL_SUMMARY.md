# Server.js Game Code Removal Summary

## Overview

This document details all game-related code that needs to be removed from `server.js` while preserving Divides, auth, admin, support, and case battles functionality.

## Sections Removed

### 1. **Line 125** - Comment Update (ALREADY DONE)

- Updated comment from `'plinko', 'blackjack', 'keno', 'rugged', 'mines', 'divides'` to just `'divides'`

### 2. **Lines 276-293** - Keno Rate Limiter

**What:** In-memory play rate limiter for Keno
**Remove:** Complete `_playRateMap` and `checkPlayRate` function

```
// Simple in-memory play rate limiter for Keno...
const _playRateMap = new Map();
function checkPlayRate(userId, ...) { ... }
```

### 3. **Lines 2594-2662** - Rugged Constants & Keno Helpers

**What:** Temporary Rugged disable message, constants, and provably fair helpers
**Remove:**

- `RUGGED_DISABLED_MESSAGE`
- `RUGGED_TOTAL_SUPPLY`
- `sha256()` function
- `hashToNumbers()` function
- `generateSeed()` function

### 4. **Lines 3290-3547** - Keno Play Route

**What:** Complete `/keno/play` POST endpoint
**Remove:** Entire route handler including validation, paytable logic, provably fair implementation

### 5. **Lines 3549-3558** - Keno Rounds Route

**What:** `/keno/rounds` GET endpoint for provably-fair history
**Remove:** Complete route handler

### 6. **Lines 3581-3728** - Game Sections in /api/recent-games

**What:** Keno, Plinko, Blackjack, Rugged sections in recent games feed
**Remove:**

- Keno games fetch and loop (lines 3581-3602)
- Plinko games fetch and loop (lines 3603-3624)
- Blackjack games fetch and loop (lines 3625-3652)
- Rugged buys fetch and loop (lines 3684-3705)
- Rugged sells fetch and loop (lines 3706-3728)
  **Keep:** Case Battles section and sorting logic

### 7. **Lines 3758-3898** - Game Sections in /api/my-games

**What:** User-specific Keno, Plinko, Blackjack, Rugged game fetches
**Remove:**

- User's Keno games (lines 3758-3778)
- User's Plinko games (lines 3779-3799)
- User's Blackjack games (lines 3800-3826)
- User's Rugged buys (lines 3855-3875)
- User's Rugged sells (lines 3876-3898)
  **Keep:** Case Battles section

### 8. **Lines 3928-4024** - Game Sections in /api/top-wins

**What:** Top Keno, Plinko, Blackjack games by multiplier
**Remove:**

- Top Keno games (lines 3928-3951)
- Top Plinko games (lines 3952-3974)
- Top Blackjack games (lines 3975-4005)
  **Keep:** Case Battles section and sorting

### 9. **Lines 4054-4091** - Keno Leaderboard Route

**What:** `/keno/leaderboard` GET endpoint
**Remove:** Complete aggregation pipeline for top 3 Keno multipliers

### 10. **Lines 4092-4129** - Plinko Leaderboard Route

**What:** `/plinko/leaderboard` GET endpoint
**Remove:** Complete aggregation pipeline

### 11. **Lines 4130-4167** - Blackjack Leaderboard Route

**What:** `/blackjack/leaderboard` GET endpoint
**Remove:** Complete aggregation pipeline

### 12. **Lines 4184-4226** - Keno Odds Route

**What:** `/keno/odds` GET endpoint for expected multipliers
**Remove:** Combinatorics helpers and odds calculation

### 13. **Lines 4228-4241** - Keno Paytables Route

**What:** `/keno/paytables` GET endpoint
**Remove:** Complete route that returns authoritative paytables

### 14. **Lines 4243-4253** - Keno RTP Route

**What:** `/keno/rtp` GET endpoint for configured RTP values
**Remove:** Complete route

### 15. **Lines 4302-4308** - Wheel Routes Registration

**What:** Registration of Wheel game routes
**Remove:**

```javascript
// Register Wheel routes
try {
  console.log("startup: about to register wheel routes");
  registerWheelRoutes(app, io, { auth });
  console.log("startup: wheel routes registered");
} catch (e) {
  console.error("Failed to register wheel routes", e);
}
```

### 16. **Lines 4310-4365** - ensureRuggedInit Function

**What:** Rugged game initialization function and call
**Remove:**

- Complete `async function ensureRuggedInit()`
- Call to `ensureRuggedInit().catch(e => console.error(e))`

### 17. **Lines 4581-4662** - Wheel Socket.IO Namespace

**What:** Wheel game Socket.IO events and WheelGameManager setup
**Remove:**

- `const wheelNamespace = io.of('/wheel')`
- Socket connection/join/leave handlers
- WheelGameManager initialization
- `/api/wheel/lobbies` route

### 18. **Lines 4721-4881** - Rugged Helper Functions

**What:** Rugged game broadcast, price calculation, restart scheduling
**Remove:**

- `broadcastRugged()` function
- `recalcAndPersistPrice()` function
- `scheduleRugRestart()` function
- `cancelScheduledRugRestart()` function
- `recoverScheduledRestarts()` function
- Cooldown safety interval
- Comment about Rugged routes moved to separate file

### 19. **Lines 4985-4990** - Admin Rugged Consolidate Route

**What:** `/admin/rugged/consolidate` POST endpoint
**Remove:** Complete route that returns deprecation message

### 20. **Lines ~4993-5020** - Admin Keno RTP Route

**What:** `/admin/keno-rtp` GET endpoint for expected multipliers per spot
**Remove:** Complete combinatorics calculation route

### 21. **Lines in /admin/finance** - Game Stats

**What:** Keno, Plinko, Blackjack, Rugged, Mines stats in finance summary
**Keep:** Divides stats only
**Modify:** Remove plinko, blackjack, keno, rugged, mines from games object

### 22. **Lines 4712-4713** - Keno Reserve in Jackpot Route

**What:** KenoReserve references in `/jackpot` GET endpoint
**Remove:**

```javascript
const kenoReserveDoc = await KenoReserve.findOne({ id: "global" }).lean();
// and from response: kenoReserve: kenoReserveDoc?.amount || 0
```

### 23. **Leaderboard Snapshot Code** - Bottom of File

**What:** Keno, Plinko, Blackjack leaderboard aggregations in snapshot function
**Remove:** Game-specific leaderboard aggregations
**Keep:** Jackpot snapshot only

### 24. **Game Verification in /api/verify-game**

**What:** Case handlers for Keno, Plinko, Blackjack in verify-game endpoint
**Remove:** Switch cases for these games
**Keep:** Case Battle verification

## Import/Require Statements to Check

Look for and potentially remove:

- KenoRound model import
- PlinkoGame model import
- BlackjackGame model import
- Rugged model import
- KenoReserve model import
- WheelGameManager import
- registerWheelRoutes import
- paytables/configured imports from paytable-data.js

## Total Impact

- **Estimated lines removed:** ~1,800-2,000 lines
- **Routes removed:** 15+ endpoints
- **Socket namespaces removed:** 1 (Wheel)
- **Helper functions removed:** 10+
- **Model references to clean:** 5-6

## What's Preserved

✅ All Divides routes and logic
✅ Auth system (login, register, JWT, 2FA, OAuth)
✅ Admin routes (except game-specific ones)
✅ Support ticket system
✅ Case battles and cases routes
✅ Ledger system
✅ Chat systems (public and moderator)
✅ User management and profiles
✅ Jackpot logic (base system, minus game-specific contributions)
✅ House stats (structure, minus game-specific stats)
✅ XP and level system
✅ Notifications

## Next Steps

1. Create backup: `cp server.js server.js.backup`
2. Remove sections systematically (starting from bottom to preserve line numbers)
3. Test server startup: `node server.js`
4. Check for:
   - Undefined references to removed functions
   - Missing model imports
   - Socket namespace errors
5. Update any lingering references in comments
6. Test core functionality (Divides, auth, case battles)

## Verification Checklist

- [ ] Server starts without errors
- [ ] Divides game works
- [ ] Auth (login/register) works
- [ ] Case battles work
- [ ] Support tickets work
- [ ] Chat works
- [ ] Admin panel loads (minus game management)
- [ ] No console errors about missing routes
- [ ] No undefined function references
