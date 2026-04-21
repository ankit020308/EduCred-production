import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle2,
  Fingerprint,
  Globe,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * 🔑 PROFESSIONAL LOGIN PAGE
 * Clean split-screen layout mirroring the Signup flow for consistency.
 * Replaces technical jargon with standard, trustworthy SaaS terminology.
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      if (err?.requiresVerification) {
        navigate(`/verify-otp?email=${encodeURIComponent(err.email)}`);
        return;
      }
      const msg = typeof err === 'string' ? err : err?.response?.data?.error || 'Authentication failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="relative min-h-screen flex bg-white font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* ─── LEFT PANE: BRANDING & TRUST ────────────────────────────────── */}
      <div className="hidden lg:flex w-[40%] flex-col relative overflow-hidden bg-[#0B132B]">
        <div className="absolute inset-0 z-0 opacity-40">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,#2563EB_0%,transparent_50%),radial-gradient(circle_at_80%_70%,#38BDF8_0%,transparent_50%)]" />
        </div>

        <div className="relative z-10 flex flex-col h-full p-16">
          <Link to="/" className="flex items-center gap-3 w-fit mb-24 hover:scale-105 transition-transform">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight uppercase">Edu<span className="text-blue-500">Cred</span></span>
          </Link>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-4xl font-black text-white leading-tight mb-8">
               Welcome back to <br/> your <span className="text-blue-400">secure workspace.</span>
            </h2>
            
            <div className="space-y-6">
               <div className="flex items-center gap-3 text-slate-300 font-bold text-sm">
                 <CheckCircle2 size={18} className="text-blue-500" /> Secure enterprise access
               </div>
               <div className="flex items-center gap-3 text-slate-300 font-bold text-sm">
                 <CheckCircle2 size={18} className="text-blue-500" /> Decentralized identity anchoring
               </div>
               <div className="flex items-center gap-3 text-slate-300 font-bold text-sm">
                 <CheckCircle2 size={18} className="text-blue-500" /> Real-time credential management
               </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex items-center gap-4">
             <div className="flex -space-x-2">
                {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0B132B] bg-slate-700" />)}
             </div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
               Trusted by 1,200+ institutions
             </span>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANE: LOGIN FORM ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-24 bg-[#F8FAFC]">
        <div className="w-full max-w-[400px]">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 text-center lg:text-left"
          >
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Log In</h1>
            <p className="text-slate-500 text-sm font-medium">Access your verified credentials.</p>
          </motion.div>

          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    type="email" placeholder="Email Address" required autoFocus
                    value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    type={showPassword ? 'text' : 'password'} placeholder="Password" required
                    value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-12 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                 <button type="button" className="text-xs font-bold text-blue-600 hover:underline">Forgot password?</button>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full !shadow-blue-500/10">
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
              </button>

              {error && <p className="text-rose-600 text-[10px] font-black uppercase text-center mt-4">Error: {error}</p>}
            </form>
          </div>

          <p className="text-center mt-12 text-slate-400 text-xs font-medium">
             Don't have an account?{' '}
             <Link to="/signup" className="text-blue-500 font-bold hover:underline">Get Started</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
