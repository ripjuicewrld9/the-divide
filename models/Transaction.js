import mongoose from 'mongoose';

/**
 * Transaction Model
 * Tracks all crypto deposits and withdrawals via NOWPayments
 */
const transactionSchema = new mongoose.Schema({
  // User reference
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Transaction type
  type: { 
    type: String, 
    enum: ['deposit', 'withdrawal'], 
    required: true 
  },
  
  // Transaction status
  status: { 
    type: String, 
    enum: [
      'pending',           // Initial state - waiting for payment
      'waiting',           // NOWPayments: waiting for deposit
      'confirming',        // NOWPayments: confirming on blockchain
      'confirmed',         // NOWPayments: confirmed, waiting to process
      'sending',           // NOWPayments: sending funds
      'partially_paid',    // NOWPayments: partial deposit received
      'finished',          // Successfully completed
      'failed',            // Failed transaction
      'refunded',          // Refunded to user
      'expired',           // Payment window expired
      'cancelled'          // Cancelled by user or system
    ], 
    default: 'pending' 
  },
  
  // USD amount (in cents - platform currency)
  amountCents: { type: Number, required: true },
  
  // Crypto details
  cryptoCurrency: { type: String, required: true }, // e.g., 'btc', 'eth', 'ltc', 'usdt'
  cryptoAmount: { type: Number }, // Amount in crypto
  cryptoAmountReceived: { type: Number }, // Actual amount received (for deposits)
  
  // Exchange rate at time of transaction
  exchangeRate: { type: Number }, // USD per 1 crypto
  
  // NOWPayments specific fields
  nowPaymentsId: { type: String, index: true }, // payment_id from NOWPayments
  nowPaymentsInvoiceId: { type: String }, // invoice_id if using invoice flow
  nowPaymentsOrderId: { type: String }, // our internal order ID
  payAddress: { type: String }, // Deposit address for the payment
  payinHash: { type: String }, // Blockchain transaction hash (incoming)
  payoutHash: { type: String }, // Blockchain transaction hash (outgoing withdrawal)
  
  // Withdrawal specific fields
  withdrawAddress: { type: String }, // User's wallet address for withdrawals
  withdrawFeePercent: { type: Number }, // Fee percentage charged
  withdrawFeeCents: { type: Number }, // Fee amount in cents
  
  // Custody customer mode fields
  custodyMode: { type: Boolean, default: false }, // Whether using custody customer flow
  nowPaymentsCustomerId: { type: String }, // NOWPayments customer ID for custody mode
  
  // Timestamps and metadata
  ipnData: { type: mongoose.Schema.Types.Mixed }, // Raw IPN callback data for debugging
  errorMessage: { type: String }, // Error details if failed
  completedAt: { type: Date }, // When transaction finished
  expiresAt: { type: Date }, // When payment window expires
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ nowPaymentsId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1, status: 1 });

// Update timestamp on save
transactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for display amount in dollars
transactionSchema.virtual('amountDollars').get(function() {
  return (this.amountCents / 100).toFixed(2);
});

// Methods
transactionSchema.methods.markCompleted = async function() {
  this.status = 'finished';
  this.completedAt = new Date();
  return this.save();
};

transactionSchema.methods.markFailed = async function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

// Statics for querying
transactionSchema.statics.findByNowPaymentsId = function(paymentId) {
  return this.findOne({ nowPaymentsId: paymentId });
};

transactionSchema.statics.findUserTransactions = function(userId, options = {}) {
  const query = { userId };
  if (options.type) query.type = options.type;
  if (options.status) query.status = options.status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

transactionSchema.statics.getPendingDeposits = function() {
  return this.find({
    type: 'deposit',
    status: { $in: ['pending', 'waiting', 'confirming', 'confirmed', 'sending'] }
  });
};

export default mongoose.model('Transaction', transactionSchema);
