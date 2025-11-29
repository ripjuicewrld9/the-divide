import crypto from 'crypto';
import https from 'https';

/**
 * Generate random seed from Random.org
 */
export async function generateServerSeedFromRandomOrg() {
  const apiKey = process.env.RANDOM_ORG_API_KEY;
  
  if (!apiKey) {
    console.warn('[WheelPOF] No Random.org API key, falling back to crypto.randomBytes');
    return crypto.randomBytes(32).toString('hex');
  }

  const requestData = JSON.stringify({
    jsonrpc: '2.0',
    method: 'generateStrings',
    params: {
      apiKey,
      n: 1,
      length: 64,
      characters: '0123456789abcdef',
      replacement: true,
    },
    id: Date.now(),
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.random.org',
      path: '/json-rpc/4/invoke',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
      },
      timeout: 5000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.result?.random?.data?.[0]) {
            resolve(parsed.result.random.data[0]);
          } else {
            console.warn('[WheelPOF] Random.org response missing data, using fallback');
            resolve(crypto.randomBytes(32).toString('hex'));
          }
        } catch (err) {
          console.error('[WheelPOF] Random.org parse error:', err.message);
          resolve(crypto.randomBytes(32).toString('hex'));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[WheelPOF] Random.org request error:', err.message);
      resolve(crypto.randomBytes(32).toString('hex'));
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('[WheelPOF] Random.org timeout');
      resolve(crypto.randomBytes(32).toString('hex'));
    });

    req.write(requestData);
    req.end();
  });
}

/**
 * Get EOS block hash for additional entropy
 */
export async function getEOSBlockHash() {
  const requestData = JSON.stringify({
    block_num_or_id: 'head',
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'eos.greymass.com',
      path: '/v1/chain/get_block',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
      },
      timeout: 5000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.id) {
            resolve(parsed.id);
          } else {
            console.warn('[WheelPOF] EOS block hash missing, using fallback');
            resolve(crypto.randomBytes(32).toString('hex'));
          }
        } catch (err) {
          console.error('[WheelPOF] EOS parse error:', err.message);
          resolve(crypto.randomBytes(32).toString('hex'));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[WheelPOF] EOS request error:', err.message);
      resolve(crypto.randomBytes(32).toString('hex'));
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('[WheelPOF] EOS timeout');
      resolve(crypto.randomBytes(32).toString('hex'));
    });

    req.write(requestData);
    req.end();
  });
}

/**
 * Hash server seed for commitment
 */
export function hashServerSeed(serverSeed) {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Combine server seed and block hash to create game seed
 */
export function createGameSeed(serverSeed, blockHash) {
  return crypto
    .createHash('sha256')
    .update(serverSeed + blockHash)
    .digest('hex');
}

/**
 * Generate wheel segment index (0-53) from game seed
 */
export function generateSegmentIndex(gameSeed) {
  // Use multiple rounds of hashing for better distribution
  let hash = gameSeed;
  for (let i = 0; i < 3; i++) {
    hash = crypto.createHash('sha256').update(hash).digest('hex');
  }
  
  // Convert hash to number and map to 0-53
  const hashNum = parseInt(hash.substring(0, 13), 16);
  return hashNum % 54;
}

/**
 * Verify wheel round
 */
export function verifyWheelRound(serverSeed, blockHash, segmentIndex) {
  try {
    const gameSeed = createGameSeed(serverSeed, blockHash);
    const calculatedSegment = generateSegmentIndex(gameSeed);
    return calculatedSegment === segmentIndex;
  } catch (err) {
    console.error('[WheelPOF] Verification error:', err);
    return false;
  }
}

export default {
  generateServerSeedFromRandomOrg,
  getEOSBlockHash,
  hashServerSeed,
  createGameSeed,
  generateSegmentIndex,
  verifyWheelRound,
};
