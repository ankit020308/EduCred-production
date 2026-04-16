import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Hexagon, ArrowLeft, Home, Shield } from 'lucide-react';
import BlockchainBackground from '../components/BlockchainBackground';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#000000] font-sans overflow-hidden px-6">
      {/* Ambient */}
      <div className="fixed inset-0 z-0 opacity-25 mix-blend-screen pointer-events-none">
        <BlockchainBackground />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-600/8 blur-[180px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[480px] text-center"
      >
        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-3 mb-12 group">
          <div className="w-10 h-10 bg-[#111] border border-white/[0.06] rounded-xl flex items-center justify-center group-hover:border-blue-500/30 transition-colors">
            <Hexagon className="text-blue-500" size={20} />
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">
            Edu<span className="text-blue-500">Cred</span>
          </span>
        </Link>

        {/* Card */}
        <div className="bg-[#0A0A0A]/90 backdrop-blur-3xl border border-white/[0.06] rounded-[2.5rem] p-12 shadow-[0_0_100px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

          {/* 404 */}
          <div className="relative mb-8">
            <div className="text-[120px] font-black leading-none text-white/[0.04] select-none tracking-tighter">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <Shield className="text-blue-500" size={28} />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight mb-3">
            Route Not Found
          </h1>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] leading-relaxed mb-10 max-w-xs mx-auto">
            The path you're looking for doesn't exist on this protocol.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:border-white/20 transition-all"
            >
              <ArrowLeft size={14} /> Go Back
            </button>
            <Link
              to="/"
              className="btn-command btn-blue flex-1 h-14"
            >
              <Home size={14} /> Home
            </Link>
          </div>
        </div>

        <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-700">
          EduCred · Blockchain Credential Network
        </p>
      </motion.div>
    </div>
  );
}
