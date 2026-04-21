import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Lock, User, Building2, ArrowRight, ChevronLeft, CheckCircle2, Award, Globe, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [authStep, setAuthStep] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', universityName: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = (e) => {
    e.preventDefault();
    setError('');
    if (authStep === 0) { setAuthStep(1); return; }
    executeRegistration();
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
      const data = err?.response?.data;
      let msg = 'Registration failed.';
      if (!err.response && err.message) msg = `Network error: ${err.message}`;
      else if (data?.details) msg = `${data.error} — ${data.details}`;
      else if (data?.error) msg = data.error;
      else if (err.message) msg = err.message;
      setError(msg);
      setLoading(false);
    }
  };

  const FEATURES = [
    { icon: Globe, title: 'Global Portability', text: 'Your credentials follow you anywhere, instantly verifiable worldwide.' },
    { icon: ShieldCheck, title: 'Enterprise Grade', text: 'Built on battle-tested blockchain protocols for maximum security.' },
    { icon: Award, title: 'Career Ready', text: 'Stand out to employers with instantly authenticated achievements.' },
  ];

  return (
    <div className="min-h-screen flex bg-white font-sans overflow-hidden">

      {/* ── LEFT — Hero Blaze panel ── */}
      <div className="hidden lg:flex w-[42%] flex-col hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />

        <div className="relative z-10 flex flex-col h-full p-14">
          <Link to="/" className="flex items-center gap-3 w-fit mb-20">
            <div className="w-10 h-10 bg-white/20 border border-white/30 rounded-full flex items-center justify-center">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <span className="text-xl font-black text-white tracking-tight">Edu<span className="text-white/70">Cred</span></span>
          </Link>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-4xl font-black text-white leading-tight mb-10 tracking-tight">
              Empowering the future<br />of <span className="text-white/70">verification.</span>
            </h2>

            <div className="space-y-8">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-white font-black text-sm mb-1">{title}</h4>
                    <p className="text-white/60 text-xs leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white/30 bg-white/20" />)}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              Trusted by 1,200+ institutions
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT — Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-14 bg-[#f6f6f6] overflow-y-auto">
        <div className="w-full max-w-[440px]">

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            {authStep > 0 && (
              <button onClick={() => setAuthStep(0)}
                className="flex items-center gap-2 text-[#646464] hover:text-[#202020] transition-colors text-xs font-bold uppercase tracking-widest mb-6">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            <h1 className="text-3xl font-black text-[#202020] tracking-tight mb-2">
              {authStep === 0 ? 'Get Started' : 'Profile Setup'}
            </h1>
            <p className="text-[#646464] text-sm">Create your account to secure your academic future.</p>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div key={authStep}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-[#202020] rounded-full p-8">

              <form onSubmit={handleNext} className="space-y-5">
                {authStep === 0 && (
                  <>
                    {/* Role toggle */}
                    <div className="flex p-1 bg-[#f6f6f6] border border-[#e0e0e0] rounded-full mb-6">
                      {['student', 'university'].map((role) => (
                        <button key={role} type="button" onClick={() => setForm({ ...form, role })}
                          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${
                            form.role === role ? 'bg-white text-[#ea2804] border border-[#e0e0e0]' : 'text-[#646464] hover:text-[#202020]'
                          }`}>
                          {role === 'student' ? 'Student' : 'Institution'}
                        </button>
                      ))}
                    </div>

                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={18} />
                      <input placeholder="Full Name" required value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} className="ds-input pl-12" />
                    </div>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={18} />
                      <input type="email" placeholder="Email Address" required value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })} className="ds-input pl-12" />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={18} />
                      <input type="password" placeholder="Password" required value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })} className="ds-input pl-12" />
                    </div>

                    <button type="submit" className="btn-primary w-full">
                      Continue <ArrowRight size={16} />
                    </button>
                  </>
                )}

                {authStep === 1 && (
                  <>
                    {form.role === 'university' ? (
                      <div className="space-y-5">
                        <div className="relative group">
                          <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={18} />
                          <input placeholder="Full Institution Name" required autoFocus value={form.universityName}
                            onChange={e => setForm({ ...form, universityName: e.target.value })} className="ds-input pl-12" />
                        </div>
                        <textarea placeholder="Describe your institution's academic scope..."
                          value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                          rows="3"
                          className="w-full bg-[#f6f6f6] border border-[#e0e0e0] rounded-3xl px-5 py-3 text-sm text-[#202020] outline-none focus:border-[#ea2804] focus:bg-white transition-all resize-none" />
                        <div className="flex gap-3 items-start bg-[#ea2804]/5 border border-[#ea2804]/20 rounded-full px-5 py-4">
                          <ShieldCheck className="text-[#ea2804] shrink-0 mt-0.5" size={16} />
                          <p className="text-[10px] text-[#ea2804] font-bold leading-relaxed uppercase tracking-wider">
                            Institution portals are verified by our admin team before activation.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#2b9a66]/5 border border-[#2b9a66]/20 rounded-full p-8 text-center">
                        <div className="w-16 h-16 bg-[#2b9a66] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                          <Award size={28} />
                        </div>
                        <h4 className="text-[#202020] font-black mb-2">Ready to verify!</h4>
                        <p className="text-[#646464] text-xs">Finalize your profile to start receiving credentials.</p>
                      </div>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary w-full">
                      {loading ? <Loader2 className="animate-spin" size={18} /> : 'Complete Setup'}
                    </button>

                    {error && (
                      <p className="text-[#ea2804] text-xs font-bold uppercase tracking-widest text-center border border-[#ea2804]/20 bg-[#ea2804]/5 rounded-full px-4 py-2">
                        {error}
                      </p>
                    )}
                  </>
                )}
              </form>
            </motion.div>
          </AnimatePresence>

          <p className="text-center mt-10 text-[#646464] text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-[#ea2804] font-black"
              style={{ textDecoration: 'underline dotted #ea2804', textUnderlineOffset: '3px' }}>
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
