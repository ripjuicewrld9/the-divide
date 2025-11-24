// Simple simulation to verify PURE RNG Rugged accounting invariants
// Run with: node tests/simulate_rugged.js

function cents(n) {
  // return integer cents
  return Math.round(Number(n || 0) * 100);
}

function sum(arr) { return arr.reduce((a,b)=>a+b,0); }

// Configuration
const USERS = 50;
const ITERATIONS = 20000;
const MAX_BUY = 5.0; // max $ per buy
const SELL_PROB = 0.02; // chance to attempt a sell on each iteration
const CRASH_PROB = 1/1000; // 0.1% per buy

// State
let users = Array.from({length: USERS}, (_,i) => ({ id: `u${i}`, balance: cents(1000), positions: [] }));
let pool = 0; // cents
let jackpot = 0;
let house = 0;

const initialTotal = cents(sum(users.map(u=>u.balance)) + pool + jackpot + house);

function buy(user, amount) {
  // amount is in dollars; convert to cents and clamp to user balance
  let amountC = cents(amount);
  amountC = Math.min(amountC, user.balance);
  if (amountC <= 0) return false;
  // Deduct from user, add to pool (all in cents)
  user.balance = Number(user.balance) - amountC;
  pool = Number(pool) + amountC;
  // Position entryPool is pool after buy (in cents)
  const entryPool = pool;
  user.positions.push({ entryAmount: amountC, entryPool });
  return true;
}

function sell(user) {
  if (!user.positions.length) return false;
  let payout = 0;
  for (const p of user.positions) {
    const entryPool = Number(p.entryPool || pool || 1);
    const mult = Number(pool) / entryPool;
    const ppay = Math.floor(Number(p.entryAmount || 0) * mult);
    payout += ppay;
  }
  payout = Math.min(payout, pool);
  pool = Number(pool) - payout;
  user.balance = Number(user.balance) + payout;
  user.positions = [];
  return true;
}

for (let i=0;i<ITERATIONS;i++) {
  // Randomly pick a user
  const idx = Math.floor(Math.random()*USERS);
  const u = users[idx];

  // Random buy amount up to MAX_BUY
  const amt = +(Math.random()*MAX_BUY).toFixed(2);
  buy(u, amt);

  // Crash check (per buy)
  if (Math.random() < CRASH_PROB || pool <= 1) {
    const poolValue = pool;
    const jackpotGain = Math.floor(poolValue * 0.5);
    const houseGain = poolValue - jackpotGain;
    jackpot = jackpot + jackpotGain;
    house = house + houseGain;
    pool = 0;
    // clear all positions (they lose)
    for (const uu of users) uu.positions = [];
    continue;
  }

  // Randomly attempt a sell
  if (Math.random() < SELL_PROB) {
    // pick a random user who has positions
    const withPos = users.filter(x=>x.positions.length);
    if (withPos.length) {
      const r = withPos[Math.floor(Math.random()*withPos.length)];
      sell(r);
    }
  }
}

const finalTotal = cents(sum(users.map(u=>u.balance)) + pool + jackpot + house);

console.log('initialTotal', initialTotal);
console.log('finalTotal', finalTotal);
console.log('pool', pool, 'jackpot', jackpot, 'house', house);

if (Math.abs(finalTotal - initialTotal) > 0.05) {
  console.error('Invariant FAILED: totals differ by', (finalTotal - initialTotal).toFixed(2));
  process.exit(2);
} else {
  console.log('Invariant OK: totals conserved (within rounding)');
  process.exit(0);
}
