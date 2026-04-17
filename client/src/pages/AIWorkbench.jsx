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
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-500/30 overflow-hidden">

      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      <div className="container max-w-[1400px] mx-auto px-6 pt-32 pb-24 relative z-10 space-y-12">

        {/* HEADER SECTION */}
        <motion.div {...containerTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full w-fit">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Enterprise AI Builder</span>
            </div>
            <h1 className="text-6xl md:text-[5.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase">
              Feature <span className="text-blue-500">Workbench.</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-4">
              <Cpu size={14} className="text-blue-500/60" /> Advanced Feature Generation & Code Review
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => { setGeneratedOutput(null); setPrompt(''); }}
              className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-white/40 hover:text-blue-500 transition-all shadow-xl group"
            >
              <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>
            <div className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 text-white/40 shadow-xl group hover:text-blue-500 transition-colors cursor-pointer">
              <History size={20} className="opacity-20 group-hover:opacity-100" />
              <span className="text-[10px] font-black uppercase tracking-widest">History</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* 🧩 CONFIGURATION (Left Panel) */}
          <motion.div
            {...containerTransition}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 space-y-8"
          >
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-900/10 space-y-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full" />

              <div className="space-y-8">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm">
                    <Zap className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 leading-none">AI Operation</h3>
                    <p className="text-[9px] text-slate-400 mt-2 font-black uppercase tracking-widest">Select logic generation mode</p>
                  </div>
                </div>

                {/* Mode Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {modes.map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`py-4 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                        ${selectedMode === mode
                          ? 'bg-blue-600 border-blue-700 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                    >
                      {mode.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>

                {/* File Path */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target File Path</label>
                  <div className="relative group">
                    <FileCode className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      value={filePath}
                      onChange={(e) => setFilePath(e.target.value)}
                      placeholder="e.g. server/controllers/certificateController.js"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-5 pl-14 pr-6 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Prompt Area */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Feature Description</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={6}
                    placeholder="Describe the functionality you'd like the AI to generate..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-8 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all shadow-sm resize-none leading-relaxed"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="btn-primary w-full h-16 shadow-blue-500/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      Generating Logic...
                    </>
                  ) : (
                    <>
                      <Play size={20} fill="currentColor" />
                      Generate Enhancement
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex gap-5 shadow-sm">
              <ShieldAlert className="text-amber-500 flex-shrink-0" size={24} />
              <p className="text-[10px] text-amber-700/80 leading-relaxed font-black uppercase tracking-widest">
                AI enhancements are reviewed by our security filters. Destructive operations are restricted.
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
                  className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-white/50 text-center space-y-6"
                >
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 border border-slate-100">
                    <Terminal size={40} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Input</p>
                    <p className="text-[11px] text-slate-300 font-medium max-w-xs mx-auto">Configure your feature request to start building.</p>
                  </div>
                </motion.div>
              ) : isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center space-y-10"
                >
                  <div className="relative">
                    <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full animate-ping" />
                    <div className="h-24 w-24 border-b-2 border-blue-600 rounded-full animate-spin shadow-xl shadow-blue-500/20" />
                  </div>
                  <div className="text-center space-y-3">
                    <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest">AI Agent Analysis</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black animate-pulse">Scanning application context...</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="output"
                  {...diffTransition}
                  className="flex flex-col h-full space-y-8"
                >
                  <div className="flex-1 flex flex-col bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-900/10 h-full">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/40 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Review Changes</span>
                        <div className="h-4 w-px bg-slate-200 mx-2" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{filePath}</span>
                      </div>
                      <div className="px-5 py-2 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-xl border border-blue-100 shadow-sm">
                        Confidence: {(generatedOutput.confidence * 100).toFixed(0)}%
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 font-mono text-sm leading-relaxed">
                      {renderDiff(generatedOutput.patch || 'No changes required.')}
                    </div>

                    <div className="p-10 border-t border-slate-100 space-y-8 bg-slate-50/30">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Implementation Summary</label>
                        <p className="text-[12px] text-slate-600 leading-relaxed font-medium bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                          {generatedOutput.explanation}
                        </p>
                      </div>

                      {generatedOutput.risks?.length > 0 && (
                        <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl flex gap-6 shadow-sm">
                          <AlertTriangle className="text-rose-500 flex-shrink-0" size={24} />
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Risk Assessment</p>
                            <ul className="space-y-2">
                              {generatedOutput.risks.map((risk, i) => (
                                <li key={i} className="text-[11px] text-slate-600 font-bold uppercase tracking-widest flex items-center gap-3">
                                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                  {risk}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={() => setGeneratedOutput(null)}
                          className="flex-1 h-16 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all font-sans"
                        >
                          Discard
                        </button>
                        <button
                          disabled={isApplying || !generatedOutput.patch}
                          onClick={handleApply}
                          className="flex-[2] btn-primary h-16 !shadow-blue-500/20"
                        >
                          {isApplying ? <Loader2 className="animate-spin" size={20} /> : <HardDrive size={20} />}
                          Apply Changes
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
