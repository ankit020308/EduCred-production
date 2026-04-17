import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Shield, 
  Lock,
  Globe,
  Award,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProtocolBootSequence from '../components/ProtocolBootSequence';

const transition = { duration: 0.8, ease: [0.22, 1, 0.36, 1] };

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isBooting, setIsBooting] = useState(true);

  const stats = [
    { label: "Verified Credentials", value: "250K+", icon: Award },
    { label: "Partner Institutions", value: "1.2K", icon: Building2 },
    { label: "Network Uptime", value: "99.9%", icon: Globe },
  ];

  return (
    <div className="relative min-h-screen bg-[#F9FAFB] text-[#111827] font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <ProtocolBootSequence onComplete={() => setIsBooting(false)} />
      
      <AnimatePresence>
        {!isBooting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative z-10"
          >
            {/* CLEAN BACKGROUND */}
            <div className="fixed inset-0 bg-[#F9FAFB]" />
            <div className="fixed inset-0 hero-gradient pointer-events-none" />

            {/* 🚀 HERO SECTION */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
              <div className="container max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                  
                  {/* LEFT: CONTENT */}
                  <div className="flex-1 text-center lg:text-left">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, ...transition }}
                    >
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/5 border border-blue-500/10 text-[#60A5FA] text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                        <ShieldCheck size={14} /> Global Credential Verification
                      </span>
                      <h1 className="text-5xl lg:text-7xl font-black text-[#111827] tracking-tight leading-[1.1] mb-8">
                        Tamper-proof credentials for the <span className="text-[#60A5FA]">enterprise world.</span>
                      </h1>
                      <p className="text-lg lg:text-xl text-[#4B5563] font-medium leading-relaxed mb-10 max-w-2xl mx-auto lg:mx-0">
                        EduCred provides a secure layer for verifying academic achievements instantly. No complexity, just pure cryptographic trust.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                        <button 
                          onClick={() => navigate(user ? '/dashboard' : '/signup')}
                          className="btn-primary w-full sm:w-auto"
                        >
                          {user ? "Go to Dashboard" : "Get Started Now"} <ArrowRight size={18} />
                        </button>
                        <button 
                          onClick={() => navigate('/verify')}
                          className="btn-secondary w-full sm:w-auto"
                        >
                          Verify a Credential
                        </button>
                      </div>

                      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
                        {stats.map((stat, i) => (
                           <div key={i} className="flex flex-col items-center lg:items-start">
                              <span className="text-2xl font-black text-[#111827]">{stat.value}</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#4B5563] mt-1">{stat.label}</span>
                           </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* RIGHT: MOCKUP ASSET */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: 0.4, ...transition }}
                    className="flex-1 relative"
                  >
                    <div className="relative z-10 group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                      <div className="relative saas-card rounded-[2rem] border-[#D1D5DB] overflow-hidden shadow-2xl">
                         <img 
                            src="/Users/minorproject/.gemini/antigravity/brain/55c9efde-99af-4b93-b746-4ec9f5ff71f1/verified_certificate_mockup_v2_1776318548794.png" 
                            alt="Verified Credential Mockup"
                            className="w-full h-auto object-cover"
                         />
                      </div>
                      
                      {/* FLOATING TRUST ELEMENTS */}
                      <motion.div 
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-6 -right-6 saas-card px-6 py-4 rounded-2xl flex items-center gap-3 shadow-xl border-[#D1D5DB]"
                      >
                         <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                           <CheckCircle2 size={18} />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-[#4B5563]">Trust Score</span>
                            <span className="text-sm font-bold text-emerald-600">100% Valid</span>
                         </div>
                      </motion.div>
                    </div>
                  </motion.div>

                </div>
              </div>
            </section>

            <section className="py-16 border-y border-[#E5E7EB] bg-[#F1F5F9]">
              <div className="container max-w-7xl mx-auto px-6">
                <div className="flex flex-wrap justify-center gap-12 lg:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
                  <div className="flex items-center gap-3 text-[#2C2F33] font-bold tracking-tighter text-base uppercase">
                    <Shield size={20} className="text-[#60A5FA]" /> Global Standards
                  </div>
                  <div className="flex items-center gap-3 text-[#2C2F33] font-bold tracking-tighter text-base uppercase">
                    <Lock size={20} className="text-[#60A5FA]" /> AES-256 Secured
                  </div>
                  <div className="flex items-center gap-3 text-[#2C2F33] font-bold tracking-tighter text-base uppercase">
                    <Globe size={20} className="text-[#60A5FA]" /> ISO Certified
                  </div>
                  <div className="flex items-center gap-3 text-[#2C2F33] font-bold tracking-tighter text-base uppercase">
                    <Users size={20} className="text-[#60A5FA]" /> 1M+ Users
                  </div>
                </div>
              </div>
            </section>

            <section className="py-40 px-6 relative overflow-hidden bg-[#F9FAFB]">
              <div className="container max-w-7xl mx-auto">
                <div className="bg-white rounded-[3rem] p-12 lg:p-32 shadow-2xl border border-[#E5E7EB] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  
                  <div className="flex flex-col lg:flex-row items-center gap-24 relative z-10">
                    <div className="flex-1 space-y-10">
                      <h2 className="text-5xl lg:text-7xl font-black text-[#2C2F33] tracking-tighter leading-none uppercase">
                        Secure your <br/><span className="italic opacity-30">Identity.</span>
                      </h2>
                      <p className="text-xl text-[#4B5563] font-medium leading-relaxed max-w-2xl">
                        Join a global network of institutions providing portable, verifiable, and tamper-proof academic records.
                      </p>
                      <ul className="space-y-8">
                        {[
                          { title: "Instant Verification", text: "Recruiters can verify credentials in one click." },
                          { title: "Global Standard", text: "Blockchain-anchored IDs accepted worldwide." },
                          { title: "Tamper-Proof", text: "Unbreakable security for every record." }
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-6 group">
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-[#60A5FA] shrink-0 mt-1 group-hover:bg-[#2C2F33] group-hover:text-white transition-all duration-500">
                              <CheckCircle2 size={20} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-[#2C2F33] font-black text-sm uppercase tracking-widest">{item.title}</h4>
                                <p className="text-[#4B5563] text-[11px] font-black uppercase tracking-widest opacity-80">{item.text}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="w-full lg:w-[500px] bg-[#F9FAFB] border border-[#E5E7EB] p-16 shadow-2xl rounded-[3rem] relative group transition-all duration-700">
                      <h3 className="text-3xl font-black text-[#2C2F33] mb-4 text-center lg:text-left uppercase tracking-tighter">Get Started.</h3>
                      <p className="text-[#4B5563] text-sm mb-12 font-black uppercase tracking-widest text-center lg:text-left opacity-60">Create your enterprise EduCred profile today.</p>
                      
                      <div className="space-y-6">
                        <button onClick={() => navigate('/signup')} className="btn-primary w-full shadow-slate-900/10 py-6 text-sm !bg-[#2C2F33]">Create Free Account</button>
                        <p className="text-center text-[10px] uppercase font-black text-[#4B5563] tracking-[0.2em] mt-8 italic">
                          Trusted by 1,200+ global institutions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
