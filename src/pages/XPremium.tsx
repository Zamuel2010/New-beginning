import React from 'react';
import { motion } from 'motion/react';
import { Crown, Construction, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function XPremium() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full"></div>
        <div className="relative bg-gradient-to-br from-amber-400 to-amber-600 p-6 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.3)]">
          <Crown className="w-16 h-16 text-white" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 max-w-md"
      >
        <h1 className="text-4xl font-extrabold tracking-tight text-white">X Premium</h1>
        <div className="flex items-center justify-center gap-2 text-amber-400 font-medium bg-amber-400/10 px-4 py-2 rounded-full border border-amber-400/20 w-fit mx-auto">
          <Construction className="w-5 h-5" />
          <span>Under Construction</span>
        </div>
        <p className="text-zinc-400 text-lg leading-relaxed">
          We are building something extraordinary for our premium members. 
          Exclusive rates, instant processing, and dedicated support are coming soon.
        </p>
        
        <div className="pt-8">
          <Button 
            onClick={() => navigate('/')}
            variant="outline" 
            className="gap-2 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 h-12 px-8 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
