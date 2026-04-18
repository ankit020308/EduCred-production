import { motion } from 'framer-motion';
import { Gavel, ShieldAlert, Cpu, Network, RefreshCcw, Activity } from 'lucide-react';
import BlockchainBackground from '../components/BlockchainBackground';

// 💠 ANIMATION CONSTANTS (ZERO-G SPEC)
const viewTransition = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

export default function Terms() {
  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      <div className="container max-w-4xl mx-auto px-6 pt-40 pb-24 relative z-10 space-y-16">
        
        {/* HEADER */}
        <motion.div {...viewTransition} className="space-y-6 text-left">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md shadow-sm">
            <Gavel className="text-blue-600" size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Platform Governance</span>
          </div>
          <h1 className="text-6xl md:text-[5.5rem] font-black text-white tracking-tighter leading-none uppercase">
            Terms of <span className="text-blue-500">Service.</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-xl leading-relaxed">
            By using the EduCred platform, you agree to comply with our service terms and record-keeping standards.
          </p>
        </motion.div>

        {/* CONTENT PANEL */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.1 }} className="bg-white p-10 md:p-14 border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-900/10 space-y-16">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
              { 
                icon: Network, 
                title: "I. User Accountability", 
                text: "EduCred provides institutional-grade digital verification infrastructure. Users are responsible for maintaining compliance with regional legal frameworks and institutional policies." 
              },
              { 
                icon: ShieldAlert, 
                title: "II. Attestation Fidelity", 
                text: "Issuing institutions bear sole responsibility for the veracity of submitted academic records. Submission of fraudulent data is grounds for immediate credential revocation and account deactivation." 
              },
              { 
                icon: Cpu, 
                title: "III. Immutability Clause", 
                text: "All verified attestations anchored to the ledger are considered permanent record-of-truth. This ensures long-term non-repudiation of achievement for all stakeholders." 
              },
              { 
                icon: Activity, 
                title: "IV. Disclaimer of Warranty", 
                text: "EduCred acts as a decentralized service interface. We disclaim liability for inaccuracies arising from third-party data entry or external institutional misconfigurations." 
              }
            ].map((section, idx) => (
              <div key={idx} className="space-y-4">
                <div className="flex items-center gap-4 text-blue-600">
                  <section.icon size={20} className="opacity-60" />
                  <h2 className="text-[11px] font-black uppercase tracking-widest leading-none">{section.title}</h2>
                </div>
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest leading-relaxed">{section.text}</p>
              </div>
            ))}
          </div>

          <div className="pt-16 border-t border-slate-50 space-y-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Governance Updates</h2>
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest leading-relaxed max-w-2xl">
              EduCred reserves the right to modify these terms to align with evolving regulatory and technological standards. Stakeholders are encouraged to review these governance protocols regularly.
            </p>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-blue-600 cursor-pointer hover:gap-6 transition-all group">
               View Latest Version <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform" />
            </div>
          </div>

        </motion.div>

        {/* FOOTER */}
        <footer className="text-center space-y-10 pt-12">
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-40">
                Authorized Platform Terms. Version: {new Date().getFullYear()}.01
             </p>
        </footer>

      </div>
    </div>
  );
}