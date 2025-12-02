# XP Backfill Guide - Render.com + MongoDB Atlas

## Option 1: Run Locally (Recommended)

1. **Update your local `.env` file** with your MongoDB Atlas connection string:
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/divide?retryWrites=true&w=majority
   ```

2. **Run the backfill script**:
   ```bash
   npm run backfill-xp
   ```

3. **Restore local MongoDB URI** (if you want to keep using local):
   ```bash
   MONGODB_URI=mongodb://localhost:27017/divide
   ```

---

## Option 2: Run via Render Shell

1. **Go to your Render dashboard** → Select your web service

2. **Click "Shell" tab** (top right)

3. **Run the backfill command**:
   ```bash
   node scripts/backfill-xp-levels.js
   ```

   This will use the `MONGODB_URI` environment variable already configured in Render.

---

## What the Script Does

- Calculates XP from each user's historical `wagered` amount
- Awards **2 XP per $1 wagered** (retroactive)
- Auto-assigns the correct **level** and **badge** based on XP
- Does NOT modify weekly/monthly XP (those track fresh activity)

---

## Expected Output

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB
📊 Found 42 users to process
  alice123: Calculated 5000 XP from $2500.00 wagered
  alice123: Updated to Level 8 (Skeptic)
  bob456: Calculated 150000 XP from $75000.00 wagered
  bob456: Updated to Level 30 (Propagandist)
  ...
✅ Backfill complete!
   Updated: 35 users
   Skipped: 7 users (already correct)
```

---

## Troubleshooting

**Error: "MONGODB_URI not found"**
- Make sure `.env` file exists with `MONGODB_URI` set
- For Render shell, check environment variables in dashboard

**Error: "connect ECONNREFUSED"**
- Local MongoDB not running OR wrong connection string
- Use MongoDB Atlas URI instead of `localhost:27017`

**Error: "Authentication failed"**
- Check MongoDB Atlas username/password in connection string
- Ensure IP whitelist includes `0.0.0.0/0` (or your current IP)

---

## After Running

Users will see their level/badge on their profile page automatically!
