import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * 🚀 PROTOCOL BOOT SEQUENCE: HUD LOADER
 * A high-fidelity cinematic loading sequence that displays randomized technical logs
 * and "initializes" the EduCred protocol environment.
 */
export default function ProtocolBootSequence({ onComplete }) {
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const TECHNICAL_LOGS = [
    "INITIALIZING SECURE PROTOCOL...",
    "ESTABLISHING GANACHE_NODE SYNC [PORT:5432]...",
    "FETCHING PUBLIC VERIFIER SCHEMAS...",
    "MOUNTING IPFS GATEWAY v2.4...",
    "GENERATING SHA-256 SALT BUFFERS...",
    "SYNCING AUDIT_LOG REGISTRY...",
    "VALIDATING INSTITUTIONAL WALLETS...",
    "SECURING BINARY HASH PIPELINE...",
    "PROTOCOL INTEGRITY: OPTIMAL",
    "DECRYPTING INTERFACE ASSETS...",
    "READY TO VERIFY."
  ];

  useEffect(() => {
    let currentLog = 0;
    const logInterval = setInterval(() => {
      if (currentLog < TECHNICAL_LOGS.length) {
        setLogs(prev => [...prev, TECHNICAL_LOGS[currentLog]]);
        currentLog++;
        setProgress((currentLog / TECHNICAL_LOGS.length) * 100);
      } else {
        clearInterval(logInterval);
        setTimeout(() => {
          setIsDone(true);
          setTimeout(onComplete, 800); // Wait for AnimatePresence exit
        }, 1000);
      }
    }, 150);

    return () => clearInterval(logInterval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20, filter: "blur(20px)" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black font-mono"
        >
          {/* 📡 Grid Background */}
          <div className="absolute inset-0 opacity-10 mesh-grid" />
          
          <div className="relative w-full max-w-xl px-10">
            {/* 🛰️ EDUCRED MARK */}
            <div className="mb-12 flex flex-col items-center">
              <motion.div 
                animate={{ scale: [1, 1.05, 1], rotate: [0, 1, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-400 text-black shadow-[0_0_50px_rgba(34,211,238,0.4)]"
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                   <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                </svg>
              </motion.div>
              <h1 className="text-2xl font-bold tracking-[0.4em] text-white">EDUCRED</h1>
              <p className="mt-2 text-[10px] uppercase tracking-[0.6em] text-cyan-500/60">Secure Protocol v2.5</p>
            </div>

            {/* 📜 TERMINAL LOGS */}
            <div className="h-48 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl scanline-overlay">
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <motion.p 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-[11px] leading-relaxed ${i === logs.length - 1 ? "text-cyan-400 font-bold" : "text-slate-500"}`}
                  >
                    <span className="mr-3 opacity-30">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                    {log}
                  </motion.p>
                ))}
              </div>
            </div>

            {/* 📊 PROGRESS BAR */}
            <div className="mt-8 flex items-center gap-6">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                <motion.div 
                  className="h-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="w-12 text-right text-[12px] font-bold text-cyan-400">{Math.round(progress)}%</p>
            </div>
          </div>

          <div className="absolute bottom-10 text-[9px] uppercase tracking-[0.4em] text-slate-700">
            Academic trust layer // Secured via Ethereum
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
