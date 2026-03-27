/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Buffer } from 'buffer';

// Polyfill Buffer for WalletConnect v2
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import XPremium from './pages/XPremium';
import { PhantomProvider, darkTheme, AddressType } from "@phantom/react-sdk";

// Solana Wallet Adapter Imports
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { UnifiedWalletProvider } from '@jup-ag/wallet-adapter';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TrustWalletAdapter,
  CoinbaseWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { WalletConnectWalletAdapter } from '@solana/wallet-adapter-walletconnect';
import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// Import Solana Wallet Adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  state = { hasError: false, error: null as Error | null };

  constructor(props: { children: React.ReactNode }) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#06080F] text-white p-4">
          <div className="max-w-xl bg-red-500/10 border border-red-500/20 p-6 rounded-xl">
            <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
            <p className="text-sm text-red-300/80 mb-4">The application crashed. Here is the error:</p>
            <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs font-mono text-red-200">
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!currentUser) return <Navigate to="/login" replace />;

  if (requireAdmin && userRole !== 'admin') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

export default function App() {
  // You can provide a custom RPC endpoint here
  const endpoint = React.useMemo(() => clusterApiUrl('mainnet-beta'), []);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Ignore WalletErrors (like user rejecting the connection)
      if (event.reason && event.reason.name && event.reason.name.includes('Wallet')) {
        event.preventDefault();
        return;
      }
      
      // Ignore specific wallet adapter errors that are safe to ignore
      if (event.reason && typeof event.reason.message === 'string' && 
         (event.reason.message.includes('User rejected') || 
          event.reason.message.includes('Wallet connection failed') ||
          event.reason.message.includes('HTTP status code: 403') ||
          event.reason.message.includes('Allowlist'))) {
        event.preventDefault();
        return;
      }

      console.error('Unhandled Promise Rejection:', event.reason);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
  // Only the wallets you configure here will be compiled into your application, and only the dependencies
  // of wallets that your users connect to will be loaded.
  // Modern wallets support the Wallet Standard and are auto-detected, so we don't need to add them here.
  // However, for mobile browsers to connect to wallet apps like Jupiter, we need WalletConnect.
  const wallets = React.useMemo(() => [
    new WalletConnectWalletAdapter({
      network: WalletAdapterNetwork.Mainnet,
      options: {
        // Use a custom project ID from env, or fallback to the one provided by the user
        // @ts-ignore
        projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '26a2c8cd12a81d4a285f51674c2a69db',
        metadata: {
          name: 'Zyrohub',
          description: 'Zyrohub Crypto Exchange',
          url: 'https://zyrohub.online',
          icons: ['https://zyrohub.online/favicon.ico'],
        },
      },
    }),
  ], []);

  const handleWalletError = React.useCallback(
    (error: WalletError) => {
      console.error('Wallet Error:', error);
      // We catch the error here so it doesn't bubble up to the global unhandledrejection handler
    },
    []
  );

  return (
    <ErrorBoundary>
      <PhantomProvider
        config={{
          providers: ["google", "apple", "injected"], // Enabled auth methods
          appId: "7ea0bc44-726b-49c8-9d7d-e89003266c03",
          addressTypes: [AddressType.ethereum, AddressType.solana, AddressType.bitcoinSegwit, AddressType.sui],
          authOptions: {
            redirectUrl: "https://zyrohub.online/auth/callback", // Whitelisted in Phantom Portal
          },
        }}
        theme={darkTheme}
        appIcon="https://zyrohub.online/favicon.ico"
        appName="Zyrohub"
      >
        <ConnectionProvider endpoint={endpoint}>
          <UnifiedWalletProvider
            wallets={wallets}
            config={{
              autoConnect: true,
              env: 'mainnet-beta',
              metadata: {
                name: 'Zyrohub',
                description: 'Zyrohub Crypto Exchange',
                url: 'https://zyrohub.online',
                iconUrls: ['https://zyrohub.online/favicon.ico'],
              },
              theme: 'dark',
            }}
          >
            {/* @ts-ignore */}
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
              <AuthProvider>
                <Router>
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Home />} />
                      <Route path="login" element={<Login />} />
                      <Route path="register" element={<Register />} />
                      <Route path="dashboard" element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="admin" element={
                        <ProtectedRoute requireAdmin>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="premium" element={
                        <ProtectedRoute>
                          <XPremium />
                        </ProtectedRoute>
                      } />
                      {/* Phantom Auth Callback Route */}
                      <Route path="auth/callback" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>
                </Router>
                <Toaster position="top-center" richColors />
              </AuthProvider>
            </ThemeProvider>
          </UnifiedWalletProvider>
        </ConnectionProvider>
      </PhantomProvider>
    </ErrorBoundary>
  );
}
