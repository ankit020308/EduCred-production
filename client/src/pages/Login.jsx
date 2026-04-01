import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import BlockchainBackground from '../components/BlockchainBackground';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login Failure:', err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      const { isNewUser } = await googleLogin(credentialResponse.credential);
      if (isNewUser) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Google Login Failure:', err);
      setError(err || 'Google identity verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google identity verification failed.');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden bg-[#010409]">
      
      {/* 🌌 INTERACTIVE BACKGROUND: Neural-Link Mesh */}
      <BlockchainBackground />

      {/* AMBIENT GLOWS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-[140px] rounded-full animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[440px] z-10"
      >
        <div className="glass-card p-10 md:p-12 border border-white/10 group">
          
          {/* Orbital Orb behind login */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-600/10 blur-3xl animate-orbit pointer-events-none" />

          {/* HEADER */}
          <div className="text-center mb-10 space-y-4 relative z-10">
            <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto border border-white/5 shadow-xl shadow-indigo-500/10 animate-levitate">
              <ShieldCheck size={28} className="text-indigo-500" />
            </div>

            <h1 className="text-3xl font-bold text-white tracking-tight">
              Access <span className="text-indigo-500">Node</span>
            </h1>

            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] opacity-60">
              Identity Protocol Authentication
            </p>
          </div>

          {/* ERROR ALERT */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-8 text-rose-400 text-[10px] font-bold uppercase tracking-widest text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                Institutional ID
              </label>
              <div className="relative group/input">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-indigo-500 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@educred.com"
                  className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none transition-all duration-300 focus:border-indigo-500/50 placeholder:text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                Security Key
              </label>
              <div className="relative group/input">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-indigo-500 transition-colors" size={18} />
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none transition-all duration-300 focus:border-indigo-500/50 placeholder:text-slate-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-5 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 hover:bg-slate-200 disabled:opacity-50 shadow-xl shadow-white/5"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Enter Network <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* OR SEPARATOR */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[8px] font-bold uppercase tracking-[0.3em]">
              <span className="bg-[#0b0e14] px-4 text-slate-600">Secure Bridge</span>
            </div>
          </div>

          {/* GOOGLE LOGIN */}
          <div className="flex justify-center">
            <div className="w-full grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500 rounded-xl overflow-hidden border border-white/5">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_black"
                shape="rectangular"
                width="100%"
                text="continue_with"
              />
            </div>
          </div>

          {/* FOOTER */}
          <div className="text-center mt-10 pt-8 border-t border-white/5 relative z-10">
            <span className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              New Member?
            </span>
            <Link to="/signup" className="text-indigo-500 font-bold ml-2 text-[10px] uppercase tracking-widest hover:text-indigo-400 transition-colors">
              Establish Node
            </Link>
          </div>

          {/* DEMO TOOLTIP */}
          <div className="mt-8 p-4 bg-indigo-600/5 rounded-2xl border border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-600 text-center relative z-10">
            <span className="text-indigo-500 mr-2">Demo Access:</span>
            admin@educred.com / admin123
          </div>

        </div>
      </motion.div>
    </div>
  );
}