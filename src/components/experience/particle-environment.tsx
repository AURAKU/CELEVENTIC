"use client";

import { useEffect, useRef } from "react";
import type { EnvironmentPresetId, EnvironmentIntensity } from "@/lib/experience/experience-types";
import { getEnvironmentPreset, resolveEnvironmentDensity } from "@/lib/experience/environment-presets";

interface ParticleEnvironmentProps {
  presetId: EnvironmentPresetId;
  intensity?: EnvironmentIntensity;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  char?: string;
  kind: string;
}

const ADINKRA = ["✦", "◆", "❋", "✿", "◎", "❖"];

export function ParticleEnvironment({ presetId, intensity = "medium", className }: ParticleEnvironmentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preset = getEnvironmentPreset(presetId);
  const effectiveDensity = resolveEnvironmentDensity(preset.density, intensity);

  useEffect(() => {
    if (!effectiveDensity) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const kind = preset.particles;
    const symbols =
      kind === "symbols" ? ADINKRA
      : kind === "hearts" ? ["♥", "❤"]
      : kind === "butterflies" ? ["🦋"]
      : [];

    const particles: Particle[] = Array.from({ length: effectiveDensity }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * preset.speed * 2,
      vy: (Math.random() * 0.5 + 0.2) * preset.speed,
      size: Math.random() * 6 + 4,
      color: preset.colors[Math.floor(Math.random() * preset.colors.length)] ?? "#fff",
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.02,
      char: symbols.length ? symbols[Math.floor(Math.random() * symbols.length)] : undefined,
      kind,
    }));

    let frame: number;
    const g = ctx;

    function drawParticle(p: Particle) {
      if (p.char && (p.kind === "symbols" || p.kind === "hearts" || p.kind === "butterflies")) {
        g.font = `${p.size * (p.kind === "butterflies" ? 2.2 : 2)}px serif`;
        g.fillStyle = p.color;
        g.fillText(p.char, -p.size, p.size);
        return;
      }
      if (p.kind === "snow" || p.kind === "fireflies" || p.kind === "stars") {
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        g.fill();
        return;
      }
      if (p.kind === "confetti") {
        g.fillStyle = p.color;
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        return;
      }
      g.fillStyle = p.color;
      g.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
    }

    function draw() {
      g.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h + 20) { p.y = -10; p.x = Math.random() * w; }
        if (p.x < -20) p.x = w + 10;
        if (p.x > w + 20) p.x = -10;

        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.globalAlpha = p.kind === "fireflies" ? 0.75 : 0.55;
        drawParticle(p);
        g.restore();
      }
      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);

    function resize() {
      const c = canvasRef.current;
      if (!c) return;
      w = window.innerWidth;
      h = window.innerHeight;
      c.width = w;
      c.height = h;
    }
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [preset, presetId, effectiveDensity]);

  if (!effectiveDensity) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-[1] ${className ?? ""}`}
      aria-hidden
    />
  );
}
