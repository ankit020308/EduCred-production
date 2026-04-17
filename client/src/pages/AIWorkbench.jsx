import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Cpu, Zap, ShieldCheck, Loader2, Play,
  Terminal, FileCode, CheckCircle2, ChevronRight,
  ArrowRight, ShieldAlert, Database, History,
  Layout, Code2, AlertTriangle, RefreshCcw, Search,
  X, Check, Copy, ExternalLink, HardDrive
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useToast } from '../components/Toast';

// 💠 UI ANIMATIONS
const containerTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

const diffTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.4 }
};

/**
 * 🛠️ AI Workbench: Feature Generation Node
 * Allows administrators to request, review, and apply AI-generated code features.
 */
export default function AIWorkbench() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      navigate('/login');
    }
  }, [user, navigate]);

  const [modes, setModes] = useState([]);
  const [selectedMode, setSelectedMode] = useState('GENERATE_FEATURE');
  const [prompt, setPrompt] = useState('');
  const [filePath, setFilePath] = useState('server/controllers/certificateController.js');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchModes();
  }, []);

  const fetchModes = async () => {
    try {
      const res = await api.get('/api/ai/modes');
      setModes(res.data.modes || []);
    } catch (err) {
      console.error('Failed to fetch AI modes:', err);
      toast.error('Intelligence system offline.');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return toast.error('Request description required.');

    setIsGenerating(true);
    setGeneratedOutput(null);
    setError(null);

    try {
      const res = await api.post(`/api/ai/${selectedMode.toLowerCase().replace('_', '-')}`, {
        featureDescription: prompt,
        filePath: filePath
      });
      setGeneratedOutput(res.data);
      toast.success('Feature logic generated successfully.');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Integration timeout.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!generatedOutput?.patch) return;

    setIsApplying(true);
    try {
      await api.post('/api/ai/apply-patch', {
        filePath: filePath,
        patch: generatedOutput.patch
      });

      toast.success('Changes applied to filesystem.');
      setGeneratedOutput(null);
      setPrompt('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to apply changes.');
    } finally {
      setIsApplying(false);
    }
  };

  const renderDiff = (patch) => {
    if (!patch) return null;
    return patch.split('\n').map((line, i) => {
      let color = 'text-slate-400';
      let bg = '';
      if (line.startsWith('+')) { color = 'text-emerald-400'; bg = 'bg-emerald-500/5'; }
      if (line.startsWith('-')) { color = 'text-rose-400'; bg = 'bg-rose-500/5'; }
      if (line.startsWith('@@')) { color = 'text-blue-400'; bg = 'bg-blue-500/5'; }

      return (
        <div key={i} className={`font-mono text-[10px] py-0.5 px-3 flex gap-4 ${bg}`}>
          <span className="w-8 opacity-20 select-none text-right">{i + 1}</span>
          <span className={`${color} whitespace-pre-wrap break-all`}>{line}</span>
        </div>
      );
    });
  };

  return (
  return (
    <div className="relative min-h-screen bg-[#F9FAFB]">
      
      {/* 🏔️ CLEAN BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 space-y-16 p-8 md:p-12 max-w-[1600px] mx-auto">

        {/* HEADER SECTION */}
        <motion.div {...containerTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-[#E5E7EB] pb-12">
          <div className="space-y-8">
            <div className="flex items-center gap-4 px-6 py-2 bg-blue-500/5 border border-blue-500/10 rounded-full w-fit">
              <span className="text-[10px] font-black text-[#60A5FA] uppercase tracking-[0.2em]">Platform Design Node</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-[#2C2F33] tracking-tighter leading-none uppercase">
              AI <span className="opacity-30 italic">Workbench.</span>
            </h1>
            <p className="text-[#4B5563] text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-6 italic">
              <Cpu size={18} className="text-[#60A5FA]" /> Professional Feature Architecture
            </p>
          </div>

          <div className="flex gap-6">
            <button
              onClick={() => { setGeneratedOutput(null); setPrompt(''); }}
              className="h-16 w-16 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#4B5563] hover:text-[#60A5FA] hover:border-[#60A5FA]/30 transition-all shadow-sm"
            >
              <RefreshCcw size={22} />
            </button>
            <div className="h-16 px-10 rounded-2xl bg-white border border-[#E5E7EB] flex items-center gap-6 text-[#2C2F33] hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
              <History size={22} className="text-[#4B5563]" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Archives</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

          {/* 🧩 CONFIGURATION (Left Panel) */}
          <motion.div
            {...containerTransition}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 space-y-12"
          >
            <div className="bg-white p-12 rounded-[3rem] border border-[#E5E7EB] shadow-2xl space-y-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full" />

              <div className="space-y-12">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex items-center justify-center">
                    <Zap className="text-[#60A5FA]" size={28} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black uppercase tracking-[0.2em] text-[#2C2F33]">Architectural Protocol</h3>
                    <p className="text-[10px] text-[#4B5563] mt-2 font-black uppercase tracking-widest leading-none">Intelligence mode selection</p>
                  </div>
                </div>

                {/* Mode Grid */}
                <div className="grid grid-cols-2 gap-5">
                  {[...modes, 'STITCH_DESIGN'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`h-16 px-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all border
                        ${selectedMode === mode
                          ? 'bg-[#2C2F33] border-[#2C2F33] text-white shadow-xl shadow-slate-900/10'
                          : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563] hover:text-[#2C2F33] hover:bg-white'}`}
                    >
                      {mode.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>

                {/* File Path */}
                <div className="space-y-5">
                  <label className="text-[11px] font-black text-[#4B5563] uppercase tracking-[0.2em] ml-2">Target Filecontext</label>
                  <div className="relative group">
                    <FileCode className="absolute left-6 top-1/2 -translate-y-1/2 text-[#D1D5DB] group-focus-within:text-[#60A5FA] transition-colors" size={22} />
                    <input
                      value={filePath}
                      onChange={(e) => setFilePath(e.target.value)}
                      placeholder="e.g. server/controllers/certificateController.js"
                      className="w-full h-16 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl pl-16 pr-6 text-[12px] font-bold text-[#111827] outline-none focus:bg-white focus:border-[#60A5FA] transition-all shadow-inner uppercase tracking-[0.1em] placeholder:text-[#9CA3AF]"
                    />
                  </div>
                </div>

                {/* Prompt Area */}
                <div className="space-y-5">
                  <label className="text-[11px] font-black text-[#4B5563] uppercase tracking-[0.2em] ml-2">Generation Directive</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={7}
                    placeholder="Describe the high-fidelity component or logic enhancement..."
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[2rem] p-10 text-[14px] font-medium text-[#111827] outline-none focus:bg-white focus:border-[#60A5FA] transition-all shadow-inner resize-none leading-relaxed tracking-wide placeholder:text-[#9CA3AF]"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full h-18 bg-[#2C2F33] text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] hover:bg-[#1F2937] hover:scale-[1.02] transition-all shadow-xl disabled:bg-slate-100 disabled:text-slate-300 flex items-center justify-center gap-6"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={28} className="animate-spin opacity-40" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      <Play size={24} fill="currentColor" />
                      Assemble Architecture
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-10 rounded-[2.5rem] flex gap-8 shadow-xl">
              <ShieldAlert className="text-amber-600 flex-shrink-0" size={28} />
              <p className="text-[11px] text-[#4B5563] leading-relaxed font-black uppercase tracking-[0.15em] italic opacity-80">
                Architectural changes are sandboxed. Review all diffs before finalizing the commitment.
              </p>
            </div>
          </motion.div>

          {/* 📝 CODE REVIEWER (Right Panel) */}
          <div className="lg:col-span-7 h-full min-h-[850px]">
            <AnimatePresence mode="wait">
              {!generatedOutput && !isGenerating ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center border border-[#E5E7EB] rounded-[3.5rem] bg-white text-center space-y-10 shadow-2xl"
                >
                  <div className="w-28 h-28 bg-[#F3F4F6] rounded-full flex items-center justify-center text-[#D1D5DB] border border-[#E5E7EB] shadow-inner">
                    <Terminal size={56} />
                  </div>
                  <div className="space-y-4">
                    <p className="text-[14px] font-black text-[#2C2F33] uppercase tracking-[0.3em]">Workbench Node: Waiting</p>
                    <p className="text-[11px] text-[#4B5563] font-black uppercase tracking-[0.2em] max-w-xs mx-auto italic opacity-60">Assemble your build directive to begin.</p>
                  </div>
                </motion.div>
              ) : isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center space-y-16"
                >
                  <div className="relative">
                    <Loader2 size={120} className="text-[#60A5FA] animate-spin opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Cpu size={56} className="text-[#2C2F33] animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center space-y-6">
                    <p className="text-[18px] font-black text-[#2C2F33] uppercase tracking-[0.4em] leading-none">Architecting Feature</p>
                    <p className="text-[11px] text-[#4B5563] uppercase tracking-[0.2em] font-black opacity-60 italic">Resolving context dependencies...</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="output"
                  {...diffTransition}
                  className="flex flex-col h-full space-y-10"
                >
                  <div className="flex-1 flex flex-col bg-white border border-[#E5E7EB] rounded-[3rem] overflow-hidden shadow-2xl h-full">
                    <div className="px-12 py-10 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
                      <div className="flex items-center gap-6">
                        <div className="w-3 h-3 rounded-full bg-[#60A5FA]" />
                        <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[#2C2F33]">Registry Patch Review</span>
                        <div className="h-5 w-px bg-[#E5E7EB] mx-3" />
                        <span className="text-[11px] font-black text-[#4B5563] uppercase tracking-[0.1em] truncate max-w-[250px] opacity-60 italic">{filePath}</span>
                      </div>
                      <div className="px-6 py-2.5 bg-blue-50 text-[#60A5FA] text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-blue-100">
                        Reliability Factor: {(generatedOutput.confidence * 100).toFixed(0)}%
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50 p-12 font-mono text-[11px] leading-loose selection:bg-blue-100">
                      {renderDiff(generatedOutput.patch || 'No architectural permutations required.')}
                    </div>

                    <div className="p-14 border-t border-[#E5E7EB] space-y-12 bg-[#F9FAFB]/50">
                      <div className="space-y-8">
                        <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#4B5563] flex items-center gap-4">
                          <CheckCircle2 size={16} className="text-[#60A5FA]" />
                          Implementation Strategy
                        </label>
                        <p className="text-[13px] text-[#2C2F33] leading-relaxed font-bold bg-white p-12 rounded-[2rem] border border-[#E5E7EB] shadow-sm uppercase tracking-wider opacity-90 italic">
                          {generatedOutput.explanation}
                        </p>
                      </div>

                      {generatedOutput.risks?.length > 0 && (
                        <div className="bg-rose-50 border border-rose-100 p-12 rounded-[2rem] flex gap-10 shadow-sm">
                          <AlertTriangle className="text-rose-600 flex-shrink-0" size={36} />
                          <div className="space-y-6">
                            <p className="text-[12px] font-black text-rose-600 uppercase tracking-[0.3em]">Critical Analysis Matrix</p>
                            <ul className="space-y-4">
                              {generatedOutput.risks.map((risk, i) => (
                                <li key={i} className="text-[11px] text-[#4B5563] font-black uppercase tracking-[0.15em] flex items-center gap-5 opacity-80">
                                  <div className="w-2 h-2 bg-rose-500 rounded-full" />
                                  {risk}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-6 pt-6">
                        <button
                          onClick={() => setGeneratedOutput(null)}
                          className="flex-1 h-18 rounded-2xl border border-[#E5E7EB] text-[12px] font-black uppercase tracking-[0.3em] text-[#4B5563] hover:bg-slate-50 transition-all font-sans"
                        >
                          Discard
                        </button>
                        <button
                          disabled={isApplying || !generatedOutput.patch}
                          onClick={handleApply}
                          className="flex-[2.5] h-18 bg-[#2C2F33] text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] hover:bg-[#1F2937] transition-all shadow-xl flex items-center justify-center gap-6 font-sans"
                        >
                          {isApplying ? <Loader2 className="animate-spin opacity-40" size={24} /> : <HardDrive size={26} />}
                          Finalize Architecture
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
