import { useEffect, useRef } from "react";

export default function PixelGridBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let animationFrameId;
    let width, height;

    const particles = [];
    let mouse = { x: null, y: null };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    class Pixel {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.speed = 0.5 + Math.random() * 1.5;
        this.size = 2 + Math.random() * 4;
        this.opacity = 0.2 + Math.random() * 0.5;
      }

      update() {
        this.y += this.speed;

        // mouse interaction
        if (mouse.x && mouse.y) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            this.x += dx * 0.02;
            this.y += dy * 0.02;
          }
        }

        if (this.y > height) {
          this.y = -10;
          this.x = Math.random() * width;
        }
      }

      draw() {
        const gradient = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.size * 4
        );

        gradient.addColorStop(0, `rgba(80,120,255,${this.opacity})`);
        gradient.addColorStop(1, "rgba(80,120,255,0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.size, this.size);
      }
    }

    resize();

    for (let i = 0; i < 200; i++) {
      particles.push(new Pixel());
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // depth fade (premium feel)
      const fade = ctx.createLinearGradient(0, 0, 0, height);
      fade.addColorStop(0, "rgba(0,0,0,0.2)");
      fade.addColorStop(1, "rgba(0,0,0,0.85)");

      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,              // ✅ FIXED
        pointerEvents: "none",
      }}
    />
  );
}