import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, ArrowRight, CheckCircle2, Loader2, Eye, EyeOff, GraduationCap, Building2, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { id: 'student',     label: 'Student',     icon: GraduationCap, hint: 'Access your certificates' },
  { id: 'institution', label: 'Institution', icon: Building2,     hint: 'Issue & manage credentials' },
  { id: 'admin',       label: 'Admin',       icon: Shield,         hint: 'Platform administration' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validateFields = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateFields()) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      if (err?.requiresVerification) {
        navigate(`/verify-otp?email=${encodeURIComponent(err.email)}`);
        return;
      }
      setError(typeof err === 'string' ? err : err?.response?.data?.error || 'Authentication failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans overflow-hidden">

      {/* Left hero */}
      <div className="hidden lg:flex w-[42%] flex-col hero-gradient relative overflow-hidden">
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
              {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white/30 bg-white/20" />)}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Ready for institutional integration</span>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-14 bg-[#f6f6f6]">
        <div className="w-full max-w-[420px]">

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl font-black text-[#202020] tracking-tight mb-1">Log In</h1>
            <p className="text-[#646464] text-sm">Access your verified credentials.</p>
          </motion.div>

          {/* Role selector */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="mb-6">
            <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-3">Sign in as</p>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(role => (
                <button key={role.id} type="button" onClick={() => setSelectedRole(role.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    selectedRole === role.id
                      ? 'bg-[#ea2804]/10 border-[#ea2804] text-[#ea2804]'
                      : 'bg-white border-[#e0e0e0] text-[#646464] hover:border-[#202020]'
                  }`}>
                  <role.icon size={18} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{role.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Form card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={16} />
                  <input type="email" placeholder="student@university.edu" required autoFocus
                    value={form.email}
                    onChange={e => { setForm({ ...form, email: e.target.value }); setFieldErrors(p => ({ ...p, email: '' })); }}
                    onBlur={() => { if (!form.email) setFieldErrors(p => ({ ...p, email: 'Email is required.' })); }}
                    className={`ds-input pl-11 ${fieldErrors.email ? 'border-[#ea2804] bg-[#ea2804]/5' : ''}`} />
                </div>
                {fieldErrors.email && <p className="text-[9px] font-bold text-[#ea2804] uppercase tracking-widest">{fieldErrors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={16} />
                  <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" required
                    value={form.password}
                    onChange={e => { setForm({ ...form, password: e.target.value }); setFieldErrors(p => ({ ...p, password: '' })); }}
                    onBlur={() => { if (!form.password) setFieldErrors(p => ({ ...p, password: 'Password is required.' })); }}
                    className={`ds-input pl-11 pr-12 ${fieldErrors.password ? 'border-[#ea2804] bg-[#ea2804]/5' : ''}`} />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#bbbbbb] hover:text-[#202020] transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-[9px] font-bold text-[#ea2804] uppercase tracking-widest">{fieldErrors.password}</p>}
              </div>

              <div className="flex justify-end">
                <button type="button" className="text-[9px] font-bold text-[#ea2804] uppercase tracking-widest"
                  style={{ textDecoration: 'underline dotted #ea2804', textUnderlineOffset: '3px' }}>
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="animate-spin" size={16} /> : <>Sign In <ArrowRight size={14} /></>}
              </button>

              {error && (
                <p className="text-[#ea2804] text-[9px] font-bold uppercase tracking-widest text-center border border-[#ea2804]/20 bg-[#ea2804]/5 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}
            </form>
          </motion.div>

          <p className="text-center mt-8 text-[#646464] text-sm">
            Don&apos;t have an account?{' '}
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
