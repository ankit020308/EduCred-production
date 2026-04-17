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
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-500/30">
      
      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative w-full max-w-[500px] z-10"
      >
        <div className="bg-white p-12 md:p-14 rounded-[2.5rem] shadow-2xl shadow-slate-900/50 border border-white/5 relative overflow-hidden">
          
          <div className="text-center mb-12 space-y-6">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20">
              <ShieldCheck size={32} className="text-white" />
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
              Setup Your <span className="text-blue-500">Profile.</span>
            </h1>

            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
              Professional Identity Setup
            </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-8 text-rose-600 text-[10px] font-black uppercase text-center"
              >
                Error: {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ROLE SELECTION CARDS */}
            <div className="grid grid-cols-2 gap-6">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`p-8 rounded-[2rem] border transition-all relative overflow-hidden group ${
                  role === 'student' 
                    ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/5' 
                    : 'border-slate-100 bg-slate-50 hover:border-blue-500/20'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all ${
                  role === 'student' ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-white text-slate-400 border border-slate-200'
                }`}>
                  <User size={24} />
                </div>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                  role === 'student' ? 'text-slate-900' : 'text-slate-500'
                }`}>I'm a Student</h3>
              </button>

              <button
                type="button"
                onClick={() => setRole('university')}
                className={`p-8 rounded-[2rem] border transition-all relative overflow-hidden group ${
                  role === 'university' 
                    ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/5' 
                    : 'border-slate-100 bg-slate-50 hover:border-blue-500/20'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all ${
                  role === 'university' ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-white text-slate-400 border border-slate-200'
                }`}>
                  <GraduationCap size={24} />
                </div>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                  role === 'university' ? 'text-slate-900' : 'text-slate-500'
                }`}>Institution</h3>
              </button>
            </div>

            <AnimatePresence>
              {role === 'university' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 pt-6 border-t border-slate-100"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution Name</label>
                    <input
                      type="text"
                      required
                      value={form.universityName}
                      onChange={e => setForm({ ...form, universityName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 px-8 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all"
                      placeholder="e.g. Stanford University"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brief Description</label>
                    <textarea
                      required
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 px-8 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all h-32 resize-none"
                      placeholder="Tell us about your institution..."
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !role}
              className="btn-primary w-full h-16 !shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  Complete Setup <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
