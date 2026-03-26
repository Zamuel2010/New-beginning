import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, Settings, List, Users, LayoutDashboard, Ban, ShieldCheck, TrendingUp, Activity, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const { userRole } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingRates, setSavingRates] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const { currentUser } = useAuth();
  const isSuperAdmin = currentUser?.email === 'samadeniji852@gmail.com';

  useEffect(() => {
    if (userRole !== 'admin') return;

    // Fetch transactions
    const qTxs = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubscribeTxs = onSnapshot(qTxs, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.GET, 'transactions');
      } catch (e) {}
    });

    // Fetch users
    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'users');
      } catch (e) {}
    });

    // Fetch settings
    const docRef = doc(db, 'settings', 'rates');
    const unsubscribeSettings = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setSettings({
          buyMargin: 2,
          sellMargin: 2,
          baseRates: { SOL: 150, USDT: 1, USDC: 1 },
          usdToNgnRate: 1500,
        });
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'settings/rates');
      } catch (e) {}
    });

    return () => {
      unsubscribeTxs();
      unsubscribeUsers();
      unsubscribeSettings();
    };
  }, [userRole]);

  const handleStatusUpdate = async (tx: any, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'transactions', tx.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Transaction marked as ${newStatus}`);
    } catch (error: any) {
      console.error('Status update error:', error);
      toast.error(error.message || 'Failed to update transaction');
    }
  };

  const handleAutoSend = async (tx: any) => {
    try {
      toast.info('Initiating automatic crypto transfer...');
      const idToken = await auth.currentUser?.getIdToken();
      
      const response = await fetch('/api/admin/send-crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: tx.id, idToken })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send crypto automatically');
      }
      
      toast.success(`Crypto sent successfully! TX Hash: ${data.txHash}`);
    } catch (error: any) {
      console.error('Auto send error:', error);
      toast.error(error.message || 'Failed to send crypto automatically');
    }
  };

  const handleUserStatusUpdate = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
      await updateDoc(doc(db, 'users', id), {
        status: newStatus,
      });
      toast.success(`User has been ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update user status');
      try {
        handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
      } catch (e) {}
    }
  };

  const handleUserRoleUpdate = async (userId: string, currentRole: string) => {
    if (!isSuperAdmin) {
      toast.error('Only the super admin can change roles.');
      return;
    }
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: currentRole === 'admin' ? 'user' : 'admin'
      });
      toast.success(`User role updated to ${currentRole === 'admin' ? 'user' : 'admin'}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
      try {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      } catch (e) {}
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
    user.uid?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRates(true);
    try {
      await setDoc(doc(db, 'settings', 'rates'), {
        ...settings,
        updatedAt: serverTimestamp(),
      });
      toast.success('Rates updated successfully');
    } catch (error) {
      toast.error('Failed to update rates');
      try {
        handleFirestoreError(error, OperationType.UPDATE, 'settings/rates');
      } catch (e) {}
    } finally {
      setSavingRates(false);
    }
  };

  const handleRateChange = (crypto: string, value: string) => {
    setSettings((prev: any) => ({
      ...prev,
      baseRates: {
        ...prev.baseRates,
        [crypto]: parseFloat(value) || 0,
      }
    }));
  };

  const fetchLivePrices = async () => {
    try {
      toast.info('Fetching live prices...');
      const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112,Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const data = await response.json();
      
      const newRates = { ...(settings?.baseRates || { SOL: 150, USDT: 1, USDC: 1 }) };
      
      if (data && data.pairs) {
        const solPair = data.pairs.find((p: any) => p.baseToken.address === 'So11111111111111111111111111111111111111112' && (p.quoteToken.symbol === 'USDC' || p.quoteToken.symbol === 'USDT'));
        if (solPair) newRates.SOL = parseFloat(solPair.priceUsd);
        
        const usdtPair = data.pairs.find((p: any) => p.baseToken.address === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' && p.quoteToken.symbol === 'USDC');
        if (usdtPair) newRates.USDT = parseFloat(usdtPair.priceUsd);
        
        newRates.USDC = 1;
      }
      
      setSettings((prev: any) => ({
        ...prev,
        baseRates: newRates
      }));
      toast.success('Live prices fetched successfully');
    } catch (error) {
      console.error("Error fetching live prices", error);
      toast.error('Failed to fetch live prices');
    }
  };

  if (userRole !== 'admin') {
    return <div className="text-center py-12 text-red-500">Access Denied. Admin only.</div>;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-blue-400">Loading premium dashboard...</div>;
  }

  const totalVolume = transactions.filter(t => t.status === 'completed').reduce((acc, t) => acc + t.amountFiat, 0);
  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const activeUsersCount = users.filter(u => u.status !== 'banned').length;

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return format(d, 'MMM dd');
  });

  const chartData = last7Days.map(date => {
    const dayTxs = transactions.filter(t => t.status === 'completed' && t.createdAt && format(t.createdAt.toDate(), 'MMM dd') === date);
    const volume = dayTxs.reduce((acc, t) => acc + t.amountFiat, 0);
    return { date, volume };
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Command Center</h2>
          <p className="text-zinc-400 mt-1">Manage your empire, transactions, and users.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#0B0F19] p-2 rounded-xl border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-sm font-medium text-zinc-300">System Online</span>
        </div>
      </motion.div>

      <Tabs defaultValue="overview" className="w-full flex flex-col">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-2xl bg-[#06080F] border border-white/10 p-1 rounded-xl h-auto sm:h-14 gap-1 sm:gap-0">
          <TabsTrigger value="overview" className="gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all py-2 sm:py-0"><LayoutDashboard className="w-4 h-4 hidden sm:block" /> Overview</TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all py-2 sm:py-0"><List className="w-4 h-4 hidden sm:block" /> Orders {pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}</TabsTrigger>
          <TabsTrigger value="users" className="gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all py-2 sm:py-0"><Users className="w-4 h-4 hidden sm:block" /> Users</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all py-2 sm:py-0"><Settings className="w-4 h-4 hidden sm:block" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-gradient-to-br from-[#0B0F19] to-[#06080F] border-white/10 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-16 h-16 text-blue-500" /></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-zinc-400 text-sm font-medium">Total Volume (NGN)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{totalVolume.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-gradient-to-br from-[#0B0F19] to-[#06080F] border-white/10 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Activity className="w-16 h-16 text-yellow-500" /></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-zinc-400 text-sm font-medium">Pending Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{pendingCount}</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-gradient-to-br from-[#0B0F19] to-[#06080F] border-white/10 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-16 h-16 text-emerald-500" /></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-zinc-400 text-sm font-medium">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{activeUsersCount}</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6">
            <Card className="bg-gradient-to-br from-[#0B0F19] to-[#06080F] border-white/10 shadow-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white">Transaction Volume (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₦${(value/1000)}k`} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0B0F19', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number) => [value.toLocaleString('en-US', { style: 'currency', currency: 'NGN' }), 'Volume']}
                    />
                    <Area type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-8 space-y-6">
          <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 p-5 rounded-2xl border border-blue-500/20 shadow-lg">
            <h3 className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Platform Wallet Addresses (For receiving Sell transactions)</h3>
            <div className="grid gap-3 text-sm font-mono text-zinc-300">
              <div className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="font-sans font-medium text-zinc-400">SOL</span>
                <span className="text-white tracking-wider">2MYX1kp5F3v5CQVMedm9S2npC3AmvLCEqbAj6sjc4cTD</span>
              </div>
              <div className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="font-sans font-medium text-zinc-400">USDT (BEP20)</span>
                <span className="text-white tracking-wider">0x80a4b52919e5799da523b8f96f545d43171319c8</span>
              </div>
              <div className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="font-sans font-medium text-zinc-400">USDC (BEP20)</span>
                <span className="text-white tracking-wider">0x80a4b52919e5799da523b8f96f545d43171319c8</span>
              </div>
            </div>
          </div>

          <Card className="border-white/10 bg-[#0B0F19]/90 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-black/20">
              <CardTitle className="text-white">All Transactions</CardTitle>
              <CardDescription className="text-zinc-400">
                Review and process user exchange requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="text-center py-16 text-zinc-500">No transactions found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#06080F]/50">
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-zinc-400 font-medium">Date</TableHead>
                        <TableHead className="text-zinc-400 font-medium">User ID</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Type</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Fiat</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Crypto</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Details</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Status</TableHead>
                        <TableHead className="text-right text-zinc-400 font-medium">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="text-zinc-400 text-xs whitespace-nowrap">
                            {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM d, HH:mm') : 'Pending...'}
                          </TableCell>
                          <TableCell className="font-mono text-xs truncate max-w-[100px] text-zinc-500" title={tx.userId}>
                            {tx.userId.substring(0, 8)}...
                          </TableCell>
                          <TableCell className="capitalize font-medium text-zinc-200">
                            <Badge variant="outline" className={tx.type === 'buy' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10'}>
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-zinc-200 whitespace-nowrap">
                            {tx.amountFiat.toLocaleString('en-US', { style: 'currency', currency: tx.fiatCurrency })}
                          </TableCell>
                          <TableCell className="text-zinc-200 whitespace-nowrap">
                            {tx.amountCrypto} <span className="text-zinc-500 text-xs">{tx.cryptoCurrency}</span>
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400 max-w-[250px] truncate">
                            {tx.type === 'buy' ? (
                              <div className="flex flex-col gap-1">
                                <span title={`Sender: ${tx.senderName}`} className="bg-black/30 px-2 py-1 rounded truncate">Sender: <span className="text-zinc-200">{tx.senderName}</span></span>
                                {tx.recipientWallet && (
                                  <span title={`Wallet: ${tx.recipientWallet}`} className="bg-black/30 px-2 py-1 rounded truncate">Wallet: <span className="text-zinc-200">{tx.recipientWallet}</span></span>
                                )}
                                {tx.txHash && (
                                  <span title={`TX Hash: ${tx.txHash}`} className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 font-mono text-[10px] truncate">
                                    TX: {tx.txHash}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span title={`${tx.recipientBank} - ${tx.recipientAccount} (${tx.recipientName})`} className="bg-black/30 px-2 py-1 rounded block truncate">
                                <span className="text-zinc-200">{tx.recipientBank}</span> - {tx.recipientAccount}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {tx.status === 'completed' && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Completed</Badge>}
                            {tx.status === 'rejected' && <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Rejected</Badge>}
                            {tx.status === 'pending' && <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse">Pending</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger render={<Button size="sm" variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 mr-2" onClick={() => setSelectedTx(tx)} />}>
                                Details
                              </DialogTrigger>
                              <DialogContent className="bg-[#0B0F19] border-white/10 text-white sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Transaction Details</DialogTitle>
                                  <DialogDescription className="text-zinc-400">
                                    Full information for this order.
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedTx && (
                                  <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="text-zinc-400 text-sm font-medium">Type:</span>
                                      <span className="col-span-3 capitalize font-medium">{selectedTx.type}</span>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="text-zinc-400 text-sm font-medium">Amount:</span>
                                      <span className="col-span-3 font-bold text-emerald-400">{selectedTx.amountFiat.toLocaleString('en-US', { style: 'currency', currency: selectedTx.fiatCurrency })}</span>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="text-zinc-400 text-sm font-medium">Crypto:</span>
                                      <span className="col-span-3">{selectedTx.amountCrypto} {selectedTx.cryptoCurrency}</span>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="text-zinc-400 text-sm font-medium">Rate:</span>
                                      <span className="col-span-3">{selectedTx.rate?.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</span>
                                    </div>
                                    <div className="grid grid-cols-4 items-start gap-4">
                                      <span className="text-zinc-400 text-sm font-medium">Info:</span>
                                      <div className="col-span-3 text-sm bg-black/30 p-3 rounded-lg border border-white/5">
                                        {selectedTx.type === 'buy' ? (
                                          <>
                                            <p>Sender Name: <span className="text-white font-medium">{selectedTx.senderName}</span></p>
                                            {selectedTx.recipientWallet && (
                                              <p className="mt-2">Receiving Wallet: <br/><span className="text-white font-mono text-xs break-all">{selectedTx.recipientWallet}</span></p>
                                            )}
                                            {selectedTx.txHash && (
                                              <p className="mt-2">TX Hash: <br/><span className="text-emerald-400 font-mono text-xs break-all">{selectedTx.txHash}</span></p>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            <p>Bank: <span className="text-white font-medium">{selectedTx.recipientBank}</span></p>
                                            <p>Account: <span className="text-white font-medium">{selectedTx.recipientAccount}</span></p>
                                            <p>Name: <span className="text-white font-medium">{selectedTx.recipientName}</span></p>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            {tx.status === 'pending' && (
                              <div className="inline-flex justify-end gap-2">
                                <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors" onClick={() => handleStatusUpdate(tx, 'completed')}>
                                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                </Button>
                                {tx.type === 'buy' && (
                                  <Button size="sm" variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 hover:text-blue-300 transition-colors" onClick={() => handleAutoSend(tx)}>
                                    <Wallet className="w-4 h-4 mr-1" /> Auto Send
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 transition-colors" onClick={() => handleStatusUpdate(tx, 'rejected')}>
                                  <XCircle className="w-4 h-4 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-8">
          <Card className="border-white/10 bg-[#0B0F19]/90 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-white">User Management</CardTitle>
                <CardDescription className="text-zinc-400">
                  View all registered users and manage their access.
                </CardDescription>
              </div>
              <div className="w-full sm:w-64">
                <Input 
                  placeholder="Search by email or ID..." 
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-zinc-500">No users found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#06080F]/50">
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-zinc-400 font-medium">Joined</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Email</TableHead>
                        <TableHead className="text-zinc-400 font-medium">User ID</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Role</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Status</TableHead>
                        <TableHead className="text-right text-zinc-400 font-medium">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="text-zinc-400 text-xs whitespace-nowrap">
                            {user.createdAt ? format(user.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium text-zinc-200">
                            {user.email}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-500">
                            {user.uid}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={user.role === 'admin' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' : 'border-zinc-500/30 text-zinc-400 bg-zinc-500/10'}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.status === 'banned' ? (
                              <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Banned</Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger render={<Button size="sm" variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 mr-2" onClick={() => setSelectedUser(user)} />}>
                                View Details
                              </DialogTrigger>
                              <DialogContent className="bg-[#0B0F19] border-white/10 text-white sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>User Details</DialogTitle>
                                  <DialogDescription className="text-zinc-400">
                                    Comprehensive information about this user.
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedUser && (
                                  <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="text-zinc-400 text-sm font-medium">Email:</span>
                                      <span className="col-span-3 font-medium">{selectedUser.email}</span>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="text-zinc-400 text-sm font-medium">User ID:</span>
                                      <span className="col-span-3 font-mono text-xs text-zinc-300 bg-black/30 p-2 rounded">{selectedUser.uid}</span>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="text-zinc-400 text-sm font-medium">Joined:</span>
                                      <span className="col-span-3">{selectedUser.createdAt ? format(selectedUser.createdAt.toDate(), 'PPP') : 'N/A'}</span>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="text-zinc-400 text-sm font-medium">Total Txs:</span>
                                      <span className="col-span-3">{transactions.filter(t => t.userId === selectedUser.uid).length}</span>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="text-zinc-400 text-sm font-medium">Volume:</span>
                                      <span className="col-span-3 text-emerald-400 font-bold">
                                        {transactions.filter(t => t.userId === selectedUser.uid && t.status === 'completed').reduce((acc, t) => acc + t.amountFiat, 0).toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="text-zinc-400 text-sm font-medium">Status:</span>
                                      <span className="col-span-3">
                                        {selectedUser.status === 'banned' ? (
                                          <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Banned</Badge>
                                        ) : (
                                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                <DialogFooter className="sm:justify-between border-t border-white/10 pt-4">
                                  {selectedUser?.role !== 'admin' && (
                                    <Button 
                                      variant="outline" 
                                      className={selectedUser?.status === 'banned' 
                                        ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20" 
                                        : "text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20"
                                      }
                                      onClick={() => {
                                        handleUserStatusUpdate(selectedUser.id, selectedUser.status);
                                        setSelectedUser({...selectedUser, status: selectedUser.status === 'banned' ? 'active' : 'banned'});
                                      }}
                                    >
                                      {selectedUser?.status === 'banned' ? <CheckCircle className="w-4 h-4 mr-1" /> : <Ban className="w-4 h-4 mr-1" />}
                                      {selectedUser?.status === 'banned' ? 'Unban User' : 'Ban User'}
                                    </Button>
                                  )}
                                  {isSuperAdmin && selectedUser?.email !== 'samadeniji852@gmail.com' && (
                                    <Button 
                                      variant="outline" 
                                      className={selectedUser?.role === 'admin' 
                                        ? "text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20" 
                                        : "text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20"
                                      }
                                      onClick={() => {
                                        handleUserRoleUpdate(selectedUser.id, selectedUser.role);
                                        setSelectedUser({...selectedUser, role: selectedUser.role === 'admin' ? 'user' : 'admin'});
                                      }}
                                    >
                                      <ShieldCheck className="w-4 h-4 mr-1" />
                                      {selectedUser?.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                    </Button>
                                  )}
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            {user.role !== 'admin' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className={user.status === 'banned' 
                                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20" 
                                  : "text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20"
                                }
                                onClick={() => handleUserStatusUpdate(user.id, user.status)}
                              >
                                {user.status === 'banned' ? <CheckCircle className="w-4 h-4 mr-1" /> : <Ban className="w-4 h-4 mr-1" />}
                                {user.status === 'banned' ? 'Unban' : 'Ban'}
                              </Button>
                            )}
                            {isSuperAdmin && user.email !== 'samadeniji852@gmail.com' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className={user.role === 'admin' 
                                  ? "text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 ml-2" 
                                  : "text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 ml-2"
                                }
                                onClick={() => handleUserRoleUpdate(user.id, user.role)}
                              >
                                <ShieldCheck className="w-4 h-4 mr-1" />
                                {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-8">
          <Card className="max-w-3xl border-white/10 bg-[#0B0F19]/90 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-black/20">
              <CardTitle className="text-white">Exchange Rates & Margins</CardTitle>
              <CardDescription className="text-zinc-400">
                Set the base market rates and your platform's profit margins.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveSettings}>
              <CardContent className="space-y-8 pt-6">
                <div className="space-y-4 bg-[#06080F]/50 p-6 rounded-xl border border-white/5">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-400" /> Platform Margins (%)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="buyMargin" className="text-zinc-400">Buy Margin (User Pays More)</Label>
                      <Input 
                        id="buyMargin" 
                        type="number" 
                        step="0.1" 
                        className="h-12 bg-[#0B0F19] border-white/10 text-white focus-visible:ring-blue-500/50 rounded-xl"
                        value={settings?.buyMargin || 0} 
                        onChange={(e) => setSettings({...settings, buyMargin: parseFloat(e.target.value) || 0})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sellMargin" className="text-zinc-400">Sell Margin (User Gets Less)</Label>
                      <Input 
                        id="sellMargin" 
                        type="number" 
                        step="0.1" 
                        className="h-12 bg-[#0B0F19] border-white/10 text-white focus-visible:ring-blue-500/50 rounded-xl"
                        value={settings?.sellMargin || 0} 
                        onChange={(e) => setSettings({...settings, sellMargin: parseFloat(e.target.value) || 0})} 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-[#06080F]/50 p-6 rounded-xl border border-white/5">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-400" /> Fiat Exchange Rate</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="usdToNgnRate" className="sm:text-right font-medium text-zinc-300">USD to NGN</Label>
                    <Input 
                      id="usdToNgnRate" 
                      type="number" 
                      step="any" 
                      className="col-span-1 sm:col-span-3 h-12 bg-[#0B0F19] border-white/10 text-white focus-visible:ring-emerald-500/50 rounded-xl"
                      value={settings?.usdToNgnRate || 1500} 
                      onChange={(e) => setSettings({...settings, usdToNgnRate: parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                </div>

                <div className="space-y-4 bg-[#06080F]/50 p-6 rounded-xl border border-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-indigo-400" /> Base Market Rates (USD)</h3>
                    <Button type="button" variant="outline" size="sm" onClick={fetchLivePrices} className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 rounded-lg">
                      Fetch Live Prices
                    </Button>
                  </div>
                  <div className="grid gap-4 mt-4">
                    {['SOL', 'USDT', 'USDC'].map((crypto) => (
                      <div key={crypto} className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                        <Label htmlFor={`rate-${crypto}`} className="sm:text-right font-medium text-zinc-300">{crypto}</Label>
                        <Input 
                          id={`rate-${crypto}`} 
                          type="number" 
                          step="any" 
                          className="col-span-1 sm:col-span-3 h-12 bg-[#0B0F19] border-white/10 text-white focus-visible:ring-indigo-500/50 rounded-xl"
                          value={settings?.baseRates?.[crypto] || 0} 
                          onChange={(e) => handleRateChange(crypto, e.target.value)} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-black/20 border-t border-white/5 p-6">
                <Button type="submit" disabled={savingRates} className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] rounded-xl transition-all">
                  {savingRates ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
