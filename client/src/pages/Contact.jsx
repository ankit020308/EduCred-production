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
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-500/30 overflow-hidden">

      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-6 pt-40 pb-24 relative z-10 space-y-16">

        {/* HEADER */}
        <motion.div {...viewTransition} className="text-center space-y-6">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl shadow-sm">
            <Radio className="text-blue-600 animate-pulse" size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Institutional Support Center</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none uppercase">
            Contact <span className="text-blue-500">Support.</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-xl mx-auto">
            Get in touch with our institutional team for integration support and account inquiries.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* CONTACT FORM */}
          <motion.div {...viewTransition} transition={{ delay: 0.1 }} className="lg:col-span-12 xl:col-span-8">
            <div className="bg-white p-10 md:p-14 border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-900/10 relative overflow-hidden group">
              <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />

              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20 relative z-10"
                  >
                    <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center border border-blue-100 shadow-sm">
                      <ShieldCheck size={48} className="text-blue-600" />
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Message Sent.</h2>
                      <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest max-w-sm mx-auto">
                        Our support team has received your inquiry and will respond shortly.
                      </p>
                    </div>
                    <button onClick={() => setSuccess(false)} className="px-10 py-4 mt-4 btn-primary !shadow-blue-500/10">
                      Send Another Message
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-5 px-8 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm"
                          placeholder="Your Name"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-5 px-8 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm"
                          placeholder="email@institution.edu"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Message</label>
                      <textarea
                        required
                        rows={6}
                        value={form.message}
                        onChange={e => setForm({ ...form, message: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] py-6 px-8 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm resize-none"
                        placeholder="How can we help you?"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full h-16 !shadow-blue-500/10"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> Send Message</>}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* SIDE PANEL */}
          <motion.div {...viewTransition} transition={{ delay: 0.2 }} className="lg:col-span-12 xl:col-span-4 space-y-8">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-900/10 space-y-10">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">limited reach right now ! </h3>
              <div className="space-y-8">
                {[
                  { label: "Email Support", val: "support@educred.com", color: "bg-blue-600" },
                  { label: "Platform Status", val: "Operational", color: "bg-emerald-500" }
                ].map((item, i) => (
                  <div key={i} className="space-y-3 pl-6 border-l-2 border-slate-100 hover:border-blue-500 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.color} ${item.val === 'Operational' ? 'animate-pulse' : ''}`} />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                    </div>
                    <p className="text-slate-900 text-sm font-bold uppercase tracking-widest leading-none">{item.val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-10 bg-blue-600 rounded-[2.5rem] text-center space-y-6 shadow-xl shadow-blue-500/20">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto text-white border border-white/10">
                <Radio size={24} className="animate-pulse" />
              </div>
              <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                Our support team is available 24/7 for institutional integration assistance.
              </p>
            </div>
          </motion.div>
        </div>

        {/* FOOTER-ISH */}
        <footer className="pt-24 text-center relative z-10">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] max-w-md mx-auto leading-loose">
            Enterprise Grade Security. <br /> Trusted by Universities Globally.
          </p>
        </footer>
      </div>
    </div>
  );
}