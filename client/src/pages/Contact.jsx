import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageSquare, Send, Globe, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import BlockchainBackground from '../components/BlockchainBackground';

// 💠 ANIMATION CONSTANTS (ZERO-G SPEC)
const viewTransition = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
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
    <div className="relative min-h-screen bg-[#010409] text-slate-300 overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* 🌌 INTERACTIVE BACKGROUND */}
      <BlockchainBackground />

      {/* AMBIENT GLOW */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 blur-[200px] rounded-full animate-pulse" />
      </div>

      <div className="container max-w-5xl mx-auto px-6 pt-40 pb-24 relative z-10 space-y-16">
        
        {/* HEADER */}
        <motion.div {...viewTransition} className="text-center space-y-6">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md animate-levitate shadow-xl shadow-indigo-500/5">
            <MessageSquare className="text-indigo-400" size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-indigo-400">Institutional Inquiry Protocol</span>
          </div>
          <h1 className="text-6xl md:text-[5.5rem] font-bold text-white tracking-tighter leading-none italic uppercase">
            Inquiry <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent text-glow-emissive">Node.</span>
          </h1>
          <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl mx-auto leading-relaxed">
            Direct protocol connection for institutional support and network integration.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* FORM AREA */}
          <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.1 }} className="lg:col-span-12 xl:col-span-8">
            <div className="glass-card p-10 md:p-14 border border-white/10 overflow-hidden group">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 blur-[100px] pointer-events-none group-hover:bg-indigo-600/10 transition-all duration-1000" />
              
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20 relative z-10"
                  >
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-xl shadow-emerald-500/10 animate-levitate">
                      <CheckCircle2 size={40} className="text-emerald-500" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold text-white tracking-tighter italic uppercase">Transmission Successful.</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] max-w-xs mx-auto">Our institutional response node will synchronize with you shortly.</p>
                    </div>
                    <button onClick={() => setSuccess(false)} className="px-10 py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                      Send New Signal
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] ml-2">Authority Identity</label>
                        <input 
                          type="text" 
                          required 
                          value={form.name} 
                          onChange={e => setForm({...form, name: e.target.value.toUpperCase()})}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-5 px-8 text-white text-[11px] font-bold tracking-widest outline-none focus:border-indigo-500/50 transition-all uppercase placeholder:text-slate-800" 
                          placeholder="FULL NAME / INSTITUTION" 
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] ml-2">Communication Link</label>
                        <input 
                          type="email" 
                          required 
                          value={form.email} 
                          onChange={e => setForm({...form, email: e.target.value})}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-5 px-8 text-white text-[11px] font-bold tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-800" 
                          placeholder="IDENTITY@NODE.EDU" 
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] ml-2">Protocol Inquiry</label>
                      <textarea 
                        required 
                        rows={6}
                        value={form.message} 
                        onChange={e => setForm({...form, message: e.target.value})}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-[1.5rem] py-5 px-8 text-white text-[11px] font-medium leading-relaxed outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-800 resize-none" 
                        placeholder="DESCRIBE THE OPERATION CYCLE..." 
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full h-16 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-4 transition-all hover:bg-slate-200 active:scale-95 shadow-xl shadow-white/5"
                    >
                      {loading ? <Loader2 size={24} className="animate-spin text-black" /> : <><Send size={20} /> Transmit Signal</>}
                    </button>
                  </form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* SIDE ASIDE */}
          <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.2 }} className="lg:col-span-12 xl:col-span-4 space-y-10">
              <div className="glass-card p-10 border border-white/5 space-y-10">
                  <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">Node Proximity</h3>
                  <div className="space-y-8">
                     {[
                        { icon: Mail, label: "COMM-CHANNEL", val: "SUPPORT@EDUCRED.COM" },
                        { icon: Globe, label: "MAINNET NODE", val: "GLOBAL PROTOCOL 01" }
                     ].map((item, i) => (
                        <div key={i} className="space-y-2 pl-6 border-l-2 border-white/5 hover:border-indigo-500/30 transition-colors">
                           <div className="flex items-center gap-3 text-slate-500">
                              <item.icon size={12} className="opacity-40" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                           </div>
                           <p className="text-white text-xs font-bold uppercase tracking-widest leading-none">{item.val}</p>
                        </div>
                     ))}
                  </div>
              </div>

              <div className="p-10 bg-indigo-600/5 rounded-[2.5rem] border border-indigo-500/20 text-center space-y-6 animate-levitate">
                  <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 border border-white/5 shadow-xl">
                    <Globe size={24} className="animate-pulse" />
                  </div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] leading-relaxed italic">
                    Institutional response matrices are monitored 24/7 across all synchronization zones.
                  </p>
                  <button className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.3em] flex items-center justify-center gap-2 hover:gap-4 transition-all">
                    Network Status <ArrowRight size={14} />
                  </button>
              </div>
          </motion.div>
        </div>

        {/* FOOTER */}
        <footer className="pt-24 text-center">
             <div className="h-px w-24 bg-white/5 mx-auto" />
             <p className="text-slate-800 text-[10px] font-black uppercase tracking-[0.6em] max-w-sm mx-auto leading-loose italic mt-12 opacity-30">
                Authorized communication only. All transmissions are hashed for protocol security.
             </p>
        </footer>
      </div>
    </div>
  );
}