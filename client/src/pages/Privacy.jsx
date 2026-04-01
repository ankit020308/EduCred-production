import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Globe, Eye, Server, RefreshCcw } from 'lucide-react';
import BlockchainBackground from '../components/BlockchainBackground';

// 💠 ANIMATION CONSTANTS (ZERO-G SPEC)
const viewTransition = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

export default function Privacy() {
  return (
    <div className="relative min-h-screen bg-[#010409] text-slate-300 overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* 🌌 INTERACTIVE BACKGROUND */}
      <BlockchainBackground />

      {/* AMBIENT GLOW */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/5 blur-[200px] rounded-full" />
      </div>

      <div className="container max-w-4xl mx-auto px-6 pt-40 pb-24 relative z-10 space-y-16">
        
        {/* HEADER */}
        <motion.div {...viewTransition} className="space-y-6">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md animate-levitate shadow-xl shadow-indigo-500/5">
            <Lock className="text-indigo-400" size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-indigo-400">Data Sovereignty Protocol</span>
          </div>
          <h1 className="text-6xl md:text-[5.5rem] font-bold text-white tracking-tighter leading-none italic uppercase">
            Privacy <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent text-glow-emissive">Manifest.</span>
          </h1>
          <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl leading-relaxed">
            At EduCred, your identity is cryptographically secured. This manifest outlines the node-level security maintaining your digital sovereignty.
          </p>
        </motion.div>

        {/* CONTENT GLASS PANEL */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.1 }} className="glass-card p-10 md:p-14 border border-white/10 space-y-16">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
              { 
                icon: Eye, 
                title: "Data Extraction", 
                text: "We collect only the essential metadata (Name, Email, Institutional Reference) required to establish a valid cryptographic link." 
              },
              { 
                icon: Server, 
                title: "Network Usage", 
                text: "Your data is used strictly for credential verification, node-level communication, and ledger integrity checks." 
              },
              { 
                icon: Globe, 
                title: "On-Chain Hashing", 
                text: "Credentials are recomputed into secure SHA-256 hashes and anchored to the ledger. No original binary assets are publicly exposed." 
              },
              { 
                icon: ShieldCheck, 
                title: "Identity Sovereignty", 
                text: "We provide you with absolute sovereign control over your manifest. Your data is never traded or distributed outside the network." 
              }
            ].map((section, idx) => (
              <div key={idx} className="space-y-4">
                <div className="flex items-center gap-4 text-indigo-400">
                  <section.icon size={20} className="opacity-40" />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em]">{section.title}</h2>
                </div>
                <p className="text-slate-500 text-[11px] font-medium leading-relaxed italic">{section.text}</p>
              </div>
            ))}
          </div>

          <div className="pt-16 border-t border-white/5 space-y-8">
            <h2 className="text-2xl font-bold text-white tracking-tighter italic uppercase">Identity Rights</h2>
            <p className="text-slate-500 text-[11px] font-medium leading-relaxed italic max-w-2xl">
              Under the EduCred Governance Protocol, every node (User) maintains the right to access, synchronize, or request the detachment of their identity manifest from the identity controller at any time.
            </p>
            <div className="flex items-center gap-4 text-[10px] font-bold text-indigo-500 uppercase tracking-widest cursor-pointer hover:gap-6 transition-all group">
               Sync Identity Control <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform" />
            </div>
          </div>

        </motion.div>

        {/* FOOTER */}
        <footer className="text-center space-y-10 pt-12">
             <div className="h-px w-24 bg-white/5 mx-auto" />
             <p className="text-slate-800 text-[10px] font-black uppercase tracking-[0.5em] max-w-sm mx-auto leading-loose italic opacity-30">
                Authorized Governance Protocol. Last Synchronized: {new Date().getFullYear()} Cycle.
             </p>
        </footer>

      </div>
    </div>
  );
}