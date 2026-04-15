import { useState, useEffect } from 'react';
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
import BlockchainBackground from '../components/BlockchainBackground';
import { useToast } from '../components/Toast';

// 💠 SAPPHIRE ANIMATION PROTOCOL
const containerTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const diffTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.4 }
};

/**
 * 🕵️ AI Workbench: Forensic Code Engineering Node
 * Allows Super Admins to request, review, and anchor AI-generated features.
 */
export default function AIWorkbench() {
  const { user } = useAuth();
  const { toast } = useToast();

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
      toast.error('AI Agent offline. Check node connection.');
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
      const errMsg = err.response?.data?.error || 'Intelligence engine timeout.';
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
      const res = await api.post('/api/ai/apply-patch', {
        filePath: filePath,
        patch: generatedOutput.patch
      });
      
      toast.success('Patch anchored to filesystem.');
      setGeneratedOutput(null);
      setPrompt('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Patch application failed.');
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
      if (line.startsWith('@@')) { color = 'text-indigo-400'; bg = 'bg-indigo-500/5'; }
      
      return (
        <div key={i} className={`font-mono text-[10px] py-0.5 px-3 flex gap-4 ${bg}`}>
          <span className="w-8 opacity-20 select-none text-right">{i + 1}</span>
          <span className={`${color} whitespace-pre-wrap break-all`}>{line}</span>
        </div>
      );
    });
  };

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-300 font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* 🌌 NEURAL NETWORK BACKGROUND */}
      <BlockchainBackground />
      
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="container max-w-[1400px] mx-auto px-6 pt-32 pb-24 relative z-10 space-y-12">
        
        {/* HEADER SECTION */}
        <motion.div {...containerTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full w-fit">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Neural Workbench Alpha</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter leading-none">
              Intelligence <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent glow-indigo">Labs.</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
              <Cpu size={14} className="text-indigo-400" /> Human-in-the-Loop Feature Engineering
            </p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => { setGeneratedOutput(null); setPrompt(''); }}
              className="h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md flex items-center justify-center text-slate-500 hover:text-white transition-all"
            >
              <RefreshCcw size={20} />
            </button>
            <div className="h-14 px-8 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center gap-4 text-indigo-400">
               <History size={20} />
               <span className="text-[10px] font-bold uppercase tracking-widest">Audit Logs</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* 🧩 REQUEST ARCHITECT (Left Panel) */}
          <motion.div 
            {...containerTransition}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 space-y-8"
          >
            <div className="glass-pane p-8 border border-white/5 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[60px] rounded-full" />
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <Zap className="text-indigo-400" size={18} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-white">Objective Specification</h3>
                    <p className="text-[9px] text-slate-500 mt-0.5">Define the engineering goal for the AI agent</p>
                  </div>
                </div>

                {/* Mode Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {modes.map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`py-3.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border
                        ${selectedMode === mode 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-white/[0.02] border-white/[0.06] text-slate-600 hover:text-white hover:bg-white/5'}`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* File Path */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Context (Optional)</span>
                  <div className="relative group">
                    <FileCode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors" size={16} />
                    <input 
                      value={filePath}
                      onChange={(e) => setFilePath(e.target.value)}
                      placeholder="e.g. server/controllers/certificateController.js"
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-4 pl-12 pr-6 text-xs text-white outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>

                {/* Prompt Area */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Feature Description</span>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={6}
                    placeholder="Describe the feature or optimization. AI will analyze the code and propose a Git Diff..."
                    className="w-full bg-[#050505] border border-white/10 rounded-2xl p-5 text-sm text-slate-300 outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-800 resize-none font-medium leading-relaxed"
                  />
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full h-16 bg-white text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-slate-200 transition-all disabled:opacity-50 group overflow-hidden relative"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Synthesizing Logic...
                    </>
                  ) : (
                    <>
                      <Play size={18} fill="currentColor" />
                      Initiate Synthesis
                      <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="glass-pane p-5 border border-amber-500/10 bg-amber-500/[0.02] flex gap-4">
              <ShieldAlert className="text-amber-500 flex-shrink-0" size={20} />
              <p className="text-[9px] text-amber-500/70 leading-relaxed font-bold uppercase tracking-widest">
                The Intelligence Engine is constrained by strict security filters. 
                Shell commands and destructive FS operations will be blocked.
              </p>
            </div>
          </motion.div>

          {/* 📝 CODE REVIEWER (Right Panel) */}
          <div className="lg:col-span-7 h-full min-h-[600px]">
            <AnimatePresence mode="wait">
              {!generatedOutput && !isGenerating ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.01] text-center space-y-6"
                >
                   <Terminal className="text-slate-800" size={64} />
                   <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">Awaiting Instruction</p>
                     <p className="text-[9px] text-slate-800 uppercase tracking-widest">Logic review will appear here</p>
                   </div>
                </motion.div>
              ) : isGenerating ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center space-y-8"
                >
                  <div className="relative">
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-ping" />
                    <div className="h-20 w-20 border-b-2 border-indigo-500 rounded-full animate-spin" />
                  </div>
                  <div className="text-center space-y-2 animate-pulse">
                    <p className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.4em]">Neural Handshake</p>
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black">Scanning Repository Context...</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="output"
                  {...diffTransition}
                  className="flex flex-col h-full space-y-6"
                >
                  <div className="flex-1 flex flex-col bg-[#050505] border border-white/[0.08] rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/[0.06] flex items-center justify-between bg-[#080808]">
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Proposed Diff</span>
                         <span className="text-[10px] text-slate-600">|</span>
                         <span className="text-[10px] font-bold text-slate-500">{filePath}</span>
                       </div>
                       <div className="flex gap-2">
                         <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                           Confidence: {(generatedOutput.confidence * 100).toFixed(0)}%
                         </div>
                       </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-black p-4 scrollbar-hide">
                       {renderDiff(generatedOutput.patch || 'No changes required for this request.')}
                    </div>

                    <div className="p-8 bg-[#080808] border-t border-white/[0.06] space-y-6">
                       <div className="space-y-4">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Intelligence Narrative</h4>
                         <p className="text-xs text-slate-400 leading-relaxed font-medium">
                           {generatedOutput.explanation}
                         </p>
                       </div>

                       {generatedOutput.risks?.length > 0 && (
                         <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl flex gap-4">
                            <AlertTriangle className="text-rose-500 flex-shrink-0" size={18} />
                            <div className="space-y-1">
                               <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Risk Assessment</p>
                               <ul className="list-disc list-inside space-y-1">
                                 {generatedOutput.risks.map((risk, i) => (
                                   <li key={i} className="text-[9px] text-rose-400 font-medium">{risk}</li>
                                 ))}
                               </ul>
                            </div>
                         </div>
                       )}

                       <div className="flex gap-4 pt-4 border-t border-white/[0.04]">
                         <button 
                             onClick={() => setGeneratedOutput(null)}
                             className="flex-1 h-14 bg-white/[0.03] border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                         >
                            Discard
                         </button>
                         <button 
                            disabled={isApplying || !generatedOutput.patch}
                            onClick={handleApply}
                            className="flex-[2] h-14 bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500 shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                         >
                            {isApplying ? <Loader2 className="animate-spin" size={16} /> : <HardDrive size={16} />}
                            Push to Production
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
