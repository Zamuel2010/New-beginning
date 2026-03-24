import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardFooter } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { ArrowDownUp, Info, ShieldCheck, Zap, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_RATES = {
  SOL: 150,
  USDT: 1,
  USDC: 1,
};

export default function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<string>('');
  const [cryptoCurrency, setCryptoCurrency] = useState('SOL');
  const [fiatCurrency] = useState('NGN');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [liveRates, setLiveRates] = useState<typeof DEFAULT_RATES>(DEFAULT_RATES);
  const [senderName, setSenderName] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [recipientBank, setRecipientBank] = useState('');
  const [recipientName, setRecipientName] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'rates');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        } else {
          setSettings({
            buyMargin: 2,
            sellMargin: 2,
            baseRates: DEFAULT_RATES,
            usdToNgnRate: 1500,
          });
        }
      } catch (error) {
        console.error("Error fetching rates", error);
        setSettings({
          buyMargin: 2,
          sellMargin: 2,
          baseRates: DEFAULT_RATES,
          usdToNgnRate: 1500,
        });
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112,Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        const data = await response.json();
        
        const newRates = { ...DEFAULT_RATES };
        
        if (data && data.pairs) {
          // Find SOL price
          const solPair = data.pairs.find((p: any) => p.baseToken.address === 'So11111111111111111111111111111111111111112' && (p.quoteToken.symbol === 'USDC' || p.quoteToken.symbol === 'USDT'));
          if (solPair) newRates.SOL = parseFloat(solPair.priceUsd);
          
          // Find USDT price
          const usdtPair = data.pairs.find((p: any) => p.baseToken.address === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' && p.quoteToken.symbol === 'USDC');
          if (usdtPair) newRates.USDT = parseFloat(usdtPair.priceUsd);
          
          newRates.USDC = 1;
        }
        
        setLiveRates(newRates);
      } catch (error) {
        console.error("Error fetching live prices", error);
      }
    };

    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const baseRateUsd = liveRates[cryptoCurrency as keyof typeof liveRates] || DEFAULT_RATES[cryptoCurrency as keyof typeof DEFAULT_RATES];
  const usdToNgnRate = settings?.usdToNgnRate || 1500;
  const baseRateNgn = baseRateUsd * usdToNgnRate;
  const margin = type === 'buy' ? (settings?.buyMargin || 2) : (settings?.sellMargin || 2);
  
  // If buying, rate is higher (user pays more). If selling, rate is lower (user gets less).
  const effectiveRate = type === 'buy' 
    ? baseRateNgn * (1 + margin / 100) 
    : baseRateNgn * (1 - margin / 100);

  const numAmount = parseFloat(amount) || 0;
  
  // If buying, user inputs fiat amount to get crypto.
  // If selling, user inputs crypto amount to get fiat.
  const calculatedAmount = type === 'buy'
    ? (numAmount / effectiveRate).toFixed(6)
    : (numAmount * effectiveRate).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('Please log in to make a transaction');
      navigate('/login');
      return;
    }

    if (numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (type === 'buy' && !senderName.trim()) {
      toast.error('Please enter the sender\'s name');
      return;
    }

    if (type === 'sell' && (!recipientAccount.trim() || !recipientBank.trim() || !recipientName.trim())) {
      toast.error('Please fill in all bank account details');
      return;
    }

    setLoading(true);
    try {
      const transactionData: any = {
        userId: currentUser.uid,
        type,
        amountFiat: type === 'buy' ? numAmount : parseFloat(calculatedAmount),
        amountCrypto: type === 'buy' ? parseFloat(calculatedAmount) : numAmount,
        fiatCurrency,
        cryptoCurrency,
        rate: effectiveRate,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (type === 'buy') {
        transactionData.senderName = senderName;
      } else {
        transactionData.recipientAccount = recipientAccount;
        transactionData.recipientBank = recipientBank;
        transactionData.recipientName = recipientName;
      }

      await addDoc(collection(db, 'transactions'), transactionData);
      toast.success('Transaction submitted successfully!');
      
      // Reset form
      setAmount('');
      setSenderName('');
      setRecipientAccount('');
      setRecipientBank('');
      setRecipientName('');
      
      navigate('/dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
      toast.error('Failed to submit transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
          <Zap className="w-4 h-4" />
          <span>Lightning Fast Exchange</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-br from-white via-blue-100 to-blue-400 bg-clip-text text-transparent">
          Crypto to Fiat,<br />Simplified.
        </h1>
        <p className="text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto">
          The most secure and premium on/off-ramp platform for your digital assets.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative group"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <Card className="relative shadow-2xl border-white/10 bg-[#0B0F19]/80 backdrop-blur-2xl rounded-[2rem] overflow-hidden">
          <Tabs value={type} onValueChange={(v) => setType(v as 'buy' | 'sell')} className="w-full">
            <div className="p-2 bg-[#06080F]/50">
              <TabsList className="grid w-full grid-cols-2 rounded-xl h-14 bg-black/40 p-1 border border-white/5">
                <TabsTrigger value="buy" className="text-base rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">Buy Crypto</TabsTrigger>
                <TabsTrigger value="sell" className="text-base rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">Sell Crypto</TabsTrigger>
              </TabsList>
            </div>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="pt-8 px-4 sm:px-8 space-y-6">
                {/* Crypto Selection Row */}
                <div className="space-y-3">
                  <Label className="text-zinc-400 font-medium ml-1 text-sm">Select Cryptocurrency</Label>
                  <div className="flex gap-2 sm:gap-4">
                    {['SOL', 'USDT', 'USDC'].map((crypto) => (
                      <button
                        key={crypto}
                        type="button"
                        onClick={() => setCryptoCurrency(crypto)}
                        className={`flex-1 py-3 sm:py-4 px-2 sm:px-4 rounded-xl font-medium text-sm sm:text-base transition-all duration-300 border ${
                          cryptoCurrency === crypto
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] border-transparent'
                            : 'bg-[#06080F]/60 text-zinc-400 border-white/5 hover:bg-white/5 hover:text-zinc-200'
                        }`}
                      >
                        {crypto}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 relative mt-6">
                  <div className="space-y-2">
                    <Label className="text-zinc-400 font-medium ml-1">You {type === 'buy' ? 'Pay' : 'Sell'}</Label>
                    <div className="relative flex items-center">
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-2xl font-medium h-16 bg-[#06080F]/80 border-white/10 focus-visible:ring-blue-500/50 rounded-2xl px-4 pr-24"
                        step="any"
                        min="0"
                        required
                      />
                      <div className="absolute right-4 flex items-center justify-center bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        <span className="text-sm font-bold text-white">{type === 'buy' ? fiatCurrency : cryptoCurrency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center -my-4 relative z-10">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 180 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-full shadow-lg shadow-blue-500/20 cursor-pointer border border-white/10"
                      onClick={() => setType(type === 'buy' ? 'sell' : 'buy')}
                    >
                      <ArrowDownUp className="w-5 h-5 text-white" />
                    </motion.div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400 font-medium ml-1">You Receive (Estimated)</Label>
                    <div className="relative flex items-center">
                      <Input 
                        type="text" 
                        value={numAmount > 0 ? calculatedAmount : '0.00'}
                        className="text-2xl font-medium h-16 bg-[#06080F]/40 border-white/5 text-zinc-300 rounded-2xl px-4 pr-24"
                        readOnly
                      />
                      <div className="absolute right-4 flex items-center justify-center bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        <span className="text-sm font-bold text-white">{type === 'buy' ? cryptoCurrency : fiatCurrency}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#06080F]/60 p-5 rounded-2xl border border-white/5 space-y-3 text-sm backdrop-blur-sm">
                  <div className="flex justify-between items-center text-zinc-400">
                    <span className="flex items-center gap-2"><ArrowDownUp className="w-4 h-4" /> Exchange Rate</span>
                    <span className="font-medium text-zinc-200">1 {cryptoCurrency} = {effectiveRate.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Network Fee</span>
                    <span className="font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">Included</span>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {type === 'buy' && (
                    <motion.div 
                      key="buy-details"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-5 pt-2"
                    >
                      <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 p-5 rounded-2xl border border-blue-500/20 space-y-3">
                        <p className="text-sm text-blue-300 font-medium flex items-center gap-2">
                          <Wallet className="w-4 h-4" /> Please send NGN to:
                        </p>
                        <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-sm bg-black/20 p-4 rounded-xl">
                          <span className="text-zinc-400">Account:</span>
                          <span className="col-span-2 font-mono text-white text-base tracking-wider">9136806231</span>
                          <span className="text-zinc-400">Bank:</span>
                          <span className="col-span-2 text-white font-medium">OPay</span>
                          <span className="text-zinc-400">Name:</span>
                          <span className="col-span-2 text-white font-medium">Adeniji Samuel Temiloluwa</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="senderName" className="text-zinc-400 font-medium ml-1">Sender's Name</Label>
                        <Input 
                          id="senderName"
                          type="text" 
                          placeholder="Enter the name on the sending account" 
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          className="h-14 bg-[#06080F]/80 border-white/10 focus-visible:ring-blue-500/50 rounded-xl px-4"
                          required={type === 'buy'}
                        />
                      </div>
                    </motion.div>
                  )}

                  {type === 'sell' && (
                    <motion.div 
                      key="sell-details"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-5 pt-2"
                    >
                      <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-5 rounded-2xl border border-indigo-500/20 space-y-3">
                        <p className="text-sm text-indigo-300 font-medium flex items-center gap-2">
                          <Wallet className="w-4 h-4" /> Send {cryptoCurrency} to this wallet:
                        </p>
                        <div className="text-sm break-all font-mono text-white bg-black/30 p-4 rounded-xl border border-white/5 shadow-inner">
                          {cryptoCurrency === 'SOL' && '2MYX1kp5F3v5CQVMedm9S2npC3AmvLCEqbAj6sjc4cTD'}
                          {cryptoCurrency === 'USDT' && '0x80a4b52919e5799da523b8f96f545d43171319c8 (BEP20)'}
                          {cryptoCurrency === 'USDC' && '0x80a4b52919e5799da523b8f96f545d43171319c8 (BEP20)'}
                        </div>
                      </div>
                      <div className="space-y-4 bg-[#06080F]/40 p-5 rounded-2xl border border-white/5">
                        <p className="text-sm font-medium text-zinc-300 mb-2">Where should we send your NGN?</p>
                        <div className="space-y-2">
                          <Label htmlFor="recipientAccount" className="text-zinc-400 text-xs ml-1">Account Number</Label>
                          <Input 
                            id="recipientAccount"
                            type="text" 
                            placeholder="e.g. 0123456789" 
                            value={recipientAccount}
                            onChange={(e) => setRecipientAccount(e.target.value)}
                            className="h-12 bg-[#06080F]/80 border-white/10 focus-visible:ring-indigo-500/50 rounded-xl"
                            required={type === 'sell'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="recipientBank" className="text-zinc-400 text-xs ml-1">Bank Name</Label>
                          <Input 
                            id="recipientBank"
                            type="text" 
                            placeholder="e.g. GTBank" 
                            value={recipientBank}
                            onChange={(e) => setRecipientBank(e.target.value)}
                            className="h-12 bg-[#06080F]/80 border-white/10 focus-visible:ring-indigo-500/50 rounded-xl"
                            required={type === 'sell'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="recipientName" className="text-zinc-400 text-xs ml-1">Account Name</Label>
                          <Input 
                            id="recipientName"
                            type="text" 
                            placeholder="e.g. John Doe" 
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            className="h-12 bg-[#06080F]/80 border-white/10 focus-visible:ring-indigo-500/50 rounded-xl"
                            required={type === 'sell'}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </CardContent>
              <CardFooter className="pb-8 px-6 sm:px-8">
                <Button 
                  type="submit" 
                  className={`w-full h-16 text-lg font-semibold text-white rounded-2xl transition-all duration-300 ${
                    type === 'buy' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.4)]' 
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-[0_0_30px_rgba(79,70,229,0.4)]'
                  }`} 
                  disabled={loading || numAmount <= 0}
                >
                  {loading ? 'Processing...' : (currentUser ? `${type === 'buy' ? 'Buy' : 'Sell'} ${cryptoCurrency}` : 'Log in to continue')}
                </Button>
              </CardFooter>
            </form>
          </Tabs>
        </Card>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 mb-12 flex items-start gap-4 p-5 bg-blue-950/20 text-blue-200 rounded-2xl border border-blue-900/30 backdrop-blur-sm shadow-xl"
      >
        <div className="bg-blue-500/20 p-2 rounded-full">
          <Info className="w-5 h-5 text-blue-400" />
        </div>
        <div className="text-sm">
          <p className="font-semibold mb-1 text-blue-300 text-base">How it works</p>
          <p className="text-blue-200/70 leading-relaxed">After submitting your request, you will receive instructions on how to complete the payment. Your transaction will be processed once the payment is confirmed by our team.</p>
        </div>
      </motion.div>
    </div>
  );
}
