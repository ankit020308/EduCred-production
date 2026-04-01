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
    <div className="relative min-h-screen bg-[#010409] text-slate-300 overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* 🌌 INTERACTIVE BACKGROUND */}
      <BlockchainBackground />

      {/* AMBIENT GLOW */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-indigo-600/5 blur-[200px] rounded-full" />
      </div>

      <div className="container max-w-4xl mx-auto px-6 pt-40 pb-24 relative z-10 space-y-16">
        
        {/* HEADER */}
        <motion.div {...viewTransition} className="space-y-6 text-left">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md animate-levitate shadow-xl shadow-indigo-500/5">
            <Gavel className="text-indigo-400" size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-indigo-400">Governance Protocol Terms</span>
          </div>
          <h1 className="text-6xl md:text-[5.5rem] font-bold text-white tracking-tighter leading-none italic uppercase">
            Protocol <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent text-glow-emissive">Governance.</span>
          </h1>
          <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl leading-relaxed">
            By synchronizing with the EduCred ecosystem, you agree to abide by the decentralized governance protocols outlined in this manifest.
          </p>
        </motion.div>

        {/* CONTENT GLASS PANEL */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.1 }} className="glass-card p-10 md:p-14 border border-white/10 space-y-16">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
              { 
                icon: Network, 
                title: "Node Usage", 
                text: "EduCred provides high-integrity blockchain-based verification. Nodes must operate within the legal boundaries of their respective jurisdictions." 
              },
              { 
                icon: ShieldAlert, 
                title: "Input Authenticity", 
                text: "Issuers are cryptographically responsible for the accuracy of anchored assets. Fraudulent injection will result in immediate node detachment." 
              },
              { 
                icon: Cpu, 
                title: "Immutability", 
                text: "All cryptographic hashes anchored to the ledger are permanent and non-deletable once consensus is achieved on the EduCred network." 
              },
              { 
                icon: Activity, 
                title: "Liability Limit", 
                text: "EduCred is a decentralized protocol interface. We are not liable for external misinterpretation or incorrect institutional data injection." 
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
            <h2 className="text-2xl font-bold text-white tracking-tighter italic uppercase">Modifications</h2>
            <p className="text-slate-500 text-[11px] font-medium leading-relaxed italic max-w-2xl">
              The Governance Protocol may be updated as the network evolves. Nodes are responsible for periodically synchronizing with this manifest to ensure compliance with the latest consensus rules.
            </p>
            <div className="flex items-center gap-4 text-[10px] font-bold text-indigo-500 uppercase tracking-widest cursor-pointer hover:gap-6 transition-all group">
               Sync Protocol Version <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform" />
            </div>
          </div>

        </motion.div>

        {/* FOOTER */}
        <footer className="text-center space-y-10 pt-12">
             <div className="h-px w-24 bg-white/5 mx-auto" />
             <p className="text-slate-800 text-[10px] font-black uppercase tracking-[0.5em] max-w-sm mx-auto leading-loose italic opacity-30">
                Authorized Governance Protocol. Protocol Version: {new Date().getFullYear()}.01
             </p>
        </footer>

      </div>
    </div>
  );
}