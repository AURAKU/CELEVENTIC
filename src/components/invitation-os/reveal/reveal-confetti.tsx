"use client";

import { useEffect, useRef } from "react";

interface RevealConfettiProps {
  active: boolean;
  durationMs?: number;
}

const COLORS = ["#D4A63A", "#0B8A83", "#F5E6B8", "#ffffff", "#fda4af", "#7dd3fc"];

export function RevealConfetti({ active, durationMs = 2200 }: RevealConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = ctx;

    const w = canvas.width;
    const h = canvas.height;

    const particles = Array.from({ length: 72 }, () => ({
      x: w / 2,
      y: h / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.8) * 12,
      size: Math.random() * 6 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      life: 1,
    }));

    let frame: number;
    const start = performance.now();

    function draw() {
      g.clearRect(0, 0, w, h);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.vx *= 0.99;
        p.rot += p.vr;
        p.life -= 0.012;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.globalAlpha = Math.max(0, p.life);
        g.fillStyle = p.color;
        g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        g.restore();
      }
      if (alive && performance.now() - start < durationMs) {
        frame = requestAnimationFrame(draw);
      } else {
        g.clearRect(0, 0, w, h);
      }
    }

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, durationMs]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[110] pointer-events-none"
      aria-hidden
    />
  );
}
