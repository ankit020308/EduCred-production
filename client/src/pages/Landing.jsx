import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Search,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle2,
  Building2,
  Smartphone,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function Landing() {
  const navigate = useNavigate();

  const [searchId, setSearchId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [demoResult, setDemoResult] = useState(null);

  const handleDemoVerify = (e) => {
    e.preventDefault();
    if (!searchId) return;

    setVerifying(true);
    setDemoResult(null);

    setTimeout(() => {
      setVerifying(false);

      if (searchId.length > 5) {
        setDemoResult({
          status: 'verified',
          name: 'MARCUS AURELIUS',
          degree: 'B.SCIENCE IN ARTIFICIAL INTELLIGENCE',
          node: 'EDU-NODE-0X42F',
          score: 'CGPA 9.8'
        });
      } else {
        setDemoResult({
          status: 'error',
          message: 'PROTOCOL DATA NOT FOUND IN CORE LEDGER'
        });
      }
    }, 1400);
  };

  return (
    <div className="flex flex-col min-h-screen relative bg-transparent">

      {/* ───────── HERO SECTION ───────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-32 pb-24 overflow-visible">

        {/* BACKGROUND SYSTEM */}
        <div className="absolute inset-0 pointer-events-none">

          {/* radial glow */}
          <div className="absolute top-1/2 left-1/2 w-[1200px] h-[1200px] 
          -translate-x-1/2 -translate-y-1/2 
          bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.12)_0%,transparent_65%)]" />

          {/* blur orb */}
          <div className="absolute top-1/2 left-1/2 w-[900px] h-[900px] 
          -translate-x-1/2 -translate-y-1/2 
          bg-blue-600/10 blur-[200px] rounded-full" />

        </div>

        <div className="container mx-auto px-6 relative z-10">

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center gap-14"
          >

            {/* STATUS */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="px-8 py-3 rounded-full 
              bg-blue-600/5 border border-blue-500/20 
              flex items-center gap-4 
              text-[10px] font-black uppercase tracking-[0.5em] 
              text-blue-400 backdrop-blur-xl"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-70"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500"></span>
              </span>
              Mainnet v2.4 Protocol Active
            </motion.div>

            {/* HEADLINE */}
            <div className="space-y-10 max-w-6xl">

              <h1 className="text-6xl md:text-[8rem] font-black text-white 
              italic tracking-tight leading-[0.95] uppercase">

                Decentralized <br className="hidden md:block" />

                <span className="text-transparent bg-clip-text 
                bg-gradient-to-b from-blue-400 to-blue-700 
                drop-shadow-[0_0_60px_rgba(37,99,235,0.25)]">

                  Credentials

                </span>
              </h1>

              <p className="text-slate-400 text-xl md:text-2xl 
              max-w-3xl mx-auto font-medium leading-relaxed opacity-80 italic">

                EduCred eliminates academic fraud by anchoring achievements to an immutable blockchain ledger.
                Verify with absolute cryptographic certainty.

              </p>

            </div>

            {/* BUTTONS */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 mt-6">

              <Button
                onClick={() => navigate('/signup')}
                className="h-20 px-14 !rounded-[2rem] tracking-[0.3em]"
              >
                ESTABLISH NODE <ArrowRight size={20} className="ml-4" />
              </Button>

              <Button
                variant="secondary"
                onClick={() => navigate('/verify')}
                className="h-20 px-14 !rounded-[2rem] tracking-[0.3em]"
              >
                <Search size={20} className="mr-4 text-blue-500" />
                VERIFY RECORD
              </Button>

            </div>

          </motion.div>
        </div>
      </section>
      {/* ───────── LIVE VERIFICATION TERMINAL ───────── */}
      <section className="relative py-36 border-y border-white/5 bg-[#03050c]/60 backdrop-blur-xl overflow-visible">

        <div className="container mx-auto px-6 max-w-5xl">

          {/* HEADER */}
          <div className="text-center mb-20 space-y-6">

            <h2 className="text-xs font-black text-blue-500 uppercase tracking-[0.5em]">
              Live Prototype Node
            </h2>

            <p className="text-white text-4xl md:text-5xl font-black italic tracking-tight uppercase">
              On-Chain Verification
            </p>

            <p className="text-slate-500 max-w-xl mx-auto text-sm uppercase tracking-widest">
              Simulate credential validation through decentralized ledger matching
            </p>

          </div>

          {/* MAIN CARD */}
          <Card className="p-10 md:p-14 !bg-[#0b0f2a]/70 backdrop-blur-3xl border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] rounded-[2.5rem] relative overflow-hidden group">

            {/* subtle glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-1000">
              <div className="absolute w-[500px] h-[500px] bg-blue-600/10 blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            {/* INPUT */}
            <form onSubmit={handleDemoVerify} className="relative z-10">

              <div className="relative group/input">

                <Search
                  className="absolute left-8 top-1/2 -translate-y-1/2 
                  text-slate-600 group-focus-within/input:text-blue-500 transition"
                  size={24}
                />

                <input
                  type="text"
                  placeholder="INPUT PROTOCOL IDENTIFIER (E.G. TRX-1002)"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                  className="w-full bg-white/5 border-2 border-white/10 
                  rounded-[2rem] py-8 pl-20 pr-48 text-white 
                  font-black tracking-widest outline-none 
                  focus:border-blue-500/50 transition-all 
                  placeholder:text-slate-800"
                />

                <button
                  type="submit"
                  disabled={verifying}
                  className="absolute right-4 top-1/2 -translate-y-1/2 
                  bg-blue-600 hover:bg-blue-500 
                  text-white h-14 px-10 rounded-2xl 
                  font-black text-[10px] uppercase tracking-[0.3em] 
                  transition-all active:scale-95 disabled:opacity-50"
                >
                  {verifying ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    'EXECUTE'
                  )}
                </button>

              </div>

            </form>

            {/* RESULT */}
            <AnimatePresence mode="wait">
              {demoResult && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-14 pt-14 border-t border-white/5 relative z-10"
                >

                  {demoResult.status === 'verified' ? (

                    <div className="flex flex-col md:flex-row items-center gap-10">

                      {/* ICON */}
                      <div className="w-24 h-24 bg-emerald-500/10 rounded-3xl 
                      flex items-center justify-center border border-emerald-500/20 
                      text-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.2)]">

                        <CheckCircle2 size={48} />

                      </div>

                      {/* DATA */}
                      <div className="flex-1 text-center md:text-left space-y-4">

                        <h3 className="text-4xl font-black text-white italic uppercase tracking-tight">
                          VERIFIED
                        </h3>

                        <p className="text-slate-500 text-xs font-black uppercase tracking-[0.4em]">
                          {demoResult.node}
                        </p>

                        <div className="flex flex-wrap gap-10 mt-6">

                          <div>
                            <p className="text-[9px] text-blue-500 uppercase tracking-widest">Entity</p>
                            <p className="text-white font-black text-sm uppercase">{demoResult.name}</p>
                          </div>

                          <div>
                            <p className="text-[9px] text-blue-500 uppercase tracking-widest">Proof</p>
                            <p className="text-white font-black text-sm uppercase">{demoResult.degree}</p>
                          </div>

                          <div>
                            <p className="text-[9px] text-blue-500 uppercase tracking-widest">Score</p>
                            <p className="text-white font-black text-sm uppercase">{demoResult.score}</p>
                          </div>

                        </div>

                      </div>

                    </div>

                  ) : (

                    <div className="flex items-center gap-6 text-rose-500 
                    bg-rose-500/5 p-8 rounded-[2rem] border border-rose-500/20">

                      <AlertCircle size={32} />
                      <span className="text-xs font-black uppercase tracking-[0.4em]">
                        {demoResult.message}
                      </span>

                    </div>

                  )}

                </motion.div>
              )}
            </AnimatePresence>

          </Card>
        </div>
      </section>
      {/* ───────── FEATURE MATRIX ───────── */}
      <section className="relative py-40 border-t border-white/5 bg-[#03050c]/80 overflow-visible">

        {/* BACKGROUND DEPTH */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[700px] h-[700px] bg-blue-600/5 blur-[160px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="container mx-auto px-6 relative z-10">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">

            {[
              {
                icon: ShieldCheck,
                title: "SHA-256 Anchoring",
                desc: "Every certificate is hashed and permanently anchored to the blockchain. Tamper-proof by design."
              },
              {
                icon: Zap,
                title: "Instant Verification",
                desc: "Verification occurs in seconds by recomputing and matching cryptographic hashes."
              },
              {
                icon: Globe,
                title: "Global Portability",
                desc: "Credentials are globally accessible and owned entirely by the student."
              }
            ].map((f, i) => (

              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                whileHover={{ y: -12 }}
                className="relative p-12 rounded-[3rem] 
                bg-white/5 backdrop-blur-2xl 
                border border-white/10 
                flex flex-col items-center text-center gap-10 
                transition-all duration-500 
                hover:border-blue-500/40 hover:bg-white/10 
                shadow-[0_20px_60px_rgba(0,0,0,0.5)] group"
              >

                {/* hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-700">
                  <div className="absolute w-[300px] h-[300px] bg-blue-600/10 blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* icon */}
                <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] 
                flex items-center justify-center border border-blue-500/20 
                shadow-xl transition-all duration-500 
                group-hover:bg-blue-600 group-hover:text-white">

                  <f.icon className="text-blue-500 group-hover:text-white" size={32} />

                </div>

                {/* text */}
                <div className="space-y-5">

                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">
                    {f.title}
                  </h3>

                  <p className="text-slate-500 text-base leading-relaxed max-w-xs mx-auto">
                    {f.desc}
                  </p>

                </div>

              </motion.div>

            ))}

          </div>
        </div>
      </section>
      {/* ───────── INSTITUTIONAL SECTION ───────── */}
      <section className="relative py-36 bg-blue-600 overflow-visible">

        {/* DEPTH BACKGROUND */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[900px] h-[900px] bg-white/10 blur-[180px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
        </div>

        <div className="container mx-auto px-6 relative z-10">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">

            {/* TEXT SIDE */}
            <div className="space-y-10">

              <h2 className="text-6xl md:text-[7rem] font-black text-white uppercase italic tracking-tight leading-[1.05]">
                Institutional <br className="hidden md:block" /> Integrity
              </h2>

              <p className="text-blue-100 text-xl leading-relaxed max-w-xl opacity-90">
                Universities leverage EduCred to issue tamper-proof, globally verifiable academic credentials.
              </p>

              <div className="flex gap-10 items-center">
                <CheckCircle2 size={42} className="text-white" />
                <Building2 size={42} className="text-white/70" />
                <Smartphone size={42} className="text-white/40" />
              </div>

            </div>

            {/* CARD SIDE */}
            <motion.div
              initial={{ opacity: 0, rotate: 6 }}
              whileInView={{ opacity: 1, rotate: 3 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >

              <Card className="!p-16 bg-white/5 backdrop-blur-2xl rounded-[3.5rem] border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] hover:rotate-0 transition-transform duration-700">

                <div className="flex justify-between items-center mb-10">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-200 opacity-70">
                    AUTHNODE::0X42F
                  </span>
                  <ShieldCheck className="text-white" size={28} />
                </div>

                <div className="space-y-6 mb-14">

                  <p className="text-6xl font-black text-white italic uppercase tracking-tight leading-none">
                    Verified
                  </p>

                  <p className="text-blue-100 text-xs uppercase tracking-[0.5em]">
                    Global Standard Protocol
                  </p>

                </div>

                <div className="flex justify-between items-end">

                  <div>
                    <p className="text-xs text-blue-200 uppercase tracking-widest mb-1">
                      Trust Index
                    </p>
                    <p className="text-3xl font-black text-white italic">
                      CGPA 9.8
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-blue-200 uppercase tracking-widest mb-1">
                      Node Sync
                    </p>
                    <p className="text-3xl font-black text-white italic">
                      100%
                    </p>
                  </div>

                </div>

              </Card>

            </motion.div>

          </div>
        </div>
      </section>


      {/* ───────── FOOTER ───────── */}
      <footer className="relative py-24 border-t border-white/5 bg-[#03050c]">

        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">

          {/* BRAND */}
          <div className="flex items-center gap-4">

            <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
              <ShieldCheck size={26} className="text-white" />
            </div>

            <div>
              <p className="text-2xl font-black text-white italic tracking-tight">
                Edu<span className="text-blue-500">Cred</span>
              </p>
              <p className="text-[9px] uppercase tracking-[0.4em] text-slate-600">
                Decentralized Protocol
              </p>
            </div>

          </div>

          {/* LINKS */}
          <div className="flex gap-10 text-xs uppercase tracking-[0.3em] text-slate-500">

            <Link to="/privacy" className="hover:text-white transition">
              Privacy
            </Link>

            <Link to="/terms" className="hover:text-white transition">
              Terms
            </Link>

            <Link to="/contact" className="hover:text-white transition">
              Contact
            </Link>

          </div>

        </div>

      </footer>

    </div>
  );
}