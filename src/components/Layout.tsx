import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { ArrowRightLeft, LogOut, LayoutDashboard, Settings, Menu, X, Crown, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function Layout() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setIsMenuOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleXPremium = () => {
    navigate('/premium');
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#06080F] flex flex-col font-sans text-white">
      <header className="bg-[#0B0F19] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white z-50">
            <div className="bg-indigo-600 text-white p-1.5 rounded-md shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            Btg Xchange
            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30 hidden xs:inline-block">
              Beta V2
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            {currentUser ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleXPremium}
                  className="gap-2 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border border-amber-400/20"
                >
                  <Crown className="w-4 h-4" />
                  X Premium
                </Button>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2 text-zinc-300 hover:text-white hover:bg-white/5">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="gap-2 text-zinc-300 hover:text-white hover:bg-white/5">
                    <User className="w-4 h-4" />
                    Profile
                  </Button>
                </Link>
                {userRole === 'admin' && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="gap-2 text-zinc-300 hover:text-white hover:bg-white/5">
                      <Settings className="w-4 h-4" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5">
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-white/5">Log in</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]">Sign up</Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2 z-50">
            {!currentUser && (
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-zinc-300">Log in</Button>
              </Link>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-zinc-300 hover:text-white hover:bg-white/5"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[280px] bg-[#0B0F19] opacity-100 border-l border-white/5 z-50 md:hidden p-6 pt-20 flex flex-col gap-4 shadow-2xl"
            >
              {currentUser ? (
                <>
                  <div className="mb-4 pb-4 border-b border-white/5">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Account</p>
                    <p className="text-sm font-medium text-zinc-200 truncate">{currentUser.email}</p>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    onClick={handleXPremium}
                    className="justify-start gap-3 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 h-12 rounded-xl"
                  >
                    <Crown className="w-5 h-5" />
                    X Premium
                  </Button>

                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-300 hover:text-white hover:bg-white/5 h-12 rounded-xl">
                      <LayoutDashboard className="w-5 h-5" />
                      Dashboard
                    </Button>
                  </Link>

                  <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-300 hover:text-white hover:bg-white/5 h-12 rounded-xl">
                      <User className="w-5 h-5" />
                      My Profile
                    </Button>
                  </Link>

                  {userRole === 'admin' && (
                    <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-300 hover:text-white hover:bg-white/5 h-12 rounded-xl">
                        <Settings className="w-5 h-5" />
                        Admin Panel
                      </Button>
                    </Link>
                  )}

                  <div className="mt-auto pt-4 border-t border-white/5">
                    <Button 
                      variant="ghost" 
                      onClick={handleLogout}
                      className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 h-12 rounded-xl"
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-zinc-300">Log in</Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white">Sign up</Button>
                  </Link>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      <footer className="bg-[#0B0F19] border-t border-white/5 py-8 text-center text-sm text-zinc-500">
        <p>&copy; {new Date().getFullYear()} Btg Xchange. All rights reserved.</p>
      </footer>
    </div>
  );
}
