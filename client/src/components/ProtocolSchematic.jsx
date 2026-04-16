import { motion } from "framer-motion";
import { ShieldCheck, Database, LayoutDashboard, Globe } from "lucide-react";

/**
 * 🗺️ PROTOCOL SCHEMATIC: INTERACTIVE SVG VISUALIZATION
 * Animates data packets flowing from Issuer to Verifier
 * using animated SVG paths and Framer Motion.
 */
export default function ProtocolSchematic() {
  return (
    <div className="relative h-[480px] w-full rounded-[3rem] border border-white/10 bg-[#030303]/60 p-12 backdrop-blur-3xl scanline-overlay overflow-hidden">
      <div className="absolute inset-0 opacity-20 mesh-grid" />
      
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 400">
        {/* 🛣️ DATA PATHS */}
        <motion.path
          d="M150 200 L300 100 L500 100 L650 200"
          className="path-flow text-cyan-400"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M150 200 L300 300 L500 300 L650 200"
          className="path-flow text-indigo-400"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1 }}
        />

        {/* 🛰️ NODES */}
        {/* ISSUER */}
        <g transform="translate(80, 160)">
          <motion.rect 
            width="140" height="80" rx="20" 
            className="fill-black stroke-white/20"
            whileHover={{ scale: 1.05, stroke: "rgba(34, 211, 238, 0.5)" }}
          />
          <foreignObject x="0" y="0" width="140" height="80">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <LayoutDashboard size={20} className="text-cyan-400" />
              <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-white">Issuer</p>
            </div>
          </foreignObject>
        </g>

        {/* IPFS / STORAGE */}
        <g transform="translate(330, 60)">
          <motion.rect 
            width="140" height="80" rx="20" 
            className="fill-black stroke-white/20 shadow-2xl"
            whileHover={{ scale: 1.05, stroke: "rgba(34, 211, 238, 0.5)" }}
          />
          <foreignObject x="0" y="0" width="140" height="80">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Database size={20} className="text-cyan-400" />
              <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-white">IPFS Storage</p>
            </div>
          </foreignObject>
        </g>

        {/* BLOCKCHAIN */}
        <g transform="translate(330, 260)">
          <motion.rect 
            width="140" height="80" rx="20" 
            className="fill-black stroke-indigo-500/30"
            whileHover={{ scale: 1.05, stroke: "rgba(99, 102, 241, 0.5)" }}
          />
          <foreignObject x="0" y="0" width="140" height="80">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShieldCheck size={20} className="text-indigo-400" />
              <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-white">Chain Anchor</p>
            </div>
          </foreignObject>
        </g>

        {/* VERIFIER */}
        <g transform="translate(580, 160)">
          <motion.rect 
            width="140" height="80" rx="20" 
            className="fill-black stroke-white/20"
            whileHover={{ scale: 1.05, stroke: "rgba(34, 211, 238, 0.5)" }}
          />
          <foreignObject x="0" y="0" width="140" height="80">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Globe size={20} className="text-cyan-400" />
              <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-white">Public Verifier</p>
            </div>
          </foreignObject>
        </g>
      </svg>

      {/* 🔮 STATS OVERLAY */}
      <div className="absolute bottom-10 left-10 right-10 flex justify-between gap-6">
        <div className="flex-1 rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">Hash Integrity</p>
          <p className="mt-1 text-xs font-mono text-cyan-400">SHA-256: OPTIMAL</p>
        </div>
        <div className="flex-1 rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">Chain Status</p>
          <p className="mt-1 text-xs font-mono text-indigo-400">ANCHORED: 0x2A...4F</p>
        </div>
      </div>
    </div>
  );
}
