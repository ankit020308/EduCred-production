import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldX, ArrowLeft, RefreshCw } from 'lucide-react';

/**
 * AuthError — shown when the Google OAuth redirect flow fails.
 * Backend redirects here via: failureRedirect: `${CLIENT_URL}/auth/error`
 */
export default function AuthError() {
  const navigate = useNavigate();

  const handleRetry = () => {
    // Full page redirect to restart the OAuth flow
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] relative overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="relative z-10 bg-white border border-slate-100 rounded-[2.5rem] p-12 max-w-sm w-full mx-4 text-center shadow-2xl shadow-slate-900/10"
      >
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-8 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center shadow-sm">
          <ShieldX size={36} className="text-rose-500" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-3 leading-none">
          Auth <span className="text-rose-500">Error.</span>
        </h1>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">
          Unable to sign in with Google
        </p>

        {/* Error detail */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-10 text-left">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed mb-6">
            Common reasons:
          </p>
          <ul className="space-y-3 text-slate-600 text-[10px] font-bold uppercase tracking-widest list-none">
            <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> Login was cancelled</li>
            <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> Account not permitted</li>
            <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> Connection timed out</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4">
          <button
            id="retry-google-btn"
            type="button"
            onClick={handleRetry}
            className="btn-primary w-full h-16 !shadow-blue-500/10"
          >
            <RefreshCw size={18} />
            Retry Login
          </button>
          <button
            id="back-to-login-btn"
            type="button"
            onClick={() => navigate('/login')}
            className="w-full h-14 flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50 hover:text-slate-600"
          >
            <ArrowLeft size={16} />
            Back to Login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
