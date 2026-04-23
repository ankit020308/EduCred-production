import { useEffect, useRef } from "react";

/**
 * 🛰️ BLOCKCHAIN BACKGROUND: SAPPHIRE SPEC v2.4
 * Implements a high-fidelity, interactive neural-network visualization
 * optimized for sub-pixel rendering and chromatic surge effects.
 */
export default function BlockchainBackground({ isSurging = false }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -2000, y: -2000 });
  const surgeRef = useRef(0); // For smooth ramping of the warp effect

  // Configuration Matrices
  const CONFIG = {
    node: {
      count: 40,
      baseSize: 0.8,
      baseSpeed: 0.25,
      color: "rgba(34, 211, 238, ", // Hyper-Cyan
      surgeColor: "rgba(99, 102, 241, ", // Electric Indigo
    },
    links: {
      radius: 180,
      baseWidth: 0.5,
      surgeWidth: 1.5,
      color: "rgba(34, 211, 238, ",
    },
    interaction: {
      radius: 350,
      gravity: 0.12,
      friction: 0.95
    }
  };

  const isSurgingRef = useRef(isSurging);

  // Sync ref with prop
  useEffect(() => {
    isSurgingRef.current = isSurging;
  }, [isSurging]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    let animationFrameId;
    let width, height;
    let nodes = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initializeNodes();
    };

    const drawGrid = (surge) => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.02 + surge * 0.04})`;
      ctx.lineWidth = 0.5;
      const step = 60;

      for (let x = 0; x < width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    };

    class QuantumNode {
      constructor() {
        this.init();
      }

      init() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * CONFIG.node.baseSpeed;
        this.vy = (Math.random() - 0.5) * CONFIG.node.baseSpeed;
        this.size = CONFIG.node.baseSize + Math.random() * 1.8;
        this.baseGlow = 0.15 + Math.random() * 0.35;
        this.pulsePhase = Math.random() * Math.PI * 2;
      }

      update(surge) {
        const warpSpeed = 1 + Math.pow(surge, 3) * 15;
        this.x += this.vx * warpSpeed;
        this.y += this.vy * warpSpeed;

        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        const dx = mouseRef.current.x - this.x;
        const dy = mouseRef.current.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < CONFIG.interaction.radius) {
          const force = (1 - distance / CONFIG.interaction.radius) * CONFIG.interaction.gravity * (1 + surge * 4);
          this.x += dx * force;
          this.y += dy * force;
        }

        this.pulsePhase += 0.02 + (surge * 0.08);
      }

      draw(surge) {
        const pulse = Math.sin(this.pulsePhase) * 0.15;
        const opacity = Math.min(1, this.baseGlow + pulse + surge * 0.6);
        const colorBase = surge > 0.8 ? CONFIG.node.surgeColor : CONFIG.node.color;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * (1 + surge * 0.75), 0, Math.PI * 2);
        ctx.fillStyle = `${colorBase}${opacity})`;
        ctx.fill();

        if (surge > 0.1) {
          ctx.shadowBlur = 4 * surge; // Performance optimization
          ctx.shadowColor = `${CONFIG.node.color}${surge * 0.8})`;
        } else {
          ctx.shadowBlur = 0;
        }
      }
    }

    let connectionPairs = [];

    const buildConnectionPairs = () => {
      connectionPairs = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < CONFIG.links.radius * 1.65) {
            connectionPairs.push([i, j]);
          }
        }
      }
    };

    const initializeNodes = () => {
      nodes = [];
      for (let i = 0; i < CONFIG.node.count; i++) {
        nodes.push(new QuantumNode());
      }
      buildConnectionPairs();
    };

    const drawConnections = (surge) => {
      const connectionRadius = CONFIG.links.radius * (1 + surge * 0.65);
      for (let k = 0; k < connectionPairs.length; k++) {
        const p1 = nodes[connectionPairs[k][0]];
        const p2 = nodes[connectionPairs[k][1]];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < connectionRadius) {
          const proximityFactor = 1 - (distance / connectionRadius);
          const baseOpacity = proximityFactor * (0.22 + surge * 0.45);
          const lineWidth = (CONFIG.links.baseWidth + (proximityFactor * 0.6)) * (1 + surge * 1.5);
          ctx.lineWidth = lineWidth;

          ctx.beginPath();
          ctx.strokeStyle = `${CONFIG.links.color}${baseOpacity})`;
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          if (surge > 0.4) {
            const surgeOpacity = (surge - 0.4) * proximityFactor;
            ctx.beginPath();
            const offset = (surge - 0.4) * 2.5;
            ctx.strokeStyle = `rgba(255, 255, 255, ${surgeOpacity * 0.6})`;
            ctx.moveTo(p1.x + offset, p1.y + offset);
            ctx.lineTo(p2.x + offset, p2.y + offset);
            ctx.shadowBlur = 2 * surge;
            ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      }
    };

    const drawShimmer = (surge) => {
      if (Math.random() > 0.96) {
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        ctx.beginPath();
        ctx.arc(randomNode.x, randomNode.y, randomNode.size * 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + surge * 0.4})`;
        ctx.fill();
      }
    };

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      const targetSurge = isSurgingRef.current ? 1 : 0;
      surgeRef.current += (targetSurge - surgeRef.current) * 0.08;
      const surge = surgeRef.current;

      ctx.fillStyle = `rgba(0, 0, 0, ${0.15 + surge * 0.1})`;
      ctx.fillRect(0, 0, width, height);

      drawGrid(surge);
      nodes.forEach(node => {
        node.update(surge);
        node.draw(surge);
      });

      drawConnections(surge);
      drawShimmer(surge);

      // 🎭 Vignette Overlay
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.8);
      grad.addColorStop(0, "rgba(0, 0, 0, 0)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0.6)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    resize();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);


  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[-1] pointer-events-none" // Ensure it's behind everything
      style={{ background: "#000000", opacity: 0.6 }} // Reduced opacity for better compositing
    />
  );
}