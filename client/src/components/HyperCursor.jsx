import { useEffect, useRef, useState } from "react";
import { motion, useSpring } from "framer-motion";

/**
 * 🛰️ HYPER-CURSOR: REACTIVE SPOTLIGHT SYSTEM
 * Implements a multi-layered custom cursor with trailing springs
 * and a depth-aware spotlight effect.
 */
export default function HyperCursor() {
  const cursorDotRef = useRef(null);
  const cursorRingRef = useRef(null);
  const spotlightRef = useRef(null);
  
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  // Smooth springs for the trailing ring
  const ringX = useSpring(0, { damping: 25, stiffness: 200 });
  const ringY = useSpring(0, { damping: 25, stiffness: 200 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      
      // Update instances directly for performance (0-latency dot)
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate(${clientX - 4}px, ${clientY - 4}px)`;
      }
      
      if (spotlightRef.current) {
        spotlightRef.current.style.left = `${clientX}px`;
        spotlightRef.current.style.top = `${clientY}px`;
      }

      // Update springs for the trailing ring
      ringX.set(clientX - 20);
      ringY.set(clientY - 20);

      // Detect interactive elements
      const target = e.target;
      const isInteractive = target.closest('button, a, input, [role="button"]');
      setIsHovering(!!isInteractive);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [ringX, ringY]);

  return (
    <>
      {/* 🔴 Fixed Dot (Central Focus) */}
      <div 
        ref={cursorDotRef} 
        className="cursor-dot hidden md:block" 
      />

      {/* 🔵 Trailing Ring (Spring Physics) */}
      <motion.div
        className="cursor-ring hidden md:block"
        style={{
          x: ringX,
          y: ringY,
          scale: isClicking ? 0.8 : (isHovering ? 1.5 : 1),
          borderColor: isHovering ? "rgba(34, 211, 238, 1)" : "rgba(34, 211, 238, 0.3)",
          backgroundColor: isHovering ? "rgba(34, 211, 238, 0.05)" : "transparent"
        }}
      />

      {/* 🔦 Depth Spotlight (Reveals background detail) */}
      <div 
        ref={spotlightRef} 
        className="cursor-spotlight hidden md:block" 
      />

      <style>{`
        body * {
          cursor: none !important;
        }
        @media (max-width: 768px) {
          body * {
            cursor: auto !important;
          }
        }
      `}</style>
    </>
  );
}
