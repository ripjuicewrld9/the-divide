// Parametrized simulation for PURE RNG accounting invariants
// Usage: node tests/simulate_param.js USERS ITERATIONS MAX_BUY SELL_PROB CRASH_NUM CRASH_DEN
// Example: node tests/simulate_param.js 50 20000 5 0.02 1 1000

function cents(n) { return Math.round(Number(n || 0) * 100); }
function sum(arr) { return arr.reduce((a,b)=>a+b,0); }

const USERS = Number(process.argv[2] || 50);
const ITERATIONS = Number(process.argv[3] || 20000);
const MAX_BUY = Number(process.argv[4] || 5.0);
const SELL_PROB = Number(process.argv[5] || 0.02);
const CRASH_NUM = Number(process.argv[6] || 1);
const CRASH_DEN = Number(process.argv[7] || 1000);

let users = Array.from({length: USERS}, (_,i) => ({ id: `u${i}`, balance: cents(1000), positions: [] }));
let pool = 0;
let jackpot = 0;
let house = 0;

const initialTotal = cents(sum(users.map(u=>u.balance)) + pool + jackpot + house);

function buy(user, amount) {
  // amount is dollars -> convert to cents
  let amountC = cents(amount);
  amountC = Math.min(amountC, user.balance);
  if (amountC <= 0) return false;
  user.balance = Number(user.balance) - amountC;
  pool = Number(pool) + amountC;
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
  const idx = Math.floor(Math.random()*USERS);
  const u = users[idx];
  const amt = +(Math.random()*MAX_BUY).toFixed(2);
  buy(u, amt);

  // crash check
  if (Math.random() < (CRASH_NUM/CRASH_DEN) || pool <= 1) {
    const poolValue = pool;
    const jackpotGain = Math.floor(poolValue * 0.5);
    const houseGain = poolValue - jackpotGain;
    jackpot = jackpot + jackpotGain;
    house = house + houseGain;
    pool = 0;
    for (const uu of users) uu.positions = [];
    continue;
  }

  if (Math.random() < SELL_PROB) {
    const withPos = users.filter(x=>x.positions.length);
    if (withPos.length) {
      const r = withPos[Math.floor(Math.random()*withPos.length)];
      sell(r);
    }
  }
}

const finalTotal = cents(sum(users.map(u=>u.balance)) + pool + jackpot + house);

console.log('params', { USERS, ITERATIONS, MAX_BUY, SELL_PROB, CRASH_NUM, CRASH_DEN });
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
