import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Mail, Lock, User, Building2, ArrowRight, ChevronLeft,
  CheckCircle2, Award, Globe, Loader2, Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: Globe,       title: 'Global Portability',  text: 'Credentials follow you anywhere, instantly verifiable worldwide.' },
  { icon: ShieldCheck, title: 'Enterprise Grade',     text: 'Built on battle-tested blockchain protocols for maximum security.' },
  { icon: Award,       title: 'Career Ready',         text: 'Stand out with instantly authenticated achievements.' },
];

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);          // 0=role+basic, 1=profile, 2=success
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student',
    universityName: '', officialDomain: '', adminName: '', description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = (e) => {
    e.preventDefault();
    setError('');
    if (step === 0) { setStep(1); return; }
    executeRegistration();
  };

  const executeRegistration = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await register(form);
      if (result?.requiresVerification) {
        navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`);
      } else if (form.role === 'university') {
        setStep(2);
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

  return (
    <div className="min-h-screen flex bg-white font-sans overflow-hidden">

      {/* Left hero */}
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
              {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white/30 bg-white/20" />)}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Ready for institutional integration</span>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-14 bg-[#f6f6f6] overflow-y-auto">
        <div className="w-full max-w-[440px]">

          <AnimatePresence mode="wait">

            {/* ── Step 2 (success screen for institutions) ── */}
            {step === 2 ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-center space-y-8">
                <div className="w-20 h-20 bg-[#2b9a66]/10 border border-[#2b9a66]/20 rounded-full mx-auto flex items-center justify-center text-[#2b9a66]">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-[#202020] tracking-tight mb-3">Account Created.</h1>
                  <p className="text-[#646464] text-sm leading-relaxed max-w-sm mx-auto">
                    Your institution account is pending admin approval. Once verified you'll receive full certificate issuance access.
                  </p>
                </div>
                <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 space-y-4 text-left">
                  <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">What happens next?</p>
                  {[
                    { label: 'Admin Review', text: 'Our team verifies your institutional credentials.', time: '1–2 business days' },
                    { label: 'Portal Activation', text: 'Your account gets certificate issuance rights.', time: 'Upon approval' },
                    { label: 'Issue Credentials', text: 'Start anchoring academic records on the blockchain.', time: 'Immediately after' },
                  ].map((s) => (
                    <div key={s.label} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <Clock size={11} className="text-[#ea2804]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#202020] uppercase tracking-wide">{s.label}</p>
                        <p className="text-[9px] text-[#646464] mt-0.5">{s.text}</p>
                        <p className="text-[9px] font-black text-[#ea2804] uppercase tracking-widest mt-0.5">{s.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/login')} className="btn-primary w-full">
                  Go to Login <ArrowRight size={14} />
                </button>
              </motion.div>
            ) : (
              <motion.div key={`step-${step}`} initial={{ opacity: 0, x: step === 1 ? 12 : -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}>

                {/* Header */}
                <div className="mb-8">
                  {step > 0 && (
                    <button onClick={() => setStep(0)}
                      className="flex items-center gap-2 text-[#646464] hover:text-[#202020] transition-colors text-[9px] font-bold uppercase tracking-widest mb-5">
                      <ChevronLeft size={14} /> Back
                    </button>
                  )}
                  <h1 className="text-3xl font-black text-[#202020] tracking-tight mb-1">Get Started</h1>
                  <p className="text-[#646464] text-sm">Create your account to secure your academic future.</p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-6">
                  {['Account', 'Profile'].map((label, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                        i < step ? 'bg-[#2b9a66]/10 border-[#2b9a66]/20 text-[#2b9a66]'
                          : i === step ? 'bg-[#ea2804]/10 border-[#ea2804]/20 text-[#ea2804]'
                          : 'bg-[#f6f6f6] border-[#e0e0e0] text-[#bbbbbb]'
                      }`}>
                        {i < step && <CheckCircle2 size={9} />}
                        {i === step && <div className="w-1.5 h-1.5 rounded-full bg-[#ea2804] animate-pulse" />}
                        {label}
                      </div>
                      {i < 1 && <div className={`h-px w-6 ${i < step ? 'bg-[#2b9a66]' : 'bg-[#e0e0e0]'}`} />}
                    </div>
                  ))}
                </div>

                {/* Card */}
                <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm">
                  <form onSubmit={handleNext} className="space-y-4">

                    {step === 0 && (
                      <>
                        {/* Role toggle */}
                        <div>
                          <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-2">Account type</p>
                          <div className="flex p-1.5 bg-[#f6f6f6] border border-[#e0e0e0] rounded-xl">
                            {[
                              { value: 'student',    label: 'Student' },
                              { value: 'university', label: 'Institution' },
                            ].map(role => (
                              <button key={role.value} type="button" onClick={() => setForm({ ...form, role: role.value })}
                                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                  form.role === role.value
                                    ? 'bg-white text-[#ea2804] border border-[#e0e0e0]'
                                    : 'text-[#646464] hover:text-[#202020]'
                                }`}>
                                {role.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Full Name</label>
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={16} />
                            <input placeholder="Your full name" required value={form.name}
                              onChange={e => setForm({ ...form, name: e.target.value })} className="ds-input pl-11" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Email Address</label>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={16} />
                            <input type="email" placeholder="you@university.edu" required value={form.email}
                              onChange={e => setForm({ ...form, email: e.target.value })} className="ds-input pl-11" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Password</label>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={16} />
                            <input type="password" placeholder="At least 8 characters" required minLength={6} value={form.password}
                              onChange={e => setForm({ ...form, password: e.target.value })} className="ds-input pl-11" />
                          </div>
                        </div>

                        <button type="submit" className="btn-primary w-full">
                          Continue <ArrowRight size={14} />
                        </button>
                      </>
                    )}

                    {step === 1 && (
                      <>
                        {form.role === 'university' ? (
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Institution Name</label>
                              <div className="relative group">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={16} />
                                <input placeholder="e.g. SRM Institute of Technology" required autoFocus value={form.universityName}
                                  onChange={e => setForm({ ...form, universityName: e.target.value })} className="ds-input pl-11" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Official Domain</label>
                              <div className="relative group">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={16} />
                                <input placeholder="e.g. srmist.edu.in" value={form.officialDomain}
                                  onChange={e => setForm({ ...form, officialDomain: e.target.value })} className="ds-input pl-11" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Admin Contact Name</label>
                              <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={16} />
                                <input placeholder="Registrar / IT Admin name" value={form.adminName}
                                  onChange={e => setForm({ ...form, adminName: e.target.value })} className="ds-input pl-11" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Description (optional)</label>
                              <textarea placeholder="Briefly describe your institution's academic scope…"
                                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                rows={3}
                                className="w-full bg-[#f6f6f6] border border-[#e0e0e0] rounded-xl px-4 py-3 text-sm text-[#202020] outline-none focus:border-[#ea2804] focus:bg-white transition-all resize-none placeholder:text-[#bbbbbb]" />
                            </div>
                            <div className="flex gap-3 items-start bg-[#ea2804]/5 border border-[#ea2804]/20 rounded-xl px-4 py-3">
                              <ShieldCheck className="text-[#ea2804] shrink-0 mt-0.5" size={14} />
                              <p className="text-[9px] text-[#ea2804] font-bold leading-relaxed uppercase tracking-wider">
                                Institution portals are verified by our admin team before activation (1–2 business days).
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#2b9a66]/5 border border-[#2b9a66]/20 rounded-2xl p-8 text-center space-y-3">
                            <div className="w-14 h-14 bg-[#2b9a66] text-white rounded-full flex items-center justify-center mx-auto">
                              <Award size={24} />
                            </div>
                            <h4 className="text-[#202020] font-black text-base">Ready to verify!</h4>
                            <p className="text-[#646464] text-xs leading-relaxed">Finalize your profile to start receiving verified credentials from your institution.</p>
                          </div>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary w-full">
                          {loading ? <Loader2 className="animate-spin" size={16} /> : 'Complete Setup'}
                        </button>

                        {error && (
                          <p className="text-[#ea2804] text-[9px] font-bold uppercase tracking-widest text-center border border-[#ea2804]/20 bg-[#ea2804]/5 rounded-xl px-4 py-2.5">
                            {error}
                          </p>
                        )}
                      </>
                    )}
                  </form>
                </div>

                <p className="text-center mt-8 text-[#646464] text-sm">
                  Already have an account?{' '}
                  <Link to="/login" className="text-[#ea2804] font-black"
                    style={{ textDecoration: 'underline dotted #ea2804', textUnderlineOffset: '3px' }}>
                    Log In
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
