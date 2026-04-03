import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Mail, Lock, Loader2, ArrowRight,
  Hexagon, Zap, Cpu, Activity, Fingerprint, ChevronLeft, Terminal
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
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
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  // State Management
  const [authStep, setAuthStep] = useState(0); // 0: ID, 1: Password, 2: Verifying
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
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
      // Artificial delay for security theater visuals
      await new Promise(res => setTimeout(res, 1500));
      addLog("VERIFYING SHA-256 SIGNATURE...");

      await login(form.email, form.password);

      addLog("ACCESS GRANTED. ROUTING TO LEDGER...");
      setTimeout(() => navigate('/dashboard'), 800);

    } catch (err) {
      console.error('Login Failure:', err);
      if (err.requiresVerification) {
        addLog("IDENTITY DORMANT. ROUTING TO ACTIVATION...");
        setTimeout(() => navigate(`/verify-otp?email=${encodeURIComponent(err.email)}`), 800);
        return;
      }
      setError(err.response?.data?.error || err.response?.data?.message || err || 'Authentication failed. Invalid parameters.');
      addLog("CRITICAL: HANDSHAKE FAILED. UNAUTHORIZED.");
      setAuthStep(1); // Kick back to password step
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setAuthStep(2);
    addLog("INTERCEPTING OAUTH PAYLOAD...");
    setError('');
    try {
      const { isNewUser } = await googleLogin(credentialResponse.credential);
      addLog("OAUTH VERIFIED. ESTABLISHING SESSION...");
      if (isNewUser) navigate('/onboarding');
      else navigate('/dashboard');
    } catch (err) {
      setError('Third-party identity verification failed.');
      addLog("OAUTH REJECTED.");
      setAuthStep(0);
    }
  };

  return (
    <div className="relative min-h-screen flex bg-[#000000] font-sans selection:bg-blue-500/30 overflow-hidden">

      {/* 🌌 AMBIENT BACKGROUND */}
      <div className="fixed inset-0 z-0 opacity-30 mix-blend-screen pointer-events-none" aria-hidden="true">
        <BlockchainBackground />
      </div>

      {/* Split Layout Container */}
      <div className="relative z-10 w-full flex flex-col lg:flex-row h-screen">

        {/* ──────────────────────────────────────────────────────────────────
            LEFT HALF: TELEMETRY & SECURITY MATRIX
        ────────────────────────────────────────────────────────────────── */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 border-r border-white/[0.04] bg-[#020202]/80 backdrop-blur-md relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-4 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-12 h-12 bg-[#111111] border border-white/[0.06] rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <Hexagon className="text-blue-500" size={24} />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-white tracking-tight block">Edu<span className="text-blue-500">Cred</span></span>
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Global Authentication Node</span>
            </div>
          </div>

          {/* Matrix & Logs */}
          <div className="relative z-10 flex-1 my-12 flex flex-col justify-end">
            <div className="h-64 mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-[#020202] z-10" />
              <SecurityMatrix />
            </div>

            <div className="bg-[#050505] border border-white/[0.06] rounded-2xl p-6 font-mono text-xs text-blue-400 space-y-2 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-2 mb-4 border-b border-white/[0.04] pb-3 text-slate-500">
                <Terminal size={14} />
                <span className="tracking-widest uppercase text-[10px] font-bold">Live Telemetry Feed</span>
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

          {/* Footer Metrics */}
          <div className="relative z-10 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-t border-white/[0.04] pt-6">
            <span className="flex items-center gap-2"><Activity size={12} className="text-emerald-500" /> Network: Optimal</span>
            <span>Protocol v2.4.0</span>
            <span className="flex items-center gap-2"><Lock size={12} /> E2E Encryption</span>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────────
            RIGHT HALF: COMMAND AUTHENTICATION PANEL
        ────────────────────────────────────────────────────────────────── */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">

          <div className="w-full max-w-[440px]">
            {/* Mobile Header (Hidden on Desktop) */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-12" onClick={() => navigate('/')}>
              <Hexagon className="text-blue-500" size={28} />
              <span className="text-3xl font-extrabold text-white tracking-tight">Edu<span className="text-blue-500">Cred</span></span>
            </div>

            {/* ERROR ALERT */}
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

            {/* THE GLASS AUTH CARD */}
            <div className="bg-[#0A0A0A]/80 backdrop-blur-3xl p-10 md:p-12 border border-white/[0.06] rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden">

              {/* Dynamic Header based on Step */}
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
                <h1 className="text-3xl font-extrabold text-white tracking-tighter uppercase">
                  {authStep === 0 ? 'Log In' : authStep === 1 ? 'Verify Password' : 'Authenticating'}
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                  {authStep === 0 ? 'Enter Institutional Email' : authStep === 1 ? 'Provide Security Credentials' : 'Establishing Consensus...'}
                </p>
              </div>

              {/* MULTI-STEP FORM LOGIC */}
              <div className="relative min-h-[160px]">
                <AnimatePresence mode="wait">

                  {/* STEP 0: EMAIL */}
                  {authStep === 0 && (
                    <motion.form key="step0" variants={formVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleNextStep} className="space-y-6">
                      <div className="relative group/input">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
                        <input
                          type="email" required autoFocus
                          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                          placeholder="EMAIL@UNIVERSITY.EDU"
                          className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl py-4.5 pl-14 pr-6 text-white text-[11px] font-bold tracking-widest outline-none transition-all focus:border-blue-500/50 focus:bg-[#161616] placeholder:text-slate-700 uppercase"
                        />
                      </div>
                      <button type="submit" className="w-full bg-white text-black py-4.5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        Continue <ArrowRight size={16} />
                      </button>
                    </motion.form>
                  )}

                  {/* STEP 1: PASSWORD */}
                  {authStep === 1 && (
                    <motion.form key="step1" variants={formVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleFinalSubmit} className="space-y-6">
                      <div className="relative group/input">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
                        <input
                          type="password" required autoFocus
                          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                          placeholder="••••••••••••"
                          className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl py-4.5 pl-14 pr-6 text-white text-xs outline-none transition-all focus:border-blue-500/50 focus:bg-[#161616] placeholder:text-slate-700 tracking-wider"
                        />
                      </div>
                      <div className="flex justify-end px-1">
                        <button type="button" className="text-[9px] font-bold text-slate-500 hover:text-blue-400 uppercase tracking-widest transition-colors">Recover Key</button>
                      </div>
                      <button type="submit" className="w-full bg-blue-600 text-white py-4.5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all hover:bg-blue-500 active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        Initialize Handshake <Zap size={16} />
                      </button>
                    </motion.form>
                  )}

                  {/* STEP 2: PROCESSING (Security Theater) */}
                  {authStep === 2 && (
                    <motion.div key="step2" variants={formVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center justify-center py-8 space-y-6">
                      <div className="relative">
                        <div className="absolute inset-0 border-[3px] border-blue-500/20 rounded-full animate-ping" />
                        <div className="w-16 h-16 border-[3px] border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent rounded-full animate-spin" />
                        <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={20} />
                      </div>
                      <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest animate-pulse">
                        {telemetryLogs[telemetryLogs.length - 1]}
                      </p>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* THIRD PARTY BRIDGE (Only show on step 0 if ID is present) */}
              <AnimatePresence>
                {authStep === 0 && import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8">
                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]"></div></div>
                      <div className="relative flex justify-center text-[9px] font-bold uppercase tracking-[0.3em]">
                        <span className="bg-[#0A0A0A] px-4 text-slate-600">Google Identity Bridge</span>
                      </div>
                    </div>

                    <div className="w-full flex justify-center">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => { setError('Google identity verification failed.'); setAuthStep(0); }}
                        theme="outline" shape="rectangular" width="360" logo_alignment="center" text="continue_with"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SIGN UP LINK */}
            <div className="text-center mt-10">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                No Protocol Connection?
              </span>
              <Link to="/signup" className="text-blue-500 font-bold ml-3 text-[10px] uppercase tracking-[0.2em] hover:text-blue-400 transition-colors">
                Sign Up
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}