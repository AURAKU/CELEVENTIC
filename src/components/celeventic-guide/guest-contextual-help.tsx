"use client";

import { useEffect, useId, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getGuestContextualTopic,
  type GuestContextualTopic,
} from "@/lib/celeventic-guide/guest-zero-experience";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";

export function GuestHelpChip({
  topicId,
  className,
  tone = "light",
}: {
  topicId: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const topic = getGuestContextualTopic(topicId);
  const [open, setOpen] = useState(false);
  if (!topic) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          trackGuideEvent("guide_context_help", { topic: topicId, surface: "invite" });
        }}
        className={cn(
          "inline-flex items-center gap-1.5 min-h-11 px-3 py-2 rounded-full text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          tone === "dark"
            ? "text-white/90 focus-visible:ring-white/70"
            : "text-[#0B8A83] focus-visible:ring-[#0B8A83]",
          className
        )}
        aria-haspopup="dialog"
      >
        <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
        <span>{topic.triggerLabel}</span>
      </button>
      <GuestHelpDrawer topic={topic} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function GuestHelpDrawer({
  topic,
  open,
  onClose,
}: {
  topic: GuestContextualTopic;
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 sm:p-6" role="presentation">
          <motion.button
            type="button"
            aria-label="Close help"
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: reduce ? 0 : 0.25 }}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#0B8A83]">Quick help</p>
                <h2 id={titleId} className="font-display text-xl text-slate-900 mt-1">
                  {topic.title}
                </h2>
              </div>
              <Button type="button" size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-3 text-sm text-slate-700 leading-relaxed">
              <p><span className="font-semibold text-slate-900">What is this?</span> {topic.what}</p>
              <p><span className="font-semibold text-slate-900">What should I do?</span> {topic.doNext}</p>
              <p><span className="font-semibold text-slate-900">Why do I need it?</span> {topic.why}</p>
              <p><span className="font-semibold text-slate-900">What happens after?</span> {topic.after}</p>
              <ol className="space-y-2 pt-2">
                {topic.steps.map((step, i) => (
                  <li key={step.title} className="rounded-xl border border-slate-150 bg-slate-50 px-3 py-2.5">
                    <p className="font-medium text-slate-900">
                      {i + 1}. {step.title}
                    </p>
                    <p className="text-slate-600 mt-0.5">{step.body}</p>
                  </li>
                ))}
              </ol>
              <a
                href={`/guide/${topic.guideSlug}`}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-[#0B8A83] hover:underline"
              >
                More help in Celeventic Guide →
              </a>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
