// Text formatting utilities for Divide creation
// Handles smart capitalization and spell checking

// Known brand names and special capitalizations
// These will override normal title case rules
const SPECIAL_CASES = {
    // Tech brands with lowercase first letter
    'iphone': 'iPhone',
    'ipad': 'iPad',
    'ipod': 'iPod',
    'imac': 'iMac',
    'ios': 'iOS',
    'icloud': 'iCloud',
    'itunes': 'iTunes',
    'ebay': 'eBay',
    'youtube': 'YouTube',
    'linkedin': 'LinkedIn',
    'paypal': 'PayPal',
    'onedrive': 'OneDrive',
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'github': 'GitHub',
    'gitlab': 'GitLab',
    'playstation': 'PlayStation',
    'xbox': 'Xbox',
    'tiktok': 'TikTok',
    'openai': 'OpenAI',
    'chatgpt': 'ChatGPT',
    'pytorch': 'PyTorch',
    'tensorflow': 'TensorFlow',
    'mongodb': 'MongoDB',
    'mysql': 'MySQL',
    'postgresql': 'PostgreSQL',
    'macos': 'macOS',
    'watchos': 'watchOS',
    'tvos': 'tvOS',
    'airpods': 'AirPods',
    'airbnb': 'Airbnb',
    'whatsapp': 'WhatsApp',
    'snapchat': 'Snapchat',
    'wechat': 'WeChat',
    'onlyfans': 'OnlyFans',
    'wordpress': 'WordPress',
    'shopify': 'Shopify',
    'coinbase': 'Coinbase',
    'binance': 'Binance',
    'dogecoin': 'Dogecoin',
    'ethereum': 'Ethereum',
    'bitcoin': 'Bitcoin',
    'solana': 'Solana',
    'cardano': 'Cardano',
    'ripple': 'Ripple',

    // Sports teams & leagues
    'nfl': 'NFL',
    'nba': 'NBA',
    'mlb': 'MLB',
    'nhl': 'NHL',
    'ufc': 'UFC',
    'mma': 'MMA',
    'f1': 'F1',
    'usa': 'USA',
    'uk': 'UK',
    'eu': 'EU',
    'un': 'UN',
    'fifa': 'FIFA',
    'uefa': 'UEFA',

    // Common tech acronyms
    'ai': 'AI',
    'api': 'API',
    'cpu': 'CPU',
    'gpu': 'GPU',
    'ram': 'RAM',
    'ssd': 'SSD',
    'hdd': 'HDD',
    'usb': 'USB',
    'hdmi': 'HDMI',
    'wifi': 'WiFi',
    'vpn': 'VPN',
    'nft': 'NFT',
    'dao': 'DAO',
    'defi': 'DeFi',
    'ceo': 'CEO',
    'cto': 'CTO',
    'cfo': 'CFO',

    // Common words that should stay lowercase (but capitalize if first word)
    'vs': 'vs',
    'or': 'or',
    'and': 'and',
    'the': 'the',
    'a': 'a',
    'an': 'an',
    'of': 'of',
    'in': 'in',
    'on': 'on',
    'at': 'at',
    'to': 'to',
    'for': 'for',
    'with': 'with',
};

// Common misspellings map
const COMMON_MISSPELLINGS = {
    'andriod': 'Android',
    'androids': 'Androids',
    'iphoen': 'iPhone',
    'ipone': 'iPhone',
    'iohone': 'iPhone',
    'andorid': 'Android',
    'samung': 'Samsung',
    'samsing': 'Samsung',
    'gogle': 'Google',
    'googel': 'Google',
    'amazom': 'Amazon',
    'amazone': 'Amazon',
    'facbook': 'Facebook',
    'facebok': 'Facebook',
    'twiter': 'Twitter',
    'twiiter': 'Twitter',
    'instgram': 'Instagram',
    'instragram': 'Instagram',
    'netfilx': 'Netflix',
    'netflex': 'Netflix',
    'spotfy': 'Spotify',
    'spotifly': 'Spotify',
    'microsft': 'Microsoft',
    'mircosoft': 'Microsoft',
    'playstaion': 'PlayStation',
    'playstaton': 'PlayStation',
    'nintedo': 'Nintendo',
    'nintnedo': 'Nintendo',
    'tesela': 'Tesla',
    'telsa': 'Tesla',
    'bitconi': 'Bitcoin',
    'btc': 'BTC',
    'eth': 'ETH',
    'crpyto': 'Crypto',
    'cyrpto': 'Crypto',
    'politcs': 'Politics',
    'poltics': 'Politics',
    'republcian': 'Republican',
    'democart': 'Democrat',
    'democrate': 'Democrat',
    'trupm': 'Trump',
    'turmp': 'Trump',
    'bidn': 'Biden',
    'bidan': 'Biden',
    'eleciton': 'Election',
    'electoin': 'Election',
    'chamionship': 'Championship',
    'champoinship': 'Championship',
    'superbowl': 'Super Bowl',
    'worldcup': 'World Cup',
    'olymipcs': 'Olympics',
    'olypics': 'Olympics',
    'footbal': 'Football',
    'soccar': 'Soccer',
    'soccor': 'Soccer',
    'basektball': 'Basketball',
    'baseketball': 'Basketball',
    'basebal': 'Baseball',
    'hocky': 'Hockey',
    'hokey': 'Hockey',
    'tenns': 'Tennis',
    'tenis': 'Tennis',
    'recieve': 'Receive',
    'recive': 'Receive',
    'beleive': 'Believe',
    'belive': 'Believe',
    'definately': 'Definitely',
    'definatly': 'Definitely',
    'seperate': 'Separate',
    'untill': 'Until',
    'occured': 'Occurred',
    'occurr': 'Occur',
    'tommorow': 'Tomorrow',
    'tommorrow': 'Tomorrow',
    'goverment': 'Government',
    'govermnent': 'Government',
    'enviroment': 'Environment',
    'enviorment': 'Environment',
};

/**
 * Smart capitalize a word, respecting special cases
 * @param {string} word - The word to capitalize
 * @param {boolean} isFirstWord - Whether this is the first word in the phrase
 * @returns {string} - The properly capitalized word
 */
function smartCapitalizeWord(word, isFirstWord = false) {
    if (!word) return word;

    const lowerWord = word.toLowerCase();

    // Check for misspellings first
    if (COMMON_MISSPELLINGS[lowerWord]) {
        return COMMON_MISSPELLINGS[lowerWord];
    }

    // Check for special cases
    if (SPECIAL_CASES[lowerWord]) {
        const specialCase = SPECIAL_CASES[lowerWord];
        // If it's the first word and the special case starts lowercase, capitalize it
        // e.g., "iphone wins" -> "iPhone wins" not "iPhone wins"
        // But "vs" at start should be "Vs"
        if (isFirstWord && /^[a-z]/.test(specialCase)) {
            // Check if it's a brand (like iPhone) vs a connector word (like "vs")
            const isConnectorWord = ['vs', 'or', 'and', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with'].includes(lowerWord);
            if (isConnectorWord) {
                return specialCase.charAt(0).toUpperCase() + specialCase.slice(1);
            }
            // For brands like iPhone at start, keep as-is
            return specialCase;
        }
        return specialCase;
    }

    // Default: capitalize first letter, lowercase rest
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Smart title case a phrase, respecting brand names and special cases
 * @param {string} text - The text to format
 * @returns {string} - The properly formatted text
 */
export function smartTitleCase(text) {
    if (!text || typeof text !== 'string') return text;

    // Split by spaces while preserving punctuation
    const words = text.trim().split(/\s+/);

    return words.map((word, index) => {
        // Handle words with punctuation attached
        const match = word.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
        if (!match) return word;

        const [, prefix, core, suffix] = match;
        const isFirstWord = index === 0;

        const capitalizedCore = smartCapitalizeWord(core, isFirstWord);
        return prefix + capitalizedCore + suffix;
    }).join(' ');
}

/**
 * Check and correct common spelling mistakes
 * @param {string} text - The text to check
 * @returns {string} - The corrected text
 */
export function correctSpelling(text) {
    if (!text || typeof text !== 'string') return text;

    const words = text.split(/\s+/);

    return words.map(word => {
        // Handle punctuation
        const match = word.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
        if (!match) return word;

        const [, prefix, core, suffix] = match;
        const lowerCore = core.toLowerCase();

        if (COMMON_MISSPELLINGS[lowerCore]) {
            return prefix + COMMON_MISSPELLINGS[lowerCore] + suffix;
        }

        return word;
    }).join(' ');
}

/**
 * Format divide text - combines spell correction and smart capitalization
 * @param {string} text - The text to format
 * @returns {string} - The formatted text
 */
export function formatDivideText(text) {
    if (!text || typeof text !== 'string') return text;

    // First correct spelling, then apply smart capitalization
    const corrected = correctSpelling(text);
    return smartTitleCase(corrected);
}
