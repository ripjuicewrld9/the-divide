require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thedivide';

async function run() {
  try {
    console.log('Connecting to', uri);
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = mongoose.connection.db;

    // Aggregation to compute top multipliers (similar to server /keno/leaderboard)
    const agg = [
      { $match: { win: { $gt: 0 } } },
      { $addFields: { multiplier: { $cond: [{ $eq: ['$betAmount', 0] }, 0, { $divide: ['$win', '$betAmount'] }] } } },
      { $sort: { multiplier: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', let: { uid: { $toObjectId: '$userId' } }, pipeline: [ { $match: { $expr: { $eq: ['$_id', '$$uid'] } } }, { $project: { username: 1 } } ], as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { win: 1, multiplier: 1, username: { $ifNull: ['$user.username', '???'] } } }
    ];

    const top = await db.collection('kenorounds').aggregate(agg).toArray();
  const jackpot = await db.collection('jackpots').findOne({ id: 'global' }) || { amount: 0 };
  const house = await db.collection('houses').findOne({ id: 'global' }) || { houseTotal: 0 };

    const snapshot = {
      createdAt: new Date(),
      count: top.length,
      entries: top,
      jackpotAmount: jackpot.amount || 0,
      houseTotal: house.houseTotal || 0
    };

    const res = await db.collection('leaderboard_snapshots').insertOne(snapshot);
    console.log('Inserted snapshot id:', res.insertedId);
    console.log(JSON.stringify(snapshot, null, 2));
  } catch (err) {
    console.error('Failed to save snapshot:', err);
    process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
