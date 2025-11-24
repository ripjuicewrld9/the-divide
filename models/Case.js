import mongoose from 'mongoose';

const caseItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: Number, required: true }, // in dollars (e.g., 1980 = $1980.00)
  chance: { type: Number, required: true, min: 0, max: 100 }, // percentage chance (0-100%, can be fractional like 0.0001%)
  image: { type: String }, // URL to item image
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common',
  },
  color: { type: String, default: '#808080' }, // hex color for UI
});

const caseSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true }, // friendly ID (nanoid)
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorUsername: { type: String, required: true },
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, maxlength: 500 },
  image: { type: String }, // URL to case card image
  items: [caseItemSchema],
  totalValue: { type: Number, required: true }, // sum of all item values in dollars
  // Pricing fields (EV-based)
  expectedValue: { type: Number, default: 0 }, // EV = Σ(item_value × probability) in dollars
  houseEdge: { type: Number, default: 10, min: 1, max: 50 }, // house edge % (default 10%)
  calculatedPrice: { type: Number, default: 0 }, // EV / (1 - house_edge%)
  isPublic: { type: Boolean, default: true }, // can others see and use in battles?
  usageCount: { type: Number, default: 0 }, // how many battles used this case
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update updatedAt and calculate EV and price on save
// Also auto-calculate rarity based on value and chance
caseSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  
  // Auto-calculate rarity for each item based on chance primarily
  const items = this.items || [];
  
  items.forEach((item) => {
    // Rarity calculation based primarily on chance (lower = rarer)
    // Chance is the primary determinant of rarity
    const chance = item.chance || 0;
    
    if (chance <= 1) {
      item.rarity = 'legendary'; // ≤1% is legendary (gold spin items)
    } else if (chance <= 3) {
      item.rarity = 'epic'; // 1-3% is epic
    } else if (chance <= 10) {
      item.rarity = 'rare'; // 3-10% is rare
    } else if (chance <= 30) {
      item.rarity = 'uncommon'; // 10-30% is uncommon
    } else {
      item.rarity = 'common'; // >30% is common
    }
  });
  
  // Calculate EV = Σ(item_value × probability)
  // probability = chance / 100 (since chance is 0-100%)
  let ev = 0;
  ev = items.reduce((sum, item) => {
    const probability = (item.chance || 0) / 100;
    return sum + ((item.value || 0) * probability);
  }, 0);
  
  this.expectedValue = Math.round(ev);
  
  // Calculate price = EV / (1 - house_edge%)
  const houseEdge = (this.houseEdge || 10) / 100;
  this.calculatedPrice = Math.round(this.expectedValue / (1 - houseEdge));
  
  next();
});

export default mongoose.model('Case', caseSchema);
