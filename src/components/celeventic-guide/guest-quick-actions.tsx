"use client";

import { useCallback, useEffect, useId, useRef, useState, type ComponentType } from "react";
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
  X,
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
 * Invitation footer: Celeventic logo opens an in-invite guest help tour video
 * so guests understand the invitation without leaving the ceremony.
 */
export function InviteGuestHelpFab({
  className,
  guideHref = "/guide?role=GUEST",
  alignEnd = false,
}: {
  className?: string;
  /** Full Guest help page — offered after / beside the tour video. */
  guideHref?: string;
  /** Fashion flagship: keep the FAB off the campaign masthead and CTAs. */
  alignEnd?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setOpen(false);
  }, []);

  const openTour = useCallback(() => {
    trackGuideEvent("guide_context_help", { action: "open-guest-help-tour", surface: "invite-fab" });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    const el = videoRef.current;
    if (el) {
      void el.play().catch(() => {
        /* autoplay may require a gesture — controls remain available */
      });
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  return (
    <>
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
        <button
          type="button"
          onClick={openTour}
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
          aria-label={`${APP_NAME} Help & tour — watch how this invitation works`}
          aria-haspopup="dialog"
          aria-expanded={open}
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
              Help & tour
            </span>
          )}
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[130] flex flex-col bg-black/92 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="flex items-center justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
            <p id={titleId} className="min-w-0 truncate px-1 text-sm font-semibold text-white">
              {APP_NAME} guest tour
            </p>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={close}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close guest tour"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="relative mx-auto flex min-h-0 w-full max-w-lg flex-1 items-center justify-center px-3 pb-3">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              className="max-h-full max-w-full rounded-2xl bg-black object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
              src={GUEST_HELP_TOUR_VIDEO}
              poster={GUEST_HELP_TOUR_POSTER}
              controls
              playsInline
              preload="metadata"
              controlsList="nodownload"
            />
          </div>

          <div className="flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
            <Link
              href={guideHref}
              onClick={() => {
                trackGuideEvent("guide_context_help", {
                  action: "open-guest-help-more",
                  surface: "invite-fab-tour",
                });
                close();
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0B8A83] px-5 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              More guest help
            </Link>
            <button
              type="button"
              onClick={close}
              className="min-h-10 text-sm font-medium text-white/75 hover:text-white"
            >
              Back to invitation
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
