"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GUEST_ZERO_INTRO_BEATS,
  clearGuestIntro,
  hasFinishedGuestIntro,
  rememberGuestIntro,
} from "@/lib/celeventic-guide/guest-zero-experience";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";

export function GuestFirstTimeIntro({
  invitationId,
  guestId,
  className,
  forceOpen = false,
  onFinished,
}: {
  invitationId: string;
  guestId?: string | null;
  className?: string;
  /** Replay from Help — ignores remembered skip/complete until closed. */
  forceOpen?: boolean;
  onFinished?: () => void;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const [ready, setReady] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [beatIndex, setBeatIndex] = useState(0);

  useEffect(() => {
    if (!invitationId || invitationId.startsWith("preview")) {
      setReady(true);
      return;
    }
    const done = hasFinishedGuestIntro(invitationId, guestId);
    setCardVisible(forceOpen || !done);
    setReady(true);
  }, [invitationId, guestId, forceOpen]);

  useEffect(() => {
    if (!tourOpen || reduce) return;
    const beat = GUEST_ZERO_INTRO_BEATS[beatIndex];
    if (!beat) return;
    const t = setTimeout(() => {
      if (beatIndex >= GUEST_ZERO_INTRO_BEATS.length - 1) {
        finish("completed");
        return;
      }
      setBeatIndex((i) => i + 1);
    }, beat.durationMs);
    return () => clearTimeout(t);
  }, [tourOpen, beatIndex, reduce]);

  const totalMs = useMemo(
    () => GUEST_ZERO_INTRO_BEATS.reduce((sum, b) => sum + b.durationMs, 0),
    []
  );

  function finish(status: "completed" | "skipped") {
    rememberGuestIntro(invitationId, status, guestId);
    setTourOpen(false);
    setCardVisible(false);
    trackGuideEvent(status === "skipped" ? "guide_tour_skip" : "guide_tour_complete", {
      tour: "guest-zero-intro",
      invitationId: invitationId.slice(0, 24),
    });
    onFinished?.();
  }

  if (!ready || !cardVisible) return null;

  const beat = GUEST_ZERO_INTRO_BEATS[beatIndex];

  return (
    <>
      {!tourOpen && (
        <div
          className={cn(
            "rounded-2xl border border-[#0B8A83]/25 bg-white/95 shadow-sm px-4 py-3.5",
            className
          )}
          role="region"
          aria-label="First time using Celeventic"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-[#0B8A83]/10 p-2 text-[#0B8A83]" aria-hidden>
              <Compass className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg text-slate-900">First time using Celeventic?</p>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                A short tour of invitation → RSVP → QR → Event Guide → seating → event day → photos.
                About {Math.round(totalMs / 1000)} seconds. Sound is optional.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="min-h-11 bg-[#0B8A83] hover:bg-[#097a74]"
                  onClick={() => {
                    setBeatIndex(0);
                    setTourOpen(true);
                    trackGuideEvent("guide_tour_start", { tour: "guest-zero-intro" });
                  }}
                >
                  Show Me Around
                </Button>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => finish("skipped")}>
                  Skip
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {tourOpen && beat ? (
          <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-3 sm:p-6">
            <motion.button
              type="button"
              aria-label="Close tour"
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => finish("skipped")}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative w-full max-w-md rounded-2xl overflow-hidden bg-slate-950 text-white shadow-2xl"
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: 12 }}
            >
              <div className="flex items-center justify-between px-4 pt-4">
                <p id={titleId} className="text-xs uppercase tracking-[0.22em] text-teal-200">
                  Show Me Around
                </p>
                <Button type="button" size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={() => finish("skipped")} aria-label="Close">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="px-6 py-8 text-center min-h-[280px] flex flex-col items-center justify-center">
                <p className="text-sm text-teal-100/90">{beat.title}</p>
                <h3 className="mt-2 font-display text-2xl sm:text-3xl font-semibold">{beat.caption}</h3>
                <p className="mt-3 text-sm text-white/75 max-w-sm leading-relaxed">{beat.narration}</p>
                <div className="mt-5 grid gap-1 text-left text-xs text-white/70 max-w-sm w-full">
                  <p>What is this? {beat.what}</p>
                  <p>What should I do? {beat.doNext}</p>
                  <p>Why? {beat.why}</p>
                  <p>After? {beat.after}</p>
                </div>
              </div>
              <div className="px-4 pb-4 space-y-3">
                <div className="h-1 rounded-full bg-white/15 overflow-hidden" aria-hidden>
                  <div
                    className="h-full bg-teal-300 transition-all"
                    style={{ width: `${((beatIndex + 1) / GUEST_ZERO_INTRO_BEATS.length) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-white/60" aria-live="polite">
                    {beatIndex + 1} / {GUEST_ZERO_INTRO_BEATS.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
                      onClick={() => {
                        if (beatIndex >= GUEST_ZERO_INTRO_BEATS.length - 1) finish("completed");
                        else setBeatIndex((i) => i + 1);
                      }}
                    >
                      {beatIndex >= GUEST_ZERO_INTRO_BEATS.length - 1 ? "Done" : "Next"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** Replay entry for Guide / Help — clears memory then opens. */
export function replayGuestIntro(invitationId: string, guestId?: string | null) {
  clearGuestIntro(invitationId, guestId);
}
