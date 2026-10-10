"use client";

import { type ComponentType, useEffect, useRef, useState } from "react";
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

const GUIDE_GLASS = [
  "relative isolate overflow-hidden",
  "border border-white/75 bg-white/20",
  "backdrop-blur-2xl backdrop-saturate-150",
  "shadow-[0_12px_28px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(255,255,255,0.4)]",
  "before:pointer-events-none before:absolute before:inset-x-2 before:top-px before:z-0 before:h-[46%] before:rounded-full",
  "before:bg-gradient-to-b before:from-white/80 before:to-transparent",
].join(" ");

function GuideLogoMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="relative z-[1] isolate block overflow-hidden rounded-full bg-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(15,23,42,0.08)]"
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
 * Invitation corner: a round glass mark. Sits off the template so
 * celebration CTAs stay clear. A tap opens the Guide chip.
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
  const [hidden, setHidden] = useState(true);
  const trayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rest = () => setHidden(true);
    window.addEventListener("pageshow", rest);
    return () => window.removeEventListener("pageshow", rest);
  }, []);

  useEffect(() => {
    if (hidden) return;
    const rest = (event: Event) => {
      const tray = trayRef.current;
      if (
        event.type === "pointerdown" &&
        tray &&
        event.target instanceof Node &&
        tray.contains(event.target)
      ) {
        return;
      }
      setHidden(true);
    };
    document.addEventListener("pointerdown", rest, true);
    document.addEventListener("scroll", rest, true);
    return () => {
      document.removeEventListener("pointerdown", rest, true);
      document.removeEventListener("scroll", rest, true);
    };
  }, [hidden]);

  return (
    <div
      ref={trayRef}
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
            className="relative z-[1] inline-flex h-9 items-center gap-2 rounded-full pl-0.5 pr-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8A83] focus-visible:ring-offset-2"
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
            className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/25 text-[#0B8A83]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-md transition-colors hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8A83]"
            aria-label="Hide guide"
          >
            <ChevronDown className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
