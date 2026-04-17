import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Hexagon, ArrowLeft, Home, Shield } from 'lucide-react';
import BlockchainBackground from '../components/BlockchainBackground';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] font-sans overflow-hidden px-6">
      
      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[480px] text-center"
      >
        {/* Card */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-12 shadow-2xl shadow-slate-900/10 relative overflow-hidden">
          
          {/* 404 */}
          <div className="relative mb-8">
            <div className="text-[120px] font-black leading-none text-slate-50 select-none tracking-tighter">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
                <Shield className="text-blue-600" size={28} />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-3 uppercase">
            Page <span className="text-blue-600">Not Found.</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed mb-10 max-w-xs mx-auto">
            The page you are looking for does not exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={16} /> Go Back
            </button>
            <Link
              to="/"
              className="btn-primary flex-1 h-14 !shadow-blue-500/10"
            >
              <Home size={16} /> Home
            </Link>
          </div>
        </div>

        <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
          EduCred &middot; Secure Digital Credentialing
        </p>
      </motion.div>
    </div>
  );
}
