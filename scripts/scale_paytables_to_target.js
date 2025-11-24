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

const TARGET = 0.95; // desired expected multiplier per spot

function computeExpectedFor(table, s) {
  let exp = 0;
  for (let k = 0; k <= s; k++) {
    const mult = (table[s] && table[s][k]) ? table[s][k] : 0;
    const p = hyperProb(s, k);
    exp += p * mult;
  }
  return exp;
}

function scaleTable(table) {
  const scaled = {};
  for (let s = 1; s <= 10; s++) {
    const exp = computeExpectedFor(table, s);
    const factor = exp > 0 ? (TARGET / exp) : 0;
    scaled[s] = {};
    const hits = table[s] || {};
    for (const kStr of Object.keys(hits)) {
      const k = Number(kStr);
      const orig = hits[k];
      const scaledVal = +(orig * factor).toFixed(6);
      scaled[s][k] = scaledVal;
    }
  }
  return scaled;
}

const out = {};
for (const risk of Object.keys(paytables)) {
  out[risk] = scaleTable(paytables[risk]);
}

console.log('module.exports = ' + JSON.stringify(out, null, 2) + ';');
