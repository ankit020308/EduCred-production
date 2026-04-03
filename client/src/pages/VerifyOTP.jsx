import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cpu, ArrowRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BlockchainBackground from '../components/BlockchainBackground';

export default function VerifyOTP() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const navigate = useNavigate();
  const { verifyOTP, resendOTP } = useAuth(); 

  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [activeInput, setActiveInput] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const inputRefs = useRef([]);

  // Redirect if accessed without an email payload
  useEffect(() => {
    if (!email) navigate('/signup');
    inputRefs.current[0]?.focus();
  }, [email, navigate]);

  // Resend Cooldown Timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleChange = (e, index) => {
    const { value } = e.target;
    if (!/^[0-9]*$/.test(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      setActiveInput(index + 1);
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      setActiveInput(index - 1);
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.some(char => !/^[0-9]$/.test(char))) return;

    const newOtp = [...otp];
    pastedData.forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    
    const focusIndex = Math.min(pastedData.length, 5);
    setActiveInput(focusIndex);
    inputRefs.current[focusIndex].focus();
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setCooldown(60);
    setError('');
    try {
      await resendOTP(email);
      console.log(`Resending transmission to ${email}...`);
    } catch (err) {
      setError('Failed to resend transmission.');
    }
  };

  const submitVerification = async (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('Incomplete cryptographic signature.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Security Theater Delay
      await new Promise(res => setTimeout(res, 1200));
      
      // Call Context Method
      await verifyOTP(email, code); 
      
      navigate('/dashboard');
    } catch (err) {
      setError(typeof err === 'string' ? err : err.response?.data?.message || 'Verification failed. Signature rejected.');
      setOtp(new Array(6).fill(''));
      inputRefs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden bg-[#000000] font-sans selection:bg-blue-500/30">
      
      {/* 🌌 AMBIENT BACKGROUND */}
      <div className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none" aria-hidden="true">
        <BlockchainBackground />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[500px] z-10"
      >
        <div className="bg-[#0A0A0A]/80 backdrop-blur-3xl p-10 md:p-14 border border-white/[0.06] rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden group">
          
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50 shadow-[0_0_20px_rgba(59,130,246,0.5)]" />

          {/* HEADER */}
          <div className="text-center mb-10 space-y-5 relative z-10">
            <div className="w-16 h-16 bg-[#111111] rounded-2xl flex items-center justify-center mx-auto border border-white/[0.08] shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              {loading ? (
                <Cpu size={28} className="text-blue-500 animate-pulse" />
              ) : (
                <ShieldCheck size={28} className="text-blue-500" />
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold text-white tracking-tighter uppercase">
                 Node <span className="text-blue-500">Activation</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
                A cryptographic signature has been dispatched to <br/>
                <span className="text-blue-400 font-mono tracking-widest">{email}</span>
              </p>
            </div>
          </div>

          {/* ERROR ALERT */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }}
                className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-8 flex items-center justify-center gap-3 text-rose-400 text-[10px] font-bold uppercase tracking-widest text-center"
              >
                <AlertCircle size={14} /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* OTP FORM */}
          <form onSubmit={submitVerification} className="space-y-8 relative z-10">
            
            {/* 6-Digit Matrix Inputs */}
            <div className="flex justify-between gap-2 sm:gap-4" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(e, index)}
                  onKeyDown={e => handleKeyDown(e, index)}
                  onFocus={() => setActiveInput(index)}
                  className={`w-12 h-14 sm:w-14 sm:h-16 bg-[#111111] border ${
                    activeInput === index ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-white/[0.06]'
                  } rounded-xl text-center text-xl font-mono font-black text-white outline-none transition-all duration-300 focus:bg-[#161616]`}
                />
              ))}
            </div>

            {/* Verification Button */}
            <button
              type="submit"
              disabled={loading || otp.join('').length < 6}
              className="w-full bg-white text-black py-4.5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            >
              {loading ? (
                <>Establishing Consensus <Loader2 size={16} className="animate-spin ml-2" /></>
              ) : (
                <>Verify Signature <ArrowRight size={16} className="text-blue-600 ml-2" /></>
              )}
            </button>
          </form>

          {/* RESEND LOGIC */}
          <div className="text-center mt-10 pt-6 border-t border-white/[0.06] relative z-10">
            <button 
              onClick={handleResend}
              disabled={cooldown > 0}
              className="flex items-center justify-center gap-2 w-full text-[10px] font-bold uppercase tracking-[0.2em] transition-colors disabled:opacity-50 text-slate-500 hover:text-blue-400"
            >
              <RefreshCw size={12} className={cooldown > 0 ? '' : 'animate-spin-slow'} />
              {cooldown > 0 ? `Transmission locked (${cooldown}s)` : 'Request New Signature'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
