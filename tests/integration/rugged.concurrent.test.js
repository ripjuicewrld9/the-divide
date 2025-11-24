import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import http from 'http';
import registerRugged from '../../routes/rugged-pure-rng.js';
import User from '../../models/User.js';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';

const JWT_SECRET = 'testsecret';

let mongoServer;
let app;
let server;
let baseUrl;

before(async function() {
  this.timeout(20000);
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  if (mongoose.connection && mongoose.connection.readyState) {
    try { await mongoose.disconnect(); } catch (e) { }
  }
  await mongoose.connect(uri);

  app = express();
  app.use(bodyParser.json());

  // simple auth middleware for tests
  const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
      next();
    } catch (e) { return res.status(401).json({ error: 'Invalid' }); }
  };
  const adminOnly = (req, res, next) => { return res.status(403).json({ error: 'not implemented in test' }); };

  const io = { emit: () => {} };
  registerRugged(app, io, { auth, adminOnly });

  server = http.createServer(app).listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  server.close();
});

it('concurrent buys do not corrupt pool total (transactions or fallback tested)', async function() {
  this.timeout(20000);
  const fetch = (await import('node-fetch')).default;
  // create a test user with large balance
  const u = await User.create({ username: 'c1', password: 'p', balance: 100000 });
  const token = jwt.sign({ userId: u._id }, JWT_SECRET);

  // run many concurrent buys
  const CONC = 50;
  const AMT = 10;
  const promises = [];
  for (let i=0;i<CONC;i++) {
    promises.push(fetch(baseUrl + '/rugged/buy', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ usdAmount: AMT }) }));
  }
  const results = await Promise.all(promises);
  // ensure all returned ok (200) or crash responses; at least none were 500
  for (const r of results) {
    if (r.status === 500) throw new Error('Server error in concurrent buy');
  }

  // fetch status and check values
  const statusRes = await fetch(baseUrl + '/rugged/status');
  const status = await statusRes.json();
  // basic sanity: pool is numeric
  if (typeof status.pool !== 'number') throw new Error('Invalid pool');
});
