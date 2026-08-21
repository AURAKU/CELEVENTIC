"use client";

import { useEffect, useId, useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getMiniTour } from "@/lib/celeventic-guide/tours";
import {
  clearTourCompletion,
  isTourCompleted,
  rememberTourCompletion,
} from "@/lib/celeventic-guide/tour-storage";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";

type HighlightRect = { top: number; left: number; width: number; height: number };

function resolveTourTarget(selector?: string): HTMLElement | null {
  if (!selector) return null;
  const parts = selector
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const candidates: HTMLElement[] = [];
  for (const part of parts) {
    document.querySelectorAll(part).forEach((node) => {
      if (node instanceof HTMLElement) candidates.push(node);
    });
  }
  const visible = candidates.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 8 && r.height > 8 && r.bottom > 0 && r.top < window.innerHeight;
  });
  return visible ?? candidates[0] ?? null;
}

export function TourEngine({ tourId, onClose }: { tourId: string; onClose: () => void }) {
  const tour = getMiniTour(tourId);
  const [step, setStep] = useState(0);
  const [completedBefore, setCompletedBefore] = useState(false);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!tour) return;
    setCompletedBefore(isTourCompleted(tour.id));
    trackGuideEvent("guide_tour_start", { tourId: tour.id });
  }, [tour]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, (tour?.steps.length ?? 1) - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, tour]);

  useLayoutEffect(() => {
    if (!tour) return;
    const current = tour.steps[step];
    const selector = current?.targetSelector;
    if (!selector) {
      setHighlight(null);
      return;
    }
    const el = resolveTourTarget(selector);
    if (!el) {
      setHighlight(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    const update = () => {
      const r = el.getBoundingClientRect();
      setHighlight({
        top: r.top + window.scrollY - 8,
        left: r.left + window.scrollX - 8,
        width: r.width + 16,
        height: r.height + 16,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [tour, step]);

  if (!tour) return null;
  const current = tour.steps[step];
  const total = tour.steps.length;
  const atEnd = step >= total - 1;

  const finish = (skipped: boolean) => {
    rememberTourCompletion(tour.id);
    trackGuideEvent(skipped ? "guide_tour_skip" : "guide_tour_complete", {
      tourId: tour.id,
      step,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <div className="absolute inset-0 bg-slate-900/55" aria-hidden />
      {highlight && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-[81] rounded-xl ring-2 ring-brand-400 ring-offset-2 ring-offset-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] transition-all duration-300"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      )}

      <div className="absolute inset-0 z-[82] flex items-end sm:items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="pointer-events-auto relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 p-5"
        >
          <p className="text-xs uppercase tracking-wider text-brand-700 font-semibold">{tour.title}</p>
          <h2 id={titleId} className="font-display text-xl font-semibold text-slate-900 mt-1">
            {current.title}
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{current.body}</p>

          <div className="mt-4 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500" aria-live="polite">
            Step {step + 1} of {total}
            {completedBefore ? " · completed before" : ""}
            {!highlight && current.targetSelector ? " · target not on this page" : ""}
          </p>

          <div className="mt-5 flex flex-wrap gap-2 justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={() => finish(true)}>
              Skip
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
              {!atEnd ? (
                <Button type="button" size="sm" onClick={() => setStep((s) => s + 1)}>
                  Next
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={() => finish(false)}>
                  Done
                </Button>
              )}
            </div>
          </div>
          {completedBefore && (
            <button
              type="button"
              className="mt-3 text-xs text-slate-500 hover:underline"
              onClick={() => {
                clearTourCompletion(tour.id);
                setCompletedBefore(false);
                setStep(0);
              }}
            >
              Replay from start
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
