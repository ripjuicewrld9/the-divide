import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function DepositWithdrawModal({ isOpen, onClose }) {
    const { withdrawFunds, user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('deposit');
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [withdrawCrypto, setWithdrawCrypto] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [show2FAPrompt, setShow2FAPrompt] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [pendingAction, setPendingAction] = useState(null);
    
    // Deposit flow states
    const [depositStep, setDepositStep] = useState('amount'); // 'amount', 'address', 'pending'
    const [paymentData, setPaymentData] = useState(null);
    const [cryptoEstimate, setCryptoEstimate] = useState(null);
    const [minAmount, setMinAmount] = useState(5);
    
    // Withdraw flow states
    const [withdrawStep, setWithdrawStep] = useState('method'); // 'method', 'details', 'pending'
    const [withdrawEstimate, setWithdrawEstimate] = useState(null);

    // Map frontend IDs to NOWPayments currency codes
    const currencyMap = {
        'btc': 'btc',
        'eth': 'eth',
        'ltc': 'ltc',
        'usdt': 'usdterc20',
        'usdt-trx': 'usdttrc20',
        'sol': 'sol',
        'usdc': 'usdcsol',
        'xrp': 'xrp',
        'bnb': 'bnbbsc',
        'trx': 'trx',
        'doge': 'doge',
        'matic': 'maticpolygon'
    };

    const depositMethods = [
        { id: 'btc', name: 'Bitcoin', symbol: 'BTC', color: '#f7931a', bgColor: 'rgba(247, 147, 26, 0.1)', icon: '/cryptosvg/bitcoin-btc-logo.svg' },
        { id: 'eth', name: 'Ethereum', symbol: 'ETH', color: '#627eea', bgColor: 'rgba(98, 126, 234, 0.1)', icon: '/cryptosvg/ethereum-eth-logo.svg' },
        { id: 'ltc', name: 'Litecoin', symbol: 'LTC', color: '#345d9d', bgColor: 'rgba(52, 93, 157, 0.1)', icon: '/cryptosvg/litecoin-ltc-logo.svg' },
        { id: 'usdt', name: 'USDT (ERC20)', symbol: 'USDT', color: '#26a17b', bgColor: 'rgba(38, 161, 123, 0.1)', icon: '/cryptosvg/tether-usdt-logo.svg' },
        { id: 'usdt-trx', name: 'USDT (TRC20)', symbol: 'USDT', color: '#26a17b', bgColor: 'rgba(38, 161, 123, 0.1)', icon: '/cryptosvg/tether-usdt-logo.svg' },
        { id: 'sol', name: 'Solana', symbol: 'SOL', color: '#14f195', bgColor: 'rgba(20, 241, 149, 0.1)', icon: '/cryptosvg/solana-sol-logo.svg' },
        { id: 'usdc', name: 'USDC (SOL)', symbol: 'USDC', color: '#2775ca', bgColor: 'rgba(39, 117, 202, 0.1)', icon: '/cryptosvg/usd-coin-usdc-logo.svg' },
        { id: 'xrp', name: 'Ripple', symbol: 'XRP', color: '#00aae4', bgColor: 'rgba(0, 170, 228, 0.1)', icon: '/cryptosvg/xrp-xrp-logo.svg' },
        { id: 'bnb', name: 'BNB (BSC)', symbol: 'BNB', color: '#f3ba2f', bgColor: 'rgba(243, 186, 47, 0.1)', icon: '/cryptosvg/bnb-bnb-logo.svg' },
        { id: 'trx', name: 'TRON', symbol: 'TRX', color: '#eb0029', bgColor: 'rgba(235, 0, 41, 0.1)', icon: '/cryptosvg/tron-trx-logo.svg' },
        { id: 'doge', name: 'Dogecoin', symbol: 'DOGE', color: '#c2a633', bgColor: 'rgba(194, 166, 51, 0.1)', icon: '/cryptosvg/dogecoin-doge-logo.svg' },
        { id: 'matic', name: 'Polygon', symbol: 'MATIC', color: '#8247e5', bgColor: 'rgba(130, 71, 229, 0.1)', icon: '/cryptosvg/polygon-matic-logo.svg' }
    ];

    const quickAmounts = [10, 25, 50, 100, 250, 500];

    // Fetch crypto estimate when amount or method changes
    useEffect(() => {
        const fetchEstimate = async () => {
            if (!selectedMethod || !depositAmount || depositAmount < minAmount) {
                setCryptoEstimate(null);
                return;
            }
            
            try {
                const currency = currencyMap[selectedMethod.id];
                const res = await api.get(`/api/payments/estimate?amount=${depositAmount}&currency=${currency}`);
                if (res.estimated_amount) {
                    setCryptoEstimate(res);
                }
            } catch (err) {
                console.error('Failed to fetch estimate:', err);
            }
        };

        const debounce = setTimeout(fetchEstimate, 300);
        return () => clearTimeout(debounce);
    }, [selectedMethod, depositAmount, minAmount]);

    // Fetch min amount when method changes
    useEffect(() => {
        const fetchMinAmount = async () => {
            if (!selectedMethod) return;
            
            try {
                const currency = currencyMap[selectedMethod.id];
                const res = await api.get(`/api/payments/min-amount/${currency}`);
                if (res.min_amount) {
                    // Convert to USD (approximate)
                    setMinAmount(Math.max(5, Math.ceil(res.min_amount * 1.1)));
                }
            } catch (err) {
                setMinAmount(5);
            }
        };

        fetchMinAmount();
    }, [selectedMethod]);

    // Create deposit payment
    const handleCreateDeposit = async () => {
        setError('');
        setLoading(true);

        try {
            const currency = currencyMap[selectedMethod.id];
            const res = await api.post('/api/payments/deposit/direct', {
                amountUsd: Number(depositAmount),
                payCurrency: currency
            });

            if (res.payAddress) {
                setPaymentData(res);
                setDepositStep('address');
            } else {
                setError('Failed to create deposit address');
            }
        } catch (err) {
            setError(err.error || err.message || 'Failed to create deposit');
        } finally {
            setLoading(false);
        }
    };

    // Create withdrawal
    const handleCreateWithdrawal = async () => {
        setError('');
        
        const amt = Number(withdrawAmount);
        if (!amt || amt < 10) {
            setError('Minimum withdrawal is $10');
            return;
        }
        
        if (amt > Number(user?.balance || 0)) {
            setError('Insufficient balance');
            return;
        }

        if (!withdrawAddress) {
            setError('Please enter your crypto address');
            return;
        }

        // Check if 2FA is enabled
        if (user?.twoFactorEnabled) {
            setPendingAction({ type: 'withdraw' });
            setShow2FAPrompt(true);
            return;
        }

        processWithdrawal();
    };

    const processWithdrawal = async () => {
        setLoading(true);
        setError('');

        try {
            const currency = currencyMap[withdrawCrypto.id];
            const res = await api.post('/api/payments/withdraw', {
                amountUsd: Number(withdrawAmount),
                currency: currency,
                address: withdrawAddress
            });

            if (res.success) {
                setSuccess(`Withdrawal of $${withdrawAmount} initiated! You'll receive ${res.estimatedCrypto} ${withdrawCrypto.symbol}`);
                setWithdrawStep('pending');
                if (refreshUser) refreshUser();
            } else {
                setError(res.error || 'Withdrawal failed');
            }
        } catch (err) {
            setError(err.error || err.message || 'Withdrawal failed');
        } finally {
            setLoading(false);
        }
    };

    // Get withdraw estimate
    useEffect(() => {
        const fetchWithdrawEstimate = async () => {
            if (!withdrawCrypto || !withdrawAmount || withdrawAmount < 10) {
                setWithdrawEstimate(null);
                return;
            }

            try {
                const currency = currencyMap[withdrawCrypto.id];
                const res = await api.get(`/api/payments/estimate?amount=${withdrawAmount}&currency=${currency}`);
                if (res.estimated_amount) {
                    // Calculate with fee deduction (2.5% fee)
                    const afterFee = Number(withdrawAmount) * 0.975;
                    setWithdrawEstimate({
                        cryptoAmount: (res.estimated_amount * (afterFee / withdrawAmount)).toFixed(8),
                        fee: (Number(withdrawAmount) * 0.025).toFixed(2)
                    });
                }
            } catch (err) {
                console.error('Failed to fetch withdraw estimate:', err);
            }
        };

        const debounce = setTimeout(fetchWithdrawEstimate, 300);
        return () => clearTimeout(debounce);
    }, [withdrawCrypto, withdrawAmount]);

    // Copy address to clipboard
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setSuccess('Copied to clipboard!');
        setTimeout(() => setSuccess(''), 2000);
    };

    const verify2FAAndProceed = async () => {
        setError('');
        
        if (!twoFactorCode || twoFactorCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        try {
            const API_BASE = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${API_BASE}/api/verify-2fa`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: twoFactorCode })
            });

            const data = await res.json();
            
            if (!res.ok || !data.verified) {
                setError('Invalid 2FA code. Please try again.');
                return;
            }

            // 2FA verified, proceed with the action
            setShow2FAPrompt(false);
            setTwoFactorCode('');
            
            if (pendingAction?.type === 'withdraw') {
                processWithdrawal();
            }
            
            setPendingAction(null);
        } catch (err) {
            console.error('2FA verification error:', err);
            setError('Failed to verify 2FA code. Please try again.');
        }
    };

    // Reset states when closing or switching tabs
    const resetDepositState = () => {
        setSelectedMethod(null);
        setDepositAmount('');
        setDepositStep('amount');
        setPaymentData(null);
        setCryptoEstimate(null);
        setError('');
        setSuccess('');
    };

    const resetWithdrawState = () => {
        setWithdrawCrypto(null);
        setWithdrawAmount('');
        setWithdrawAddress('');
        setWithdrawStep('method');
        setWithdrawEstimate(null);
        setError('');
        setSuccess('');
    };

    if (!isOpen) return null;

    // Render deposit amount input step
    const renderDepositAmount = () => (
        <>
            <button onClick={() => { setSelectedMethod(null); setDepositAmount(''); }} className="text-sm text-cyan-400 mb-4 hover:underline">← Back to methods</button>

            <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="w-10 h-10 flex items-center justify-center">
                    {selectedMethod.icon ? (
                        <img src={selectedMethod.icon} alt={selectedMethod.symbol} className="w-10 h-10" />
                    ) : (
                        <span className="text-2xl" style={{ color: selectedMethod.color }}>{selectedMethod.symbol}</span>
                    )}
                </div>
                <div>
                    <div className="font-bold text-white">Deposit with {selectedMethod.name}</div>
                    <div className="text-xs text-gray-400">Min deposit: ${minAmount}</div>
                </div>
            </div>

            <label className="block text-sm font-medium text-gray-400 mb-2">Amount (USD)</label>
            <input
                type="number"
                min={minAmount}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder={`Min $${minAmount}`}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors mb-3"
            />

            <div className="flex flex-wrap gap-2 mb-4">
                {quickAmounts.map((amt) => (
                    <button
                        key={amt}
                        onClick={() => setDepositAmount(amt.toString())}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            depositAmount === amt.toString() 
                                ? 'bg-cyan-500 text-black' 
                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                    >
                        ${amt}
                    </button>
                ))}
            </div>

            {cryptoEstimate && (
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 mb-4">
                    <div className="text-sm text-gray-400">You'll send approximately:</div>
                    <div className="text-lg font-bold text-cyan-400">
                        {cryptoEstimate.estimated_amount} {selectedMethod.symbol}
                    </div>
                </div>
            )}

            {error && <p className="text-sm text-red-400 mb-4 text-center">{error}</p>}

            <button
                onClick={handleCreateDeposit}
                disabled={loading || !depositAmount || depositAmount < minAmount}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all active:scale-95"
            >
                {loading ? 'Creating...' : 'Get Deposit Address'}
            </button>
        </>
    );

    // Render deposit address display
    const renderDepositAddress = () => (
        <>
            <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    {selectedMethod.icon ? (
                        <img src={selectedMethod.icon} alt={selectedMethod.symbol} className="w-8 h-8" />
                    ) : (
                        <span className="text-2xl" style={{ color: selectedMethod.color }}>{selectedMethod.symbol}</span>
                    )}
                </div>
                <h3 className="text-xl font-bold mb-1">Send {selectedMethod.name}</h3>
                <p className="text-sm text-gray-400">Send exactly this amount to the address below</p>
            </div>

            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-4">
                <div className="text-sm text-yellow-400 font-medium mb-1">Amount to send:</div>
                <div className="text-2xl font-bold text-white">
                    {paymentData.payAmount} {selectedMethod.symbol}
                </div>
                <div className="text-sm text-gray-400">≈ ${depositAmount} USD</div>
            </div>

            <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Deposit Address:</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        readOnly
                        value={paymentData.payAddress}
                        className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm font-mono"
                    />
                    <button
                        onClick={() => copyToClipboard(paymentData.payAddress)}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                    >
                        Copy
                    </button>
                </div>
            </div>

            {/* QR Code placeholder - you can integrate a real QR library */}
            <div className="flex justify-center mb-4">
                <div className="p-4 bg-white rounded-lg">
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(paymentData.payAddress)}`}
                        alt="QR Code"
                        className="w-32 h-32"
                    />
                </div>
            </div>

            {success && <p className="text-sm text-green-400 mb-4 text-center">{success}</p>}

            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-4">
                <p className="text-xs text-orange-400">
                    ⚠️ Send only {selectedMethod.name} to this address. Sending any other cryptocurrency may result in permanent loss.
                </p>
            </div>

            <button
                onClick={() => {
                    resetDepositState();
                    onClose();
                }}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-all"
            >
                Done
            </button>
        </>
    );

    // Render withdraw method selection
    const renderWithdrawMethod = () => (
        <>
            <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Available Balance</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    ${Number(user?.balance || 0).toFixed(2)}
                </p>
            </div>
            
            <p className="text-sm text-gray-400 mb-3">Select withdrawal currency</p>
            <div className="grid grid-cols-3 gap-2">
                {depositMethods.map((method) => (
                    <button
                        key={method.id}
                        onClick={() => {
                            setWithdrawCrypto(method);
                            setWithdrawStep('details');
                        }}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-emerald-400/50 transition-all"
                    >
                        <div className="w-8 h-8 flex items-center justify-center">
                            {method.icon ? (
                                <img src={method.icon} alt={method.symbol} className="w-8 h-8" />
                            ) : (
                                <span style={{ color: method.color }}>{method.symbol}</span>
                            )}
                        </div>
                        <span className="text-xs font-medium text-white">{method.symbol}</span>
                    </button>
                ))}
            </div>
        </>
    );

    // Render withdraw details form
    const renderWithdrawDetails = () => (
        <>
            <button onClick={() => { setWithdrawCrypto(null); setWithdrawStep('method'); }} className="text-sm text-emerald-400 mb-4 hover:underline">← Back to currencies</button>

            <div className="flex items-center gap-3 mb-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="w-10 h-10 flex items-center justify-center">
                    {withdrawCrypto.icon ? (
                        <img src={withdrawCrypto.icon} alt={withdrawCrypto.symbol} className="w-10 h-10" />
                    ) : (
                        <span className="text-2xl" style={{ color: withdrawCrypto.color }}>{withdrawCrypto.symbol}</span>
                    )}
                </div>
                <div>
                    <div className="font-bold text-white">Withdraw as {withdrawCrypto.name}</div>
                    <div className="text-xs text-gray-400">Balance: ${Number(user?.balance || 0).toFixed(2)}</div>
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">Amount (USD)</label>
                <input
                    type="number"
                    min="10"
                    max={user?.balance || 0}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Min $10"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 transition-colors"
                />
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {[10, 25, 50, 100].map((amt) => (
                    <button
                        key={amt}
                        onClick={() => setWithdrawAmount(amt.toString())}
                        disabled={amt > (user?.balance || 0)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            withdrawAmount === amt.toString() 
                                ? 'bg-emerald-500 text-black' 
                                : 'bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                    >
                        ${amt}
                    </button>
                ))}
                <button
                    onClick={() => setWithdrawAmount(String(user?.balance || 0))}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-gray-300 hover:bg-white/10"
                >
                    Max
                </button>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">{withdrawCrypto.name} Address</label>
                <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder={`Your ${withdrawCrypto.symbol} wallet address`}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 transition-colors font-mono text-sm"
                />
            </div>

            {withdrawEstimate && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Fee (2.5%):</span>
                        <span className="text-white">-${withdrawEstimate.fee}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-400">You'll receive:</span>
                        <span className="text-emerald-400 font-bold">~{withdrawEstimate.cryptoAmount} {withdrawCrypto.symbol}</span>
                    </div>
                </div>
            )}

            {error && <p className="text-sm text-red-400 mb-4 text-center">{error}</p>}

            <button
                onClick={handleCreateWithdrawal}
                disabled={loading || !withdrawAmount || withdrawAmount < 10 || !withdrawAddress}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all active:scale-95"
            >
                {loading ? 'Processing...' : `Withdraw $${withdrawAmount || '0'}`}
            </button>
        </>
    );

    // Render withdraw pending/success
    const renderWithdrawPending = () => (
        <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Withdrawal Submitted!</h3>
            <p className="text-sm text-gray-400 mb-4">{success}</p>
            <p className="text-xs text-gray-500 mb-6">Withdrawals typically process within 24 hours.</p>
            <button
                onClick={() => {
                    resetWithdrawState();
                    onClose();
                }}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-all"
            >
                Close
            </button>
        </div>
    );

    return (
        <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center" 
            onClick={onClose}
            style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                minHeight: '100dvh'
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#0b0b0b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
                style={{ maxHeight: '90vh', maxHeight: '90dvh' }}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">Wallet</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>

                <div className="flex border-b border-white/10 shrink-0">
                    <button
                        onClick={() => { setActiveTab('deposit'); resetDepositState(); }}
                        className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'deposit' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                    >Deposit</button>
                    <button
                        onClick={() => { setActiveTab('withdraw'); resetWithdrawState(); }}
                        className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'withdraw' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
                    >Withdraw</button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {show2FAPrompt ? (
                        <div className="text-center">
                            <div className="mb-6">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold mb-2">Two-Factor Authentication</h3>
                                <p className="text-sm text-gray-400">Enter the 6-digit code from your authenticator app</p>
                            </div>
                            
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength="6"
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors mb-4"
                                autoFocus
                            />
                            
                            {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShow2FAPrompt(false);
                                        setTwoFactorCode('');
                                        setPendingAction(null);
                                        setError('');
                                    }}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={verify2FAAndProceed}
                                    disabled={twoFactorCode.length !== 6}
                                    className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all active:scale-95"
                                >
                                    Verify
                                </button>
                            </div>
                        </div>
                    ) : activeTab === 'deposit' ? (
                        !selectedMethod ? (
                            <>
                                <p className="text-sm text-gray-400 mb-4">Select cryptocurrency</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {depositMethods.map((method) => (
                                        <button
                                            key={method.id}
                                            onClick={() => {
                                                setSelectedMethod(method);
                                                setDepositStep('amount');
                                            }}
                                            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/50 transition-all"
                                        >
                                            <div className="w-10 h-10 flex items-center justify-center text-lg font-bold">
                                                {method.icon ? (
                                                    <img src={method.icon} alt={method.symbol} className="w-10 h-10" />
                                                ) : (
                                                    <span style={{ color: method.color }}>{method.symbol}</span>
                                                )}
                                            </div>
                                            <span className="text-xs font-semibold text-white text-center">{method.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : depositStep === 'amount' ? (
                            renderDepositAmount()
                        ) : depositStep === 'address' ? (
                            renderDepositAddress()
                        ) : null
                    ) : (
                        withdrawStep === 'method' ? (
                            renderWithdrawMethod()
                        ) : withdrawStep === 'details' ? (
                            renderWithdrawDetails()
                        ) : withdrawStep === 'pending' ? (
                            renderWithdrawPending()
                        ) : null
                    )}
                </div>
            </motion.div>
        </div>
    );
}
