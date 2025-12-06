/**
 * Payment Routes (NOWPayments Integration)
 * 
 * Handles crypto deposits and withdrawals via NOWPayments API
 */

import express from 'express';
import * as nowPayments from '../utils/nowPayments.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import House from '../models/House.js';
import { applyVipWithdrawalDiscount } from '../utils/vipSystem.js';

const router = express.Router();

// Minimum amounts (in cents)
const MIN_DEPOSIT_CENTS = 500; // $5.00
const MIN_WITHDRAWAL_CENTS = 1000; // $10.00
const BASE_WITHDRAWAL_FEE_PERCENT = 2.5; // 2.5% fee

// ============================================
// PUBLIC ENDPOINTS
// ============================================

/**
 * GET /api/payments/status
 * Check NOWPayments API status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await nowPayments.getStatus();
    res.json(status);
  } catch (err) {
    console.error('[Payments] Status check failed:', err.message);
    res.status(503).json({ error: 'Payment service unavailable' });
  }
});

/**
 * GET /api/payments/currencies
 * Get available cryptocurrencies for deposits
 */
router.get('/currencies', async (req, res) => {
  try {
    // Return our curated list with display info
    res.json({
      currencies: nowPayments.SUPPORTED_CURRENCIES,
      minDepositUsd: MIN_DEPOSIT_CENTS / 100,
      minWithdrawalUsd: MIN_WITHDRAWAL_CENTS / 100
    });
  } catch (err) {
    console.error('[Payments] Get currencies failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

/**
 * GET /api/payments/min-amount/:currency
 * Get minimum payment amount for a specific currency
 */
router.get('/min-amount/:currency', async (req, res) => {
  try {
    const { currency } = req.params;
    const result = await nowPayments.getMinimumPaymentAmount(currency, 'usd');
    res.json(result);
  } catch (err) {
    console.error('[Payments] Get min amount failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch minimum amount' });
  }
});

/**
 * GET /api/payments/estimate
 * Get estimated crypto amount for USD
 */
router.get('/estimate', async (req, res) => {
  try {
    const { amount, currency } = req.query;
    if (!amount || !currency) {
      return res.status(400).json({ error: 'Amount and currency required' });
    }
    
    const result = await nowPayments.getEstimatedPrice(
      parseFloat(amount),
      'usd',
      currency
    );
    res.json(result);
  } catch (err) {
    console.error('[Payments] Get estimate failed:', err.message);
    res.status(500).json({ error: 'Failed to get estimate' });
  }
});

/**
 * GET /api/payments/balance
 * Get NOWPayments custody balance (admin only)
 */
router.get('/balance', async (req, res) => {
  try {
    const balance = await nowPayments.getCustodyBalance();
    res.json(balance);
  } catch (err) {
    console.error('[Payments] Get balance failed:', err.message);
    res.status(500).json({ error: 'Failed to get custody balance' });
  }
});

// ============================================
// AUTHENTICATED ENDPOINTS
// ============================================

/**
 * POST /api/payments/customer/sync
 * Create or get NOWPayments customer for current user
 */
router.post('/customer/sync', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if customer already exists
    try {
      const existing = await nowPayments.getCustomerByExternalId(req.userId);
      if (existing && existing.id) {
        // Update nowPaymentsCustomerId if not set
        if (!user.nowPaymentsCustomerId) {
          user.nowPaymentsCustomerId = existing.id;
          await user.save();
        }
        return res.json({ customerId: existing.id, status: 'existing' });
      }
    } catch (e) {
      // Customer doesn't exist, create new one
    }

    // Create new customer
    const customer = await nowPayments.createCustomer({
      email: user.email || '',
      name: user.username,
      externalId: req.userId
    });

    // Save customer ID to user
    user.nowPaymentsCustomerId = customer.id;
    await user.save();

    console.log(`[Payments] Created NOWPayments customer ${customer.id} for user ${user.username}`);

    res.json({ customerId: customer.id, status: 'created' });
  } catch (err) {
    console.error('[Payments] Customer sync failed:', err.message);
    res.status(500).json({ error: 'Failed to sync customer' });
  }
});

/**
 * GET /api/payments/customer/balance
 * Get user's custody balance (crypto held in NOWPayments)
 */
router.get('/customer/balance', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.nowPaymentsCustomerId) {
      return res.json({ balances: [], message: 'No custody account setup yet' });
    }

    const balance = await nowPayments.getCustomerBalance(user.nowPaymentsCustomerId);
    res.json({ 
      customerId: user.nowPaymentsCustomerId,
      balances: balance || []
    });
  } catch (err) {
    console.error('[Payments] Get customer balance failed:', err.message);
    res.status(500).json({ error: 'Failed to get custody balance' });
  }
});

/**
 * GET /api/payments/transactions
 * Get user's transaction history
 */
router.get('/transactions', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { type, limit = 20 } = req.query;
    const transactions = await Transaction.findUserTransactions(req.userId, {
      type,
      limit: Math.min(parseInt(limit), 100)
    });

    res.json({
      transactions: transactions.map(t => ({
        id: t._id,
        type: t.type,
        status: t.status,
        statusDescription: nowPayments.getStatusDescription(t.status),
        amountUsd: (t.amountCents / 100).toFixed(2),
        cryptoCurrency: t.cryptoCurrency,
        cryptoAmount: t.cryptoAmount,
        payAddress: t.payAddress,
        withdrawAddress: t.withdrawAddress,
        createdAt: t.createdAt,
        completedAt: t.completedAt
      }))
    });
  } catch (err) {
    console.error('[Payments] Get transactions failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/payments/transaction/:id
 * Get specific transaction details
 */
router.get('/transaction/:id', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // If pending, check status with NOWPayments
    if (transaction.nowPaymentsId && !nowPayments.isPaymentFinal(transaction.status)) {
      try {
        const paymentStatus = await nowPayments.getPaymentStatus(transaction.nowPaymentsId);
        const newStatus = nowPayments.mapPaymentStatus(paymentStatus.payment_status);
        
        if (newStatus !== transaction.status) {
          transaction.status = newStatus;
          transaction.cryptoAmountReceived = paymentStatus.actually_paid;
          await transaction.save();
        }
      } catch (statusErr) {
        console.error('[Payments] Failed to update status:', statusErr.message);
      }
    }

    res.json({
      id: transaction._id,
      type: transaction.type,
      status: transaction.status,
      statusDescription: nowPayments.getStatusDescription(transaction.status),
      amountUsd: (transaction.amountCents / 100).toFixed(2),
      cryptoCurrency: transaction.cryptoCurrency,
      cryptoAmount: transaction.cryptoAmount,
      cryptoAmountReceived: transaction.cryptoAmountReceived,
      payAddress: transaction.payAddress,
      withdrawAddress: transaction.withdrawAddress,
      payinHash: transaction.payinHash,
      payoutHash: transaction.payoutHash,
      feeCents: transaction.withdrawFeeCents,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
      expiresAt: transaction.expiresAt
    });
  } catch (err) {
    console.error('[Payments] Get transaction failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

/**
 * POST /api/payments/deposit
 * Create a new crypto deposit
 */
router.post('/deposit', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { amountUsd, currency } = req.body;
    
    if (!amountUsd || !currency) {
      return res.status(400).json({ error: 'Amount and currency required' });
    }

    const amountCents = Math.round(parseFloat(amountUsd) * 100);
    
    if (amountCents < MIN_DEPOSIT_CENTS) {
      return res.status(400).json({ 
        error: `Minimum deposit is $${(MIN_DEPOSIT_CENTS / 100).toFixed(2)}` 
      });
    }

    // Validate currency is supported
    const supportedCurrency = nowPayments.SUPPORTED_CURRENCIES.find(
      c => c.id === currency.toLowerCase()
    );
    if (!supportedCurrency) {
      return res.status(400).json({ error: 'Unsupported currency' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate unique order ID
    const orderId = `DEP-${req.userId}-${Date.now()}`;

    // Create NOWPayments invoice (hosted checkout)
    const frontendUrl = process.env.FRONTEND_URL || 'https://thedivide.us';
    const payment = await nowPayments.createInvoice({
      priceAmount: amountCents / 100,
      priceCurrency: 'usd',
      orderId,
      orderDescription: `Deposit to The Divide - ${user.username}`,
      successUrl: `${frontendUrl}/wallet?deposit=success`,
      cancelUrl: `${frontendUrl}/wallet?deposit=cancelled`
    });

    // Create transaction record
    const transaction = await Transaction.create({
      userId: req.userId,
      type: 'deposit',
      status: 'waiting',
      amountCents,
      cryptoCurrency: currency.toLowerCase(),
      nowPaymentsId: payment.id,
      nowPaymentsInvoiceId: payment.id,
      nowPaymentsOrderId: orderId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry
    });

    console.log(`[Payments] Deposit created: ${transaction._id} for user ${user.username}, $${amountUsd}`);

    res.json({
      transactionId: transaction._id,
      invoiceUrl: payment.invoice_url,
      invoiceId: payment.id,
      orderId,
      expiresAt: transaction.expiresAt
    });
  } catch (err) {
    console.error('[Payments] Create deposit failed:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create deposit' });
  }
});

/**
 * POST /api/payments/deposit/direct
 * Create deposit with direct payment address using custody customer mode
 */
router.post('/deposit/direct', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { amountUsd, currency, payCurrency } = req.body;
    const cryptoCurrency = currency || payCurrency; // Accept both field names
    
    if (!amountUsd || !cryptoCurrency) {
      return res.status(400).json({ error: 'Amount and currency required' });
    }

    const amountCents = Math.round(parseFloat(amountUsd) * 100);
    
    if (amountCents < MIN_DEPOSIT_CENTS) {
      return res.status(400).json({ 
        error: `Minimum deposit is $${(MIN_DEPOSIT_CENTS / 100).toFixed(2)}` 
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const orderId = `DEP-${req.userId}-${Date.now()}`;

    // Create standard payment (non-custody) - funds go to your main wallet
    const payment = await nowPayments.createPayment({
      priceAmount: amountCents / 100,
      priceCurrency: 'usd',
      payCurrency: cryptoCurrency.toLowerCase(),
      orderId,
      orderDescription: `Deposit to The Divide - ${user.username}`,
      ipnCallbackUrl: process.env.NOWPAYMENTS_IPN_CALLBACK_URL
    });

    const transaction = await Transaction.create({
      userId: req.userId,
      type: 'deposit',
      status: 'waiting',
      amountCents,
      cryptoCurrency: cryptoCurrency.toLowerCase(),
      cryptoAmount: payment.pay_amount,
      nowPaymentsId: payment.payment_id,
      nowPaymentsOrderId: orderId,
      payAddress: payment.pay_address,
      exchangeRate: amountCents / 100 / payment.pay_amount,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    console.log(`[Payments] Deposit created: ${transaction._id}, payment: ${payment.payment_id}, address: ${payment.pay_address}`);

    res.json({
      transactionId: transaction._id,
      payAddress: payment.pay_address,
      payAmount: payment.pay_amount,
      payCurrency: payment.pay_currency,
      orderId,
      expiresAt: transaction.expiresAt
    });
  } catch (err) {
    console.error('[Payments] Create deposit failed:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create deposit' });
  }
});

/**
 * POST /api/payments/withdraw
 * Request a withdrawal using custody customer payout
 */
router.post('/withdraw', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { amountUsd, currency, address } = req.body;
    
    if (!amountUsd || !currency || !address) {
      return res.status(400).json({ error: 'Amount, currency, and address required' });
    }

    const amountCents = Math.round(parseFloat(amountUsd) * 100);
    
    if (amountCents < MIN_WITHDRAWAL_CENTS) {
      return res.status(400).json({ 
        error: `Minimum withdrawal is $${(MIN_WITHDRAWAL_CENTS / 100).toFixed(2)}` 
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check wager requirement
    if ((user.wagerRequirement || 0) > 0) {
      return res.status(400).json({ 
        error: `You must wager $${((user.wagerRequirement || 0) / 100).toFixed(2)} more before withdrawing`,
        wagerRequired: (user.wagerRequirement || 0) / 100
      });
    }

    // Calculate fee with VIP discount
    const feePercent = applyVipWithdrawalDiscount(BASE_WITHDRAWAL_FEE_PERCENT, user.vipTier);
    const feeCents = Math.round(amountCents * (feePercent / 100));
    const totalDeductCents = amountCents + feeCents;

    if (user.balance < totalDeductCents) {
      return res.status(400).json({ 
        error: `Insufficient balance. You need $${(totalDeductCents / 100).toFixed(2)} (including $${(feeCents / 100).toFixed(2)} fee)`,
        required: totalDeductCents / 100,
        fee: feeCents / 100,
        balance: user.balance / 100
      });
    }

    // Get estimated crypto amount
    const estimate = await nowPayments.getEstimatedPrice(
      amountCents / 100,
      'usd',
      currency.toLowerCase()
    );

    const orderId = `WD-${req.userId}-${Date.now()}`;

    // Create transaction record
    const transaction = await Transaction.create({
      userId: req.userId,
      type: 'withdrawal',
      status: 'pending',
      amountCents,
      cryptoCurrency: currency.toLowerCase(),
      cryptoAmount: estimate.estimated_amount,
      withdrawAddress: address,
      withdrawFeePercent: feePercent,
      withdrawFeeCents: feeCents,
      nowPaymentsOrderId: orderId,
      exchangeRate: amountCents / 100 / estimate.estimated_amount
    });

    // Deduct from user balance
    user.balance -= totalDeductCents;
    user.totalWithdrawn = (user.totalWithdrawn || 0) + amountCents;
    user.totalRedemptions = (user.totalRedemptions || 0) + 1;
    await user.save();

    // Add fee to house
    if (feeCents > 0) {
      await House.findOneAndUpdate(
        {},
        { $inc: { totalFeesCollected: feeCents } },
        { upsert: true }
      );
    }

    console.log(`[Payments] Withdrawal requested: ${transaction._id} for user ${user.username}, $${amountUsd} to ${address}`);

    // TODO: For automatic payouts, call nowPayments.createPayout here
    // For now, withdrawals will be processed manually or via admin endpoint

    res.json({
      transactionId: transaction._id,
      amountUsd: (amountCents / 100).toFixed(2),
      feeCents,
      feePercent,
      totalDeducted: (totalDeductCents / 100).toFixed(2),
      estimatedCrypto: estimate.estimated_amount,
      currency: currency.toLowerCase(),
      address,
      status: 'pending',
      message: 'Withdrawal request submitted. Processing typically takes 1-24 hours.'
    });
  } catch (err) {
    console.error('[Payments] Create withdrawal failed:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create withdrawal' });
  }
});

/**
 * POST /api/payments/webhook
 * NOWPayments IPN callback handler
 * This endpoint receives payment status updates from NOWPayments
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Get signature from header
    const signature = req.headers['x-nowpayments-sig'];
    
    // Parse body
    let body;
    if (Buffer.isBuffer(req.body)) {
      body = JSON.parse(req.body.toString());
    } else if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }

    console.log('[Payments] Webhook received:', JSON.stringify(body));

    // Verify signature (skip in development if no secret set)
    if (process.env.NOWPAYMENTS_IPN_SECRET) {
      if (!signature || !nowPayments.verifyIPNSignature(body, signature)) {
        console.error('[Payments] Invalid IPN signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      console.warn('[Payments] IPN signature verification skipped - no secret configured');
    }

    const paymentId = body.payment_id || body.id;
    const paymentStatus = body.payment_status;
    const orderId = body.order_id;

    if (!paymentId) {
      return res.status(400).json({ error: 'Missing payment_id' });
    }

    // Find transaction
    let transaction = await Transaction.findByNowPaymentsId(String(paymentId));
    
    if (!transaction && orderId) {
      transaction = await Transaction.findOne({ nowPaymentsOrderId: orderId });
    }

    if (!transaction) {
      console.error('[Payments] Transaction not found for payment:', paymentId);
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Store raw IPN data
    transaction.ipnData = body;

    // Map and update status
    const newStatus = nowPayments.mapPaymentStatus(paymentStatus);
    const oldStatus = transaction.status;

    transaction.status = newStatus;
    transaction.cryptoAmountReceived = body.actually_paid || body.pay_amount;
    transaction.payinHash = body.payin_hash;

    // Handle completion for deposits
    if (transaction.type === 'deposit' && newStatus === 'finished' && oldStatus !== 'finished') {
      // Credit user balance
      const user = await User.findById(transaction.userId);
      if (user) {
        user.balance += transaction.amountCents;
        user.totalDeposited = (user.totalDeposited || 0) + transaction.amountCents;
        // Add 1x playthrough requirement for deposits
        user.wagerRequirement = (user.wagerRequirement || 0) + transaction.amountCents;
        await user.save();

        console.log(`[Payments] Deposit completed: ${transaction._id}, credited $${(transaction.amountCents / 100).toFixed(2)} to ${user.username}`);
      }
      transaction.completedAt = new Date();
    }

    // Handle withdrawal completion
    if (transaction.type === 'withdrawal' && newStatus === 'finished' && oldStatus !== 'finished') {
      transaction.payoutHash = body.payout_hash || body.payin_hash;
      transaction.completedAt = new Date();
      console.log(`[Payments] Withdrawal completed: ${transaction._id}`);
    }

    await transaction.save();

    console.log(`[Payments] Transaction ${transaction._id} status updated: ${oldStatus} -> ${newStatus}`);

    res.json({ success: true });
  } catch (err) {
    console.error('[Payments] Webhook error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * GET /api/payments/admin/pending
 * Get all pending withdrawals (admin only)
 */
router.get('/admin/pending', async (req, res) => {
  try {
    // Note: adminOnly middleware should be applied when mounting this router
    const pendingWithdrawals = await Transaction.find({
      type: 'withdrawal',
      status: 'pending'
    })
      .populate('userId', 'username email')
      .sort({ createdAt: 1 });

    res.json({
      withdrawals: pendingWithdrawals.map(w => ({
        id: w._id,
        user: w.userId?.username || 'Unknown',
        email: w.userId?.email,
        amountUsd: (w.amountCents / 100).toFixed(2),
        feeCents: w.withdrawFeeCents,
        cryptoCurrency: w.cryptoCurrency,
        cryptoAmount: w.cryptoAmount,
        address: w.withdrawAddress,
        createdAt: w.createdAt
      }))
    });
  } catch (err) {
    console.error('[Payments] Get pending withdrawals failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch pending withdrawals' });
  }
});

/**
 * POST /api/payments/admin/process/:id
 * Process a pending withdrawal using custody customer payout (admin only)
 */
router.post('/admin/process/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.type !== 'withdrawal' || transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Transaction is not a pending withdrawal' });
    }

    let payout;
    
    // Use custody customer payout if we have customer ID
    if (transaction.nowPaymentsCustomerId && transaction.custodyMode) {
      // Custody payout: transfer from customer to external address
      payout = await nowPayments.createCustomerPayout({
        customerId: transaction.nowPaymentsCustomerId,
        address: transaction.withdrawAddress,
        amount: transaction.cryptoAmount,
        currency: transaction.cryptoCurrency
      });
      console.log(`[Payments] Custody payout created for customer ${transaction.nowPaymentsCustomerId}`);
    } else {
      // Legacy: direct payout from master balance
      payout = await nowPayments.createPayout({
        address: transaction.withdrawAddress,
        amount: transaction.cryptoAmount,
        currency: transaction.cryptoCurrency,
        uniqueExternalId: transaction.nowPaymentsOrderId
      });
    }

    transaction.nowPaymentsId = payout.id;
    transaction.status = 'sending';
    await transaction.save();

    console.log(`[Payments] Withdrawal ${transaction._id} processed, payout ID: ${payout.id}`);

    res.json({
      success: true,
      payoutId: payout.id,
      custodyMode: transaction.custodyMode || false,
      message: 'Withdrawal is being processed'
    });
  } catch (err) {
    console.error('[Payments] Process withdrawal failed:', err.message);
    res.status(500).json({ error: err.message || 'Failed to process withdrawal' });
  }
});

/**
 * POST /api/payments/admin/reject/:id
 * Reject a pending withdrawal and refund (admin only)
 */
router.post('/admin/reject/:id', async (req, res) => {
  try {
    const { reason } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.type !== 'withdrawal' || transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Transaction is not a pending withdrawal' });
    }

    // Refund user
    const user = await User.findById(transaction.userId);
    if (user) {
      const refundAmount = transaction.amountCents + (transaction.withdrawFeeCents || 0);
      user.balance += refundAmount;
      user.totalWithdrawn = Math.max(0, (user.totalWithdrawn || 0) - transaction.amountCents);
      user.totalRedemptions = Math.max(0, (user.totalRedemptions || 0) - 1);
      await user.save();
    }

    transaction.status = 'cancelled';
    transaction.errorMessage = reason || 'Withdrawal rejected by admin';
    await transaction.save();

    console.log(`[Payments] Withdrawal ${transaction._id} rejected and refunded`);

    res.json({
      success: true,
      message: 'Withdrawal rejected and refunded'
    });
  } catch (err) {
    console.error('[Payments] Reject withdrawal failed:', err.message);
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

export default router;
