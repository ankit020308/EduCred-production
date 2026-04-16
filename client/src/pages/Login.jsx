import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Mail, Lock, Loader2, ArrowRight,
  Hexagon, Zap, Cpu, Activity, Fingerprint, ChevronLeft, Terminal, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BlockchainBackground from '../components/BlockchainBackground';

// ──────────────────────────────────────────────────────────────────────────
// 💠 ANIMATION VARIANTS
// ──────────────────────────────────────────────────────────────────────────
const transitionSpring = { type: "spring", stiffness: 120, damping: 20 };

const formVariants = {
  hidden: { opacity: 0, x: 40, filter: 'blur(10px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: transitionSpring },
  exit: { opacity: 0, x: -40, filter: 'blur(10px)', transition: { duration: 0.3 } }
};

// ──────────────────────────────────────────────────────────────────────────
// 💻 SUB-COMPONENT: CRYPTOGRAPHIC MATRIX VISUALIZER
// ──────────────────────────────────────────────────────────────────────────
const SecurityMatrix = () => {
  const [matrix, setMatrix] = useState([]);

  useEffect(() => {
    const generateHex = () => Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
    const updateMatrix = () => {
      const newMatrix = Array.from({ length: 40 }, () => generateHex());
      setMatrix(newMatrix);
    };
    updateMatrix();
    const interval = setInterval(updateMatrix, 100); // Rapid hex cycling
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-[8px] sm:text-[10px] text-blue-500/30 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-x-4 gap-y-2 select-none overflow-hidden h-full mask-image-fade-bottom">
      {matrix.map((hex, i) => (
        <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: Math.random() * 2 + 1, repeat: Infinity }}>
          0x{hex}
        </motion.span>
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 🚀 MAIN LOGIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // State Management
  const [authStep, setAuthStep] = useState(0); // 0: Email, 1: Password, 2: Verifying
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);
  const [telemetryLogs, setTelemetryLogs] = useState([
    "INITIALIZING SECURE ENCLAVE...",
    "ESTABLISHING CONNECTION TO MAINNET...",
    "AWAITING IDENTITY PROTOCOL..."
  ]);

  // Add fake logs for visual complexity
  const addLog = (msg) => {
    setTelemetryLogs(prev => [...prev.slice(-6), `[${new Date().toISOString().split('T')[1].slice(0, -1)}] ${msg}`]);
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!form.email) {
      setError("Institutional ID required.");
      return;
    }
    setError('');
    addLog(`LOCATING NODE: ${form.email.toUpperCase()}`);
    setAuthStep(1);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!form.password) {
      setError("Security Key required.");
      return;
    }

    setError('');
    setAuthStep(2); // Move to verifying UI
    addLog("INITIATING CRYPTOGRAPHIC HANDSHAKE...");

    try {
      await login(form.email, form.password);
      addLog('ACCESS GRANTED. ROUTING TO LEDGER...');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      if (err?.requiresVerification) {
        addLog('IDENTITY DORMANT. ROUTING TO ACTIVATION...');
        setTimeout(() => navigate(`/verify-otp?email=${encodeURIComponent(err.email)}`), 500);
        return;
      }
      const msg = typeof err === 'string' ? err : err?.response?.data?.error || 'Authentication failed.';
      setError(msg);
      addLog('CRITICAL: HANDSHAKE FAILED.');
      setAuthStep(1);
    }
  };

  const handleGoogleRedirect = () => {
    if (isGoogleRedirecting) return;
    setIsGoogleRedirecting(true);
    addLog('ROUTING TO GOOGLE IDENTITY NODE...');
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/google`;
  };

  const stepTitles = ['Identity Portal', 'Security Key', 'Anchoring...'];
  const stepSubs = [
    'Enter your node identifier',
    'Verify cryptographic key',
    'Establishing global consensus...'
  ];

  return (
    <div className="relative min-h-screen flex bg-[#000000] font-sans selection:bg-blue-500/30 overflow-hidden">

      <div className="fixed inset-0 z-0 opacity-30 mix-blend-screen pointer-events-none" aria-hidden="true">
        <BlockchainBackground />
      </div>

      <div className="relative z-10 w-full flex flex-col lg:flex-row h-screen">

        {/* LEFT PANEL */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 border-r border-white/[0.04] bg-[#020202]/80 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/5 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

          <div className="relative z-10 flex items-center gap-4 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-12 h-12 bg-[#0A0A0A] border border-cyan-400/20 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.15)] group hover:border-cyan-400 transition-all duration-700">
              <Hexagon className="text-cyan-400 group-hover:rotate-90 transition-transform duration-700" size={24} />
            </div>
            <div>
              <span className="text-2xl font-black text-white tracking-tighter block uppercase leading-none">Edu<span className="text-cyan-400">Cred</span></span>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-400/40 mt-2">Identity Deployment Oracle</span>
            </div>
          </div>

          <div className="relative z-10 flex-1 my-12 flex flex-col justify-end">
            <div className="h-64 mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-[#020202] z-10" />
              <SecurityMatrix />
            </div>

            <div className="bg-[#050505] border border-white/[0.06] rounded-2xl p-6 font-mono text-xs text-blue-400 space-y-2 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-2 mb-4 border-b border-white/[0.04] pb-3 text-slate-500">
                <Terminal size={14} />
                <span className="tracking-widest uppercase text-[10px] font-bold text-cyan-400/60">Live Telemetry Feed</span>
              </div>
              <AnimatePresence>
                {telemetryLogs.map((log, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="opacity-80">
                    {log}
                  </motion.div>
                ))}
              </AnimatePresence>
              <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2 h-4 bg-blue-500 inline-block mt-1 align-middle" />
            </div>
          </div>

          <div className="relative z-10 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 border-t border-white/5 pt-6">
            <span className="flex items-center gap-2"><Activity size={12} className="text-cyan-500" /> Network: Optimal</span>
            <span>Protocol v2.4.0</span>
            <span className="flex items-center gap-2"><Lock size={12} /> E2E Encryption</span>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
          <div className="w-full max-w-[440px]">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-12" onClick={() => navigate('/')}>
              <Hexagon className="text-cyan-400" size={28} />
              <span className="text-3xl font-black text-white tracking-tighter uppercase">Edu<span className="text-cyan-400">Cred</span></span>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-8 text-rose-400 text-[10px] font-bold uppercase tracking-widest text-center shadow-[0_0_30px_rgba(244,63,94,0.1)] backdrop-blur-md"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-[#0A0A0A]/80 backdrop-blur-3xl p-10 md:p-12 border border-white/[0.06] rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden">

              <div className="mb-10 space-y-2">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                    {authStep === 0 ? <Fingerprint size={24} className="text-blue-500" /> :
                      authStep === 1 ? <Lock size={24} className="text-blue-500" /> :
                        <Cpu size={24} className="text-blue-500 animate-pulse" />}
                  </div>
                  {authStep === 1 && (
                    <button onClick={() => setAuthStep(0)} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
                      <ChevronLeft size={14} /> Back
                    </button>
                  )}
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">{stepTitles[authStep]}</h1>
                <p className="text-cyan-400/40 text-[9px] font-black uppercase tracking-[0.4em] mt-2">{stepSubs[authStep]}</p>
              </div>

              <div className="relative min-h-[160px]">
                <AnimatePresence mode="wait">
                  {authStep === 0 && (
                    <motion.form key="step0" variants={formVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleNextStep} className="space-y-6">
                      <div className="relative group/input">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-cyan-400 transition-colors" size={18} />
                        <input
                          type="email" required autoFocus autoComplete="email"
                          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                          placeholder="NAME@EMAIL.COM"
                          className="w-full bg-[#050505] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-[11px] font-black tracking-[0.2em] outline-none transition-all focus:border-cyan-400/50 focus:bg-[#080808] placeholder:text-blue-900/60 uppercase"
                        />
                      </div>
                      <button type="submit" className="btn-command btn-blue w-full">
                        Continue <ArrowRight size={16} />
                      </button>
                    </motion.form>
                  )}

                  {authStep === 1 && (
                    <motion.form key="step1" variants={formVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleFinalSubmit} className="space-y-6">
                      <div className="relative group/input">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-blue-400 transition-colors" size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required autoFocus autoComplete="current-password"
                          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                          placeholder="••••••••••••"
                          className="w-full bg-[#050505] border border-white/10 rounded-2xl py-5 pl-14 pr-14 text-white text-sm outline-none transition-all focus:border-blue-400/50 focus:bg-[#080808] placeholder:text-blue-900/60 tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div className="flex justify-end px-1">
                        <button type="button" className="text-[9px] font-black text-cyan-400/40 hover:text-blue-400 uppercase tracking-widest transition-colors">Recover Key</button>
                      </div>
                      <button type="submit" className="btn-command btn-blue w-full">
                        Initialize Handshake <Zap size={16} />
                      </button>
                    </motion.form>
                  )}

                  {authStep === 2 && (
                    <motion.div key="step2" variants={formVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center justify-center py-8 space-y-6">
                      <div className="relative">
                        <div className="absolute inset-0 border-[3px] border-cyan-400/20 rounded-full animate-ping" />
                        <div className="w-16 h-16 border-[3px] border-t-cyan-400 border-r-cyan-400 border-b-transparent border-l-transparent rounded-full animate-spin" />
                        <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400" size={20} />
                      </div>
                      <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest animate-pulse">
                        {telemetryLogs[telemetryLogs.length - 1]}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {authStep === 0 && (
                <div className="mt-8">
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]"></div></div>
                    <div className="relative flex justify-center text-[9px] font-bold uppercase tracking-[0.3em]">
                      <span className="bg-[#0A0A0A] px-4 text-cyan-400/40">Google Identity Bridge</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleRedirect}
                    disabled={isGoogleRedirecting}
                    className="w-full flex items-center justify-center gap-3 bg-[#111111] border border-white/[0.08] hover:border-blue-500/40 hover:bg-[#161616] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl py-4 px-6 text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-200 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                  >
                    {isGoogleRedirecting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-blue-500" />
                        <span>Routing to Google...</span>
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                          <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.7 29.2 5 24 5 12.4 5 3 14.4 3 26s9.4 21 21 21c10.9 0 20-7.9 20-21 0-1.3-.2-2.7-.4-4z"/>
                          <path fill="#FF3D00" d="M6.3 15.5l6.6 4.8C14.5 16.4 18.9 14 24 14c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.7 29.2 5 24 5 16.2 5 9.5 9.4 6.3 15.5z"/>
                          <path fill="#4CAF50" d="M24 47c5.2 0 9.9-1.7 13.5-4.6l-6.2-5.3C29.4 38.7 26.8 39.5 24 39.5c-5.3 0-9.7-3.5-11.3-8.3l-6.5 5C9.5 43 16.3 47 24 47z"/>
                          <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.2 5.3C41.3 35.5 44 31 44 26c0-1.3-.2-2.7-.4-4z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="text-center mt-12">
              <span className="text-cyan-400/40 text-[9px] font-black uppercase tracking-[0.4em]">
                No Protocol Connection?
              </span>
              <button onClick={() => navigate('/signup')} className="text-cyan-400 font-extrabold ml-4 text-[9px] uppercase tracking-[0.4em] hover:text-white transition-all underline decoration-cyan-400/30 underline-offset-8">
                Initialize New Node
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
