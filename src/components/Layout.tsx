import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { ArrowRightLeft, LogOut, LayoutDashboard, Settings } from 'lucide-react';

export default function Layout() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080F] flex flex-col font-sans text-white">
      <header className="bg-[#0B0F19]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <div className="bg-blue-600 text-white p-1.5 rounded-md shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            Btg Xchange
          </Link>

          <nav className="flex items-center gap-4">
            {currentUser ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2 text-zinc-300 hover:text-white hover:bg-white/5">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
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
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      <footer className="bg-[#0B0F19] border-t border-white/5 py-8 text-center text-sm text-zinc-500">
        <p>&copy; {new Date().getFullYear()} Btg Xchange. All rights reserved.</p>
      </footer>
    </div>
  );
}
