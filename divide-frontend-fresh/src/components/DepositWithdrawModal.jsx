import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function DepositWithdrawModal({ isOpen, onClose }) {
    const { addFunds, withdrawFunds, user } = useAuth();
    const [activeTab, setActiveTab] = useState('deposit');
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [show2FAPrompt, setShow2FAPrompt] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [pendingAction, setPendingAction] = useState(null);

    const depositMethods = [
        { id: 'btc', name: 'Bitcoin', symbol: 'BTC', color: '#f7931a', bgColor: 'rgba(247, 147, 26, 0.1)', icon: '/cryptosvg/bitcoin-btc-logo.svg' },
        { id: 'eth', name: 'Ethereum', symbol: 'ETH', color: '#627eea', bgColor: 'rgba(98, 126, 234, 0.1)', icon: '/cryptosvg/ethereum-eth-logo.svg' },
        { id: 'ltc', name: 'Litecoin', symbol: 'LTC', color: '#345d9d', bgColor: 'rgba(52, 93, 157, 0.1)', icon: '/cryptosvg/litecoin-ltc-logo.svg' },
        { id: 'usdt', name: 'USDT (ERC20)', symbol: 'USDT', color: '#26a17b', bgColor: 'rgba(38, 161, 123, 0.1)', icon: '/cryptosvg/tether-usdt-logo.svg' },
        { id: 'usdt-trx', name: 'USDT (TRX)', symbol: 'USDT', color: '#26a17b', bgColor: 'rgba(38, 161, 123, 0.1)', icon: '/cryptosvg/tether-usdt-logo.svg' },
        { id: 'sol', name: 'Solana', symbol: 'SOL', color: '#14f195', bgColor: 'rgba(20, 241, 149, 0.1)', icon: '/cryptosvg/solana-sol-logo.svg' },
        { id: 'usdc', name: 'USDC', symbol: 'USDC', color: '#2775ca', bgColor: 'rgba(39, 117, 202, 0.1)', icon: '/cryptosvg/usd-coin-usdc-logo.svg' },
        { id: 'xrp', name: 'Ripple', symbol: 'XRP', color: '#00aae4', bgColor: 'rgba(0, 170, 228, 0.1)', icon: '/cryptosvg/xrp-xrp-logo.svg' },
        { id: 'ada', name: 'Cardano', symbol: 'ADA', color: '#0033ad', bgColor: 'rgba(0, 51, 173, 0.1)', icon: '/cryptosvg/cardano-ada-logo.svg' },
        { id: 'bnb', name: 'BNB (BSC)', symbol: 'BNB', color: '#f3ba2f', bgColor: 'rgba(243, 186, 47, 0.1)', icon: '/cryptosvg/bnb-bnb-logo.svg' },
        { id: 'trx', name: 'TRX', symbol: 'TRX', color: '#eb0029', bgColor: 'rgba(235, 0, 41, 0.1)', icon: '/cryptosvg/tron-trx-logo.svg' },
        { id: 'doge', name: 'Dogecoin', symbol: 'DOGE', color: '#c2a633', bgColor: 'rgba(194, 166, 51, 0.1)', icon: '/cryptosvg/dogecoin-doge-logo.svg' },
        { id: 'link', name: 'Chainlink', symbol: 'LINK', color: '#2a5ada', bgColor: 'rgba(42, 90, 218, 0.1)', icon: '/cryptosvg/chainlink-link-logo.svg' },
        { id: 'ton', name: 'Ton', symbol: 'TON', color: '#0088cc', bgColor: 'rgba(0, 136, 204, 0.1)', icon: '/cryptosvg/toncoin-ton-logo.svg' },
        { id: 'card', name: 'Credit Card', symbol: '💳', color: '#00ffff', bgColor: 'rgba(0, 255, 255, 0.1)', icon: null }
    ];

    const packages = [
        { id: 1, price: 1.99, coins: '40K', sc: 0 },
        { id: 2, price: 4.99, coins: '100K', sc: 5 },
        { id: 3, price: 9.99, coins: '200K', sc: 10 },
        { id: 4, price: 19.99, coins: '400K', sc: 21 },
        { id: 5, price: 39.99, coins: '800K', sc: 42 },
        { id: 6, price: 49.99, coins: '1M', sc: 52 },
        { id: 7, price: 59.99, coins: '1.2M', sc: 63, tag: 'POPULAR' },
        { id: 8, price: 79.99, coins: '1.6M', sc: 84 },
        { id: 9, price: 99.99, coins: '2M', sc: 105, tag: 'BEST' }
    ];

    const handleBuy = (pkg) => {
        setError('');

        // Check if 2FA is enabled and required
        if (user?.twoFactorEnabled) {
            setPendingAction({ type: 'buy', package: pkg });
            setShow2FAPrompt(true);
            return;
        }

        processBuy(pkg);
    };

    const processBuy = (pkg) => {
        // Daily limit check (Mock implementation using localStorage)
        try {
            const now = Date.now();
            const ONE_DAY = 24 * 60 * 60 * 1000;
            const history = JSON.parse(localStorage.getItem('mock_deposit_history') || '[]');

            // Filter deposits from last 24h
            const recentDeposits = history.filter(d => now - d.timestamp < ONE_DAY);
            const dailyTotal = recentDeposits.reduce((sum, d) => sum + d.amount, 0);

            if (dailyTotal + pkg.price > 10000) {
                const remaining = 10000 - dailyTotal;
                setError(`Daily limit reached. You can only buy $${remaining.toFixed(2)} more today.`);
                return;
            }

            if (addFunds) {
                addFunds(pkg.price);

                // Update history
                recentDeposits.push({ timestamp: now, amount: pkg.price });
                localStorage.setItem('mock_deposit_history', JSON.stringify(recentDeposits));

                setSelectedMethod(null);
                setSelectedPackage(null);
                onClose();
            }
        } catch (err) {
            console.error('Error checking limits:', err);
            if (addFunds) {
                addFunds(pkg.price);
                onClose();
            }
        }
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
            
            if (pendingAction?.type === 'buy') {
                processBuy(pendingAction.package);
            } else if (pendingAction?.type === 'redeem') {
                processRedeem();
            }
            
            setPendingAction(null);
        } catch (err) {
            console.error('2FA verification error:', err);
            setError('Failed to verify 2FA code. Please try again.');
        }
    };

    const handleRedeem = () => {
        setError('');
        const amt = Number(amount);

        if (!amt || amt <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (amt > Number(user?.balance || 0)) {
            setError('Insufficient balance');
            return;
        }

        // Check if 2FA is enabled and required
        if (user?.twoFactorEnabled) {
            setPendingAction({ type: 'redeem', amount: amt });
            setShow2FAPrompt(true);
            return;
        }

        processRedeem();
    };

    const processRedeem = async () => {
        const amt = pendingAction?.amount || Number(amount);

        // Call proper withdraw endpoint (checks wager requirement, updates totalWithdrawn)
        const result = await withdrawFunds(amt);
        
        if (result.success) {
            setAmount('');
            setShow2FAPrompt(false);
            setPendingAction(null);
            onClose();
        } else {
            setError(result.error || 'Withdrawal failed');
        }
    };

    if (!isOpen) return null;

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
                        onClick={() => { setActiveTab('deposit'); setSelectedMethod(null); setSelectedPackage(null); setError(''); }}
                        className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'deposit' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                    >Buy</button>
                    <button
                        onClick={() => { setActiveTab('withdraw'); setSelectedMethod(null); setAmount(''); setError(''); }}
                        className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'withdraw' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
                    >Redeem</button>
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
                                <p className="text-sm text-gray-400 mb-4">Select payment method</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {depositMethods.map((method) => (
                                        <button
                                            key={method.id}
                                            onClick={() => setSelectedMethod(method)}
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
                        ) : (
                            <>
                                <button onClick={() => setSelectedMethod(null)} className="text-sm text-cyan-400 mb-4 hover:underline">← Back to methods</button>

                                <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
                                    <div className="w-10 h-10 flex items-center justify-center">
                                        {selectedMethod.icon ? (
                                            <img src={selectedMethod.icon} alt={selectedMethod.symbol} className="w-10 h-10" />
                                        ) : (
                                            <span className="text-2xl" style={{ color: selectedMethod.color }}>{selectedMethod.symbol}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">Buying with {selectedMethod.name}</div>
                                        <div className="text-xs text-gray-400">Select a package below</div>
                                    </div>
                                </div>

                                {error && <p className="text-sm text-red-400 mb-4 text-center">{error}</p>}

                                <div className="grid grid-cols-2 gap-3">
                                    {packages.map((pkg) => (
                                        <button
                                            key={pkg.id}
                                            onClick={() => handleBuy(pkg)}
                                            className="relative flex flex-col items-center p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/50 transition-all group"
                                        >
                                            {pkg.tag && (
                                                <div className={`absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-black ${pkg.tag === 'BEST' ? 'bg-yellow-400' : 'bg-orange-400'}`}>
                                                    {pkg.tag}
                                                </div>
                                            )}
                                            <div className="text-yellow-400 font-bold text-lg mb-1">🪙 {pkg.coins}</div>
                                            {pkg.sc > 0 && (
                                                <div className="text-emerald-400 text-xs font-bold mb-3">+ FREE 💵 {pkg.sc}</div>
                                            )}
                                            <div className="px-4 py-1.5 rounded-full bg-green-500 text-black font-bold text-sm group-hover:scale-105 transition-transform">
                                                ${pkg.price}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )
                    ) : (
                        <>
                            <div className="mb-4">
                                <p className="text-sm text-gray-400 mb-2">Available Balance</p>
                                <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">${Number(user?.balance || 0).toFixed(2)}</p>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Redeem Amount (USD)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={user?.balance || 0}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 transition-colors"
                                />
                            </div>
                            {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
                            <button onClick={handleRedeem} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-lg transition-all active:scale-95">
                                Redeem ${amount || '0'}
                            </button>
                            <p className="text-xs text-gray-500 mt-3 text-center">Mock redemption - amount will be deducted from balance</p>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
