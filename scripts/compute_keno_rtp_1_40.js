const { paytables } = require('../paytable-data.js');

function C(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let num = 1n, den = 1n;
  for (let i = 1; i <= k; i++) {
    num *= BigInt(n - (k - i));
    den *= BigInt(i);
  }
  return Number(num / den);
}

function hyperProb(s, k) {
  const totalCombs = C(40, 10);
  const ways = C(s, k) * C(40 - s, 10 - k);
  return ways / totalCombs;
}

function computeRTPForRisk(riskName) {
  const table = paytables[riskName] || {};
  const r = {};
  for (let s = 1; s <= 40; s++) {
    let exp = 0;
    // k ranges 0..min(s,10)
    for (let k = 0; k <= Math.min(s, 10); k++) {
      const mult = (table[s] && table[s][k]) ? table[s][k] : 0;
      const p = hyperProb(s, k);
      exp += p * mult;
    }
    r[s] = exp;
  }
  return r;
}

function print() {
  console.log('Computing RTP for Keno (N=40, draw=10) — spots 1..40');
  const risks = Object.keys(paytables);
  for (const risk of risks) {
    console.log('\nRisk:', risk);
    const r = computeRTPForRisk(risk);
    for (let s = 1; s <= 40; s++) {
      const mult = r[s] || 0;
      const rtp = (mult * 100).toFixed(4);
      console.log(`  Spots ${s}: exp multiplier=${mult.toFixed(6)} => RTP=${rtp}%`);
    }
  }
}

print();
