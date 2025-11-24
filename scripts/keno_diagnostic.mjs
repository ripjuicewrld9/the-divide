import crypto from 'crypto';
import { paytables } from '../paytable-data.js';

// synchronous sha256 using Node crypto to match server's hex output
function sha256Sync(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function hashToNumbers(hash, max, count) {
  const numbers = [];
  const seedHex = (hash && hash.length >= 8) ? hash.slice(0, 8) : '00000000';
  let seed = parseInt(seedHex, 16) >>> 0;
  function mulberry32(a) {
    return function() {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(seed || 1);
  const maxAttempts = Math.max(1000, count * 20);
  let attempts = 0;
  while (numbers.length < count && attempts < maxAttempts) {
    const r = Math.floor(rand() * max) + 1;
    if (!numbers.includes(r)) numbers.push(r);
    attempts += 1;
  }
  if (numbers.length < count) {
    for (let i = 1; numbers.length < count && i <= max; i++) {
      if (!numbers.includes(i)) numbers.push(i);
    }
  }
  return numbers;
}

function computeMultiplier(risk, spots, hits) {
  const base = paytables[risk] && paytables[risk][spots] ? paytables[risk][spots][hits] : 0;
  return (typeof base === 'number') ? Number(base) : Number(base) || 0;
}

function computeWin(betAmount, risk, picks, drawnNumbers) {
  const normalizedPicks = Array.from(new Set((picks || []).map(Number))).filter(n => Number.isFinite(n));
  const matches = normalizedPicks.filter(n => drawnNumbers.includes(n));
  const spots = normalizedPicks.length;
  const hits = matches.length;
  const multiplier = computeMultiplier(risk, spots, hits);
  const totalCents = Math.round(betAmount * 100);
  const winCents = Math.round(totalCents * multiplier);
  const win = Number((winCents / 100).toFixed(2));
  return { multiplier, win, spots, hits, matches };
}

function assertEqual(a, b, msg) {
  if (a !== b) {
    console.error('ASSERT FAIL:', msg, 'expected', b, 'got', a);
  } else {
    console.log('OK:', msg, a);
  }
}

(async function main(){
  console.log('--- Keno diagnostic script ---');
  // Canonical paytable checks
  assertEqual(computeMultiplier('high', 3, 3), 81.5, 'high/3/3 multiplier');
  assertEqual(computeMultiplier('classic', 3, 3), 10.4, 'classic/3/3 multiplier');
  assertEqual(computeMultiplier('low', 10, 10), 1000.0, 'low/10/10 multiplier');

  // Simulate a deterministic round using a sample serverSeed/clientSeed/nonce
  const serverSeed = 'deadbeefcafebabe0123456789abcdef0123456789abcdef0123456789abcdef';
  const clientSeed = 'client123';
  const nonce = 1;
  const hashInput = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = sha256Sync(hashInput);
  const drawn = hashToNumbers(hash, 40, 10);
  console.log('serverSeed (short):', serverSeed.slice(0,16));
  console.log('hash (first 16):', hash.slice(0,16));
  console.log('drawn numbers:', drawn.join(','));

  // Pick a sample ticket (3-spot) and compute win
  const picks = [drawn[0], drawn[1], drawn[2]]; // guaranteed 3 matches
  const betAmount = 1.00;
  const result = computeWin(betAmount, 'high', picks, drawn);
  console.log('Simulated ticket picks:', picks, 'spots', result.spots, 'hits', result.hits, 'multiplier', result.multiplier, 'win', result.win);

  // Edge case: historical cent-int bet representation check
  // If betAmount passed as 100 (meaning 100 cents stored as integer), our normalization should detect large-integer pattern upstream.
  const legacyBet = 100; // could mean 100 cents
  const resLegacy = computeWin(legacyBet / 100, 'classic', [1,2,3], [1,4,7]);
  console.log('Legacy bet 100 cents treated as $1.00 => multiplier', resLegacy.multiplier, 'win', resLegacy.win);

  console.log('\nDone. If canonical multipliers above match project expectations, paytable lookup and RNG logic are correct.');
  console.log('Next: if you have a specific stored round JSON (client overlay), paste it and I can run the same computeWin against its serverSeed/clientSeed/nonce to see where mismatch occurs.');
})();
