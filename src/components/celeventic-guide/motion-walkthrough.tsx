"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";
import type { GuideStoryboard } from "@/lib/celeventic-guide/storyboards";

export function MotionWalkthrough({
  storyboard,
  slug,
  className,
}: {
  storyboard: GuideStoryboard;
  slug: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const beat = storyboard.beats[index];
  const total = storyboard.beats.length;

  useEffect(() => {
    if (!playing || reduce || !beat) return;
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % total);
    }, beat.durationMs);
    return () => clearTimeout(t);
  }, [playing, reduce, beat, total, index]);

  if (!beat) return null;

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white/80 overflow-hidden", className)}>
      <div className="relative aspect-[9/16] max-h-[420px] bg-gradient-to-br from-brand-900 via-brand-700 to-slate-900 text-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={beat.id}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: reduce ? 0 : 0.45 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
          >
            <MotionGlyph motionKey={beat.motionKey} />
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-brand-100/90">{beat.title}</p>
            <h3 className="mt-3 font-display text-2xl sm:text-3xl font-semibold">{beat.captionEn}</h3>
            <p className="mt-3 text-sm text-white/75 max-w-xs leading-relaxed">{beat.narration}</p>
          </motion.div>
        </AnimatePresence>
        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/15">
          <div
            className="h-full bg-gold-400 transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 p-3 border-t border-slate-100">
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Previous step"
            onClick={() => setIndex((i) => (i - 1 + total) % total)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Next step"
            onClick={() => setIndex((i) => (i + 1) % total)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Replay"
            onClick={() => {
              setIndex(0);
              setPlaying(true);
              trackGuideEvent("guide_motion_replay", { slug });
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500" aria-live="polite">
          {index + 1} / {total}
        </p>
      </div>
    </div>
  );
}

function MotionGlyph({ motionKey }: { motionKey: string }) {
  const key = motionKey.toLowerCase();
  const reduce = useReducedMotion();
  const kind =
    key.includes("qr") || key.includes("admit") || key.includes("scan")
      ? "qr"
      : key.includes("remember") || key.includes("memory") || key.includes("photo")
        ? "memory"
        : key.includes("phone") ||
            key.includes("invite") ||
            key.includes("rsvp") ||
            key.includes("open") ||
            key.includes("celebrate")
          ? "phone"
          : key.includes("seat") || key.includes("table") || key.includes("guide")
            ? "guide"
            : "pulse";

  return (
    <div className="relative h-36 w-36 flex items-center justify-center" aria-hidden>
      {kind === "phone" && (
        <motion.div
          className="relative h-32 w-20 rounded-[1.25rem] border-2 border-white/70 bg-slate-950/80 shadow-xl overflow-hidden"
          initial={reduce ? false : { y: 10, opacity: 0.7 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.5 }}
        >
          <div className="absolute top-2 inset-x-6 h-1 rounded-full bg-white/30" />
          <motion.div
            className="absolute inset-x-3 top-6 bottom-4 rounded-lg bg-gradient-to-br from-brand-400/40 to-gold-400/30"
            animate={reduce ? undefined : { opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
        </motion.div>
      )}
      {kind === "qr" && (
        <motion.div
          className="relative h-28 w-28 rounded-2xl border border-white/40 bg-white p-3 shadow-lg"
          animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          <svg viewBox="0 0 40 40" className="h-full w-full text-slate-900">
            <rect x="2" y="2" width="12" height="12" fill="currentColor" />
            <rect x="26" y="2" width="12" height="12" fill="currentColor" />
            <rect x="2" y="26" width="12" height="12" fill="currentColor" />
            <rect x="18" y="18" width="4" height="4" fill="currentColor" />
            <rect x="24" y="18" width="4" height="4" fill="currentColor" />
            <rect x="18" y="24" width="4" height="4" fill="currentColor" />
            <rect x="30" y="24" width="6" height="6" fill="currentColor" />
            <rect x="24" y="30" width="4" height="4" fill="currentColor" />
          </svg>
          <motion.div
            className="absolute inset-x-2 h-0.5 bg-brand-500/80"
            animate={reduce ? undefined : { top: ["20%", "80%", "20%"] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
      {kind === "guide" && (
        <motion.div
          className="relative h-28 w-40 rounded-2xl border border-white/35 bg-white/10 backdrop-blur-sm p-3"
          animate={reduce ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 2.6, repeat: Infinity }}
        >
          <div className="h-2 w-16 rounded bg-gold-300/80 mb-3" />
          <div className="space-y-2">
            <div className="h-1.5 w-full rounded bg-white/35" />
            <div className="h-1.5 w-4/5 rounded bg-white/25" />
            <div className="h-1.5 w-3/5 rounded bg-white/20" />
          </div>
        </motion.div>
      )}
      {kind === "memory" && (
        <div className="relative flex h-28 w-40 items-end justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="rounded-lg border border-white/30 bg-gradient-to-br from-white/25 to-white/5"
              style={{ width: 36 + i * 4, height: 48 + i * 8 }}
              animate={reduce ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
      )}
      {kind === "pulse" && (
        <div className="relative h-28 w-28 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm flex items-center justify-center">
          {!reduce && (
            <motion.div
              className="absolute inset-3 rounded-full border border-gold-400/50"
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />
          )}
          <span className="relative text-sm font-semibold uppercase tracking-wide text-center px-2">
            {motionKey.replace(/-/g, " ")}
          </span>
        </div>
      )}
    </div>
  );
}
