import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import MobileGameHeader from '../components/MobileGameHeader';
import { formatCurrency } from '../utils/format';

// Crypto currency icons (using simple emoji/text for now)
const CRYPTO_ICONS = {
  btc: '₿',
  eth: 'Ξ',
  ltc: 'Ł',
  usdt: '₮',
  usdttrc20: '₮',
  usdtbsc: '₮',
  usdc: '$',
  sol: '◎',
  doge: 'Ð',
  xrp: '✕',
  bnb: 'BNB',
  matic: 'M',
  trx: 'T'
};

export default function WalletPage({ onOpenChat }) {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('deposit');
  
  // Currencies
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('btc');
  const [minDeposit, setMinDeposit] = useState(5);
  const [minWithdraw, setMinWithdraw] = useState(10);
  
  // Deposit state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositResult, setDepositResult] = useState(null);
  
  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState(null);
  const [estimatedCrypto, setEstimatedCrypto] = useState(null);
  
  // Transactions
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  
  // Notifications from URL params
  const [notification, setNotification] = useState(null);

  const fetchCurrencies = useCallback(async () => {
    try {
      const data = await api.get('/api/payments/currencies');
      setCurrencies(data.currencies || []);
      setMinDeposit(data.minDepositUsd || 5);
      setMinWithdraw(data.minWithdrawalUsd || 10);
    } catch (err) {
      console.error('Failed to fetch currencies:', err);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setTransactionsLoading(true);
    try {
      const data = await api.get('/api/payments/transactions?limit=20');
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setTransactionsLoading(false);
    }
  }, [user]);

  const fetchEstimate = useCallback(async () => {
    try {
      const data = await api.get(`/api/payments/estimate?amount=${withdrawAmount}&currency=${selectedCurrency}`);
      setEstimatedCrypto(data.estimated_amount);
    } catch (err) {
      console.error('Failed to fetch estimate:', err);
      setEstimatedCrypto(null);
    }
  }, [withdrawAmount, selectedCurrency]);

  // Check for deposit result in URL
  useEffect(() => {
    const depositStatus = searchParams.get('deposit');
    if (depositStatus === 'success') {
      setNotification({ type: 'success', message: 'Deposit completed successfully!' });
      refreshUser?.();
    } else if (depositStatus === 'cancelled') {
      setNotification({ type: 'error', message: 'Deposit was cancelled.' });
    }
  }, [searchParams, refreshUser]);

  // Fetch currencies and transactions on mount
  useEffect(() => {
    fetchCurrencies();
    fetchTransactions();
  }, [fetchCurrencies, fetchTransactions]);

  // Fetch estimate when withdraw amount changes
  useEffect(() => {
    if (withdrawAmount && parseFloat(withdrawAmount) >= minWithdraw && selectedCurrency) {
      fetchEstimate();
    } else {
      setEstimatedCrypto(null);
    }
  }, [withdrawAmount, selectedCurrency, minWithdraw, fetchEstimate]);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < minDeposit) {
      setNotification({ type: 'error', message: `Minimum deposit is $${minDeposit}` });
      return;
    }

    setDepositLoading(true);
    setDepositResult(null);
    
    try {
      const data = await api.post('/api/payments/deposit', {
        amountUsd: amount,
        currency: selectedCurrency
      });
      
      // Redirect to NOWPayments invoice page
      if (data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
      } else {
        setDepositResult(data);
      }
    } catch (err) {
      setNotification({ 
        type: 'error', 
        message: err.error || err.message || 'Failed to create deposit' 
      });
    } finally {
      setDepositLoading(false);
    }
  };

  const handleDirectDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < minDeposit) {
      setNotification({ type: 'error', message: `Minimum deposit is $${minDeposit}` });
      return;
    }

    setDepositLoading(true);
    setDepositResult(null);
    
    try {
      const data = await api.post('/api/payments/deposit/direct', {
        amountUsd: amount,
        currency: selectedCurrency
      });
      
      setDepositResult(data);
      setNotification({ type: 'success', message: 'Deposit address generated!' });
    } catch (err) {
      setNotification({ 
        type: 'error', 
        message: err.error || err.message || 'Failed to create deposit' 
      });
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < minWithdraw) {
      setNotification({ type: 'error', message: `Minimum withdrawal is $${minWithdraw}` });
      return;
    }

    if (!withdrawAddress.trim()) {
      setNotification({ type: 'error', message: 'Please enter your wallet address' });
      return;
    }

    setWithdrawLoading(true);
    setWithdrawResult(null);
    
    try {
      const data = await api.post('/api/payments/withdraw', {
        amountUsd: amount,
        currency: selectedCurrency,
        address: withdrawAddress.trim()
      });
      
      setWithdrawResult(data);
      setNotification({ type: 'success', message: 'Withdrawal request submitted!' });
      setWithdrawAmount('');
      setWithdrawAddress('');
      refreshUser?.();
      fetchTransactions();
    } catch (err) {
      setNotification({ 
        type: 'error', 
        message: err.error || err.message || 'Failed to create withdrawal' 
      });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setNotification({ type: 'success', message: 'Copied to clipboard!' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'finished': return 'text-green-400';
      case 'waiting':
      case 'confirming':
      case 'confirmed':
      case 'sending':
      case 'pending': return 'text-yellow-400';
      case 'failed':
      case 'expired':
      case 'cancelled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Login</h1>
          <p className="text-gray-400 mb-6">You need to be logged in to access your wallet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white pb-24">
      <MobileGameHeader title="Wallet" onOpenChat={onOpenChat} className="md:hidden" />
      
      <div className="max-w-4xl mx-auto p-4 md:p-8 pt-20 md:pt-8">
        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-4 p-4 rounded-lg ${
                notification.type === 'success' 
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                  : 'bg-red-500/20 border border-red-500/50 text-red-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{notification.message}</span>
                <button onClick={() => setNotification(null)} className="text-white/50 hover:text-white">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 mb-6 border border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Available Balance</p>
              <p className="text-4xl font-bold text-cyan-400">${formatCurrency(user.balance || 0)}</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-gray-500 text-xs">Total Deposited</p>
                <p className="text-green-400 font-semibold">${formatCurrency(user.totalDeposited || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs">Total Withdrawn</p>
                <p className="text-orange-400 font-semibold">${formatCurrency(user.totalWithdrawn || 0)}</p>
              </div>
              {(user.wagerRequirement || 0) > 0 && (
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Wager Required</p>
                  <p className="text-yellow-400 font-semibold">${formatCurrency(user.wagerRequirement || 0)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              activeTab === 'deposit'
                ? 'bg-green-500 text-white'
                : 'bg-[#1a1a2e] text-gray-400 hover:text-white'
            }`}
          >
            💰 Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              activeTab === 'withdraw'
                ? 'bg-orange-500 text-white'
                : 'bg-[#1a1a2e] text-gray-400 hover:text-white'
            }`}
          >
            💸 Withdraw
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-purple-500 text-white'
                : 'bg-[#1a1a2e] text-gray-400 hover:text-white'
            }`}
          >
            📜 History
          </button>
        </div>

        {/* Deposit Tab */}
        {activeTab === 'deposit' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#1a1a2e] rounded-2xl p-6 border border-white/10"
          >
            <h2 className="text-xl font-bold mb-4">Deposit Crypto</h2>
            
            {/* Currency Selection */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Select Currency</label>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {currencies.map(curr => (
                  <button
                    key={curr.id}
                    onClick={() => setSelectedCurrency(curr.id)}
                    className={`p-3 rounded-lg border transition-all ${
                      selectedCurrency === curr.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                        : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    <div className="text-xl mb-1">{CRYPTO_ICONS[curr.id] || '🪙'}</div>
                    <div className="text-xs font-bold">{curr.symbol}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder={`Min $${minDeposit}`}
                  className="w-full bg-black/30 border border-white/10 rounded-lg py-3 px-8 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[10, 25, 50, 100, 250].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setDepositAmount(String(amt))}
                    className="px-3 py-1 bg-black/30 rounded border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/30"
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Deposit Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDeposit}
                disabled={depositLoading || !depositAmount}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-400 hover:to-emerald-500 transition-all"
              >
                {depositLoading ? 'Processing...' : 'Checkout (Hosted)'}
              </button>
              <button
                onClick={handleDirectDeposit}
                disabled={depositLoading || !depositAmount}
                className="flex-1 py-3 bg-[#2a2a4e] rounded-lg font-bold text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3a3a5e] transition-all"
              >
                {depositLoading ? 'Processing...' : 'Get Address'}
              </button>
            </div>

            {/* Deposit Result */}
            {depositResult && depositResult.payAddress && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-black/30 rounded-lg border border-cyan-500/50"
              >
                <p className="text-sm text-gray-400 mb-2">Send exactly:</p>
                <p className="text-xl font-mono text-cyan-400 mb-3">
                  {depositResult.payAmount} {depositResult.payCurrency?.toUpperCase()}
                </p>
                <p className="text-sm text-gray-400 mb-2">To address:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/50 p-2 rounded text-sm text-white break-all">
                    {depositResult.payAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(depositResult.payAddress)}
                    className="px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30"
                  >
                    📋
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  ⚠️ Only send {depositResult.payCurrency?.toUpperCase()} to this address. Sending other currencies may result in loss of funds.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Withdraw Tab */}
        {activeTab === 'withdraw' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#1a1a2e] rounded-2xl p-6 border border-white/10"
          >
            <h2 className="text-xl font-bold mb-4">Withdraw Crypto</h2>
            
            {/* Wager Requirement Warning */}
            {(user.wagerRequirement || 0) > 0 && (
              <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-400 font-semibold">⚠️ Wager Requirement</p>
                <p className="text-sm text-gray-300">
                  You must wager ${formatCurrency(user.wagerRequirement || 0)} more before withdrawing.
                </p>
              </div>
            )}

            {/* Currency Selection */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Select Currency</label>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {currencies.map(curr => (
                  <button
                    key={curr.id}
                    onClick={() => setSelectedCurrency(curr.id)}
                    className={`p-3 rounded-lg border transition-all ${
                      selectedCurrency === curr.id
                        ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                        : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    <div className="text-xl mb-1">{CRYPTO_ICONS[curr.id] || '🪙'}</div>
                    <div className="text-xs font-bold">{curr.symbol}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Min $${minWithdraw}`}
                  className="w-full bg-black/30 border border-white/10 rounded-lg py-3 px-8 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                />
              </div>
              {estimatedCrypto && (
                <p className="text-sm text-gray-400 mt-2">
                  ≈ {estimatedCrypto.toFixed(8)} {selectedCurrency.toUpperCase()}
                </p>
              )}
            </div>

            {/* Wallet Address */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Your {currencies.find(c => c.id === selectedCurrency)?.name || selectedCurrency.toUpperCase()} Wallet Address
              </label>
              <input
                type="text"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                placeholder="Enter your wallet address"
                className="w-full bg-black/30 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Fee Info */}
            <div className="mb-4 p-3 bg-black/30 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Withdrawal Fee:</span>
                <span className="text-gray-300">2.5%{user.vipTier && user.vipTier !== 'none' && ` (VIP discount applied)`}</span>
              </div>
            </div>

            {/* Withdraw Button */}
            <button
              onClick={handleWithdraw}
              disabled={withdrawLoading || !withdrawAmount || !withdrawAddress || (user.wagerRequirement || 0) > 0}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-orange-400 hover:to-red-500 transition-all"
            >
              {withdrawLoading ? 'Processing...' : 'Request Withdrawal'}
            </button>

            {/* Withdraw Result */}
            {withdrawResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg"
              >
                <p className="text-green-400 font-semibold mb-2">✓ Withdrawal Requested</p>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>Amount: ${withdrawResult.amountUsd}</p>
                  <p>Fee: ${(withdrawResult.feeCents / 100).toFixed(2)}</p>
                  <p>Estimated: {withdrawResult.estimatedCrypto?.toFixed(8)} {withdrawResult.currency?.toUpperCase()}</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">{withdrawResult.message}</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#1a1a2e] rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Transaction History</h2>
              <button
                onClick={fetchTransactions}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                🔄 Refresh
              </button>
            </div>
            
            {transactionsLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No transactions yet</div>
            ) : (
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl ${tx.type === 'deposit' ? 'text-green-400' : 'text-orange-400'}`}>
                        {tx.type === 'deposit' ? '↓' : '↑'}
                      </div>
                      <div>
                        <p className="font-semibold capitalize">{tx.type}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.createdAt).toLocaleDateString()} • {tx.cryptoCurrency?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold">${tx.amountUsd}</p>
                      <p className={`text-xs capitalize ${getStatusColor(tx.status)}`}>
                        {tx.statusDescription || tx.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Info Section */}
        <div className="mt-6 p-4 bg-[#1a1a2e]/50 rounded-lg border border-white/5">
          <h3 className="font-bold mb-2 text-gray-300">ℹ️ Important Information</h3>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Deposits are credited after blockchain confirmation (typically 1-30 minutes)</li>
            <li>• Minimum deposit: ${minDeposit} USD</li>
            <li>• Minimum withdrawal: ${minWithdraw} USD</li>
            <li>• Withdrawals require a 1x playthrough of deposited amount</li>
            <li>• VIP members receive reduced withdrawal fees</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
