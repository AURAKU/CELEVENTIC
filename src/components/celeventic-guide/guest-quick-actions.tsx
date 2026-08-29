"use client";

import { type ComponentType } from "react";
import Image from "next/image";
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
import { BRAND_LOGO_ALT, BRAND_LOGO_FULL } from "@/lib/brand/constants";

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

/**
 * Invitation footer: Celeventic logo opens the Guest Guide so guests can
 * learn how to navigate the invitation and the rest of the platform.
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
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex",
        alignEnd
          ? "justify-end pr-[max(0.75rem,env(safe-area-inset-right))] pl-3"
          : "justify-center",
        "pb-[max(1rem,env(safe-area-inset-bottom))] pt-3",
        className
      )}
    >
      <Link
        href={guideHref}
        onClick={() =>
          trackGuideEvent("guide_context_help", { action: "open-guest-guide", surface: "invite-fab" })
        }
        className={cn(
          "pointer-events-auto group inline-flex flex-col items-center gap-1.5",
          alignEnd ? "min-h-11 min-w-11 rounded-full px-2.5 py-2" : "min-h-[3.5rem] rounded-full px-5 py-2.5",
          "bg-white/95 backdrop-blur-md border border-[#0B8A83]/25",
          "shadow-[0_8px_28px_rgba(11,138,131,0.22),0_2px_8px_rgba(15,23,42,0.08)]",
          "hover:border-[#0B8A83]/45 hover:shadow-[0_10px_32px_rgba(11,138,131,0.28)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8A83] focus-visible:ring-offset-2",
          "transition-[transform,box-shadow,border-color] duration-200",
          "active:scale-[0.98]"
        )}
        aria-label={`${APP_NAME} Guest Guide — learn how to navigate the invitation`}
      >
        <span className="inline-flex items-center gap-2.5">
          <Image
            src={BRAND_LOGO_FULL}
            alt={BRAND_LOGO_ALT}
            width={120}
            height={36}
            className={alignEnd ? "h-6 w-auto object-contain" : "h-8 w-auto object-contain sm:h-9"}
            priority={false}
          />
        </span>
        {alignEnd ? null : (
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0B8A83]">
            Guest guide
          </span>
        )}
      </Link>
    </div>
  );
}
