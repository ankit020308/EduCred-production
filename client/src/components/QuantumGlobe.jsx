import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShieldCheck, Cpu, Loader2, AlertCircle } from 'lucide-react';

import universityDataset from '../data/core_universities.json';

// ─────────────────────────────────────────────────────────────
// 📐 SPHERICAL COORDINATE MATH
// lat/lng → 3D point on a sphere of given radius
// ─────────────────────────────────────────────────────────────
function latLngToVec3(lat, lng, radius) {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ─────────────────────────────────────────────────────────────
// 🌍 EARTH GLOBE (Textured)
// ─────────────────────────────────────────────────────────────
function EarthSphere() {
  const dayMap = useTexture('/textures/earth_day.jpg');

  return (
    <mesh>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial
        map={dayMap}
        roughness={0.6}
        metalness={0.05}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
// 🔵 ATMOSPHERE GLOW (additive blended outer shell)
// ─────────────────────────────────────────────────────────────
function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[2.18, 64, 64]} />
      <meshStandardMaterial
        color="#1a66ff"
        transparent
        opacity={0.07}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
// 📍 INSTANCED DATA SPIKES
// One draw call, N spikes pointing outward from the globe surface
// ─────────────────────────────────────────────────────────────
function InstancedSpikes({ activeUni, onPinClick }) {
  const meshRef = useRef();
  const GLOBE_R = 2.0;
  const count   = universityDataset.length;
  const dummy   = useMemo(() => new THREE.Object3D(), []);

  // Pre-compute each spike's surface position + outward quaternion
  const spikeData = useMemo(() =>
    universityDataset.map(uni => {
      const surfacePos = latLngToVec3(uni.lat, uni.lng, GLOBE_R);
      // The "up" direction for a spike is the outward normal = surfacePos normalised
      const outward = surfacePos.clone().normalize();
      // Cylinder default axis is +Y; we want it to point along outward normal
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        outward
      );
      return { surfacePos, outward, quaternion, id: uni.id, uni };
    }), []);

  useFrame(state => {
    if (!meshRef.current) return;
    spikeData.forEach((d, i) => {
      const isActive  = activeUni?.id === d.id;
      const height    = isActive ? 0.22 : 0.09;
      const pulse     = isActive ? 1 + Math.sin(state.clock.elapsedTime * 8) * 0.12 : 1;

      // Place spike base on surface, shift half-height along outward normal so it points out
      dummy.position.copy(d.surfacePos).addScaledVector(d.outward, height * 0.5);
      dummy.quaternion.copy(d.quaternion);
      dummy.scale.set(pulse, height, pulse);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      meshRef.current.setColorAt(i, isActive
        ? new THREE.Color('#ffffff')
        : new THREE.Color('#3b82f6'));
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, count]}
      onClick={e => {
        e.stopPropagation();
        if (e.instanceId !== undefined) onPinClick(universityDataset[e.instanceId]);
      }}
    >
      <cylinderGeometry args={[0.005, 0.014, 1, 6]} />
      <meshStandardMaterial
        color="#3b82f6"
        emissive="#1e40af"
        emissiveIntensity={1.2}
        metalness={0.8}
        roughness={0.1}
      />
    </instancedMesh>
  );
}

// ─────────────────────────────────────────────────────────────
// 🌐 WIREFRAME GRID OVERLAY (lat/lng lines for sci-fi look)
// ─────────────────────────────────────────────────────────────
function GlobeWireframe() {
  return (
    <mesh>
      <sphereGeometry args={[2.01, 36, 18]} />
      <meshBasicMaterial
        color="#1d4ed8"
        wireframe
        transparent
        opacity={0.08}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
// 🎥 CAMERA CONTROLLER
// ─────────────────────────────────────────────────────────────
function SurveillanceCamera({ activeUni }) {
  const { camera, controls } = useThree();
  const camTarget  = useRef(new THREE.Vector3(0, 0, 7));
  const ctrlTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    const step = Math.min(delta * 3.5, 0.1);
    if (activeUni) {
      const p = latLngToVec3(activeUni.lat, activeUni.lng, 2);
      camTarget.current.copy(p).normalize().multiplyScalar(3.8);
    } else {
      camTarget.current.set(0, 0, 7);
    }
    camera.position.lerp(camTarget.current, step);
    if (controls) {
      controls.target.lerp(ctrlTarget.current, step * 0.6);
      controls.update();
    }
  });
  return null;
}

// ─────────────────────────────────────────────────────────────
// 🌍 MAIN GLOBE GROUP
// ─────────────────────────────────────────────────────────────
function MainnetGlobe({ activeUni, onPinClick }) {
  const groupRef = useRef();

  useFrame((_, delta) => {
    if (!activeUni && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <EarthSphere />
      <GlobeWireframe />
      <Atmosphere />
      <InstancedSpikes activeUni={activeUni} onPinClick={onPinClick} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// 🏗️ MAIN EXPORT
// ─────────────────────────────────────────────────────────────
export default function QuantumGlobe() {
  const navigate = useNavigate();
  const [searchQuery,   setSearchQuery]   = useState('');
  const [activeNode,    setActiveNode]    = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [webGLError,    setWebGLError]    = useState(false);
  const [canvasKey,     setCanvasKey]     = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setIsInitializing(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const handleNodeLock = val => {
    setSearchQuery(val);
    if (val.length > 2) {
      setSearchResults(
        universityDataset
          .filter(u =>
            u.name.toLowerCase().includes(val.toLowerCase()) ||
            u.country.toLowerCase().includes(val.toLowerCase())
          )
          .slice(0, 5)
      );
    } else {
      setSearchResults([]);
    }
  };

  const engageHandshake = node => {
    setActiveNode(node);
    setSearchQuery('');
    setSearchResults([]);
  };

  const abortLock = () => {
    setActiveNode(null);
    setSearchResults([]);
  };

  const handleContextLost = e => {
    e.preventDefault();
    setWebGLError(true);
  };

  if (webGLError) {
    return (
      <div className="w-full h-full bg-[#050505] flex flex-col items-center justify-center gap-6 p-12 text-center">
        <AlertCircle className="text-rose-500 animate-pulse" size={48} />
        <h3 className="text-white font-black uppercase tracking-[0.3em]">WebGL Context Lost</h3>
        <button
          onClick={() => { setWebGLError(false); setCanvasKey(k => k + 1); }}
          className="px-8 py-3 bg-white text-black text-[9px] font-black uppercase tracking-[0.2em] rounded-xl"
        >
          Recover Session
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#000000] overflow-hidden flex items-center justify-center font-sans">

      {/* ── HUD SEARCH BAR ── */}
      <div className="absolute top-12 z-20 w-full max-w-2xl px-8 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#050505]/70 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl flex items-center gap-5 focus-within:border-blue-500/50 pointer-events-auto"
        >
          <Search className="text-slate-600 shrink-0" size={20} />
          <input
            type="text"
            placeholder={isInitializing ? 'INITIALIZING MAINNET...' : 'LOCATE GLOBAL INSTITUTION...'}
            value={searchQuery}
            onChange={e => handleNodeLock(e.target.value)}
            className="bg-transparent border-none outline-none text-white text-[11px] font-black tracking-[0.3em] w-full uppercase placeholder:text-slate-700"
            disabled={isInitializing}
          />
          {activeNode && (
            <button
              onClick={abortLock}
              className="px-5 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[9px] font-black tracking-[0.2em] text-rose-500 hover:bg-rose-500/20 transition-all shrink-0"
            >
              ABORT_LOCK
            </button>
          )}
        </motion.div>

        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 bg-[#0A0A0A]/99 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 pointer-events-auto"
            >
              {searchResults.map(node => (
                <button
                  key={node.id}
                  onClick={() => engageHandshake(node)}
                  className="w-full text-left px-8 py-5 hover:bg-white/[0.03] rounded-xl transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-2 h-2 rounded-full bg-blue-500/50 group-hover:bg-blue-400 transition-colors" />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-slate-500 group-hover:text-white uppercase transition-colors">{node.name}</span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-700 uppercase tracking-tighter">{node.country}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── ACTIVE NODE TELEMETRY CARD ── */}
      <AnimatePresence>
        {activeNode && (
          <motion.div
            initial={{ opacity: 0, x: 60, filter: 'blur(15px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: 60, filter: 'blur(15px)' }}
            className="absolute right-12 top-1/2 -translate-y-1/2 z-20 w-[420px] bg-[#080808]/80 backdrop-blur-3xl p-12 rounded-[2.5rem] border border-white/[0.05]"
          >
            <div className="space-y-8">
              <div className="flex items-center gap-4 text-blue-400 bg-blue-400/10 w-fit px-5 py-2.5 rounded-xl border border-blue-400/20">
                <Cpu size={16} className="animate-spin-slow" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Node Established</span>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold text-white tracking-tighter leading-none uppercase">{activeNode.name}</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Verified · {activeNode.country}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-5 py-8 border-y border-white/[0.05]">
                <div>
                  <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Latitude</span>
                  <p className="text-sm font-mono text-blue-300">{activeNode.lat.toFixed(4)}</p>
                </div>
                <div>
                  <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Longitude</span>
                  <p className="text-sm font-mono text-blue-300">{activeNode.lng.toFixed(4)}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/verify')}
                className="w-full py-5 flex items-center justify-center gap-3 rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-[0.25em] hover:bg-slate-200 transition-all"
              >
                <ShieldCheck size={18} /> Initialize Handshake
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HUD STATUS BADGES ── */}
      <div className="absolute bottom-10 left-12 z-20 flex items-center gap-3">
        <div className="bg-[#050505]/80 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
          <span className="text-emerald-400">●</span> EARTH ORBIT SYNC
        </div>
        <div className="bg-[#050505]/80 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.25em] text-blue-400">
          {universityDataset.length} NODES ACTIVE
        </div>
      </div>

      {/* ── THREE.JS CANVAS ── */}
      <div className="absolute inset-0 z-0">
        <Canvas
          key={canvasKey}
          camera={{ position: [0, 1.5, 6.5], fov: 45 }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false,
            stencil: false,
          }}
          dpr={[1, Math.min(window.devicePixelRatio, 2)]}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
          }}
        >
          <color attach="background" args={['#000000']} />

          {/* Lighting - strong enough to reveal Earth texture from all angles */}
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 3, 5]} intensity={3.0} color="#ffffff" />
          <directionalLight position={[-5, 2, -5]} intensity={0.8} color="#b3d4ff" />
          <directionalLight position={[0, -5, 0]} intensity={0.4} color="#ffffff" />

          <Suspense fallback={null}>
            <MainnetGlobe activeUni={activeNode} onPinClick={engageHandshake} />
            <SurveillanceCamera activeUni={activeNode} />
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              minPolarAngle={Math.PI * 0.25}
              maxPolarAngle={Math.PI * 0.75}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* ── INIT OVERLAY ── */}
      <AnimatePresence>
        {isInitializing && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="text-blue-500 animate-spin" size={32} />
              <span className="text-[10px] font-black text-white tracking-[0.5em] uppercase">Bridging Network</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}