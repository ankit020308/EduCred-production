import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, ShieldCheck, Radio } from 'lucide-react';
import BlockchainBackground from '../components/BlockchainBackground';

const viewTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setForm({ name: '', email: '', message: '' });
    }, 1500);
  };

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden">

      {/* 🌌 DEEP VIGNETTE & BACKGROUND */}
      <div className="fixed inset-0 z-0 opacity-30 mix-blend-screen pointer-events-none">
        <BlockchainBackground />
      </div>
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_80%)] pointer-events-none" />

      {/* AMBIENT GLOW */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-6 pt-40 pb-24 relative z-10 space-y-16">

        {/* HEADER */}
        <motion.div {...viewTransition} className="text-center space-y-6">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-[#050505] border border-white/[0.04] backdrop-blur-xl shadow-[0_0_30px_rgba(59,130,246,0.1)]">
            <Radio className="text-blue-500 animate-pulse" size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">Institutional Inquiry Protocol</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter leading-none uppercase">
            Command <span className="text-blue-500">Center.</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] max-w-xl mx-auto">
            Direct protocol connection for institutional support and network integration.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* TRANSMISSION TERMINAL (FORM) */}
          <motion.div {...viewTransition} transition={{ delay: 0.1 }} className="lg:col-span-12 xl:col-span-8">
            <div className="bg-[#0A0A0A]/80 backdrop-blur-3xl p-10 md:p-14 border border-white/[0.04] rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden group">

              {/* SCANNING LASER LINE */}
              <motion.div
                animate={{ top: ['-10%', '110%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20 pointer-events-none"
              />

              <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none group-hover:bg-blue-500/10 transition-all duration-1000" />

              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20 relative z-10"
                  >
                    <div className="w-24 h-24 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                      <ShieldCheck size={48} className="text-blue-500" />
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">Transmission Anchored.</h2>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] max-w-sm mx-auto">
                        Our institutional response node will synchronize with you shortly.
                      </p>
                    </div>
                    <button onClick={() => setSuccess(false)} className="px-10 py-4 mt-4 bg-white text-black rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-slate-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all active:scale-95">
                      Initialize New Signal
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="space-y-10 relative z-10"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-1">Authority Identity</label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })}
                          className="w-full bg-[#111111] border border-white/[0.04] rounded-xl py-4 px-6 text-white text-[11px] font-bold tracking-widest outline-none focus:border-blue-500/50 focus:bg-[#161616] focus:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all uppercase placeholder:text-slate-700"
                          placeholder="FULL NAME / INSTITUTION"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-1">Communication Link</label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          className="w-full bg-[#111111] border border-white/[0.04] rounded-xl py-4 px-6 text-white text-[11px] font-bold tracking-widest outline-none focus:border-blue-500/50 focus:bg-[#161616] focus:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all uppercase placeholder:text-slate-700"
                          placeholder="IDENTITY@NODE.EDU"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-1">Protocol Inquiry</label>
                      <textarea
                        required
                        rows={6}
                        value={form.message}
                        onChange={e => setForm({ ...form, message: e.target.value })}
                        className="w-full bg-[#111111] border border-white/[0.04] rounded-[1.5rem] py-5 px-6 text-white text-[11px] font-medium leading-relaxed outline-none focus:border-blue-500/50 focus:bg-[#161616] focus:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all placeholder:text-slate-700 resize-none uppercase tracking-wide"
                        placeholder="DESCRIBE THE OPERATION CYCLE..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-16 bg-white text-black rounded-xl text-[11px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all hover:bg-slate-200 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] active:scale-95 disabled:opacity-50 disabled:hover:shadow-none"
                    >
                      {loading ? <Loader2 size={24} className="animate-spin text-black" /> : <><Send size={18} /> Transmit Signal</>}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* NODE PROXIMITY SIDE PANEL */}
          <motion.div {...viewTransition} transition={{ delay: 0.2 }} className="lg:col-span-12 xl:col-span-4 space-y-8">
            <div className="bg-[#0A0A0A]/80 backdrop-blur-3xl p-10 rounded-[2rem] border border-white/[0.04] shadow-2xl space-y-10">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Network Proximity</h3>
              <div className="space-y-8">
                {[
                  { label: "COMM-CHANNEL", val: "SUPPORT@EDUCRED.COM", color: "bg-blue-500" },
                  { label: "MAINNET NODE", val: "GLOBAL PROTOCOL 01", color: "bg-blue-500" }
                ].map((item, i) => (
                  <div key={i} className="space-y-3 pl-6 border-l border-white/[0.06] hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.color} animate-pulse`} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">{item.label}</span>
                    </div>
                    <p className="text-white text-[11px] font-bold uppercase tracking-widest leading-none">{item.val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-10 bg-[#050505] rounded-[2rem] border border-white/[0.04] text-center space-y-6">
              <div className="w-14 h-14 bg-[#111111] rounded-2xl flex items-center justify-center mx-auto text-blue-500 border border-white/[0.04]">
                <Radio size={24} className="animate-pulse" />
              </div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] leading-relaxed">
                Institutional response matrices are monitored 24/7 across all active synchronization zones.
              </p>
            </div>
          </motion.div>
        </div>

        {/* FOOTER */}
        <footer className="pt-24 text-center relative z-10">
          <div className="h-px w-24 bg-white/[0.04] mx-auto" />
          <p className="text-slate-600 text-[9px] font-bold uppercase tracking-[0.4em] max-w-md mx-auto leading-loose mt-12">
            Authorized communication only. <br /> All transmissions are cryptographically anchored.
          </p>
        </footer>
      </div>
    </div>
  );
}