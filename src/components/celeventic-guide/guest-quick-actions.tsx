"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  BookOpen,
  Camera,
  Compass,
  Heart,
  HelpCircle,
  MapPin,
  QrCode,
  Armchair,
  Utensils,
  CalendarDays,
} from "lucide-react";
import { GUEST_QUICK_ACTIONS } from "@/lib/celeventic-guide/guest-zero-experience";
import { cn } from "@/lib/utils";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "open-invitation": BookOpen,
  rsvp: CalendarDays,
  "show-qr": QrCode,
  "find-seat": Armchair,
  programme: Compass,
  menu: Utensils,
  location: MapPin,
  "share-photos": Camera,
  "leave-wish": Heart,
  "need-help": HelpCircle,
};

export function GuestQuickActions({
  className,
  mode = "guide",
  onSectionJump,
}: {
  className?: string;
  mode?: "guide" | "invite";
  onSectionJump?: (sectionId: string) => void;
}) {
  return (
    <section className={cn("space-y-3", className)} aria-label="Guest quick actions">
      <div>
        <h2 className="font-display text-xl text-slate-900">Guest help</h2>
        <p className="text-sm text-slate-600 mt-1">
          Short answers for first-time guests. No jargon.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {GUEST_QUICK_ACTIONS.map((action) => {
          const Icon = ICONS[action.id] ?? HelpCircle;
          const guideHref = action.guideSlug ? `/guide/${action.guideSlug}` : action.href;
          if (mode === "invite" && action.sectionId && onSectionJump) {
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  onSectionJump(action.sectionId!);
                  trackGuideEvent("guide_context_help", { action: action.id, surface: "invite-quick" });
                }}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/90 px-3.5 py-3 text-left min-h-[3.25rem] hover:border-[#0B8A83]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8A83]"
              >
                <Icon className="h-5 w-5 mt-0.5 text-[#0B8A83] shrink-0" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{action.label}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{action.description}</span>
                </span>
              </button>
            );
          }
          return (
            <Link
              key={action.id}
              href={guideHref}
              onClick={() => trackGuideEvent("guide_context_help", { action: action.id, surface: "guide-quick" })}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/90 px-3.5 py-3 min-h-[3.25rem] hover:border-[#0B8A83]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8A83]"
            >
              <Icon className="h-5 w-5 mt-0.5 text-[#0B8A83] shrink-0" aria-hidden />
              <span>
                <span className="block text-sm font-semibold text-slate-900">{action.label}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{action.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <Link href="/guide?role=GUEST&q=show+me+around" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#0B8A83] hover:underline">
        Replay “Show Me Around” →
      </Link>
    </section>
  );
}
