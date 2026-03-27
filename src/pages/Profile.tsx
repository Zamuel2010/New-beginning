import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { User, Wallet, Save, UserCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const { currentUser, userData, refreshUserData } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || '');
      setWalletAddress(userData.walletAddress || '');
    }
  }, [userData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        displayName,
        walletAddress,
        updatedAt: new Date(),
      });
      await refreshUserData();
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      try {
        handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
      } catch (e) {
        toast.error('Failed to update profile. Please check your permissions.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
            <UserCircle className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Your Profile</h1>
            <p className="text-zinc-400">Manage your account settings and wallet address</p>
          </div>
        </div>

        <Card className="bg-[#0B0F19] border-white/5 shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/[0.02]">
            <CardTitle className="text-xl">Profile Information</CardTitle>
            <CardDescription className="text-zinc-500">
              Update your personal details and Solana wallet address
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-400">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="bg-white/5 border-white/10 text-zinc-500 cursor-not-allowed"
                />
                <p className="text-[10px] text-zinc-600 italic">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-zinc-400 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="walletAddress" className="text-zinc-400 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Solana Wallet Address
                </Label>
                <Input
                  id="walletAddress"
                  placeholder="Enter your Solana wallet address (e.g. 7ea0...)"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-indigo-500/50 transition-colors font-mono text-sm"
                />
                <p className="text-[10px] text-zinc-500">
                  This address will be used for your transactions and saved for future use.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-12 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving Changes...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="w-5 h-5" />
                      Save Profile
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg h-fit">
          <Crown className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h4 className="text-amber-400 font-semibold text-sm">Security Tip</h4>
          <p className="text-xs text-amber-400/70 mt-1">
            Always double-check your wallet address before saving. Zyrohub is not responsible for funds sent to incorrect addresses.
          </p>
        </div>
      </div>
    </div>
  );
}

import { Crown } from 'lucide-react';
