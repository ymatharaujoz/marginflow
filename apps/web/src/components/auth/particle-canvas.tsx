"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
}

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const ACCENT = "14, 122, 111"; // teal rgb
    const DARK = "45, 55, 52";     // darker gray for light background

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx!.scale(dpr, dpr);
    }

    function createParticles(width: number, height: number) {
      const count = Math.floor((width * height) / 14000);
      const arr: Particle[] = [];
      for (let i = 0; i < count; i++) {
        arr.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 2.8 + 0.8,
          opacity: Math.random() * 0.5 + 0.5,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.025 + 0.008,
        });
      }
      return arr;
    }

    function draw() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Wrap around
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));
        const color = Math.random() > 0.65 ? ACCENT : DARK;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${currentOpacity})`;
        ctx.fill();
      }

      // Draw connections
      const maxDist = 150;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.2;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${ACCENT}, ${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    }

    resize();
    const rect = canvas.getBoundingClientRect();
    particles = createParticles(rect.width, rect.height);
    draw();

    const handleResize = () => {
      resize();
      const r = canvas.getBoundingClientRect();
      particles = createParticles(r.width, r.height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: 1 }}
    />
  );
}
