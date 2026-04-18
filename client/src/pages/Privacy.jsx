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
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-500/30 overflow-x-hidden">

      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      <div className="container max-w-4xl mx-auto px-6 pt-40 pb-24 relative z-10 space-y-16">

        {/* HEADER */}
        <motion.div {...viewTransition} className="space-y-6">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md shadow-sm">
            <Lock className="text-blue-600" size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Privacy & Security</span>
          </div>
          <h1 className="text-6xl md:text-[5.5rem] font-black text-white tracking-tighter leading-none uppercase">
            Privacy <span className="text-blue-500">Policy.</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-xl leading-relaxed">
            At EduCred, your data privacy is our priority. We use industry-standard security and blockchain integrity to protect your records.
          </p>
        </motion.div>

        {/* CONTENT PANEL */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.1 }} className="bg-white p-10 md:p-14 border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-900/10 space-y-16">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
              {
                icon: Eye,
                title: "I. Data Processing & Collection",
                text: "EduCred acquires only the necessary personal identifiers required for the reliable issuance and verification of academic credentials, limited to name, institutional email, and enrollment data."
              },
              {
                icon: Server,
                title: "II. Information Utilization",
                text: "Data processed by the platform is utilized exclusively for cross-institutional verification, system authentication, and ensuring the technical integrity of the credentialing lifecycle."
              },
              {
                icon: Globe,
                title: "III. Cryptographic Persistence",
                text: "Non-PII (Personally Identifiable Information) hashes are anchored to the blockchain ledger. Sensitive source documents are stored in secure, encrypted environments and never exposed on-chain."
              },
              {
                icon: ShieldCheck,
                title: "IV. Data Sovereignty",
                text: "The platform operates on a principle of user ownership. EduCred does not engage in the sale of user data or unauthorized third-party sharing of institutional records."
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
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Statutory Rights & Compliance</h2>
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest leading-relaxed max-w-2xl">
              EduCred adheres to global data protection standards, ensuring users retain the right to rectify, access, or request erasure of stored data. We maintain full transparency regarding the handling of academic attestations.
            </p>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-blue-600 cursor-pointer hover:gap-6 transition-all group">
              Manage Data Settings <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform" />
            </div>
          </div>

        </motion.div>

        {/* FOOTER */}
        <footer className="text-center space-y-10 pt-12">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-40">
            Last Updated: {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </p>
        </footer>

      </div>
    </div>
  );
}
