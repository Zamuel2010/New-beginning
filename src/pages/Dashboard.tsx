import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Clock, Wallet, Activity } from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">Completed</Badge>;
      case 'rejected': return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20">Rejected</Badge>;
      default: return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20 animate-pulse">Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-blue-400">Loading your dashboard...</div>;
  }

  const totalVolume = transactions.filter(t => t.status === 'completed').reduce((acc, t) => acc + t.amountFiat, 0);
  const totalTxs = transactions.length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">My Dashboard</h2>
          <p className="text-zinc-400 mt-1">Manage your fiat/crypto exchange transactions.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-[#0B0F19] to-[#06080F] border-white/10 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-16 h-16 text-blue-500" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-zinc-400 text-sm font-medium">Total Exchanged (NGN)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalVolume.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-[#0B0F19] to-[#06080F] border-white/10 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Activity className="w-16 h-16 text-indigo-500" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-zinc-400 text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalTxs}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-white/10 bg-[#0B0F19]/90 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-black/20">
            <CardTitle className="text-white">Transaction History</CardTitle>
            <CardDescription className="text-zinc-400">
              Your recent exchange activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 flex flex-col items-center">
                <Clock className="w-12 h-12 mb-4 text-zinc-700" />
                <p>No transactions found.</p>
                <p className="text-sm mt-1">Head to the home page to start an exchange.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#06080F]/50">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-zinc-400 font-medium">Type</TableHead>
                      <TableHead className="text-zinc-400 font-medium">Date</TableHead>
                      <TableHead className="text-zinc-400 font-medium">Fiat Amount</TableHead>
                      <TableHead className="text-zinc-400 font-medium">Crypto Amount</TableHead>
                      <TableHead className="text-zinc-400 font-medium">Rate</TableHead>
                      <TableHead className="text-right text-zinc-400 font-medium">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium text-zinc-200">
                            {tx.type === 'buy' ? (
                              <ArrowDownLeft className="w-4 h-4 text-blue-400" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                            )}
                            <span className="capitalize">{tx.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm whitespace-nowrap">
                          {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM d, yyyy HH:mm') : 'Pending...'}
                        </TableCell>
                        <TableCell className="font-medium text-zinc-200 whitespace-nowrap">
                          {tx.amountFiat.toLocaleString('en-US', { style: 'currency', currency: tx.fiatCurrency })}
                        </TableCell>
                        <TableCell className="text-zinc-200 whitespace-nowrap">
                          {tx.amountCrypto} <span className="text-zinc-500 text-xs">{tx.cryptoCurrency}</span>
                        </TableCell>
                        <TableCell className="text-zinc-400 whitespace-nowrap">
                          {tx.rate.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}
                        </TableCell>
                        <TableCell className="text-right">
                          {getStatusBadge(tx.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
