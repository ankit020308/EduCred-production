import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PixelGridBackground from '../components/PixelGridBackground';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Institutional simulation delay
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setForm({ name: '', email: '', message: '' });
    }, 1500);
  };

  return (
    <PixelGridBackground>
      <div className="flex-1 overflow-y-auto px-6 py-20 relative z-10 pt-32">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-600/20 shadow-2xl">
              <MessageSquare size={40} className="text-blue-500" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">
              Inquiry <span className="text-blue-500">Node</span>
            </h1>
            <p className="text-slate-500 text-lg font-medium tracking-tight">
              Direct protocol connection for institutional support.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12">
            <Card className="p-12 !bg-[#0b0f2a]/40 backdrop-blur-3xl border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[80px] pointer-events-none group-hover:bg-blue-600/10 transition-all duration-1000" />
              
              {success ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20"
                >
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-2xl">
                    <CheckCircle2 size={40} className="text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Transmission Successful</h2>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] max-w-xs">Our institutional response node will synchronize with you shortly.</p>
                  <Button variant="secondary" onClick={() => setSuccess(false)} className="h-12 px-10 mt-8">
                    Send New Signal
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Authority Identity</label>
                      <input 
                        type="text" 
                        required 
                        value={form.name} 
                        onChange={e => setForm({...form, name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white text-base font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-800" 
                        placeholder="FULL NAME / INSTITUTION" 
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Communication Link / Email</label>
                      <input 
                        type="email" 
                        required 
                        value={form.email} 
                        onChange={e => setForm({...form, email: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white text-base font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-800" 
                        placeholder="PROTOCOL@ACADEMIC.EDU" 
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Meta-Message / Inquiry</label>
                      <textarea 
                        required 
                        rows={6}
                        value={form.message} 
                        onChange={e => setForm({...form, message: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-8 text-white text-base font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-800 resize-none" 
                        placeholder="DESCRIBE THE OPERATION..." 
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full h-20 !rounded-[2rem] text-sm tracking-[0.4em]"
                  >
                    {loading ? <Loader2 size={32} className="animate-spin" /> : <><Send size={24} className="mr-3" /> TRANSMIT SIGNAL</>}
                  </Button>
                </form>
              )}
            </Card>

            <aside className="space-y-8">
               <Card className="p-8 !bg-[#0b0f2a]/40 backdrop-blur-3xl border-white/10 space-y-8">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Node Proximity</h3>
                  <div className="space-y-6">
                     {[
                        { icon: Mail, label: "COMM-CHANNEL", val: "SUPPORT@EDUCRED.COM" },
                        { icon: Globe, label: "MAINNET NODE", val: "GLOBAL PROTOCOL" }
                     ].map((item, i) => (
                        <div key={i} className="space-y-1.5 pl-6 border-l border-white/5 group-hover:border-blue-500/30 transition-colors">
                           <div className="flex items-center gap-2 text-slate-500">
                              <item.icon size={12} />
                              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                           </div>
                           <p className="text-white text-xs font-black uppercase tracking-widest leading-none">{item.val}</p>
                        </div>
                     ))}
                  </div>
               </Card>

               <div className="p-10 bg-blue-600/5 rounded-3xl border border-blue-500/10 text-center space-y-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto text-blue-500 border border-blue-500/20 shadow-xl">
                    <Globe size={24} className="animate-pulse" />
                  </div>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] leading-relaxed">
                    Institutional response matrices are monitored 24/7 across all synchronization zones.
                  </p>
               </div>
            </aside>
          </div>
        </div>
      </div>
    </PixelGridBackground>
  );
}