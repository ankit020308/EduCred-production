import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Mail, Lock, User, Building2, FileText, Loader2,
  ArrowRight, Hexagon, Zap, Cpu, Network, ChevronLeft, Terminal, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BlockchainBackground from '../components/BlockchainBackground';

// ─── Animation Variants ───────────────────────────────────────────────────────
// ─── Password Strength ────────────────────────────────────────────────────────
function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const levels = [
    { label: '', color: '' },
    { label: 'Weak', color: 'bg-rose-500' },
    { label: 'Fair', color: 'bg-amber-500' },
    { label: 'Good', color: 'bg-blue-500' },
    { label: 'Strong', color: 'bg-blue-500' },
  ];
  return { score, ...levels[score] };
}

// ─── Node Visualizer (left panel decoration) ─────────────────────────────────
const NodeVisualizer = () => {
  const [nodes, setNodes] = useState(Array.from({ length: 12 }, () => false));

  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => {
        const next = [...prev];
        next[Math.floor(Math.random() * next.length)] = !next[Math.floor(Math.random() * next.length)];
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-6 opacity-70 select-none pointer-events-none p-10">
      {nodes.map((isActive, i) => (
        <div key={i} className="flex flex-col items-center gap-3">
          <motion.div
            animate={{
              scale: isActive ? 1.15 : 1,
              backgroundColor: isActive ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)',
              borderColor: isActive ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.05)'
            }}
            transition={{ duration: 0.4 }}
            className="w-12 h-12 rounded-xl border flex items-center justify-center"
          >
            {isActive
              ? <Cpu size={16} className="text-blue-500 animate-pulse" />
              : <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
          </motion.div>
          <div className="h-4 w-[1px] bg-gradient-to-b from-white/[0.05] to-transparent" />
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [authStep, setAuthStep] = useState(0);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student', universityName: '', description: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);
  const [logs, setLogs] = useState(['PREPARING GENESIS BLOCK...', 'AWAITING NODE SPECIFICATIONS...']);

  const addLog = (msg) => setLogs(prev =>
    [...prev.slice(-5), `[${new Date().toTimeString().slice(0, 8)}] ${msg}`]
  );

  const passwordStrength = getPasswordStrength(form.password);

  const handleNext = (e) => {
    e.preventDefault();
    setError('');
    if (authStep === 0) {
      addLog(`ROLE: ${form.role.toUpperCase()}`);
      setAuthStep(1);
    } else if (authStep === 1) {
      if (!form.name || !form.email || !form.password) return setError('All fields are required.');
      if (form.password.length < 8) return setError('Password must be at least 8 characters.');
      addLog(`IDENTITY: ${form.email}`);
      form.role === 'university' ? setAuthStep(2) : executeRegistration();
    } else if (authStep === 2) {
      if (!form.universityName || !form.description) return setError('Institution details are required.');
      executeRegistration();
    }
  };

  const executeRegistration = async () => {
    setError('');
    setAuthStep(3);
    addLog('INITIATING HANDSHAKE...');
    try {
      addLog('ALLOCATING LEDGER SPACE...');
      const result = await register(form);
      if (result?.requiresVerification) {
        addLog('ACTIVATION CODE DISPATCHED.');
        setTimeout(() => navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`), 400);
      } else {
        addLog('NODE ESTABLISHED.');
        setTimeout(() => navigate('/dashboard'), 400);
      }
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.response?.data?.error || err?.response?.data?.message || 'Registration failed.';
      setError(msg);
      addLog('CRITICAL: REGISTRATION FAILED.');
      setAuthStep(form.role === 'university' ? 2 : 1);
    }
  };

  const handleGoogleRedirect = () => {
    if (isGoogleRedirecting) return;
    setIsGoogleRedirecting(true);
    addLog('QUERYING IDENTITY HUB...');
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const stepTitles = ['Create Account', 'Personal Info', 'Institution', 'Anchoring...'];
  const stepSubs = [
    'Select account type',
    'Provide your details',
    'Institution information',
    'Writing to global state...'
  ];

  return (
    <div className="relative min-h-screen flex bg-[#000000] font-sans selection:bg-blue-500/30 overflow-hidden">

      <div className="fixed inset-0 z-0 opacity-30 mix-blend-screen pointer-events-none">
        <BlockchainBackground />
      </div>

      <div className="relative z-10 w-full flex flex-col lg:flex-row h-screen">

        {/* ─── LEFT PANEL ────────────────────────────────────────────── */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 border-r border-white/[0.04] bg-[#020202]/80 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/8 blur-[150px] rounded-full pointer-events-none" />

          {/* Logo */}
          <button onClick={() => navigate('/')} className="relative z-10 flex items-center gap-4 w-fit">
            <div className="w-12 h-12 bg-[#111111] border border-white/[0.06] rounded-xl flex items-center justify-center">
              <Hexagon className="text-blue-500" size={24} />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-white tracking-tight block">
                Edu<span className="text-blue-500">Cred</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">User Registration</span>
            </div>
          </button>

          {/* Node visualizer */}
          <div className="relative z-10 flex-1 my-12 flex flex-col justify-end">
            <div className="flex-1 flex items-center justify-center">
              <NodeVisualizer />
            </div>

            {/* Telemetry */}
            <div className="bg-[#050505] border border-white/[0.06] rounded-2xl p-6 font-mono text-xs text-blue-400 space-y-2 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-2 mb-4 border-b border-white/[0.04] pb-3 text-slate-500">
                <Terminal size={14} />
                <span className="tracking-widest uppercase text-[10px] font-bold">Registration Telemetry</span>
              </div>
              {logs.map((log, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="opacity-80 text-[11px]">
                  {log}
                </motion.div>
              ))}
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-2 h-4 bg-blue-500 align-middle mt-1"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600 border-t border-white/[0.04] pt-6">
            <span className="flex items-center gap-2"><Network size={12} className="text-blue-500" /> Topology: Active</span>
            <span>Protocol v2.4</span>
            <span className="flex items-center gap-2"><ShieldCheck size={12} /> Secure</span>
          </div>
        </div>

        {/* ─── RIGHT PANEL ───────────────────────────────────────────── */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-[460px] py-12">

            {/* Mobile logo */}
            <button onClick={() => navigate('/')} className="lg:hidden flex items-center justify-center gap-3 mb-10 w-full">
              <Hexagon className="text-blue-500" size={28} />
              <span className="text-3xl font-extrabold text-white">Edu<span className="text-blue-500">Cred</span></span>
            </button>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-6 text-rose-400 text-sm font-medium text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-[#0A0A0A]/80 backdrop-blur-3xl p-10 md:p-12 border border-white/[0.06] rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] relative overflow-hidden">

              {/* Step Header */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                    {authStep === 0 ? <Network size={22} className="text-blue-500" />
                      : authStep === 1 ? <User size={22} className="text-blue-500" />
                      : authStep === 2 ? <Building2 size={22} className="text-blue-500" />
                      : <Cpu size={22} className="text-blue-500 animate-pulse" />}
                  </div>
                  {authStep > 0 && authStep < 3 && (
                    <button
                      onClick={() => setAuthStep(p => p - 1)}
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft size={14} /> Back
                    </button>
                  )}
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tighter">{stepTitles[authStep]}</h1>
                <p className="text-slate-500 text-[11px] font-medium mt-1">{stepSubs[authStep]}</p>
              </div>

              {/* Step 0: Role Selection */}
              {authStep === 0 && (
                <form onSubmit={handleNext} className="space-y-8">
                  <div className="flex gap-2 p-1.5 bg-[#111111] rounded-[1.5rem] border border-white/[0.04]">
                    {['student', 'university'].map((role) => (
                      <button
                        key={role} type="button"
                        onClick={() => setForm({ ...form, role, universityName: '', description: '' })}
                        className={`relative flex-1 py-4 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors z-10 rounded-xl ${form.role === role ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {form.role === role && (
                          <motion.div layoutId="role-pill" className="absolute inset-0 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30 z-[-1]" />
                        )}
                        {role === 'student' ? '🎓 Student' : '🏛️ University'}
                      </button>
                    ))}
                  </div>
                  <button type="submit" className="w-full bg-white text-black py-4 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                    Continue <ArrowRight size={16} />
                  </button>
                </form>
              )}

              {/* Step 1: Personal Info */}
              {authStep === 1 && (
                <form onSubmit={handleNext} className="space-y-5">
                  <div className="relative group/input">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
                    <input
                      placeholder="Full Name" required autoFocus autoComplete="name" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl py-4 pl-14 pr-5 text-white text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>
                  <div className="relative group/input">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
                    <input
                      type="email" placeholder="Identity Email (name@email.com)" required autoComplete="email" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl py-4 pl-14 pr-5 text-white text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="relative group/input">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password (min 8 chars)" required autoComplete="new-password" value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl py-4 pl-14 pr-14 text-white text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {/* Password Strength Bar */}
                    {form.password && (
                      <div className="space-y-1.5 px-1">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength.score ? passwordStrength.color : 'bg-white/10'}`} />
                          ))}
                        </div>
                        <p className={`text-[10px] font-bold ${passwordStrength.score >= 3 ? 'text-blue-400' : passwordStrength.score >= 2 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {passwordStrength.label}
                        </p>
                      </div>
                    )}
                  </div>
                  <button type="submit" className="w-full bg-white text-black py-4 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mt-2">
                    {form.role === 'university' ? <>Continue <ArrowRight size={16} /></> : <>Create Account <Zap size={16} /></>}
                  </button>
                </form>
              )}

              {/* Step 2: University Info */}
              {authStep === 2 && (
                <form onSubmit={handleNext} className="space-y-5">
                  <div className="relative group/input">
                    <Building2 className="absolute left-5 top-[22px] text-slate-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
                    <input
                      placeholder="University / Institution Name" required autoFocus value={form.universityName}
                      onChange={(e) => setForm({ ...form, universityName: e.target.value })}
                      className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl py-4 pl-14 pr-5 text-white text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>
                  <div className="relative group/input">
                    <FileText className="absolute left-5 top-5 text-slate-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
                    <textarea
                      placeholder="Brief description of your institution (accreditation, region, etc.)"
                      rows="3" required value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl py-4 pl-14 pr-5 text-white text-sm leading-relaxed outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 resize-none"
                    />
                  </div>
                  <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-4 text-amber-400 text-[11px] font-medium leading-relaxed">
                    ⚠️ University accounts require admin approval before you can issue certificates.
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-3">
                    Submit Application <Zap size={16} />
                  </button>
                </form>
              )}

              {/* Step 3: Processing */}
              {authStep === 3 && (
                <div className="flex flex-col items-center justify-center py-10 space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 border-[3px] border-blue-500/20 rounded-[1.5rem] animate-ping" />
                    <div className="w-20 h-20 border-[3px] border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent rounded-[1.5rem] animate-spin" />
                    <Hexagon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={24} />
                  </div>
                  <p className="text-[11px] font-mono text-blue-400 uppercase tracking-widest animate-pulse text-center">
                    {logs[logs.length - 1]}
                  </p>
                </div>
              )}

              {/* Google OAuth — Step 0 only */}
              {authStep === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]" /></div>
                    <div className="relative flex justify-center">
                      <span className="bg-[#0A0A0A] px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">or continue with</span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      disabled={isGoogleRedirecting}
                      onClick={handleGoogleRedirect}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-[#111111] hover:bg-[#161616] border border-white/[0.06] transition-all group/google disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGoogleRedirecting ? (
                        <>
                          <Loader2 className="animate-spin text-blue-500" size={18} />
                          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Routing to Google...</span>
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="opacity-80 group-hover/google:opacity-100 transition-opacity">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                          </svg>
                          <span className="text-[11px] font-bold uppercase tracking-widest text-white">Join with Google</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            <p className="text-center mt-8 text-slate-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-500 font-semibold hover:text-blue-400 transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
