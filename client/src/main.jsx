import React, { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Loader2, ShieldAlert } from 'lucide-react';
import * as Sentry from '@sentry/react';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
  });
}

/* ── STYLES ── */
import './index.css';

/* ── COMPONENTS ── */
import App from './App.jsx';

/**
 * 🛰️ SYSTEM BOOT LOADER
 */
const RootLoader = () => (
  <div className="h-screen w-screen bg-[#000000] flex flex-col items-center justify-center space-y-6 font-sans">
    <div className="relative">
      <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full animate-ping" />
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
    <div className="text-center space-y-2">
      <p className="text-white text-[10px] font-bold uppercase tracking-[0.4em] animate-pulse">
        Initializing Network Enclave
      </p>
      <p className="text-slate-600 text-[8px] font-bold uppercase tracking-[0.2em]">
        Protocol v2.4.0
      </p>
    </div>
  </div>
);

/**
 * 🛡️ EMERGENCY FAILSAFE
 */
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("─── ❌ CRITICAL RUNTIME EXCEPTION ───");
    console.error(error, errorInfo);
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#050000] flex flex-col items-center justify-center p-12 text-center font-sans">
          <ShieldAlert className="text-rose-500 mb-6 animate-pulse" size={64} />
          <h1 className="text-white text-xl font-black uppercase tracking-[0.4em] mb-4">
            Protocol Security Breach
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-md leading-relaxed mb-8">
            An unrecoverable exception has occurred in the UI layer. 
            The session has been quarantined to prevent data corruption.
          </p>
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl mb-8 w-full max-w-lg">
            <p className="font-mono text-[10px] text-rose-400 break-all">
              {this.state.error?.message || "Unknown Runtime Error"}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-10 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-xl hover:bg-slate-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
          >
            Re-Initialize Protocol
          </button>
        </div>
      );
    }

    return (
      <Suspense fallback={<RootLoader />}>
        {this.props.children}
      </Suspense>
    );
  }
}

/* ── RENDER CORE ── */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>
);
