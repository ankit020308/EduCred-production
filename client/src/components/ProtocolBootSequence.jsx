import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * 🚀 PROFESSIONAL LOADER: MINIMALIST
 * Replaces the technical terminal-style boot sequence with a sleek,
 * enterprise-ready pulsing loader.
 */
export default function ProtocolBootSequence({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsDone(true);
            setTimeout(onComplete, 500);
          }, 400);
          return 100;
        }
        return prev + 1.25;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#F9FAFB] font-sans"
        >
          <div className="relative flex flex-col items-center">
            {/* Minimal Circular Loader */}
            <div className="relative w-24 h-24 mb-10">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="48"
                        cy="48"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        className="text-slate-100"
                    />
                    <motion.circle
                        cx="48"
                        cy="48"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        strokeDasharray="283"
                        strokeDashoffset={283 - (283 * progress) / 100}
                        className="text-[#60A5FA]"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-black text-white/40">{Math.round(progress)}%</span>
                </div>
            </div>

            <div className="text-center space-y-3">
              <h2 className="text-[#2C2F33] text-xs font-black uppercase tracking-[0.5em] animate-pulse">
                EduCred
              </h2>
              <p className="text-[#4B5563] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
                {progress < 40 ? "Securing connection..." : progress < 80 ? "Preparing your dashboard..." : "Finalizing environment..."}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
