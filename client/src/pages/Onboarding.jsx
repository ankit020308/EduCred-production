import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, GraduationCap, User, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BlockchainBackground from '../components/BlockchainBackground';

export default function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState(null);
  const [form, setForm] = useState({
    universityName: '',
    description: '',
    documents: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already onboarded
  useEffect(() => {
    if (user && user.role !== 'pending') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) {
      setError('Please select an identity role first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await completeOnboarding({ 
        role, 
        ...form,
        universityName: role === 'university' ? form.universityName : undefined
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Onboarding Failure:', err);
      setError(err || 'Failed to establish protocol.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden bg-[#010409]">
      
      {/* 🌌 INTERACTIVE BACKGROUND */}
      <BlockchainBackground />

      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-[140px] rounded-full animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative w-full max-w-[500px] z-10"
      >
        <div className="glass-card p-10 md:p-12 border border-white/10">
          
          <div className="text-center mb-10 space-y-4">
            <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto border border-white/5 shadow-indigo-500/10 animate-levitate">
              <ShieldCheck size={28} className="text-indigo-500" />
            </div>

            <h1 className="text-3xl font-bold text-white tracking-tight text-glow-indigo">
              Establish <span className="text-indigo-500">Identity</span>
            </h1>

            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] opacity-60">
              Protocol Onboarding Initialized
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-8 text-rose-400 text-[10px] font-bold uppercase tracking-widest text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-8">
            {/* ROLE SELECTION CARDS */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setRole('student')}
                className={`p-6 rounded-2xl border-2 transition-all group ${
                  role === 'student' 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : 'border-white/5 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                  role === 'student' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-500 group-hover:text-white'
                }`}>
                  <User size={24} />
                </div>
                <h3 className={`text-[10px] font-black uppercase tracking-widest ${
                  role === 'student' ? 'text-white' : 'text-slate-500'
                }`}>Student</h3>
                <p className="text-[8px] text-slate-600 mt-2 leading-relaxed">Proof of education & credentials</p>
              </button>

              <button
                onClick={() => setRole('university')}
                className={`p-6 rounded-2xl border-2 transition-all group ${
                  role === 'university' 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-white/5 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                  role === 'university' ? 'bg-purple-500 text-white' : 'bg-white/5 text-slate-500 group-hover:text-white'
                }`}>
                  <GraduationCap size={24} />
                </div>
                <h3 className={`text-[10px] font-black uppercase tracking-widest ${
                  role === 'university' ? 'text-white' : 'text-slate-500'
                }`}>University</h3>
                <p className="text-[8px] text-slate-600 mt-2 leading-relaxed">Authority to issue credentials</p>
              </button>
            </div>

            <AnimatePresence>
              {role === 'university' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-4 border-t border-white/5"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Institutional Name</label>
                    <input
                      type="text"
                      required
                      value={form.universityName}
                      onChange={e => setForm({ ...form, universityName: e.target.value.toUpperCase() })}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 px-6 text-white text-[11px] font-bold tracking-widest outline-none focus:border-purple-500/30"
                      placeholder="HARVARD UNIVERSITY"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Description</label>
                    <textarea
                      required
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 px-6 text-white text-[10px] outline-none focus:border-purple-500/30 h-24 resize-none"
                      placeholder="A brief history of the protocol..."
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleSubmit}
              disabled={loading || !role}
              className="w-full bg-white text-black h-16 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 hover:bg-slate-200 disabled:opacity-30 shadow-xl shadow-white/5"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Lock Identity <ArrowRight size={16} />
                </>
              )}
            </button>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
