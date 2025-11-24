import assert from 'assert';

const base = process.env.API_URL || 'http://localhost:3000';

async function post(path, body, token) {
  const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(base + path, opts);
  const txt = await res.text();
  try { return JSON.parse(txt); } catch (e) { return { status: res.status, text: txt }; }
}
async function get(path, token) {
  const opts = { method: 'GET', headers: {} };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(base + path, opts);
  const txt = await res.text();
  try { return JSON.parse(txt); } catch (e) { return { status: res.status, text: txt }; }
}

(async () => {
  try {
    const name = 'smoketest_' + Date.now();
    console.log('Registering user', name);
    const reg = await post('/register', { username: name, password: 'pass123' });
    console.log('REGISTER RESPONSE:', JSON.stringify(reg, null, 2));
    if (!reg || !reg.token) {
      console.error('No token returned from /register');
      process.exit(2);
    }
    const token = reg.token;

    console.log('Performing buy of $1');
    const buy = await post('/rugged/buy', { usdAmount: 1 }, token);
    console.log('BUY RESPONSE:', JSON.stringify(buy, null, 2));

    console.log('Fetching /rugged/status');
    const status = await get('/rugged/status');
    console.log('STATUS RESPONSE:', JSON.stringify(status, null, 2));

    // Basic checks
    if (!status || !Array.isArray(status.priceHistory)) {
      console.error('status.priceHistory missing or invalid');
      process.exit(3);
    }
    console.log('Smoke test completed. priceHistory length =', status.priceHistory.length);
    process.exit(0);
  } catch (e) {
    console.error('Smoke script error', e);
    process.exit(1);
  }
})();
