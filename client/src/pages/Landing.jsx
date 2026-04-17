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
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <ProtocolBootSequence onComplete={() => setIsBooting(false)} />
      
      <AnimatePresence>
        {!isBooting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative z-10"
          >
            {/* HER0 BACKGROUND GRADIENT */}
            <div className="fixed inset-0 bg-[#0B132B]" />
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
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                        <ShieldCheck size={14} /> Global Credential Verification
                      </span>
                      <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-8">
                        Tamper-proof credentials for the <span className="text-blue-500">enterprise world.</span>
                      </h1>
                      <p className="text-lg lg:text-xl text-slate-400 font-medium leading-relaxed mb-10 max-w-2xl mx-auto lg:mx-0">
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

                      {/* STATS STRIP */}
                      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
                        {stats.map((stat, i) => (
                           <div key={i} className="flex flex-col items-center lg:items-start">
                              <span className="text-2xl font-black text-white">{stat.value}</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{stat.label}</span>
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
                      <div className="relative glass-pane rounded-[2rem] border-white/5 overflow-hidden shadow-2xl">
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
                        className="absolute -top-6 -right-6 glass-pane px-6 py-4 rounded-2xl flex items-center gap-3 shadow-xl border-white/10"
                      >
                         <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                           <CheckCircle2 size={18} />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-white">Trust Score</span>
                            <span className="text-sm font-bold text-emerald-400">100% Valid</span>
                         </div>
                      </motion.div>
                    </div>
                  </motion.div>

                </div>
              </div>
            </section>

            {/* 🛡️ TRUST BAR */}
            <section className="py-12 border-y border-white/5 bg-white/[0.02]">
              <div className="container max-w-7xl mx-auto px-6">
                <div className="flex flex-wrap justify-center gap-12 lg:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                  <div className="flex items-center gap-3 text-white font-bold tracking-tighter text-xl">
                    <Shield size={24} /> GLOBAL STANDARDS
                  </div>
                  <div className="flex items-center gap-3 text-white font-bold tracking-tighter text-xl">
                    <Lock size={24} /> AES-256 SECURED
                  </div>
                  <div className="flex items-center gap-3 text-white font-bold tracking-tighter text-xl">
                    <Globe size={24} /> ISO CERTIFIED
                  </div>
                  <div className="flex items-center gap-3 text-white font-bold tracking-tighter text-xl">
                    <Users size={24} /> 1M+ USERS
                  </div>
                </div>
              </div>
            </section>

            {/* 🍱 JOIN THE NETWORK SECTION */}
            <section className="py-32 px-6 bg-[#F8FAFC]">
              <div className="container max-w-7xl mx-auto">
                <div className="bg-white rounded-[3rem] p-12 lg:p-24 shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  
                  <div className="flex flex-col lg:flex-row items-center gap-16 relative z-10">
                    <div className="flex-1">
                      <h2 className="text-4xl lg:text-6xl font-black text-slate-900 tracking-tight mb-8">
                        Ready to secure your <br/> credentials?
                      </h2>
                      <p className="text-lg text-slate-500 mb-10 max-w-xl font-medium">
                        Join a global network of institutions providing portable, verifiable, and tamper-proof academic identities.
                      </p>
                      <ul className="space-y-6 mb-10">
                        {[
                          { title: "Instant Verification", text: "Recruiters can verify credentials in one click." },
                          { title: "Global Standard", text: "Blockchain-anchored IDs accepted worldwide." },
                          { title: "Tamper-Proof", text: "Unbreakable security for every record." }
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-4">
                            <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0 mt-1">
                              <CheckCircle2 size={14} />
                            </div>
                            <div>
                                <h4 className="text-slate-900 font-bold text-sm uppercase tracking-wider">{item.title}</h4>
                                <p className="text-slate-500 text-xs mt-1">{item.text}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="w-full lg:w-[450px] bg-slate-50 border border-slate-200 rounded-[2rem] p-12 shadow-inner">
                      <h3 className="text-2xl font-black text-slate-900 mb-2 text-center lg:text-left">Get Started</h3>
                      <p className="text-slate-500 text-sm mb-8 font-medium text-center lg:text-left">Create your free EduCred profile today.</p>
                      
                      <div className="space-y-4">
                        <button onClick={() => navigate('/signup')} className="btn-primary w-full shadow-blue-500/20">Create Free Account</button>
                        <p className="text-center text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-6">
                          No credit card required. Trusted by 1,200+ institutions.
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
