import crypto from 'crypto';

/**
 * NOWPayments API Integration
 * Documentation: https://documenter.getpostman.com/view/7907941/2s93JusNJt
 * 
 * This utility handles all interactions with NOWPayments for crypto deposits and withdrawals.
 * Uses Sub-Partner API for customer/custody management.
 */

const API_BASE_URL = 'https://api.nowpayments.io/v1';
const SANDBOX_API_BASE_URL = 'https://api-sandbox.nowpayments.io/v1';

// Use sandbox in development
const getBaseUrl = () => {
  return process.env.NOWPAYMENTS_SANDBOX === 'true' ? SANDBOX_API_BASE_URL : API_BASE_URL;
};

/**
 * Make an authenticated request to NOWPayments API (standard endpoints)
 */
async function apiRequest(endpoint, options = {}) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error('NOWPAYMENTS_API_KEY environment variable not set');
  }

  const url = `${getBaseUrl()}${endpoint}`;
  const headers = {
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || `NOWPayments API error: ${response.status}`);
    error.statusCode = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

/**
 * Make an authenticated request to NOWPayments Sub-Partner API
 * Requires both Bearer token and API key
 */
async function subPartnerRequest(endpoint, options = {}) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  const jwtToken = process.env.NOWPAYMENTS_JWT_TOKEN;
  
  if (!apiKey) {
    throw new Error('NOWPAYMENTS_API_KEY environment variable not set');
  }
  if (!jwtToken) {
    throw new Error('NOWPAYMENTS_JWT_TOKEN environment variable not set - required for sub-partner/custody API');
  }

  const url = `${getBaseUrl()}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${jwtToken}`,
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
    ...options.headers
  };

  console.log(`[NOWPayments] Sub-partner request: ${options.method || 'GET'} ${endpoint}`);

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`[NOWPayments] Sub-partner API error:`, data);
    const error = new Error(data.message || data.statusCode || `NOWPayments API error: ${response.status}`);
    error.statusCode = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

/**
 * Check API status / availability
 */
export async function getStatus() {
  return apiRequest('/status');
}

/**
 * Get list of available cryptocurrencies for payments
 */
export async function getAvailableCurrencies() {
  return apiRequest('/currencies');
}

/**
 * Get list of currencies available for checkout (with fiat options)
 */
export async function getAvailableCheckedCurrencies() {
  return apiRequest('/merchant/coins');
}

/**
 * Get minimum payment amount for a currency pair
 * @param {string} currencyFrom - Source currency (e.g., 'btc')
 * @param {string} currencyTo - Target currency (e.g., 'usd')
 */
export async function getMinimumPaymentAmount(currencyFrom, currencyTo = 'usd') {
  return apiRequest(`/min-amount?currency_from=${currencyFrom}&currency_to=${currencyTo}`);
}

/**
 * Get estimated price for a payment
 * @param {number} amount - Amount to convert
 * @param {string} currencyFrom - Source currency
 * @param {string} currencyTo - Target currency
 */
export async function getEstimatedPrice(amount, currencyFrom, currencyTo) {
  return apiRequest(`/estimate?amount=${amount}&currency_from=${currencyFrom}&currency_to=${currencyTo}`);
}

/**
 * Create a payment (inline - generates address directly)
 * Use this for deposits where user sends crypto
 * 
 * @param {Object} params
 * @param {number} params.priceAmount - Amount in fiat (USD)
 * @param {string} params.priceCurrency - Fiat currency (default: 'usd')
 * @param {string} params.payCurrency - Crypto currency user will pay with
 * @param {string} params.orderId - Your internal order ID
 * @param {string} params.orderDescription - Description for the order
 * @param {string} params.ipnCallbackUrl - URL for IPN callbacks
 * @param {string} params.successUrl - Redirect URL on success
 * @param {string} params.cancelUrl - Redirect URL on cancel
 */
export async function createPayment(params) {
  const payload = {
    price_amount: params.priceAmount,
    price_currency: params.priceCurrency || 'usd',
    pay_currency: params.payCurrency,
    order_id: params.orderId,
    order_description: params.orderDescription || 'Deposit to The Divide',
    ipn_callback_url: params.ipnCallbackUrl || process.env.NOWPAYMENTS_IPN_CALLBACK_URL,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    is_fixed_rate: params.isFixedRate || false,
    is_fee_paid_by_user: params.isFeePaidByUser || false
  };

  return apiRequest('/payment', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Create an invoice (hosted checkout page)
 * Use this for a more guided checkout experience
 * 
 * @param {Object} params
 * @param {number} params.priceAmount - Amount in fiat
 * @param {string} params.priceCurrency - Fiat currency (default: 'usd')
 * @param {string} params.orderId - Your internal order ID
 * @param {string} params.orderDescription - Description
 * @param {string} params.ipnCallbackUrl - IPN callback URL
 * @param {string} params.successUrl - Success redirect
 * @param {string} params.cancelUrl - Cancel redirect
 */
export async function createInvoice(params) {
  const payload = {
    price_amount: params.priceAmount,
    price_currency: params.priceCurrency || 'usd',
    order_id: params.orderId,
    order_description: params.orderDescription || 'Deposit to The Divide',
    ipn_callback_url: params.ipnCallbackUrl || process.env.NOWPAYMENTS_IPN_CALLBACK_URL,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    is_fixed_rate: params.isFixedRate || false,
    is_fee_paid_by_user: params.isFeePaidByUser || false
  };

  return apiRequest('/invoice', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Get payment status by payment ID
 * @param {string} paymentId - NOWPayments payment ID
 */
export async function getPaymentStatus(paymentId) {
  return apiRequest(`/payment/${paymentId}`);
}

/**
 * Get list of payments with optional filters
 * @param {Object} params - Filter parameters
 * @param {number} params.limit - Max results (default 10, max 500)
 * @param {number} params.page - Page number (default 0)
 * @param {string} params.sortBy - Sort field
 * @param {string} params.orderBy - Sort direction (asc/desc)
 * @param {string} params.dateFrom - Start date filter
 * @param {string} params.dateTo - End date filter
 */
export async function getPayments(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.page) queryParams.append('page', params.page);
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.orderBy) queryParams.append('orderBy', params.orderBy);
  if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
  if (params.dateTo) queryParams.append('dateTo', params.dateTo);

  const query = queryParams.toString();
  return apiRequest(`/payment/${query ? '?' + query : ''}`);
}

// ============================================
// PAYOUT (Withdrawal) Functions
// Requires separate Payout API key
// ============================================

/**
 * Make an authenticated request to NOWPayments Payout API
 */
async function payoutApiRequest(endpoint, options = {}) {
  const apiKey = process.env.NOWPAYMENTS_PAYOUT_API_KEY || process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error('NOWPAYMENTS_PAYOUT_API_KEY environment variable not set');
  }

  const url = `${getBaseUrl()}${endpoint}`;
  const headers = {
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || `NOWPayments Payout API error: ${response.status}`);
    error.statusCode = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

/**
 * Get payout balance (available funds for withdrawals)
 */
export async function getPayoutBalance() {
  return payoutApiRequest('/balance');
}

/**
 * Create a payout (withdrawal) to user's wallet
 * 
 * @param {Object} params
 * @param {string} params.address - User's wallet address
 * @param {number} params.amount - Amount in crypto
 * @param {string} params.currency - Cryptocurrency (e.g., 'btc', 'eth')
 * @param {string} params.ipnCallbackUrl - IPN callback URL
 * @param {string} params.uniqueExternalId - Your internal transaction ID
 */
export async function createPayout(params) {
  // First, verify we have enough balance
  const balance = await getPayoutBalance();
  const currencyBalance = balance.find(b => b.currency.toLowerCase() === params.currency.toLowerCase());
  
  if (!currencyBalance || currencyBalance.amount < params.amount) {
    throw new Error(`Insufficient ${params.currency.toUpperCase()} balance for payout`);
  }

  const payload = {
    address: params.address,
    amount: params.amount,
    currency: params.currency,
    ipn_callback_url: params.ipnCallbackUrl || process.env.NOWPAYMENTS_IPN_CALLBACK_URL,
    unique_external_id: params.uniqueExternalId
  };

  return payoutApiRequest('/payout', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Get payout status
 * @param {string} payoutId - NOWPayments payout ID
 */
export async function getPayoutStatus(payoutId) {
  return payoutApiRequest(`/payout/${payoutId}`);
}

// ============================================
// CUSTODY & CONVERSION Functions
// ============================================

/**
 * Get custody balance (funds held in NOWPayments)
 */
export async function getCustodyBalance() {
  return apiRequest('/balance');
}

/**
 * Create a conversion between currencies (off-chain, no network fees)
 * Requires Custody to be enabled
 * 
 * @param {Object} params
 * @param {string} params.from - Source currency (e.g., 'btc')
 * @param {string} params.to - Target currency (e.g., 'usdcsol')
 * @param {number} params.amount - Amount to convert
 */
export async function createConversion(params) {
  const payload = {
    from: params.from,
    to: params.to,
    amount: params.amount
  };

  return apiRequest('/conversion', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Get conversion estimate
 */
export async function getConversionEstimate(from, to, amount) {
  return apiRequest(`/conversion/estimate?from=${from}&to=${to}&amount=${amount}`);
}

// ============================================
// SUB-PARTNER / CUSTOMER MANAGEMENT Functions
// Uses NOWPayments Sub-Partner API for custody
// Requires NOWPAYMENTS_JWT_TOKEN env variable
// ============================================

/**
 * Create a sub-partner (customer account)
 * This creates a custody sub-account for a user
 * 
 * @param {Object} params
 * @param {string} params.name - Customer name/username
 * @param {string} params.externalId - Your internal user ID (optional, for your tracking)
 * @returns {Object} { id: "sub_partner_id", ... }
 */
export async function createCustomer(params) {
  const payload = {
    name: params.name || params.externalId || 'user'
  };

  const result = await subPartnerRequest('/sub-partner', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  // The API returns { result: { id: "...", ... } }
  return result.result || result;
}

/**
 * Get sub-partner by ID
 */
export async function getCustomer(subPartnerId) {
  const result = await subPartnerRequest(`/sub-partner/${subPartnerId}`);
  return result.result || result;
}

/**
 * Get sub-partner's balance
 * Returns balances held in NOWPayments for this customer
 */
export async function getCustomerBalance(subPartnerId) {
  const result = await subPartnerRequest(`/sub-partner/${subPartnerId}/balance`);
  return result.result || result;
}

/**
 * Get sub-partner's payment history
 */
export async function getCustomerPayments(subPartnerId) {
  const result = await subPartnerRequest(`/sub-partner/payments?sub_partner_id=${subPartnerId}`);
  return result.result || result;
}

/**
 * Create a deposit payment for a sub-partner
 * This generates a payment address that credits the customer's sub-account
 * 
 * @param {Object} params
 * @param {string} params.customerId - Sub-partner ID
 * @param {string} params.currency - Crypto currency (btc, eth, trx, etc.)
 * @param {number} params.priceAmount - Amount in crypto (or USD if using price conversion)
 * @param {string} params.orderId - Your internal order/reference ID
 * @param {string} params.ipnCallbackUrl - Optional IPN callback URL
 */
export async function createCustomerDeposit(params) {
  const payload = {
    currency: params.currency.toLowerCase(),
    amount: params.priceAmount,
    sub_partner_id: params.customerId,
    is_fixed_rate: false,
    is_fee_paid_by_user: false
  };

  if (params.ipnCallbackUrl || process.env.NOWPAYMENTS_IPN_CALLBACK_URL) {
    payload.ipn_callback_url = params.ipnCallbackUrl || process.env.NOWPAYMENTS_IPN_CALLBACK_URL;
  }

  const result = await subPartnerRequest('/sub-partner/payment', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return result.result || result;
}

/**
 * Deposit from master account to sub-partner
 * Transfer funds from your main custody balance to a customer
 * 
 * @param {Object} params
 * @param {string} params.customerId - Sub-partner ID
 * @param {string} params.currency - Currency to transfer
 * @param {number} params.amount - Amount to transfer
 */
export async function transferToCustomer(params) {
  const payload = {
    currency: params.currency.toLowerCase(),
    amount: params.amount,
    sub_partner_id: params.customerId
  };

  const result = await subPartnerRequest('/sub-partner/deposit', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return result.result || result;
}

/**
 * Write-off from sub-partner to master account
 * Transfer funds from a customer's sub-account to your main custody
 * 
 * @param {Object} params
 * @param {string} params.customerId - Sub-partner ID
 * @param {string} params.currency - Currency to transfer
 * @param {number} params.amount - Amount to transfer
 */
export async function transferFromCustomer(params) {
  const payload = {
    currency: params.currency.toLowerCase(),
    amount: params.amount,
    sub_partner_id: params.customerId
  };

  const result = await subPartnerRequest('/sub-partner/write-off', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return result.result || result;
}

/**
 * Get transfer status
 */
export async function getTransferStatus(transferId) {
  const result = await subPartnerRequest(`/sub-partner/transfer/${transferId}`);
  return result.result || result;
}

/**
 * Create payout from customer's balance to external wallet
 * First writes off from customer to master, then creates external payout
 * 
 * @param {Object} params
 * @param {string} params.customerId - Sub-partner ID
 * @param {string} params.address - Destination wallet address
 * @param {string} params.currency - Currency to withdraw
 * @param {number} params.amount - Amount to withdraw
 */
export async function createCustomerPayout(params) {
  // First write-off from customer to master account
  await transferFromCustomer({
    customerId: params.customerId,
    currency: params.currency,
    amount: params.amount
  });

  // Then create external payout from master account
  return createPayout({
    address: params.address,
    currency: params.currency,
    amount: params.amount,
    ipnCallbackUrl: params.ipnCallbackUrl
  });
}

// Legacy aliases for compatibility
export const getCustomerByExternalId = async (externalId) => {
  console.warn('[NOWPayments] getCustomerByExternalId is deprecated - sub-partner API does not support external ID lookup');
  return null;
};

export const updateCustomer = async (customerId, params) => {
  console.warn('[NOWPayments] updateCustomer is deprecated - use sub-partner API');
  return null;
};

export const deleteCustomer = async (customerId) => {
  console.warn('[NOWPayments] deleteCustomer is deprecated - use sub-partner API');
  return null;
};

export const internalTransfer = async (params) => {
  console.warn('[NOWPayments] internalTransfer between customers not supported in sub-partner API');
  return null;
};

// ============================================
// IPN (Instant Payment Notification) Verification
// ============================================

/**
 * Verify IPN callback signature
 * NOWPayments uses HMAC SHA-512 to sign IPN callbacks
 * 
 * @param {Object} body - Raw request body from IPN callback
 * @param {string} signature - x-nowpayments-sig header value
 * @returns {boolean} - Whether signature is valid
 */
export function verifyIPNSignature(body, signature) {
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!ipnSecret) {
    console.error('NOWPAYMENTS_IPN_SECRET not set - cannot verify IPN signatures');
    return false;
  }

  // Sort body keys and stringify
  const sortedBody = sortObject(body);
  const bodyString = JSON.stringify(sortedBody);

  // Create HMAC SHA-512 signature
  const hmac = crypto.createHmac('sha512', ipnSecret);
  hmac.update(bodyString);
  const calculatedSignature = hmac.digest('hex');

  // Compare signatures (timing-safe comparison)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  } catch (e) {
    // If buffers are different lengths, timingSafeEqual throws
    return false;
  }
}

/**
 * Sort object keys alphabetically (required for IPN signature verification)
 */
function sortObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }

  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortObject(obj[key]);
  });
  return sorted;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Map NOWPayments status to our internal status
 */
export function mapPaymentStatus(nowPaymentsStatus) {
  const statusMap = {
    'waiting': 'waiting',
    'confirming': 'confirming',
    'confirmed': 'confirmed',
    'sending': 'sending',
    'partially_paid': 'partially_paid',
    'finished': 'finished',
    'failed': 'failed',
    'refunded': 'refunded',
    'expired': 'expired'
  };
  return statusMap[nowPaymentsStatus] || 'pending';
}

/**
 * Check if payment status is final (no more updates expected)
 */
export function isPaymentFinal(status) {
  return ['finished', 'failed', 'refunded', 'expired'].includes(status);
}

/**
 * Check if payment is successful
 */
export function isPaymentSuccessful(status) {
  return status === 'finished';
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status) {
  const descriptions = {
    'pending': 'Payment initiated',
    'waiting': 'Waiting for payment',
    'confirming': 'Payment received, confirming on blockchain',
    'confirmed': 'Payment confirmed, processing',
    'sending': 'Processing payout',
    'partially_paid': 'Partial payment received',
    'finished': 'Payment completed successfully',
    'failed': 'Payment failed',
    'refunded': 'Payment refunded',
    'expired': 'Payment window expired',
    'cancelled': 'Payment cancelled'
  };
  return descriptions[status] || 'Unknown status';
}

/**
 * Popular cryptocurrencies with display names
 */
export const SUPPORTED_CURRENCIES = [
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC' },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH' },
  { id: 'ltc', name: 'Litecoin', symbol: 'LTC' },
  { id: 'usdt', name: 'Tether (ERC-20)', symbol: 'USDT' },
  { id: 'usdttrc20', name: 'Tether (TRC-20)', symbol: 'USDT' },
  { id: 'usdtbsc', name: 'Tether (BSC)', symbol: 'USDT' },
  { id: 'usdc', name: 'USD Coin', symbol: 'USDC' },
  { id: 'usdcsol', name: 'USD Coin (Solana)', symbol: 'USDC' },
  { id: 'sol', name: 'Solana', symbol: 'SOL' },
  { id: 'doge', name: 'Dogecoin', symbol: 'DOGE' },
  { id: 'xrp', name: 'Ripple', symbol: 'XRP' },
  { id: 'bnb', name: 'Binance Coin', symbol: 'BNB' },
  { id: 'matic', name: 'Polygon', symbol: 'MATIC' },
  { id: 'trx', name: 'Tron', symbol: 'TRX' }
];

export default {
  // Status
  getStatus,
  
  // Currencies
  getAvailableCurrencies,
  getAvailableCheckedCurrencies,
  
  // Pricing
  getMinimumPaymentAmount,
  getEstimatedPrice,
  
  // Payments (Deposits)
  createPayment,
  createInvoice,
  getPaymentStatus,
  getPayments,
  
  // Payouts (Withdrawals)
  getPayoutBalance,
  createPayout,
  getPayoutStatus,
  
  // Custody & Conversion
  getCustodyBalance,
  createConversion,
  getConversionEstimate,
  
  // Sub-Partner / Customer Management
  createCustomer,
  getCustomer,
  getCustomerPayments,
  getCustomerBalance,
  createCustomerDeposit,
  transferToCustomer,
  transferFromCustomer,
  getTransferStatus,
  createCustomerPayout,
  
  // Legacy (deprecated)
  getCustomerByExternalId,
  updateCustomer,
  deleteCustomer,
  internalTransfer,
  
  // IPN
  verifyIPNSignature,
  
  // Helpers
  mapPaymentStatus,
  isPaymentFinal,
  isPaymentSuccessful,
  getStatusDescription,
  SUPPORTED_CURRENCIES
};
