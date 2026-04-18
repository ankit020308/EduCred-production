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
  const [showSuccess, setShowSuccess] = useState(false);
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
    setError('');
    try {
      await resendOTP(email);
      setCooldown(60);
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.response?.data?.error || 'Failed to resend. Try again.';
      // If server says cooldown is still active, parse wait time
      const match = msg.match(/(\d+)s/);
      if (match) {
        setCooldown(parseInt(match[1], 10));
      }
      setError(msg);
    }
  };

  const submitVerification = async (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const u = await verifyOTP(email, code);
      
      // 🎓 Detect if University pending approval
      if (u && u.role === 'university') {
         setShowSuccess(true);
         return;
      }
      
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : err?.response?.data?.error || 'Verification failed. Please try again.';
      setError(errorMsg);

      // If OTP expired, unlock resend immediately (per KI spec)
      if (errorMsg.toLowerCase().includes('expire') || errorMsg.toLowerCase().includes('expired')) {
        setCooldown(0);
        setError(`${errorMsg} — Request a new code below.`);
      }

      setOtp(new Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden bg-[#F8FAFC] font-sans selection:bg-blue-500/30">
      
      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-[500px] z-10"
          >
            <div className="bg-white p-12 md:p-16 rounded-[2.5rem] shadow-2xl shadow-slate-900/10 border border-slate-100 text-center space-y-10">
               <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                  <motion.div
                    initial={{ rotate: -15, scale: 0.5, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                  >
                    <ShieldCheck size={48} className="text-emerald-600" />
                  </motion.div>
               </div>

               <div className="space-y-4">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
                    Protocol <span className="text-emerald-600">Verified.</span>
                  </h2>
                  <p className="text-[#4B5563] text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed italic opacity-80">
                    Your institutional request has been initiated successfully. You'll receive your credentials via email once the EduCred admin approves your node.
                  </p>
               </div>

               <div className="h-px w-20 bg-slate-100 mx-auto" />

               <button
                  onClick={() => navigate('/dashboard')}
                  className="h-16 px-12 bg-[#0B132B] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-4 mx-auto w-full group"
               >
                  Enter Dashboard <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[500px] z-10"
          >
            <div className="bg-white p-10 md:p-14 rounded-[2.5rem] shadow-2xl shadow-slate-900/10 border border-slate-100 relative overflow-hidden">
          
          {/* HEADER */}
          <div className="text-center mb-10 space-y-6 relative z-10">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-sm">
              {loading ? (
                <Loader2 size={28} className="text-blue-600 animate-spin" />
              ) : (
                <ShieldCheck size={28} className="text-blue-600" />
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
                 Verify <span className="text-blue-600">Account</span>
              </h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                A verification code has been sent to <br/>
                <span className="text-blue-600 font-bold tracking-normal lowercase">{email}</span>
              </p>
            </div>
          </div>

          {/* ERROR ALERT */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }}
                className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-8 flex items-center justify-center gap-3 text-rose-600 text-[10px] font-bold uppercase tracking-widest text-center"
              >
                <AlertCircle size={14} /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* OTP FORM */}
          <form onSubmit={submitVerification} className="space-y-10 relative z-10">
            
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
                  className={`w-12 h-14 sm:w-14 sm:h-16 bg-slate-50 border shadow-sm ${
                    activeInput === index ? 'border-blue-500 bg-white ring-4 ring-blue-500/5' : 'border-slate-200'
                  } rounded-xl text-center text-2xl font-black text-slate-900 outline-none transition-all duration-300`}
                />
              ))}
            </div>

            {/* Verification Button */}
            <button
              type="submit"
              disabled={loading || otp.join('').length < 6}
              className="btn-primary w-full h-16 !shadow-blue-500/20"
            >
              {loading ? (
                <>Verifying... <Loader2 size={20} className="animate-spin" /></>
              ) : (
                <>Verify Access <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          {/* RESEND LOGIC */}
          <div className="text-center mt-12 pt-8 border-t border-slate-50 relative z-10">
            <button 
              onClick={handleResend}
              disabled={cooldown > 0}
              className="flex items-center justify-center gap-2 w-full text-[10px] font-black uppercase tracking-widest transition-colors disabled:text-slate-300 text-slate-400 hover:text-blue-600"
            >
              <RefreshCw size={12} className={cooldown > 0 ? '' : 'animate-spin-slow'} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Code'}
            </button>
          </div>
        </div>
      </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
