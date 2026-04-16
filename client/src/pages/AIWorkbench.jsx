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

// 💠 OBSIDIAN ANIMATION PROTOCOL
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
      if (line.startsWith('@@')) { color = 'text-cyan-400'; bg = 'bg-cyan-500/5'; }
      
      return (
        <div key={i} className={`font-mono text-[10px] py-0.5 px-3 flex gap-4 ${bg}`}>
          <span className="w-8 opacity-20 select-none text-right">{i + 1}</span>
          <span className={`${color} whitespace-pre-wrap break-all`}>{line}</span>
        </div>
      );
    });
  };

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-300 font-sans selection:bg-cyan-500/30 overflow-hidden">
      
      {/* 🌌 NEURAL NETWORK BACKGROUND */}
      <div className="fixed inset-0 opacity-20 pointer-events-none z-0">
        <BlockchainBackground />
      </div>
      
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="container max-w-[1400px] mx-auto px-6 pt-32 pb-24 relative z-10 space-y-12">
        
        {/* HEADER SECTION */}
        <motion.div {...containerTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="space-y-8">
            <div className="flex items-center gap-4 px-5 py-2 bg-cyan-400/10 border border-cyan-400/20 rounded-full w-fit shadow-[0_0_20px_rgba(34,211,238,0.1)]">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[9px] font-black text-white uppercase tracking-[0.4em]">Neural Workbench Beta</span>
            </div>
            <h1 className="text-6xl md:text-[5.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase">
              Intelligence <span className="text-cyan-400">Labs.</span>
            </h1>
            <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-4">
              <Cpu size={14} className="text-cyan-400" /> Human-in-the-Loop Feature Engineering
            </p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => { setGeneratedOutput(null); setPrompt(''); }}
              className="h-14 w-14 rounded-2xl bg-[#050505] border border-white/5 backdrop-blur-md flex items-center justify-center text-slate-800 hover:text-white transition-all shadow-inner"
            >
              <RefreshCcw size={20} />
            </button>
            <div className="h-14 px-8 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center gap-4 text-white shadow-inner">
               <History size={20} className="text-cyan-400" />
               <span className="text-[10px] font-black uppercase tracking-widest">Audit Logs</span>
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
            <div className="glass-pane p-10 rounded-[2.5rem] border border-white/5 space-y-10 relative overflow-hidden scanline-overlay">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 blur-[60px] rounded-full" />
              
              <div className="space-y-6">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-cyan-400/10 rounded-2xl border border-cyan-400/20 shadow-inner">
                    <Zap className="text-cyan-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white leading-none">Objective Specification</h3>
                    <p className="text-[9px] text-slate-800 mt-2 font-black uppercase tracking-widest">Protocol Alignment Matrix</p>
                  </div>
                </div>

                {/* Mode Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {modes.map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`py-4 px-6 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all border
                        ${selectedMode === mode 
                          ? 'bg-cyan-400 border-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20' 
                          : 'bg-[#050505] border-white/5 text-slate-800 hover:text-white hover:bg-[#080808]'}`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* File Path */}
                <div className="space-y-4">
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-[0.4em] ml-1">Target Context Registry</span>
                  <div className="relative group">
                    <FileCode className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-900 group-focus-within:text-cyan-400 transition-colors" size={18} />
                    <input 
                      value={filePath}
                      onChange={(e) => setFilePath(e.target.value)}
                      placeholder="e.g. server/controllers/certificateController.js"
                      className="w-full bg-[#050505] border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-[10px] font-black tracking-widest text-white outline-none focus:border-cyan-400/40 transition-all placeholder:text-slate-900 uppercase shadow-inner"
                    />
                  </div>
                </div>

                {/* Prompt Area */}
                <div className="space-y-4">
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-[0.4em] ml-1">Feature Manifest Description</span>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={6}
                    placeholder="Describe the feature or optimization. AI will analyze the code and propose a Git Diff..."
                    className="w-full bg-[#050505] border border-white/5 rounded-[2rem] p-8 text-[11px] font-black uppercase tracking-widest text-slate-300 outline-none focus:border-cyan-400/40 transition-all placeholder:text-slate-900 shadow-inner resize-none leading-relaxed"
                  />
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="btn-command btn-blue w-full h-16 shadow-[0_0_30px_rgba(59,130,246,0.2)] disabled:shadow-none"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      Synthesizing Logic...
                    </>
                  ) : (
                    <>
                      <Play size={20} fill="currentColor" />
                      Initiate Synthesis Protocol
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
                  className="h-full flex flex-col items-center justify-center space-y-10"
                >
                  <div className="relative">
                    <div className="absolute inset-0 border-4 border-cyan-400/20 rounded-full animate-ping" />
                    <div className="h-24 w-24 border-b-2 border-cyan-400 rounded-full animate-spin shadow-[0_0_30px_rgba(34,211,238,0.2)]" />
                  </div>
                  <div className="text-center space-y-3 animate-pulse">
                    <p className="text-[12px] font-black text-cyan-400 uppercase tracking-[0.6em]">Neural Handshake</p>
                    <p className="text-[9px] text-slate-800 uppercase tracking-[0.3em] font-black">Scanning Repository Context Protocol...</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="output"
                  {...diffTransition}
                  className="flex flex-col h-full space-y-6"
                >
                  <div className="flex-1 flex flex-col bg-[#050505] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl scanline-overlay sm:border">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-[#080808]/60 backdrop-blur-md">
                       <div className="flex items-center gap-4">
                         <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] animate-pulse" />
                         <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400">Proposed Diff Matrix</span>
                         <span className="text-[10px] text-slate-800">|</span>
                         <span className="text-[10px] font-black text-white uppercase tracking-widest truncate max-w-[200px]">{filePath}</span>
                       </div>
                       <div className="flex gap-2">
                         <div className="px-4 py-1.5 bg-cyan-400/10 border border-cyan-400/20 rounded-xl text-[8px] font-black text-white uppercase tracking-[0.3em] shadow-inner">
                           Confidence: {(generatedOutput.confidence * 100).toFixed(0)}%
                         </div>
                       </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-black p-4 scrollbar-hide">
                       {renderDiff(generatedOutput.patch || 'No changes required for this request.')}
                       <div className="p-10 bg-[#080808]/40 border-t border-white/5 space-y-8 backdrop-blur-md">
                       <div className="space-y-4">
                         <h4 className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-800">Intelligence Narrative Protocol</h4>
                         <p className="text-[11px] text-slate-400 leading-relaxed font-black uppercase tracking-widest bg-[#050505] p-6 rounded-2xl border border-white/5 shadow-inner">
                           {generatedOutput.explanation}
                         </p>
                       </div>

                       {generatedOutput.risks?.length > 0 && (
                         <div className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-[2rem] flex gap-5 shadow-inner">
                            <AlertTriangle className="text-rose-500 flex-shrink-0" size={24} />
                            <div className="space-y-3">
                               <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.4em]">Collision Risk Assessment</p>
                               <ul className="space-y-2">
                                 {generatedOutput.risks.map((risk, i) => (
                                   <li key={i} className="text-[9px] text-slate-700 font-black uppercase tracking-widest flex items-center gap-3">
                                     <div className="w-1 h-1 bg-rose-500 rounded-full" />
                                     {risk}
                                   </li>
                                 ))}
                               </ul>
                            </div>
                         </div>
                       )}

                       <div className="flex gap-4 pt-6 border-t border-white/5">
                         <button 
                             onClick={() => setGeneratedOutput(null)}
                             className="btn-command btn-outline flex-1 h-16"
                         >
                            Discard
                         </button>
                         <button 
                            disabled={isApplying || !generatedOutput.patch}
                            onClick={handleApply}
                            className="btn-command btn-blue flex-[2] h-16 shadow-[0_0_30px_rgba(59,130,246,0.22)]"
                         >
                            {isApplying ? <Loader2 className="animate-spin" size={20} /> : <HardDrive size={20} />}
                            Anchor to Production
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
