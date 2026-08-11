"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guideStorageKey } from "@/lib/celeventic-guide/tour-storage";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";

const DISMISS_KEY = guideStorageKey("banner", "new-to-celeventic");

export function FirstTimeHelpBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ at: Date.now() }));
    } catch {
      /* ignore */
    }
    trackGuideEvent("guide_first_time_dismiss", {});
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      className="relative overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 via-white to-gold-50/40 p-4 sm:p-5"
      role="region"
      aria-label="New to Celeventic"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pr-8">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg font-semibold text-slate-900">New to Celeventic?</p>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            Start with a short role path, or watch How Celeventic Works — invitation, RSVP, QR, Event Guide, and Memory Vault.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" size="sm" asChild>
            <Link
              href="/guide/how-celeventic-works"
              onClick={() => trackGuideEvent("guide_first_time_cta", { target: "flagship" })}
            >
              See how it works
            </Link>
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <a href="#start-here-heading" onClick={() => trackGuideEvent("guide_first_time_cta", { target: "start-here" })}>
              Start Here
            </a>
          </Button>
        </div>
      </div>
      <button
        type="button"
        className="absolute top-3 right-3 rounded-lg p-1.5 text-slate-500 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label="Dismiss New to Celeventic banner"
        onClick={dismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
