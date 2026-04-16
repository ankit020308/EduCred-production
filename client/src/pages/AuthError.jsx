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
    <div className="min-h-screen flex items-center justify-center bg-[#000000] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/10 blur-[160px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="relative z-10 bg-[#0A0A0A]/90 backdrop-blur-3xl border border-white/[0.06] rounded-[2.5rem] p-12 max-w-md w-full mx-4 text-center shadow-[0_0_80px_rgba(0,0,0,0.6)]"
      >
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.15)]">
          <ShieldX size={36} className="text-rose-500" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-extrabold text-white tracking-tighter uppercase mb-3">
          Auth Failed
        </h1>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400/40 mb-8">
          Google identity verification was rejected or cancelled
        </p>

        {/* Error detail */}
        <div className="bg-rose-500/[0.03] border border-white/5 rounded-2xl p-6 mb-10 text-left">
          <p className="text-rose-400/60 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed mb-6">
            Protocol failure detected:
          </p>
          <ul className="space-y-3 text-white/40 text-[9px] font-black uppercase tracking-widest list-none">
            <li className="flex items-center gap-3"><div className="w-1 h-1 bg-rose-500 rounded-full" /> Login was cancelled by user</li>
            <li className="flex items-center gap-3"><div className="w-1 h-1 bg-rose-500 rounded-full" /> Google account not permitted</li>
            <li className="flex items-center gap-3"><div className="w-1 h-1 bg-rose-500 rounded-full" /> OAuth callback URL mismatch</li>
            <li className="flex items-center gap-3"><div className="w-1 h-1 bg-rose-500 rounded-full" /> Session or network timeout</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            id="retry-google-btn"
            type="button"
            onClick={handleRetry}
            className="btn-command btn-blue w-full h-16"
          >
            <RefreshCw size={16} />
            Retry Google Login
          </button>
          <button
            id="back-to-login-btn"
            type="button"
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-3 bg-transparent border border-white/[0.08] hover:border-white/20 text-slate-400 hover:text-white rounded-2xl py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] transition-all active:scale-95"
          >
            <ArrowLeft size={16} />
            Back to Login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
