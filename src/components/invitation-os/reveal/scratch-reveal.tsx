"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { CELEVENTIC_BRAND } from "@/lib/invitation-os/brand";
import { RevealConfetti } from "@/components/invitation-os/reveal/reveal-confetti";

interface ScratchRevealProps {
  guestName?: string;
  eventTitle: string;
  onComplete: () => void;
}

const BRUSH = 42;

export function ScratchReveal({ guestName, eventTitle, onComplete }: ScratchRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const drawing = useRef(false);

  const checkReveal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let cleared = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) cleared++;
    }
    const ratio = cleared / (width * height);
    if (ratio > 0.42) {
      setRevealed(true);
      onComplete();
    }
  }, [onComplete, revealed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#C9A227");
    grad.addColorStop(0.5, "#E8D5A3");
    grad.addColorStop(1, "#8B7355");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    for (let i = 0; i < 80; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }

    ctx.globalCompositeOperation = "destination-out";
  }, []);

  function scratch(x: number, y: number) {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(x, y, BRUSH, 0, Math.PI * 2);
    ctx.fill();
    checkReveal();
  }

  function pointerPos(e: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: CELEVENTIC_BRAND.palette.midnight }}
    >
      <RevealConfetti active={revealed} />
      <div className="absolute inset-0 flex items-center justify-center p-8 text-center pointer-events-none">
        <div className="max-w-sm space-y-4 animate-pulse">
          <Sparkles className="h-10 w-10 mx-auto text-[#D4A63A]" />
          {guestName && <p className="text-white/70 text-sm tracking-widest uppercase">For {guestName}</p>}
          <h2 className="font-display text-2xl text-[#D4A63A]">{eventTitle}</h2>
          <p className="text-white/50 text-sm">Scratch the gold foil to reveal your invitation</p>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none cursor-crosshair"
        style={{ opacity: revealed ? 0 : 1, transition: "opacity 0.8s" }}
        onPointerDown={(e) => {
          drawing.current = true;
          const { x, y } = pointerPos(e);
          scratch(x, y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const { x, y } = pointerPos(e);
          scratch(x, y);
        }}
        onPointerUp={() => { drawing.current = false; }}
        onPointerLeave={() => { drawing.current = false; }}
      />
    </div>
  );
}
