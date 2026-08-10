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
  const label = motionKey.replace(/-/g, " ");
  return (
    <div className="relative h-28 w-28 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm flex items-center justify-center">
      <motion.div
        className="absolute inset-3 rounded-full border border-gold-400/50"
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
      <span className="relative text-sm font-semibold uppercase tracking-wide text-center px-2">{label}</span>
    </div>
  );
}
