"use client";

import { useState } from "react";
import { CalendarHeart, Check, FileDown, Loader2, MapPin, Share2, ShieldAlert } from "lucide-react";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";
import type { CalendarEventInput } from "@/lib/invitation/calendar-utils";
import { setSmartCalendarReminder } from "@/lib/invitation/smart-calendar";
import { useInvitationStaticPreview } from "@/components/invitation/invitation-static-preview";
import { cn } from "@/lib/utils";
import { TM_PALETTE as PALETTE } from "./traditional-marriage-palette";

export interface TraditionalMarriageJourneyProps {
  event: {
    title: string;
    startDate: string;
    startDateRaw?: string;
    mapsLink: string | null;
    venueName?: string | null;
    landmark?: string | null;
  };
  mapsHref?: string | null;
  pdfUrl?: string | null;
  showGifts?: boolean;
  showTimeline?: boolean;
  /**
   * Organiser-allocated heads for this invitation.
   * Used in the Share caution so guests know the pass is strictly personal.
   */
  partyAllowance?: number | null;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

type QuietLink = {
  key: string;
  label: string;
  href?: string;
  download?: boolean;
  onClick?: () => void;
};

/**
 * Continue With Us, Directions · Save the Date · Share.
 * Quiet text links only when destinations exist. No chip spam / utility cards.
 */
function formatShareAdmissionCopy(allowance?: number | null): string {
  const n = Math.max(1, Math.trunc(allowance ?? 1));
  if (n <= 1) return "This invitation only admits one guest.";
  return `This invitation only admits ${n} guests.`;
}

export function TraditionalMarriageJourney({
  event,
  mapsHref,
  pdfUrl,
  showGifts = false,
  showTimeline = false,
  partyAllowance = 1,
}: TraditionalMarriageJourneyProps) {
  const staticPreview = useInvitationStaticPreview();
  const [reminderState, setReminderState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [sharePromptOpen, setSharePromptOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const admissionCopy = formatShareAdmissionCopy(partyAllowance);

  const directionsUrl =
    mapsHref ||
    buildDirectionsUrl({
      mapsLink: event.mapsLink,
      venueName: event.venueName,
      landmark: event.landmark,
    });

  const calendarEvent: CalendarEventInput = {
    title: event.title,
    startDateRaw: event.startDateRaw ?? event.startDate,
    venue: [event.venueName, event.landmark].filter(Boolean).join(" · ") || undefined,
  };

  const quietLinks: QuietLink[] = [];
  if (showGifts) {
    quietLinks.push({
      key: "gifts",
      label: "Gifts",
      onClick: () => scrollToSection("gifts"),
    });
  }
  if (showTimeline) {
    quietLinks.push({
      key: "timeline",
      label: "Timeline",
      onClick: () => scrollToSection("schedule"),
    });
  }
  if (pdfUrl) {
    quietLinks.push({
      key: "pdf",
      label: "PDF",
      href: pdfUrl,
      download: true,
    });
  }

  function requestShare() {
    if (staticPreview || sharing) return;
    setSharePromptOpen(true);
  }

  async function confirmShare() {
    if (staticPreview || sharing) return;
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      /* user cancelled share sheet */
    } finally {
      setSharing(false);
      setSharePromptOpen(false);
    }
  }

  async function saveDate() {
    if (staticPreview || reminderState === "loading") return;
    setReminderState("loading");
    const result = await setSmartCalendarReminder(calendarEvent);
    setReminderState(result.success ? "done" : "error");
    if (result.success) {
      window.setTimeout(() => setReminderState("idle"), 3200);
    }
  }

  const triadItemClass = cn(
    "relative flex flex-col items-center justify-center gap-2.5 min-h-[88px] px-2 py-4",
    "transition-all duration-300 touch-manipulation select-none",
    "hover:brightness-[1.03] active:scale-[0.97]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:opacity-45 disabled:pointer-events-none"
  );

  return (
    <section
      aria-labelledby="tm-journey-heading"
      className="tm-section-rise relative overflow-hidden rounded-sm border px-5 py-8 sm:px-7 sm:py-9 shadow-[0_22px_48px_-28px_rgba(92,61,46,0.38)]"
      style={{
        borderColor: PALETTE.border,
        background: `
          linear-gradient(168deg, ${PALETTE.linen} 0%, ${PALETTE.peach} 42%, ${PALETTE.peachDeep} 100%),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 13px,
            rgba(139,111,92,0.025) 13px,
            rgba(139,111,92,0.025) 14px
          )
        `,
        animationDelay: "80ms",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-55"
        style={{
          background: `radial-gradient(ellipse at 50% 110%, ${PALETTE.mustardSoft}30 0%, transparent 70%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-3 rounded-sm border opacity-35"
        style={{ borderColor: `${PALETTE.mustard}50` }}
        aria-hidden
      />

      <div className="relative text-center space-y-2.5">
        <p
          className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.36em] uppercase"
          style={{ color: PALETTE.bronzeDeep }}
        >
          The Journey
        </p>
        <h2
          id="tm-journey-heading"
          className="font-[family-name:var(--font-great-vibes)] text-[2.35rem] sm:text-[2.6rem] leading-none"
          style={{ color: PALETTE.bronze }}
        >
          Continue With Us
        </h2>
        <p
          className="font-[family-name:var(--font-cormorant)] text-sm leading-relaxed max-w-[17.5rem] mx-auto"
          style={{ color: PALETTE.dress }}
        >
          Directions, a calendar reminder, and a way to share. Nothing more.
        </p>
      </div>

      <div
        className="tm-hairline relative mx-auto mt-6 mb-6 h-px w-20"
        style={{ backgroundColor: `${PALETTE.mustard}70` }}
        aria-hidden
      />

      <div
        className="relative grid grid-cols-3 rounded-sm border overflow-hidden"
        style={{
          borderColor: `${PALETTE.border}`,
          backgroundColor: `${PALETTE.peach}EE`,
        }}
      >
        {directionsUrl && !staticPreview ? (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={triadItemClass}
            style={{ outlineColor: PALETTE.bronze, color: PALETTE.bronzeDeep }}
          >
            <MapPin className="h-[18px] w-[18px]" style={{ color: PALETTE.mustard }} aria-hidden />
            <span className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.16em] uppercase text-center leading-tight">
              Directions
            </span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            className={triadItemClass}
            style={{ outlineColor: PALETTE.bronze, color: PALETTE.bronzeDeep }}
            title={staticPreview ? "Preview" : "Location not added yet"}
          >
            <MapPin className="h-[18px] w-[18px]" style={{ color: PALETTE.mustard }} aria-hidden />
            <span className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.16em] uppercase text-center leading-tight">
              Directions
            </span>
          </button>
        )}

        <div className="absolute top-4 bottom-4 left-1/3 w-px" style={{ backgroundColor: `${PALETTE.border}` }} aria-hidden />
        <div className="absolute top-4 bottom-4 left-2/3 w-px" style={{ backgroundColor: `${PALETTE.border}` }} aria-hidden />

        <button
          type="button"
          disabled={staticPreview || reminderState === "loading"}
          onClick={() => void saveDate()}
          className={triadItemClass}
          style={{ outlineColor: PALETTE.bronze, color: PALETTE.bronzeDeep }}
          title="Add to your calendar"
        >
          {reminderState === "loading" ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" style={{ color: PALETTE.mustard }} aria-hidden />
          ) : reminderState === "done" ? (
            <Check className="h-[18px] w-[18px]" style={{ color: PALETTE.mustard }} aria-hidden />
          ) : (
            <CalendarHeart className="h-[18px] w-[18px]" style={{ color: PALETTE.mustard }} aria-hidden />
          )}
          <span className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.16em] uppercase text-center leading-tight">
            {reminderState === "done" ? "Saved" : reminderState === "error" ? "Retry" : "Save the Date"}
          </span>
        </button>

        <button
          type="button"
          disabled={staticPreview}
          onClick={requestShare}
          className={triadItemClass}
          style={{ outlineColor: PALETTE.bronze, color: PALETTE.bronzeDeep }}
          aria-haspopup="dialog"
        >
          <Share2 className="h-[18px] w-[18px]" style={{ color: PALETTE.mustard }} aria-hidden />
          <span className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.16em] uppercase text-center leading-tight">
            Share
          </span>
        </button>
      </div>

      {sharePromptOpen && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center px-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#1C253A]/55 backdrop-blur-[2px]"
            aria-label="Dismiss share notice"
            onClick={() => !sharing && setSharePromptOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tm-share-caution-title"
            aria-describedby="tm-share-caution-body"
            className="relative w-full max-w-[22rem] rounded-sm border px-5 py-6 text-center shadow-[0_28px_60px_-28px_rgba(28,37,58,0.55)]"
            style={{
              borderColor: PALETTE.border,
              background: `linear-gradient(168deg, ${PALETTE.linen} 0%, ${PALETTE.peach} 48%, ${PALETTE.peachDeep} 100%)`,
              color: PALETTE.ink,
            }}
          >
            <div
              className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border"
              style={{ borderColor: `${PALETTE.mustard}88`, background: `${PALETTE.mustard}18` }}
            >
              <ShieldAlert className="h-5 w-5" style={{ color: PALETTE.mustard }} aria-hidden />
            </div>
            <p
              id="tm-share-caution-title"
              className="font-[family-name:var(--font-cinzel)] text-[13px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: PALETTE.bronzeDeep }}
            >
              Private invitation
            </p>
            <p
              id="tm-share-caution-body"
              className="mt-3 font-[family-name:var(--font-cormorant)] text-[15px] leading-relaxed"
              style={{ color: PALETTE.dress }}
            >
              This invitation is strictly by invitation from the host. {admissionCopy} Please only share with care.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                type="button"
                disabled={sharing}
                onClick={() => setSharePromptOpen(false)}
                className="rounded-full border px-4 py-2.5 font-[family-name:var(--font-cormorant)] text-[12px] uppercase tracking-[0.16em] transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: PALETTE.border, color: PALETTE.bronzeDeep, background: PALETTE.linen }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sharing}
                onClick={() => void confirmShare()}
                className="rounded-full px-4 py-2.5 font-[family-name:var(--font-cormorant)] text-[12px] font-semibold uppercase tracking-[0.16em] transition-transform hover:scale-[1.02] disabled:opacity-50"
                style={{
                  color: PALETTE.linen,
                  background: `linear-gradient(135deg, ${PALETTE.bronze}, ${PALETTE.bronzeDeep})`,
                  boxShadow: `0 12px 24px -16px ${PALETTE.bronzeDeep}`,
                }}
              >
                {sharing ? "Opening…" : "I understand, continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {quietLinks.length > 0 && (
        <nav
          aria-label="More invitation destinations"
          className="relative mt-7 pt-5 border-t flex flex-wrap items-center justify-center gap-x-1 gap-y-2"
          style={{ borderColor: `${PALETTE.border}CC` }}
        >
          {quietLinks.map((link, i) => (
            <span key={link.key} className="inline-flex items-center">
              {i > 0 && (
                <span
                  className="mx-2.5 text-[10px] select-none"
                  style={{ color: `${PALETTE.bronze}66` }}
                  aria-hidden
                >
                  ·
                </span>
              )}
              {link.href && !staticPreview ? (
                <a
                  href={link.href}
                  target={link.download ? "_blank" : undefined}
                  rel={link.download ? "noopener noreferrer" : undefined}
                  download={link.download || undefined}
                  className="inline-flex items-center gap-1 font-[family-name:var(--font-cormorant)] text-[12px] tracking-[0.14em] uppercase underline-offset-[3px] hover:underline transition-opacity hover:opacity-80"
                  style={{ color: PALETTE.bronzeDeep }}
                >
                  {link.key === "pdf" && <FileDown className="h-3 w-3" aria-hidden />}
                  {link.label}
                </a>
              ) : link.onClick && !staticPreview ? (
                <button
                  type="button"
                  onClick={link.onClick}
                  className="font-[family-name:var(--font-cormorant)] text-[12px] tracking-[0.14em] uppercase underline-offset-[3px] hover:underline transition-opacity hover:opacity-80"
                  style={{ color: PALETTE.bronzeDeep }}
                >
                  {link.label}
                </button>
              ) : (
                <span
                  className="font-[family-name:var(--font-cormorant)] text-[12px] tracking-[0.14em] uppercase opacity-50"
                  style={{ color: PALETTE.bronzeDeep }}
                >
                  {link.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
    </section>
  );
}
