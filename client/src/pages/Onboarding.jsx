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
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden bg-[#000000] text-slate-300 font-sans selection:bg-cyan-500/30">
      
      {/* 🌌 INTERACTIVE BACKGROUND */}
      <div className="fixed inset-0 opacity-20 pointer-events-none z-0">
        <BlockchainBackground />
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-cyan-400/5 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative w-full max-w-[500px] z-10"
      >
        <div className="glass-pane p-12 md:p-14 rounded-[2.5rem] border border-white/5 relative overflow-hidden scanline-overlay">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 blur-[60px] rounded-full" />
          
          <div className="text-center mb-12 space-y-8">
            <div className="w-20 h-20 bg-[#050505] rounded-3xl flex items-center justify-center mx-auto border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <ShieldCheck size={32} className="text-cyan-400 relative z-10 animate-pulse" />
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
              Establish <span className="text-cyan-400">Identity.</span>
            </h1>

            <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.4em]">
              Protocol Initialization Sequence
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 mb-10 text-rose-500 text-[9px] font-black uppercase tracking-[0.3em] text-center"
            >
              Protocol Error: {error}
            </motion.div>
          )}

          <div className="space-y-8">
            {/* ROLE SELECTION CARDS */}
            {/* ROLE SELECTION CARDS */}
            <div className="grid grid-cols-2 gap-6">
              <button
                onClick={() => setRole('student')}
                className={`p-8 rounded-[2rem] border transition-all relative overflow-hidden group shadow-2xl ${
                  role === 'student' 
                    ? 'border-cyan-400 bg-cyan-400/5 shadow-cyan-400/10' 
                    : 'border-white/5 bg-[#050505] hover:border-cyan-400/20'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all shadow-inner ${
                  role === 'student' ? 'bg-cyan-400 text-slate-950 scale-110' : 'bg-[#080808] text-slate-800'
                }`}>
                  <User size={24} />
                </div>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                  role === 'student' ? 'text-white' : 'text-slate-800'
                }`}>Subject Identity</h3>
                <p className={`text-[8px] font-black uppercase tracking-widest mt-2 leading-relaxed transition-colors ${role === 'student' ? 'text-cyan-400/60' : 'text-slate-900'}`}>Credential Repository</p>
              </button>

              <button
                onClick={() => setRole('university')}
                className={`p-8 rounded-[2rem] border transition-all relative overflow-hidden group shadow-2xl ${
                  role === 'university' 
                    ? 'border-cyan-400 bg-cyan-400/5 shadow-cyan-400/10' 
                    : 'border-white/5 bg-[#050505] hover:border-cyan-400/20'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all shadow-inner ${
                  role === 'university' ? 'bg-cyan-400 text-slate-950 scale-110' : 'bg-[#080808] text-slate-800'
                }`}>
                  <GraduationCap size={24} />
                </div>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                  role === 'university' ? 'text-white' : 'text-slate-800'
                }`}>Authority Node</h3>
                <p className={`text-[8px] font-black uppercase tracking-widest mt-2 leading-relaxed transition-colors ${role === 'university' ? 'text-cyan-400/60' : 'text-slate-900'}`}>Issuance Privilege</p>
              </button>
            </div>

            <AnimatePresence>
              {role === 'university' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 pt-8 border-t border-white/5"
                >
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-800 uppercase tracking-[0.4em] ml-1">Institutional Identifier</label>
                    <input
                      type="text"
                      required
                      value={form.universityName}
                      onChange={e => setForm({ ...form, universityName: e.target.value.toUpperCase() })}
                      className="w-full bg-[#050505] border border-white/10 rounded-2xl py-5 px-8 text-white text-[10px] font-black tracking-widest uppercase outline-none focus:border-cyan-400/40 shadow-inner"
                      placeholder="e.g. UNIVERSITY OF LONDON"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-800 uppercase tracking-[0.4em] ml-1">Institutional Manifest</label>
                    <textarea
                      required
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      className="w-full bg-[#050505] border border-white/10 rounded-2xl py-5 px-8 text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-cyan-400/40 h-28 resize-none shadow-inner leading-loose"
                      placeholder="Describe the protocol history..."
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleSubmit}
              disabled={loading || !role}
              className="btn-command btn-blue w-full h-16 shadow-[0_0_30px_rgba(59,130,246,0.3)] disabled:shadow-none"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  Anchor Identity <ArrowRight size={20} />
                </>
              )}
            </button>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
