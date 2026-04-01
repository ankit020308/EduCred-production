import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import BlockchainBackground from '../components/BlockchainBackground';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    universityName: '',
    description: '',
    documents: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      console.error('Signup Failure:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Signup failed. Please check network connectivity.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      // Use the currently selected role from the form
      const { isNewUser } = await googleLogin(credentialResponse.credential, form.role);
      if (isNewUser) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Google Signup Failure:', err);
      setError(err || 'Google identity verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google identity verification failed.');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-32 overflow-hidden bg-[#010409]">
      
      {/* 🌌 INTERACTIVE BACKGROUND: Neural-Link Mesh */}
      <BlockchainBackground />

      {/* AMBIENT NEBULA GLOW */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 blur-[140px] rounded-full animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[480px] z-10"
      >
        <div className="glass-card p-10 md:p-12 border border-white/10 group">
          
          {/* HEADER */}
          <div className="text-center mb-10 space-y-4">
            <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto border border-white/5 animate-levitate shadow-xl shadow-indigo-500/10">
              <ShieldCheck size={28} className="text-indigo-500" />
            </div>

            <h1 className="text-3xl font-bold text-white tracking-tight">
              Establish <span className="text-indigo-500">Node</span>
            </h1>

            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] opacity-60">
              Identity Protocol Registration
            </p>
          </div>

          {/* ERROR ALERT */}
          <AnimatePresence mode="wait">
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

          {/* ROLE SWITCH */}
          <div className="flex gap-4 mb-8 p-1 bg-white/[0.03] rounded-2xl border border-white/5 shadow-2xl">
            {['student', 'university'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setForm({ ...form, role, universityName: '' })}
                className={`flex-1 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all
                  ${form.role === role
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <input
                placeholder="FULL LEGAL NAME"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
                className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-4 px-6 text-white text-[11px] font-bold tracking-widest outline-none transition-all focus:border-indigo-500/50"
              />

              {form.role === 'university' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <input
                    placeholder="INSTITUTIONAL IDENTITY"
                    required
                    value={form.universityName}
                    onChange={(e) => setForm({ ...form, universityName: e.target.value.toUpperCase() })}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-4 px-6 text-white text-[11px] font-bold tracking-widest outline-none transition-all focus:border-indigo-500/50"
                  />
                  <textarea
                    placeholder="INSTITUTIONAL DESCRIPTION"
                    rows="2"
                    required
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-4 px-6 text-white text-[10px] font-medium leading-relaxed outline-none transition-all focus:border-indigo-500/50 resize-none"
                  />
                </div>
              )}

              <input
                type="email"
                placeholder="NETWORK EMAIL"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-4 px-6 text-white text-[11px] font-bold tracking-widest outline-none transition-all focus:border-indigo-500/50"
              />

              <input
                type="password"
                placeholder="SECURITY KEY"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-4 px-6 text-white text-[11px] font-bold tracking-widest outline-none transition-all focus:border-indigo-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-5 mt-6 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 hover:bg-slate-200 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <ArrowRight size={18} /> Establish Protocol
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
              <span className="bg-[#0b0e14] px-4 text-slate-600">Secure Protocol Bridge</span>
            </div>
          </div>

          {/* GOOGLE SIGNUP */}
          <div className="flex justify-center">
            <div className="w-full grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500 rounded-xl overflow-hidden border border-white/5">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_black"
                shape="rectangular"
                width="100%"
                text="signup_with"
              />
            </div>
          </div>

          {/* FOOTER */}
          <div className="text-center mt-10 pt-8 border-t border-white/5">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              Existing Node?
            </span>
            <Link
              to="/login"
              className="text-indigo-500 font-bold ml-2 text-[10px] uppercase tracking-widest hover:text-indigo-400 transition-colors"
            >
              Access Node
            </Link>
          </div>

        </div>
      </motion.div>
    </div>
  );
}