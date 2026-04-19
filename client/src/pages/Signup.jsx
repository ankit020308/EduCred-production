import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  ArrowRight, 
  ChevronLeft,
  CheckCircle2,
  Award,
  Globe,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * 🔒 PROFESSIONAL SIGNUP FLOW
 * A modern split-screen layout designed for maximum trust and accessibility.
 * Replaces technical jargon and complex node language with clear SaaS flows.
 */
export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [authStep, setAuthStep] = useState(0); // 0: Role, 1: Details
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student', universityName: '', description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = (e) => {
    e.preventDefault();
    setError('');
    if (authStep === 0) {
      setAuthStep(1);
    } else {
      executeRegistration();
    }
  };

  const executeRegistration = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await register(form);
      
      if (result?.requiresVerification) {
        navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('[SIGNUP_EXCEPTION] Protocol registration failed:', err);
      
      const data = err?.response?.data;
      const networkError = !err.response && err.message;
      
      let msg = 'Registration failed.';
      if (networkError) {
        msg = `Network Error: Could not connect to the EduCred server. Please check your internet or try again later. (${err.message})`;
      } else if (data?.details) {
        msg = `${data.error} Details: ${data.details}`;
      } else if (data?.error) {
        msg = data.error;
      } else if (data?.message) {
        msg = data.message;
      } else if (err.message) {
        msg = err.message;
      }
      
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex bg-white font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* ─── LEFT PANE: BRANDING & TRUST ────────────────────────────────── */}
      <div className="hidden lg:flex w-[40%] flex-col relative overflow-hidden bg-[#0B132B]">
        {/* Background Visual Asset (Using high-end CSS gradients as fallback) */}
        <div className="absolute inset-0 z-0 opacity-40">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,#2563EB_0%,transparent_50%),radial-gradient(circle_at_80%_70%,#38BDF8_0%,transparent_50%)]" />
        </div>

        <div className="relative z-10 flex flex-col h-full p-16">
          <Link to="/" className="flex items-center gap-3 w-fit mb-24 hover:scale-105 transition-transform">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight uppercase">Edu<span className="text-blue-500">Cred</span></span>
          </Link>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-4xl font-black text-white leading-tight mb-8">
               Empowering the future <br/> of <span className="text-blue-400">verification.</span>
            </h2>
            
            <div className="space-y-8">
              {[
                { icon: Globe, title: "Global Portability", text: "Your credentials follow you anywhere, instantly verifiable worldwide." },
                { icon: ShieldCheck, title: "Enterprise Grade", text: "Built on battle-tested blockchain protocols for maximum security." },
                { icon: Award, title: "Career Ready", text: "Stand out to employers with instantly authenticated achievements." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 shrink-0">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm mb-1">{item.title}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex items-center gap-4">
             <div className="flex -space-x-2">
                {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0B132B] bg-slate-700" />)}
             </div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
               Trusted by 1,200+ institutions
             </span>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANE: REGISTRATION FORM ──────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-24 bg-[#F8FAFC] overflow-y-auto">
        <div className="w-full max-w-[440px]">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 text-center lg:text-left"
          >
            {authStep > 0 && (
              <button 
                onClick={() => setAuthStep(0)}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-widest mb-6"
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              {authStep === 0 ? "Get Started" : "Profile Setup"}
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Create your account to secure your academic future.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={authStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100"
            >
              <form onSubmit={handleNext} className="space-y-6">
                
                {authStep === 0 && (
                  <>
                    <div className="flex p-1 bg-slate-50 border border-slate-100 rounded-2xl mb-8">
                       <button
                         type="button"
                         onClick={() => setForm({...form, role: 'student'})}
                         className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${form.role === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         Student
                       </button>
                       <button
                         type="button"
                         onClick={() => setForm({...form, role: 'university'})}
                         className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${form.role === 'university' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         Portal
                       </button>
                    </div>

                    <div className="space-y-4">
                      <div className="relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <input 
                            placeholder="Full Name" required 
                            value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                          />
                      </div>
                      <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <input 
                            type="email" placeholder="Email Address" required 
                            value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                          />
                      </div>
                      <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <input 
                            type="password" placeholder="Password" required 
                            value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                          />
                      </div>
                    </div>

                    <button type="submit" className="btn-primary w-full mt-4 !shadow-blue-500/10">
                      Continue <ArrowRight size={18} />
                    </button>
                  </>
                )}

                {authStep === 1 && (
                  <>
                    <div className="space-y-4">
                      {form.role === 'university' ? (
                        <>
                          <div className="space-y-4 mb-6">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institutional Identity</label>
                            <div className="relative group">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input 
                                  placeholder="Full Institution Name" required autoFocus
                                  value={form.universityName} onChange={e => setForm({...form, universityName: e.target.value})}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
                                />
                            </div>
                          </div>
                          <div className="space-y-4 mb-6">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Statement / Description</label>
                            <textarea
                              placeholder="Briefly describe your institution's authority and academic scope..."
                              value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                              rows="4"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium resize-none text-[13px]"
                            />
                          </div>
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                             <ShieldCheck className="text-amber-600 shrink-0" size={18} />
                             <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-wider">
                               Institution portals are verified by our admin team before activation.
                             </p>
                          </div>
                        </>
                      ) : (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center">
                           <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                              <Award size={32} />
                           </div>
                           <h4 className="text-slate-900 font-black mb-2">Ready to verify!</h4>
                           <p className="text-slate-500 text-xs">Finalize your profile to start receiving credentials.</p>
                        </div>
                      )}
                    </div>
                    
                    <button type="submit" disabled={loading} className="btn-primary w-full !shadow-blue-500/10">
                      {loading ? <Loader2 className="animate-spin" size={20} /> : "Complete Setup"}
                    </button>
                    {error && <p className="text-rose-600 text-[10px] font-black uppercase text-center mt-4">Error: {error}</p>}
                  </>
                )}
              </form>
            </motion.div>
          </AnimatePresence>

          <p className="text-center mt-12 text-slate-400 text-xs font-medium">
             Already have an account?{' '}
             <Link to="/login" className="text-blue-500 font-bold hover:underline">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
