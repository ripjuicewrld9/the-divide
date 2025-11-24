import crypto from 'crypto';
import mongoose from 'mongoose';
import RuggedState from '../models/RuggedState.js';
import Rugged from '../models/Rugged.js';
import RuggedPosition from '../models/RuggedPosition.js';
import User from '../models/User.js';
import Ledger from '../models/Ledger.js';

// Helpers: convert dollars (float/string) -> integer cents, and cents -> dollars (number)
const toCents = (n) => Math.round((Number(n) || 0) * 100);
const toDollars = (cents) => Number(((Number(cents) || 0) / 100).toFixed(2));

  // Display threshold: do not persist values smaller than this (client expects
  // no displayable prices under MIN_DISPLAY). Also use this to collapse tiny
  // floating rounding artifacts into a stable displayable number.
  const MIN_DISPLAY = 0.00001;
  // DIVISOR used to compute UX-friendly display price = pool (dollars) / DISPLAY_DIVISOR
  // Keep in sync with frontend DISPLAY_DIVISOR (100000)
  const DISPLAY_DIVISOR = 100000;
  function normalizePriceForPersist(p) {
    const price = Number(p || 0) || 0;
    if (price > 0 && price < MIN_DISPLAY) return MIN_DISPLAY;
    // cap precision to avoid storing long float tails
    return Number(price.toFixed(8));
  }

  function pushPriceIfChanged(arrayLike, point) {
    if (!arrayLike) arrayLike = [];
    const last = arrayLike.length ? arrayLike[arrayLike.length - 1] : null;
    if (last && Number(last.price || 0) === Number(point.price || 0)) return arrayLike;
    arrayLike.push(point);
    if (arrayLike.length > 500) arrayLike = arrayLike.slice(-500);
    return arrayLike;
  }

export default function registerRugged(app, io, { auth, adminOnly } = {}) {
  // detect whether the connected MongoDB supports transactions (replica set)
  let _supportsTransactions = null;
  async function supportsTransactions() {
    if (_supportsTransactions !== null) return _supportsTransactions;
    try {
      const admin = mongoose.connection.db.admin();
      // try the modern 'hello' command, fall back to 'isMaster' for older servers
      let info;
      try { info = await admin.command({ hello: 1 }); } catch (e) { info = await admin.command({ isMaster: 1 }); }
      // For transactions we require both sessions support and that the server is a replica set (has setName)
      // mongodb-memory-server and some single-node servers may advertise sessions but not support transactions
      // so check both logicalSessionTimeoutMinutes and setName (or sharded 'isdbgrid').
      const hasSessions = !!info.logicalSessionTimeoutMinutes;
      const isReplicaSet = !!(info.setName || info.msg === 'isdbgrid');
      _supportsTransactions = hasSessions && isReplicaSet;
    } catch (e) {
      _supportsTransactions = false;
    }
    return _supportsTransactions;
  }
  // initialize single state doc if missing
  async function ensureState() {
    // Use atomic upsert to avoid races creating the singleton state doc under concurrent requests
    const defaults = { id: 'global', pool: 0, jackpot: 0, house: 0, crashed: false, revealedSeeds: [] };
    let s = await RuggedState.findOneAndUpdate(
      { id: 'global' },
      { $setOnInsert: defaults },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // ensure provably-fair seed exists (persist if missing)
    if (!s.serverSeed) {
      const seed = crypto.randomBytes(32).toString('hex');
      const h = crypto.createHash('sha256').update(seed).digest('hex');
      s.serverSeed = seed;
      s.serverSeedHashed = h;
      s.nonce = 0;
      await s.save();
    }

    // Ensure an authoritative `Rugged` document exists so the server-wide
    // chart/history is persisted in one place. If a `Rugged` doc is missing
    // but the older `RuggedState` has priceHistory, copy it over to avoid
    // losing history for late-joining clients.
    try {
      const serverDoc = await Rugged.findOne({ id: 'global' });
      if (!serverDoc) {
        // create a minimal Rugged document seeded from RuggedState fields
        await Rugged.create({
          id: 'global',
          totalSupply: Number(s.totalSupply || 100000000),
          jackpotSupply: Number(s.jackpot || 0),
          circulatingSupply: Number(s.circulatingSupply || 0),
          lastPrice: (s.lastPrice || 0) || 0,
          priceHistory: Array.isArray(s.priceHistory) ? s.priceHistory.slice(-500) : []
        }).catch(e => console.error('Failed to create Rugged doc from RuggedState', e));
      } else if ((!serverDoc.priceHistory || serverDoc.priceHistory.length === 0) && Array.isArray(s.priceHistory) && s.priceHistory.length > 0) {
        // merge missing history
        try {
          serverDoc.priceHistory = s.priceHistory.slice(-500);
          await serverDoc.save();
        } catch (e) { console.error('Failed to migrate priceHistory into Rugged doc', e); }
      }
    } catch (e) { console.error('ensureState: Rugged doc migration check failed', e); }
    return s;
  }

  // GET /rugged/status
  app.get('/rugged/status', async (req, res) => {
    try {
      const s = await ensureState();
      // If the richer server-side `Rugged` document exists and contains a
      // persisted `priceHistory`, prefer it so late-joining clients see the
      // authoritative chart. Fall back to the simple RuggedState if not.
      try {
        const serverDoc = await Rugged.findOne({ id: 'global' }).lean();
  const serverPHlen = serverDoc && Array.isArray(serverDoc.priceHistory) ? serverDoc.priceHistory.length : 0;
  const statePHlen = Array.isArray(s.priceHistory) ? s.priceHistory.length : 0;
  // Prefer the source with the richer history (more points). This helps
  // when one of the collections (Rugged vs RuggedState) was updated but
  // the other wasn't yet migrated.
  if (serverDoc && serverPHlen >= statePHlen && serverPHlen > 0) {
          // Use the authoritative RuggedState.pool (stored in cents) converted to dollars.
          // NOTE: historically some code attempted to use a legacy token wallet
          // (WalletUSDDC) to derive pool, but DC is a purely visual mapping and
          // the backend authoritative source for accounting is `RuggedState.pool`.
          // Do not override that with any legacy wallet balance here; admin tools
          // may report legacy wallet data separately but it is not the source of truth for /rugged/status.
          const poolDollars = toDollars(s.pool);

          return res.json({
            pool: poolDollars,
            jackpot: toDollars(s.jackpot),
            house: toDollars(s.house),
            crashed: !!serverDoc.rugged || !!s.crashed,
            // serverDoc.priceHistory already contains points in display units
            priceHistory: serverDoc.priceHistory || [],
            serverSeedHashed: s.serverSeedHashed || serverDoc.serverSeedHashed || null
          });
        } else if (statePHlen > 0) {
          // prefer RuggedState's history if it is richer
          return res.json({
            pool: toDollars(s.pool),
            jackpot: toDollars(s.jackpot),
            house: toDollars(s.house),
            crashed: !!s.crashed,
            priceHistory: s.priceHistory || [],
            serverSeedHashed: s.serverSeedHashed || null
          });
        }
      } catch (e) {
        console.error('Error loading authoritative Rugged doc for /rugged/status fallback', e);
      }

      // return dollars for backwards compatibility (fallback)
      res.json({ pool: toDollars(s.pool), jackpot: toDollars(s.jackpot), house: toDollars(s.house), crashed: !!s.crashed, priceHistory: s.priceHistory || [], serverSeedHashed: s.serverSeedHashed || null });
    } catch (e) { console.error('GET /rugged/status', e); res.status(500).json({ error: 'Server error' }); }
  });

  // GET /rugged/reveal - return revealed seeds for verification
  app.get('/rugged/reveal', async (req, res) => {
    try {
      const s = await ensureState();
      // return the last 10 revealed seeds and the current committed hash
      const revealed = (s.revealedSeeds || []).slice(-10).map(r => ({ seed: r.seed, nonce: r.nonce, revealedAt: r.revealedAt }));
      res.json({ serverSeedHashed: s.serverSeedHashed || null, revealed });
    } catch (e) { console.error('GET /rugged/reveal', e); res.status(500).json({ error: 'Server error' }); }
  });

  // POST /rugged/buy
  app.post('/rugged/buy', auth, async (req, res) => {
    const usdAmount = toCents(req.body.usdAmount || req.body.amount || 0);
    if (usdAmount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.balance < usdAmount) return res.status(400).json({ error: 'Insufficient balance' });

      const state = await ensureState();
      const prevPool = Number(state.pool || 0);
      const newPool = prevPool + usdAmount;

      const canTrans = await supportsTransactions();

      // Attempt transactional path when supported
      if (canTrans) {
        let session = null;
        try {
          session = await mongoose.startSession();
          session.startTransaction();

          const userDoc = await User.findById(req.userId).session(session);
          userDoc.balance = Number(userDoc.balance || 0) - usdAmount;
          await userDoc.save({ session });

          const created = await RuggedPosition.create([{ userId: req.userId, entryAmount: usdAmount, entryPool: newPool }], { session });
          const createdPos = Array.isArray(created) ? created[0] : created;

          const stateDoc = await RuggedState.findOne({ id: 'global' }).session(session);
          stateDoc.pool = newPool;
          const seed = stateDoc.serverSeed;
          const nonce = (stateDoc.nonce || 0) + 1;
          const hash = crypto.createHash('sha256').update(seed + ':' + nonce).digest('hex');
          const rInt = parseInt(hash.slice(0, 8), 16) >>> 0;
          const roll = (rInt % 1000) + 1;
          stateDoc.nonce = nonce;

          if (roll === 1 || stateDoc.pool <= 1) {
            const poolValue = Number(stateDoc.pool || 0);
            const jackpotGain = Math.floor(poolValue * 0.5);
            const houseGain = poolValue - jackpotGain;
            stateDoc.jackpot = Number(stateDoc.jackpot || 0) + jackpotGain;
            stateDoc.house = Number(stateDoc.house || 0) + houseGain;
            stateDoc.pool = 0;
            stateDoc.crashed = true;

            stateDoc.revealedSeeds = stateDoc.revealedSeeds || [];
            stateDoc.revealedSeeds.push({ seed: seed, nonce, revealedAt: new Date() });
            const newSeed = crypto.randomBytes(32).toString('hex');
            stateDoc.serverSeed = newSeed;
            stateDoc.serverSeedHashed = crypto.createHash('sha256').update(newSeed).digest('hex');
            stateDoc.nonce = 0;

            await stateDoc.save({ session });
            await RuggedPosition.deleteMany({}, { session });
            try { await Ledger.create([{ type: 'rugged_crash', amount: poolValue, detail: { jackpotGain, houseGain } }], { session }); } catch (e) {}
            await session.commitTransaction();
            session.endSession();

            io.emit('rugged:update', { pool: toDollars(0), jackpot: toDollars(stateDoc.jackpot), house: toDollars(stateDoc.house), crashed: true });
            io.emit('rugged:rugPull', { reason: 'crash', jackpotGain: toDollars(jackpotGain), houseGain: toDollars(houseGain), poolValue: toDollars(poolValue), serverSeedHash: stateDoc.serverSeedHashed });
            return res.json({ crashed: true, pool: toDollars(0), jackpot: toDollars(stateDoc.jackpot), balance: toDollars(userDoc.balance), revealed: { seedHash: stateDoc.serverSeedHashed, revealedNonce: nonce } });
          }

          // persist a priceHistory point into the lightweight state doc
          try {
            stateDoc.priceHistory = stateDoc.priceHistory || [];
            // stateDoc.pool is stored in cents. Compute display-friendly price = pool(dollars) / DISPLAY_DIVISOR
            const raw = stateDoc.pool ? Number((stateDoc.pool / 100) / DISPLAY_DIVISOR) : 0;
            const fakePricePoint = normalizePriceForPersist(raw);
            stateDoc.priceHistory = pushPriceIfChanged(stateDoc.priceHistory, { ts: new Date(), price: fakePricePoint });
          } catch (e) { console.error('Failed to append priceHistory to RuggedState (tx)', e); }

          await stateDoc.save({ session });
          await Ledger.create([{ type: 'rugged_buy', amount: usdAmount, userId: req.userId }], { session }).catch(() => {});
          await session.commitTransaction();
          session.endSession();

            // Mirror this trade into the authoritative Rugged doc so the
            // server-wide priceHistory remains canonical for all clients.
            try {
            const raw = stateDoc.pool ? Number((stateDoc.pool / 100) / DISPLAY_DIVISOR) : 0;
            const fakePrice = normalizePriceForPersist(raw);
            console.log('mirroring buy into Rugged doc (tx)', { fakePrice });
            // Read-modify-write so we can avoid appending unnecessary tiny/duplicate points
            const serverDoc = await Rugged.findOne({ id: 'global' });
            if (!serverDoc) {
              await Rugged.create({ id: 'global', lastPrice: fakePrice, priceHistory: [{ ts: new Date(), price: fakePrice, volume: (usdAmount || 0) / 100 }] });
            } else {
              const last = serverDoc.priceHistory && serverDoc.priceHistory.length ? serverDoc.priceHistory[serverDoc.priceHistory.length - 1].price : serverDoc.lastPrice || 0;
              if (Number(last) !== Number(fakePrice)) {
                serverDoc.priceHistory = serverDoc.priceHistory || [];
                serverDoc.priceHistory = pushPriceIfChanged(serverDoc.priceHistory, { ts: new Date(), price: fakePrice, volume: (usdAmount || 0) / 100 });
                serverDoc.lastPrice = fakePrice;
                try { await serverDoc.save(); } catch (e) { console.error('Failed saving Rugged serverDoc (tx mirror)', e); }
              }
            }
          } catch (e) { console.error('Failed to mirror buy into Rugged doc (tx path)', e); }

          io.emit('rugged:update', { pool: toDollars(stateDoc.pool), jackpot: toDollars(stateDoc.jackpot) });
          return res.json({ pool: toDollars(stateDoc.pool), jackpot: toDollars(stateDoc.jackpot), balance: toDollars(userDoc.balance), position: { id: createdPos._id, entryAmount: toDollars(createdPos.entryAmount), entryPool: toDollars(createdPos.entryPool) } });
        } catch (txErr) {
          if (session) {
            try { await session.abortTransaction(); } catch (e) {}
            try { session.endSession(); } catch (e) {}
          }
          console.error('transaction error /rugged/buy', txErr);
          // fall through to fallback path
        }
      }

      // Non-transactional fallback
      try {
        const stateDoc = await RuggedState.findOneAndUpdate({ id: 'global' }, { $inc: { nonce: 1 } }, { new: true });
        const nonce = stateDoc.nonce || 1;
        const seed = stateDoc.serverSeed;
        const hash = crypto.createHash('sha256').update(seed + ':' + nonce).digest('hex');
        const rInt = parseInt(hash.slice(0, 8), 16) >>> 0;
        const roll = (rInt % 1000) + 1;

        user.balance = Number(user.balance || 0) - usdAmount;
        await user.save();

        const createdPos = await RuggedPosition.create({ userId: req.userId, entryAmount: usdAmount, entryPool: newPool });

        stateDoc.pool = newPool;

        if (roll === 1 || stateDoc.pool <= 1) {
          const poolValue = Number(stateDoc.pool || 0);
          const jackpotGain = Math.floor(poolValue * 0.5);
          const houseGain = poolValue - jackpotGain;
          stateDoc.jackpot = Number(stateDoc.jackpot || 0) + jackpotGain;
          stateDoc.house = Number(stateDoc.house || 0) + houseGain;
          stateDoc.pool = 0;
          stateDoc.crashed = true;
          stateDoc.revealedSeeds = stateDoc.revealedSeeds || [];
          stateDoc.revealedSeeds.push({ seed: seed, nonce, revealedAt: new Date() });
          const newSeed = crypto.randomBytes(32).toString('hex');
          stateDoc.serverSeed = newSeed;
          stateDoc.serverSeedHashed = crypto.createHash('sha256').update(newSeed).digest('hex');
          stateDoc.nonce = 0;
          await stateDoc.save();
          await RuggedPosition.deleteMany({});
          try { await Ledger.create({ type: 'rugged_crash', amount: poolValue, detail: { jackpotGain, houseGain } }); } catch (e) {}
          io.emit('rugged:update', { pool: toDollars(0), jackpot: toDollars(stateDoc.jackpot), house: toDollars(stateDoc.house), crashed: true });
          io.emit('rugged:rugPull', { reason: 'crash', jackpotGain: toDollars(jackpotGain), houseGain: toDollars(houseGain), poolValue: toDollars(poolValue), serverSeedHash: stateDoc.serverSeedHashed });
    return res.json({ crashed: true, pool: toDollars(0), jackpot: toDollars(stateDoc.jackpot), balance: toDollars(user.balance), revealed: { seedHash: stateDoc.serverSeedHashed, revealedNonce: nonce } });
        }

        try {
          stateDoc.priceHistory = stateDoc.priceHistory || [];
          const raw = stateDoc.pool ? Number((stateDoc.pool / 100) / DISPLAY_DIVISOR) : 0;
          const fakePricePoint = normalizePriceForPersist(raw);
          stateDoc.priceHistory = pushPriceIfChanged(stateDoc.priceHistory, { ts: new Date(), price: fakePricePoint });
        } catch (e) { console.error('Failed to append priceHistory to RuggedState (fallback)', e); }
        await stateDoc.save();
        try { await Ledger.create({ type: 'rugged_buy', amount: usdAmount, userId: req.userId }); } catch (e) {}
        // Mirror into Rugged doc so priceHistory is authoritative for clients
          try {
          const raw = stateDoc.pool ? Number((stateDoc.pool / 100) / DISPLAY_DIVISOR) : 0;
          const fakePrice = normalizePriceForPersist(raw);
          console.log('mirroring buy into Rugged doc (fallback)', { fakePrice });
          const serverDoc = await Rugged.findOne({ id: 'global' });
          if (!serverDoc) {
            await Rugged.create({ id: 'global', lastPrice: fakePrice, priceHistory: [{ ts: new Date(), price: fakePrice, volume: (usdAmount || 0) / 100 }] });
          } else {
            const last = serverDoc.priceHistory && serverDoc.priceHistory.length ? serverDoc.priceHistory[serverDoc.priceHistory.length - 1].price : serverDoc.lastPrice || 0;
            if (Number(last) !== Number(fakePrice)) {
              serverDoc.priceHistory = serverDoc.priceHistory || [];
              serverDoc.priceHistory = pushPriceIfChanged(serverDoc.priceHistory, { ts: new Date(), price: fakePrice, volume: (usdAmount || 0) / 100 });
              serverDoc.lastPrice = fakePrice;
              try { await serverDoc.save(); } catch (e) { console.error('Failed saving Rugged serverDoc (fallback mirror)', e); }
            }
          }
        } catch (e) { console.error('Failed to mirror buy into Rugged doc (fallback)', e); }
        io.emit('rugged:update', { pool: toDollars(stateDoc.pool), jackpot: toDollars(stateDoc.jackpot) });
  return res.json({ pool: toDollars(stateDoc.pool), jackpot: toDollars(stateDoc.jackpot), balance: toDollars(user.balance), position: { id: createdPos._id, entryAmount: toDollars(createdPos.entryAmount), entryPool: toDollars(createdPos.entryPool) } });
      } catch (fallbackErr) {
        console.error('fallback error /rugged/buy', fallbackErr);
        return res.status(500).json({ error: 'Server error' });
      }
    } catch (e) { console.error('POST /rugged/buy error', e); res.status(500).json({ error: 'Server error' }); }
  });

  // POST /rugged/sell
  app.post('/rugged/sell', auth, async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const positions = await RuggedPosition.find({ userId: req.userId }).lean();
      if (!positions || positions.length === 0) return res.status(400).json({ error: 'No positions' });

      // allow partial sell via percent (0-100). If not provided default to 100 (sell all)
      let percent = Number(req.body?.percent ?? 100);
      if (!isFinite(percent) || percent <= 0) return res.status(400).json({ error: 'Invalid percent' });
      percent = Math.min(100, Math.max(0, percent));
      const fraction = percent / 100;

      const canTrans = await supportsTransactions();
      if (canTrans) {
        let session = null;
        try {
          session = await mongoose.startSession();
          session.startTransaction();

          const state = await RuggedState.findOne({ id: 'global' }).session(session);
          const currentPool = Number(state.pool || 0);
          let totalPayout = 0;
          // calculate payout for fraction of each position
          for (const p of positions) {
            const entryPool = Number(p.entryPool || currentPool || 1);
            const mult = currentPool / entryPool;
            const payout = Math.floor((Number(p.entryAmount || 0) * mult * fraction));
            totalPayout += payout;
          }
          totalPayout = Math.min(totalPayout, currentPool);

          state.pool = Number(state.pool || 0) - totalPayout;
          user.balance = Number(user.balance || 0) + totalPayout;
          // append a price point to the lightweight state doc (cents -> display)
          try {
            state.priceHistory = state.priceHistory || [];
            const raw = state.pool ? Number((state.pool / 100) / DISPLAY_DIVISOR) : 0;
            const fakePricePoint = normalizePriceForPersist(raw);
            state.priceHistory = pushPriceIfChanged(state.priceHistory, { ts: new Date(), price: fakePricePoint });
          } catch (e) { console.error('Failed to append priceHistory to RuggedState (sell tx)', e); }
          await user.save({ session });
          await state.save({ session });

          // update positions: reduce entryAmount by fraction, delete if depleted
          if (fraction >= 1) {
            await RuggedPosition.deleteMany({ userId: req.userId }, { session });
          } else {
            for (const p of positions) {
              const keep = Math.floor(Number(p.entryAmount || 0) * (1 - fraction));
              if (keep <= 0) {
                await RuggedPosition.deleteOne({ _id: p._id }, { session });
              } else {
                await RuggedPosition.updateOne({ _id: p._id }, { $set: { entryAmount: keep } }, { session });
              }
            }
          }

          try { await Ledger.create([{ type: 'rugged_sell', amount: totalPayout, userId: req.userId, meta: { percent } }], { session }); } catch (e) {}
          await session.commitTransaction();
          session.endSession();
          // Mirror updated canonical price into Rugged doc for clients
          try {
            const raw = state.pool ? Number((state.pool / 100) / DISPLAY_DIVISOR) : 0;
            const fakePrice = normalizePriceForPersist(raw);
            console.log('mirroring sell into Rugged doc (tx)', { fakePrice });
            const serverDoc = await Rugged.findOne({ id: 'global' });
            if (!serverDoc) {
              await Rugged.create({ id: 'global', lastPrice: fakePrice, priceHistory: [{ ts: new Date(), price: fakePrice }] });
            } else {
              const last = serverDoc.priceHistory && serverDoc.priceHistory.length ? serverDoc.priceHistory[serverDoc.priceHistory.length - 1].price : serverDoc.lastPrice || 0;
              if (Number(last) !== Number(fakePrice)) {
                serverDoc.priceHistory = serverDoc.priceHistory || [];
                serverDoc.priceHistory = pushPriceIfChanged(serverDoc.priceHistory, { ts: new Date(), price: fakePrice });
                serverDoc.lastPrice = fakePrice;
                try { await serverDoc.save(); } catch (e) { console.error('Failed saving Rugged serverDoc (sell tx mirror)', e); }
              }
            }
          } catch (e) { console.error('Failed to mirror sell into Rugged doc (tx path)', e); }

          io.emit('rugged:update', { pool: toDollars(state.pool), jackpot: toDollars(state.jackpot) });
          try {
            // return canonical updated positions for the user (converted to dollars)
            const updated = await RuggedPosition.find({ userId: req.userId }).lean();
            const outPositions = (updated || []).map(p => ({ id: p._id, entryAmount: toDollars(p.entryAmount), entryPool: toDollars(p.entryPool), createdAt: p.createdAt }));
            return res.json({ payout: toDollars(totalPayout), pool: toDollars(state.pool), balance: toDollars(user.balance), positions: outPositions });
          } catch (e) {
            console.error('Failed to load updated positions after sell (tx)', e);
            return res.json({ payout: toDollars(totalPayout), pool: toDollars(state.pool), balance: toDollars(user.balance) });
          }
        } catch (txErr) {
          if (session) {
            try { await session.abortTransaction(); } catch (e) {}
            try { session.endSession(); } catch (e) {}
          }
          console.error('transaction error /rugged/sell', txErr);
          // fall through to non-transactional fallback
        }
      }

      // Non-transactional fallback
      const state = await ensureState();
      const currentPool = Number(state.pool || 0);
      let totalPayout = 0;
      for (const p of positions) {
        const entryPool = Number(p.entryPool || currentPool || 1);
        const mult = currentPool / entryPool;
        const payout = Math.floor((Number(p.entryAmount || 0) * mult * fraction));
        totalPayout += payout;
      }
      totalPayout = Math.min(totalPayout, currentPool);
      state.pool = Number(state.pool || 0) - totalPayout;
      user.balance = Number(user.balance || 0) + totalPayout;
      try {
        state.priceHistory = state.priceHistory || [];
        const raw = state.pool ? Number((state.pool / 100) / DISPLAY_DIVISOR) : 0;
        const fakePricePoint = normalizePriceForPersist(raw);
        state.priceHistory = pushPriceIfChanged(state.priceHistory, { ts: new Date(), price: fakePricePoint });
      } catch (e) { console.error('Failed to append priceHistory to RuggedState (sell fallback)', e); }
      await user.save();
      await state.save();

      if (fraction >= 1) {
        await RuggedPosition.deleteMany({ userId: req.userId });
      } else {
        for (const p of positions) {
          const keep = Math.floor(Number(p.entryAmount || 0) * (1 - fraction));
          if (keep <= 0) await RuggedPosition.deleteOne({ _id: p._id });
          else await RuggedPosition.updateOne({ _id: p._id }, { $set: { entryAmount: keep } });
        }
      }

      try { await Ledger.create({ type: 'rugged_sell', amount: totalPayout, userId: req.userId, meta: { percent } }); } catch (e) {}
      // Mirror into Rugged doc so clients have canonical history
  try {
    const raw = state.pool ? Number((state.pool / 100) / DISPLAY_DIVISOR) : 0;
    const fakePrice = normalizePriceForPersist(raw);
    console.log('mirroring sell into Rugged doc (fallback)', { fakePrice });
    const serverDoc = await Rugged.findOne({ id: 'global' });
    if (!serverDoc) {
      await Rugged.create({ id: 'global', lastPrice: fakePrice, priceHistory: [{ ts: new Date(), price: fakePrice }] });
    } else {
      const last = serverDoc.priceHistory && serverDoc.priceHistory.length ? serverDoc.priceHistory[serverDoc.priceHistory.length - 1].price : serverDoc.lastPrice || 0;
      if (Number(last) !== Number(fakePrice)) {
        serverDoc.priceHistory = serverDoc.priceHistory || [];
        serverDoc.priceHistory = pushPriceIfChanged(serverDoc.priceHistory, { ts: new Date(), price: fakePrice });
        serverDoc.lastPrice = fakePrice;
        try { await serverDoc.save(); } catch (e) { console.error('Failed saving Rugged serverDoc (sell fallback mirror)', e); }
      }
    }
  } catch (e) { console.error('Failed to mirror sell into Rugged doc (fallback)', e); }
      io.emit('rugged:update', { pool: toDollars(state.pool), jackpot: toDollars(state.jackpot) });
      try {
        // return canonical updated positions after fallback sell
        const updated = await RuggedPosition.find({ userId: req.userId }).lean();
        const outPositions = (updated || []).map(p => ({ id: p._id, entryAmount: toDollars(p.entryAmount), entryPool: toDollars(p.entryPool), createdAt: p.createdAt }));
        return res.json({ payout: toDollars(totalPayout), pool: toDollars(state.pool), balance: toDollars(user.balance), positions: outPositions });
      } catch (e) {
        console.error('Failed to load updated positions after sell (fallback)', e);
        return res.json({ payout: toDollars(totalPayout), pool: toDollars(state.pool), balance: toDollars(user.balance) });
      }
    } catch (e) { console.error('POST /rugged/sell', e); res.status(500).json({ error: 'Server error' }); }
  });

  // GET /rugged/positions - return current user's open positions (converted to dollars)
  app.get('/rugged/positions', auth, async (req, res) => {
    try {
      const positions = await RuggedPosition.find({ userId: req.userId }).lean();
      // convert stored cents -> dollars for API
      const out = (positions || []).map(p => ({ id: p._id, entryAmount: toDollars(p.entryAmount), entryPool: toDollars(p.entryPool), createdAt: p.createdAt }));
      return res.json({ positions: out });
    } catch (e) {
      console.error('GET /rugged/positions', e);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin-only forced crash (for testing)
  app.post('/admin/rugged/crash', adminOnly, async (req, res) => {
    try {
      const state = await ensureState();
      const poolValue = Number(state.pool || 0); // cents
      const jackpotGain = Math.floor(poolValue * 0.5);
      const houseGain = poolValue - jackpotGain;
      state.jackpot = Number(state.jackpot || 0) + jackpotGain;
      state.house = Number(state.house || 0) + houseGain;
      state.pool = 0;
      state.crashed = true;
      await state.save();
      await RuggedPosition.deleteMany({});
      try { await Ledger.create({ type: 'rugged_crash_admin', amount: poolValue, detail: { jackpotGain, houseGain } }); } catch (e) {}
      io.emit('rugged:update', { pool: toDollars(0), jackpot: toDollars(state.jackpot), house: toDollars(state.house), crashed: true });
      io.emit('rugged:rugPull', { reason: 'admin', jackpotGain: toDollars(jackpotGain), houseGain: toDollars(houseGain), poolValue: toDollars(poolValue) });
      res.json({ ok: true });
    } catch (e) { console.error('admin crash', e); res.status(500).json({ error: 'Server error' }); }
  });

}
