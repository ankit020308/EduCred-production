import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-32 relative z-10">

      {/* 🔥 DEPTH GLOW (FIXES “FLOATING CARD ISSUE”) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] bg-blue-600/10 blur-[140px] 
        top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-[440px]"
      >

        <div className="bg-[#0b0f2a]/80 backdrop-blur-2xl border border-white/10 
        p-10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] 
        overflow-hidden group">

          {/* subtle glow */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-700">
            <div className="absolute w-[300px] h-[300px] bg-blue-600/10 blur-[100px] 
            top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>

          {/* HEADER */}
          <div className="text-center mb-10 space-y-4">

            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl 
            flex items-center justify-center mx-auto border border-blue-500/20">
              <ShieldCheck size={28} className="text-blue-500" />
            </div>

            <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">
              Welcome <span className="text-blue-500">Back</span>
            </h1>

            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
              Identity Node Authentication
            </p>

          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-6 text-rose-400 text-xs font-bold uppercase tracking-widest text-center">
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* EMAIL */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Institutional Identity
              </label>

              <div className="relative group/input">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-blue-500 transition" size={18} />

                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@university.edu"
                  className="w-full bg-white/5 border border-white/10 
                  rounded-2xl py-4 pl-14 pr-6 text-white 
                  outline-none transition-all duration-300 
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Security Key
              </label>

              <div className="relative group/input">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-blue-500 transition" size={18} />

                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 
                  rounded-2xl py-4 pl-14 pr-6 text-white 
                  outline-none transition-all duration-300 
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 
              text-white py-5 rounded-3xl text-xs font-black uppercase tracking-widest 
              flex items-center justify-center gap-3 
              transition-all duration-300 
              active:scale-95 hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? <Loader2 size={22} className="animate-spin" /> : 'Access Node'}
            </button>

          </form>

          {/* FOOTER */}
          <div className="text-center mt-10 pt-8 border-t border-white/5">
            <span className="text-slate-500 text-xs uppercase tracking-widest italic">
              Don't have an account?
            </span>
            <Link to="/signup" className="text-blue-500 font-bold ml-2 text-xs uppercase tracking-widest hover:text-blue-400">
              Sign Up
            </Link>
          </div>

          {/* DEMO */}
          <div className="mt-8 p-5 bg-blue-600/5 rounded-2xl border border-blue-500/10 text-xs uppercase tracking-widest text-slate-500 text-center italic">
            <strong className="text-blue-500 mr-2">Demo:</strong>
            admin@educred.com / admin123
          </div>

        </div>
      </motion.div>
    </div>
  );
}