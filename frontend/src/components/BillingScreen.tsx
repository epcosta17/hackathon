
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowLeft, CheckCircle2, Zap, ShieldCheck, X } from 'lucide-react';
import { Button } from './ui/button';
import { authenticatedFetch } from '../utils/api';
import { CheckoutForm } from './CheckoutForm';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';

// Exchange Rates (Approximate for display)
const EXCHANGE_RATES: Record<string, number> = {
    usd: 1.0,
    eur: 0.92,
    gbp: 0.79,
    cad: 1.36,
    inr: 84.50,
    aud: 1.52,
    jpy: 150.0,
    cny: 7.25,
    mxn: 20.0
};

const CURRENCY_SYMBOLS: Record<string, string> = {
    usd: '$',
    eur: '€',
    gbp: '£',
    cad: '$',
    inr: '₹',
    aud: '$',
    jpy: '¥',
    cny: '¥',
    mxn: '$'
};

interface BillingScreenProps {
    onBack: () => void;
}

export function BillingScreen({ onBack }: BillingScreenProps) {
    const [credits, setCredits] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [currency, setCurrency] = useState('usd');
    const [exchangeRates, setExchangeRates] = useState(EXCHANGE_RATES);

    // Fetch real-time exchange rates from backend
    useEffect(() => {
        const fetchExchangeRates = async () => {
            try {
                const response = await authenticatedFetch('/v1/billing/exchange-rates');
                if (response.ok) {
                    const data = await response.json();
                    if (data.rates) {
                        setExchangeRates(data.rates);
                        console.log('✅ [Billing] Exchange rates updated from backend');
                    }
                }
            } catch (error) {
                console.warn('⚠️ [Billing] Failed to fetch exchange rates, using fallback:', error);
            }
        };

        fetchExchangeRates();
    }, []);

    // Auto-detect currency on mount
    useEffect(() => {
        const browserLang = navigator.language.toLowerCase();
        let detectedCurrency = 'usd';

        if (browserLang.includes('mx')) detectedCurrency = 'mxn';
        else if (browserLang.includes('gb')) detectedCurrency = 'gbp';
        else if (browserLang.includes('ca')) detectedCurrency = 'cad';
        else if (browserLang.includes('au')) detectedCurrency = 'aud';
        else if (browserLang.includes('jp')) detectedCurrency = 'jpy';
        else if (browserLang.includes('in')) detectedCurrency = 'inr';
        else if (['fr', 'de', 'it', 'es', 'pt', 'nl'].some(code => browserLang.includes(code))) detectedCurrency = 'eur';

        // Only set if we support it
        if (exchangeRates[detectedCurrency]) {
            setCurrency(detectedCurrency);
        }
    }, [exchangeRates]);

    const formatPrice = (cents: number, curr: string) => {
        const rate = exchangeRates[curr] || 1.0;
        const symbol = CURRENCY_SYMBOLS[curr] || '$';

        // Calculate amount
        let amount = cents * rate;

        // Format based on currency type (JPY is 0 decimal)
        if (['jpy', 'krw', 'vnd'].includes(curr)) {
            // 500 cents = $5.00 -> 750 Yen
            amount = (cents / 100) * rate;
            return `${symbol}${Math.round(amount).toLocaleString()}`;
        }

        // Standard (cents to main unit)
        return `${symbol}${(amount / 100).toFixed(2)}`;
    };

    // Listen to user credits
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        console.log(`📡 [Billing] Listening for credits updates: users/${user.uid}`);
        const userRef = doc(db, 'users', user.uid);

        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setCredits(data.credits || 0);
            } else {
                setCredits(0);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching credits:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handlePurchase = async (packId: string) => {
        try {
            setIsCheckingOut(packId);

            const response = await authenticatedFetch('/v1/billing/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pack_id: packId, currency })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create checkout session');
            }

            const data = await response.json();
            if (data.clientSecret) {
                setClientSecret(data.clientSecret);
            } else {
                throw new Error("No client secret returned");
            }

        } catch (error) {
            console.error('Purchase error:', error);
            toast.error('Failed to initiate purchase. Please try again.');
        } finally {
            setIsCheckingOut(null);
        }
    };

    const handleCloseCheckout = () => {
        setClientSecret(null);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center py-12 px-4 animate-in fade-in duration-500">
            <div className="max-w-4xl w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                            className="rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                                Billing & Credits
                            </h1>
                            <p className="text-zinc-400">Manage your interview analysis credits</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500 hidden sm:inline">Currency:</span>
                        <Select value={currency} onValueChange={setCurrency}>
                            <SelectTrigger className="w-[110px] bg-zinc-900 border-zinc-800">
                                <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                <SelectItem value="usd">USD ($)</SelectItem>
                                <SelectItem value="mxn">MXN ($)</SelectItem>
                                <SelectItem value="eur">EUR (€)</SelectItem>
                                <SelectItem value="gbp">GBP (£)</SelectItem>
                                <SelectItem value="cad">CAD ($)</SelectItem>
                                <SelectItem value="inr">INR (₹)</SelectItem>
                                <SelectItem value="aud">AUD ($)</SelectItem>
                                <SelectItem value="jpy">JPY (¥)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Current Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 mb-12 flex items-center justify-between relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <p className="text-zinc-400 mb-1 font-medium">Available Credits</p>
                        <div className="flex items-baseline gap-2">
                            {isLoading ? (
                                <div className="h-10 w-24 bg-zinc-800 rounded animate-pulse" />
                            ) : (
                                <span className="text-5xl font-bold text-white tracking-tight">{credits}</span>
                            )}
                            <span className="text-zinc-500">credits</span>
                        </div>
                    </div>
                    <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 z-10">
                        <Zap className="w-8 h-8 text-white fill-white" />
                    </div>

                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                </motion.div>

                {/* Packages */}
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-400" />
                    Top Up Credits
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Standard Pack */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors flex flex-col"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Starter Pack</h3>
                                <p className="text-zinc-400 text-sm">Perfect for individual use</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-white">
                                    {formatPrice(500, currency)}
                                </span>
                                <p className="text-zinc-500 text-xs">One-time payment</p>
                            </div>
                        </div>

                        <div className="bg-zinc-950/50 rounded-lg p-4 mb-6 border border-zinc-800/50">
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="w-5 h-5 text-indigo-400" />
                                <span className="font-semibold text-white">5 Credits</span>
                            </div>
                            <p className="text-xs text-zinc-500">
                                {formatPrice(100, currency)} per interview
                            </p>
                        </div>

                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-zinc-300">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span>Full AI Analysis</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-zinc-300">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span>Detailed Transcript</span>
                            </li>
                        </ul>

                        <Button
                            className="w-full bg-[#2a2a2a] hover:bg-[#333333] text-white border border-[#3a3a3a] font-semibold"
                            onClick={() => handlePurchase('pack_5')}
                            disabled={!!isCheckingOut}
                        >
                            {isCheckingOut === 'pack_5' ? 'Processing...' : 'Buy 5 Credits'}
                        </Button>
                    </motion.div>

                    {/* Pro Pack - Best Value */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-zinc-900 border border-indigo-500/30 rounded-2xl p-6 relative flex flex-col shadow-lg shadow-indigo-500/5"
                    >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            BEST VALUE
                        </div>

                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Pro Pack</h3>
                                <p className="text-zinc-400 text-sm">For serious interviewers</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-white">
                                    {formatPrice(1500, currency)}
                                </span>
                                <p className="text-zinc-500 text-xs text-green-400">Save 25%</p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg p-4 mb-6 border border-indigo-500/20">
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="w-5 h-5 text-indigo-400" />
                                <span className="font-semibold text-white">20 Credits</span>
                            </div>
                            <p className="text-xs text-indigo-300">
                                {formatPrice(75, currency)} per interview
                            </p>
                        </div>

                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-zinc-300">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span>Full AI Analysis</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-zinc-300">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span>Detailed Transcript</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-zinc-300">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span>Priority Support</span>
                            </li>
                        </ul>

                        <Button
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-indigo-500/25"
                            onClick={() => handlePurchase('pack_20')}
                            disabled={!!isCheckingOut}
                        >
                            {isCheckingOut === 'pack_20' ? 'Processing...' : 'Buy 20 Credits'}
                        </Button>
                    </motion.div>
                </div>

                <div className="mt-12 text-center text-zinc-500 text-sm flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Secure payments processed by Stripe</span>
                </div>
            </div>

            {/* Embedded Checkout Modal */}
            {clientSecret && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl"
                    >
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 flex-shrink-0">
                            <h3 className="text-lg font-semibold text-white">Complete Purchase</h3>
                            <Button variant="ghost" size="icon" onClick={handleCloseCheckout} className="hover:bg-zinc-800 rounded-full">
                                <X className="w-5 h-5 text-zinc-400" />
                            </Button>
                        </div>
                        <div className="flex-1 bg-zinc-950 p-2 overflow-y-auto">
                            <CheckoutForm clientSecret={clientSecret} onComplete={handleCloseCheckout} />
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
