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
  const table = paytables[riskName];
  if (!table) return null;
  const r = {};
  for (let s = 1; s <= 10; s++) {
    let exp = 0;
    for (let k = 0; k <= s; k++) {
      const mult = (table[s] && table[s][k]) ? table[s][k] : 0;
      const p = hyperProb(s, k);
      exp += p * mult;
    }
    r[s] = exp;
  }
  return r;
}
function pretty(n){ return Number(n).toFixed(6); }
function run(){
  console.log('Keno RTP (N=40, draw=10)');
  const risks = Object.keys(paytables);
  for(const risk of risks){
    const r = computeRTPForRisk(risk);
    console.log('\n=== Risk:', risk, '===');
    let sum = 0; let best = {s:null,rtp:-Infinity}, worst={s:null,rtp:Infinity};
    for(let s=1;s<=10;s++){ const mult=r[s]||0; const rtp=mult*100; sum+=rtp; if(rtp>best.rtp){best={s,rtp}} if(rtp<worst.rtp){worst={s,rtp}}; console.log(`Spots ${s}: multiplier=${pretty(mult)} -> RTP=${rtp.toFixed(4)}%`); }
    const avg = sum/10; console.log(`Average (equal weight across spots 1..10): ${avg.toFixed(4)}%`);
    console.log(`Best spot: ${best.s} (RTP=${best.rtp.toFixed(4)}%), Worst spot: ${worst.s} (RTP=${worst.rtp.toFixed(4)}%)`);
  }
}
run();
