"use client";

import { type ComponentType } from "react";
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
import { APP_NAME } from "@/lib/constants";

/** Guest help tour video shown from the invitation Celeventic logo. */
export const GUEST_HELP_TOUR_VIDEO = "/guides/videos/guest-help-tour.mp4";
export const GUEST_HELP_TOUR_POSTER = "/guides/posters/guest-help-tour.jpg";

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

/** Full Guest help action grid — used on Celeventic Guide / FAQ hub. */
export function GuestQuickActions({
  className,
}: {
  className?: string;
  /** @deprecated Invite surface uses InviteGuestHelpFab instead of the inline grid. */
  mode?: "guide" | "invite";
  onSectionJump?: (sectionId: string) => void;
}) {
  return (
    <section className={cn("space-y-3", className)} aria-label="Guest quick actions">
      <h2 className="font-display text-xl text-slate-900">Guest help</h2>
      <div className="grid sm:grid-cols-2 gap-2">
        {GUEST_QUICK_ACTIONS.map((action) => {
          const Icon = ICONS[action.id] ?? HelpCircle;
          const guideHref = action.guideSlug ? `/guide/${action.guideSlug}` : action.href;
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
      <Link
        href="/guide?role=GUEST&q=show+me+around"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-[#0B8A83] hover:underline"
      >
        Replay “Show Me Around” →
      </Link>
    </section>
  );
}

const GUIDE_GLASS =
  "bg-white/55 backdrop-blur-xl border border-white/80 shadow-[0_8px_28px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.9)]";

/**
 * Invitation footer: compact Celeventic Guide control.
 * Sits in document flow at the end of the invite so it does not overlay every section.
 */
export function InviteGuestHelpFab({
  className,
  guideHref = "/guide?role=GUEST",
  alignEnd = false,
}: {
  className?: string;
  guideHref?: string;
  /** Fashion flagship: keep the FAB off the campaign masthead and CTAs. */
  alignEnd?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative z-10 flex w-full pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
        alignEnd
          ? "justify-end pr-[max(0.75rem,env(safe-area-inset-right))] pl-3"
          : "justify-center",
        className
      )}
      data-guest-guide-tray="footer"
    >
      <Link
        href={guideHref}
        onClick={() =>
          trackGuideEvent("guide_context_help", { action: "open-guest-guide", surface: "invite-fab" })
        }
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full",
          GUIDE_GLASS,
          "text-[#0B8A83] transition-transform duration-200 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8A83] focus-visible:ring-offset-2"
        )}
        aria-label={`${APP_NAME} Guide — learn how to navigate the invitation`}
      >
        <Compass className="h-5 w-5" strokeWidth={2.2} aria-hidden />
      </Link>
    </div>
  );
}
