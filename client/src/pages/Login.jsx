import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, ArrowRight, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
      setError(typeof err === 'string' ? err : err?.response?.data?.error || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans overflow-hidden">

      {/* ── LEFT — Hero Blaze panel ── */}
      <div className="hidden lg:flex w-[42%] flex-col hero-gradient relative overflow-hidden">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />

        <div className="relative z-10 flex flex-col h-full p-14">
          <Link to="/" className="flex items-center gap-3 w-fit mb-20">
            <div className="w-10 h-10 bg-white/20 border border-white/30 rounded-full flex items-center justify-center">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <span className="text-xl font-black text-white tracking-tight">Edu<span className="text-white/70">Cred</span></span>
          </Link>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-4xl font-black text-white leading-tight mb-10 tracking-tight">
              Welcome back to<br />your <span className="text-white/70">secure workspace.</span>
            </h2>

            <div className="space-y-5">
              {['Secure enterprise access', 'Decentralized identity anchoring', 'Real-time credential management'].map((t) => (
                <div key={t} className="flex items-center gap-3 text-white/90 font-semibold text-sm">
                  <CheckCircle2 size={18} className="text-white shrink-0" /> {t}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white/30 bg-white/20" />)}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              Trusted by 1,200+ institutions
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT — Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-14 bg-[#f6f6f6]">
        <div className="w-full max-w-[400px]">

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <h1 className="text-3xl font-black text-[#202020] tracking-tight mb-2">Log In</h1>
            <p className="text-[#646464] text-sm">Access your verified credentials.</p>
          </motion.div>

          <div className="bg-white border border-[#202020] rounded-full p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={18} />
                <input type="email" placeholder="Email Address" required autoFocus
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="ds-input pl-12" />
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={18} />
                <input type={showPassword ? 'text' : 'password'} placeholder="Password" required
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="ds-input pl-12 pr-12" />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#bbbbbb] hover:text-[#202020] transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="flex justify-end">
                <button type="button" className="text-xs font-bold text-[#ea2804]"
                  style={{ textDecoration: 'underline dotted #ea2804', textUnderlineOffset: '3px' }}>
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Sign In <ArrowRight size={16} /></>}
              </button>

              {error && (
                <p className="text-[#ea2804] text-xs font-bold uppercase tracking-widest text-center border border-[#ea2804]/20 bg-[#ea2804]/5 rounded-full px-4 py-2">
                  {error}
                </p>
              )}
            </form>
          </div>

          <p className="text-center mt-10 text-[#646464] text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#ea2804] font-bold"
              style={{ textDecoration: 'underline dotted #ea2804', textUnderlineOffset: '3px' }}>
              Get Started
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
