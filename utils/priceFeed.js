// utils/priceFeed.js
import fetch from 'node-fetch';

// Simple cache to avoid rate limits
const priceCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds

// Mapping of symbols to CoinGecko IDs
const SYMBOL_MAP = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'DOGE': 'dogecoin',
    'SHIB': 'shiba-inu',
    'PEPE': 'pepe',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'AVAX': 'avalanche-2',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'ATOM': 'cosmos',
    'LTC': 'litecoin',
    'BCH': 'bitcoin-cash',
    'NEAR': 'near',
    'APT': 'aptos',
    'ARB': 'arbitrum',
    'OP': 'optimism',
    'SUI': 'sui',
    'TIA': 'celestia',
    'SEI': 'sei-network',
    'BONK': 'bonk',
    'WIF': 'dogwifhat'
};

export async function getPrice(symbol) {
    const id = SYMBOL_MAP[symbol.toUpperCase()];
    if (!id) return null;

    // Check cache
    const cached = priceCache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.price;
    }

    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
        const data = await res.json();

        if (data[id] && data[id].usd) {
            const price = data[id].usd;
            priceCache.set(id, { price, timestamp: Date.now() });
            return price;
        }
    } catch (err) {
        console.error(`Error fetching price for ${symbol}:`, err.message);
    }
    return null;
}

export function getSupportedAssets() {
    return Object.keys(SYMBOL_MAP);
}
