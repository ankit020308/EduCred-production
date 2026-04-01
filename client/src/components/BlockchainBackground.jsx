import { useEffect, useRef } from "react";

export default function BlockchainBackground({ isSurging = false }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const surgeRef = useRef(0); // For smooth ramping of the surge effect

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let width, height;

    const particles = [];
    const particleCount = 80; // Optimized density for spatial depth
    const connectionRadius = 180;
    
    // Neural Link parameters
    const mouseRadius = 250;
    const mousePull = 0.08;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    resize();

    class Node {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.size = 0.8 + Math.random() * 1.5;
        this.glow = 0.1 + Math.random() * 0.3;
      }

      update(surge) {
        // Speed multiplier during surge (Exponential Ramp)
        const speedMult = 1 + Math.pow(surge, 2) * 12;
        this.x += this.vx * speedMult;
        this.y += this.vy * speedMult;

        // Wrapped Boundaries
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Mouse interaction (Neural-Link Gravitation)
        const dx = mouseRef.current.x - this.x;
        const dy = mouseRef.current.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouseRadius) {
          const force = (1 - distance / mouseRadius) * mousePull * (1 + surge * 3);
          this.x += dx * force;
          this.y += dy * force;
        }
      }

      draw(surge) {
        const opacity = this.glow + surge * 0.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * (1 + surge * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(138, 43, 226, ${opacity})`;
        ctx.fill();
        
        // Dynamic Glow on nodes during surge
        if (surge > 0.1) {
          ctx.shadowBlur = 20 * surge;
          ctx.shadowColor = `rgba(138, 43, 226, ${surge * 0.6})`;
        } else {
          ctx.shadowBlur = 0;
        }
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Node());
    }

    const animate = () => {
      // Smoothly transition the surge value (Damped spring effect)
      const targetSurge = isSurging ? 1 : 0;
      surgeRef.current += (targetSurge - surgeRef.current) * 0.05;
      const surge = surgeRef.current;

      ctx.clearRect(0, 0, width, height);

      // Deep Space Fade (Trail effect)
      ctx.fillStyle = "rgba(1, 4, 9, 0.18)";
      ctx.fillRect(0, 0, width, height);

      const dynamicRadius = connectionRadius * (1 + surge * 0.6);

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update(surge);
        p1.draw(surge);

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < dynamicRadius) {
            const opacity = (1 - distance / dynamicRadius) * (0.2 + surge * 0.4);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            
            // Dynamic color shift to white/purple neon during surge
            ctx.strokeStyle = surge > 0.8 
              ? `rgba(199, 162, 255, ${opacity})` 
              : `rgba(138, 43, 226, ${opacity})`;
            
            ctx.lineWidth = 0.5 + surge * 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isSurging]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
}
