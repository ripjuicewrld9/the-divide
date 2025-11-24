/**
 * Universal Case System
 * 
 * Load and validate any case type (blankets, toys, NFTs, etc.)
 * from JSON with standardized schema.
 * 
 * Schema Example:
 * {
 *   "id": "case-001",
 *   "name": "Premium Blanket Bundle",
 *   "description": "Luxe summer collection",
 *   "category": "textiles",
 *   "thumbnail": "url",
 *   "totalValue": 50000,  // cents
 *   "items": [
 *     {
 *       "id": "item-001",
 *       "name": "Egyptian Cotton",
 *       "value": 5000,     // cents
 *       "chance": 10,      // 0-100
 *       "tier": "common",
 *       "image": "url",
 *       "rarity": "common"
 *     }
 *   ]
 * }
 */

const fs = require('fs');
const path = require('path');

class CaseManager {
  constructor(casesFilePath = './cases.json') {
    this.casesFilePath = casesFilePath;
    this.cases = {};
    this.loadCases();
  }

  /**
   * Load all cases from cases.json
   */
  loadCases() {
    try {
      if (!fs.existsSync(this.casesFilePath)) {
        console.warn(`[CaseManager] ${this.casesFilePath} not found. Starting with empty cases.`);
        this.cases = {};
        return;
      }

      const data = fs.readFileSync(this.casesFilePath, 'utf8');
      const casesData = JSON.parse(data);

      // Validate and register each case
      for (const caseData of casesData) {
        this.validateCase(caseData);
        this.cases[caseData.id] = caseData;
      }

      console.log(`[CaseManager] ✅ Loaded ${Object.keys(this.cases).length} cases`);
    } catch (error) {
      console.error('[CaseManager] Error loading cases:', error.message);
      this.cases = {};
    }
  }

  /**
   * Validate case schema
   */
  validateCase(caseData) {
    const required = ['id', 'name', 'items'];
    for (const field of required) {
      if (!caseData[field]) {
        throw new Error(`[CaseManager] Case missing required field: ${field}`);
      }
    }

    if (!Array.isArray(caseData.items) || caseData.items.length === 0) {
      throw new Error('[CaseManager] Case must have at least 1 item');
    }

    // Validate each item
    for (const item of caseData.items) {
      const itemRequired = ['id', 'name', 'value', 'chance'];
      for (const field of itemRequired) {
        if (item[field] === undefined) {
          throw new Error(`[CaseManager] Item ${item.id} missing required field: ${field}`);
        }
      }

      if (item.chance < 0 || item.chance > 100) {
        throw new Error(`[CaseManager] Item ${item.id} chance must be 0-100`);
      }

      if (item.value < 0) {
        throw new Error(`[CaseManager] Item ${item.id} value must be >= 0`);
      }
    }

    // Validate chances sum to ~100 (allow ±0.5% tolerance for rounding)
    const totalChance = caseData.items.reduce((sum, item) => sum + item.chance, 0);
    if (Math.abs(totalChance - 100) > 0.5) {
      console.warn(`[CaseManager] Case ${caseData.id} chances sum to ${totalChance}% (expected ~100%)`);
    }

    console.log(`[CaseManager] ✅ Validated case: ${caseData.name} (${caseData.items.length} items)`);
  }

  /**
   * Get case by ID
   */
  getCase(caseId) {
    const caseData = this.cases[caseId];
    if (!caseData) {
      throw new Error(`[CaseManager] Case not found: ${caseId}`);
    }
    return caseData;
  }

  /**
   * List all available cases
   */
  getAllCases() {
    return Object.values(this.cases);
  }

  /**
   * Get case summary (for listings, etc)
   */
  getCaseSummary(caseId) {
    const c = this.getCase(caseId);
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      thumbnail: c.thumbnail,
      totalValue: c.totalValue,
      itemCount: c.items.length,
    };
  }

  /**
   * Get case items for RNG (with chance/value only)
   */
  getCaseItems(caseId) {
    const c = this.getCase(caseId);
    return c.items.map(item => ({
      id: item.id,
      name: item.name,
      value: item.value,
      chance: item.chance,
    }));
  }

  /**
   * Get full item details (for displaying results)
   */
  getItem(caseId, itemId) {
    const c = this.getCase(caseId);
    const item = c.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`[CaseManager] Item not found: ${itemId}`);
    }
    return item;
  }

  /**
   * Calculate case statistics
   */
  getCaseStats(caseId) {
    const c = this.getCase(caseId);
    const items = c.items;

    const stats = {
      caseId: c.id,
      caseName: c.name,
      totalItems: items.length,
      minValue: Math.min(...items.map(i => i.value)),
      maxValue: Math.max(...items.map(i => i.value)),
      averageValue: items.reduce((sum, i) => sum + i.value, 0) / items.length,
      totalCaseValue: c.totalValue,
      itemsByTier: {},
    };

    // Group by tier if available
    for (const item of items) {
      const tier = item.tier || 'uncategorized';
      if (!stats.itemsByTier[tier]) {
        stats.itemsByTier[tier] = [];
      }
      stats.itemsByTier[tier].push({
        name: item.name,
        chance: item.chance,
        value: item.value,
      });
    }

    return stats;
  }
}

// ============================================================================
// EXAMPLE cases.json TEMPLATE
// ============================================================================

const EXAMPLE_CASES_JSON = [
  {
    id: "case-blankets-001",
    name: "Premium Blanket Bundle",
    description: "Luxury textiles for summer 2025",
    category: "textiles",
    thumbnail: "https://via.placeholder.com/200?text=Blankets",
    totalValue: 50000,
    items: [
      {
        id: "blanket-cotton",
        name: "Egyptian Cotton Throw",
        value: 5000,
        chance: 30,
        tier: "common",
        image: "https://via.placeholder.com/100?text=Cotton",
        description: "Soft Egyptian cotton, 50x70 inches"
      },
      {
        id: "blanket-wool",
        name: "Merino Wool Blend",
        value: 15000,
        chance: 20,
        tier: "uncommon",
        image: "https://via.placeholder.com/100?text=Wool",
        description: "Premium wool blend, temperature regulating"
      },
      {
        id: "blanket-silk",
        name: "Mulberry Silk Coverlet",
        value: 25000,
        chance: 10,
        tier: "rare",
        image: "https://via.placeholder.com/100?text=Silk",
        description: "100% mulberry silk, hypoallergenic"
      },
      {
        id: "blanket-cashmere",
        name: "Cashmere Dream",
        value: 45000,
        chance: 1,
        tier: "legendary",
        image: "https://via.placeholder.com/100?text=Cashmere",
        description: "Pure cashmere, limited edition"
      },
      {
        id: "blanket-linen",
        name: "Irish Linen Weave",
        value: 8000,
        chance: 39,
        tier: "common",
        image: "https://via.placeholder.com/100?text=Linen",
        description: "Breathable Irish linen"
      }
    ]
  }
];

/**
 * Create example cases.json file
 */
function createExampleCasesFile(filePath = './cases.json') {
  try {
    fs.writeFileSync(filePath, JSON.stringify(EXAMPLE_CASES_JSON, null, 2), 'utf8');
    console.log(`[CaseManager] ✅ Created example cases.json at ${filePath}`);
  } catch (error) {
    console.error('[CaseManager] Error creating example file:', error.message);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  CaseManager,
  createExampleCasesFile,
  EXAMPLE_CASES_JSON,
};
