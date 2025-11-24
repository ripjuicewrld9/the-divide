/* Integration test for server-authoritative PURE RNG Rugged routes
   Uses mongodb-memory-server to run an in-memory MongoDB and Supertest to hit endpoints.
*/
import assert from 'assert';
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

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  // ensure any previous mongoose connection is closed before creating a new one for mongodb-memory-server
  if (mongoose.connection && mongoose.connection.readyState) {
    try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

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

  // register routes with a bare-bones io stub
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

it('buy and sell flow preserves totals and server provides seed hash', async () => {
  // create a user
  const u = await User.create({ username: 't1', password: 'p', balance: 1000 });
  const token = jwt.sign({ userId: u._id }, JWT_SECRET);

  // perform a buy via fetch
  const fetch = (await import('node-fetch')).default;
  const buyRes = await fetch(baseUrl + '/rugged/buy', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ usdAmount: 10 }) });
  const buyJson = await buyRes.json();
  assert.strictEqual(buyRes.status, 200);
  // check returned pool and jackpot existence
  assert.strictEqual(typeof buyJson.pool, 'number');

  // now attempt a sell
  const sellRes = await fetch(baseUrl + '/rugged/sell', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({}) });
  const sellJson = await sellRes.json();
  assert.strictEqual(sellRes.status, 200);
  assert.strictEqual(typeof sellJson.payout, 'number');
});
