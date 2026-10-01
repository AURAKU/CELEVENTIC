"use client";

import { type ComponentType, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Camera,
  ChevronDown,
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
import { BRAND_LOGO_MARK } from "@/lib/brand/constants";

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
  "bg-white/38 backdrop-blur-2xl border border-white/70 shadow-[0_10px_28px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.95)]";

function GuideLogoMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="relative isolate block overflow-hidden rounded-full bg-white/75 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.95)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src={BRAND_LOGO_MARK}
        alt=""
        fill
        sizes={`${size}px`}
        className="object-cover object-[50%_18%] scale-[1.9] origin-[center_18%]"
      />
    </span>
  );
}

/**
 * Invitation corner: compact glass Guide chip. Sits off the template so
 * celebration CTAs stay clear. Guests can tuck it to a round mark.
 */
export function InviteGuestHelpFab({
  className,
  guideHref = "/guide?role=GUEST",
  alignEnd: _alignEnd = false,
}: {
  className?: string;
  guideHref?: string;
  /** Kept for callers; the chip always parks bottom-right off the template. */
  alignEnd?: boolean;
}) {
  const [hidden, setHidden] = useState(false);

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[80]",
        "bottom-[max(0.7rem,env(safe-area-inset-bottom))]",
        "right-[max(0.7rem,env(safe-area-inset-right))]",
        className
      )}
      data-guest-guide-tray={hidden ? "hidden" : "open"}
    >
      {hidden ? (
        <button
          type="button"
          onClick={() => setHidden(false)}
          className={cn(
            "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full",
            GUIDE_GLASS,
            "transition-transform duration-200 active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8A83] focus-visible:ring-offset-2"
          )}
          aria-label="Show guide"
        >
          <GuideLogoMark size={32} />
        </button>
      ) : (
        <div
          className={cn(
            "pointer-events-auto relative flex h-11 items-center gap-1 rounded-full py-1 pl-1 pr-1",
            GUIDE_GLASS
          )}
        >
          <Link
            href={guideHref}
            onClick={() =>
              trackGuideEvent("guide_context_help", { action: "open-guest-guide", surface: "invite-fab" })
            }
            className="inline-flex h-9 items-center gap-2 rounded-full pl-0.5 pr-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8A83] focus-visible:ring-offset-2"
            aria-label={`${APP_NAME} Guide — learn how to navigate the invitation`}
          >
            <GuideLogoMark size={34} />
            <span className="pr-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B8A83]/90">
              Guide
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/35 text-[#0B8A83]/80 transition-colors hover:bg-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8A83]"
            aria-label="Hide guide"
          >
            <ChevronDown className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
