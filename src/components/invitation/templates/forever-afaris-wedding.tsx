"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import {
  buildDirectionsUrl,
  extractMapsCoordinates,
  googleMapsDirectionsHref,
  resolveMapsLocationHref,
} from "@/lib/invitation/maps-utils";
import { shouldUnoptimizeNextImage } from "@/lib/uploads/media-url";
import { isVideoUrl } from "@/lib/invitation/theme-media-assets";
import { useInvitationStaticPreview } from "@/components/invitation/invitation-static-preview";
import {
  distinctInvitationPhrase,
  mergeWeddingBoard,
  type ResolvedWeddingBoard,
  type WeddingBoardContent,
  type WeddingSectionId,
} from "@/lib/invitation/wedding-board";
import { requestInvitationReplay } from "@/lib/experience/replay-invitation";
import { isEdwinLordinaBook } from "@/lib/invitation/wedding-pages";
import { WeddingScroll } from "@/components/invitation/templates/forever-afaris-wedding-pages";
import {
  resolveWeddingPalette,
  type FaPalette,
} from "./forever-afaris-wedding-palette";
import { TraditionalMarriageRespond } from "./traditional-marriage-respond";
import { InvitationMapPreview } from "@/components/invitation/invitation-map-preview";
import { PlaceCard } from "@/components/invitation/place-card";
import { InvitationMediaLightbox } from "@/components/invitation/invitation-media-lightbox";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import type { CalendarEventInput } from "@/lib/invitation/calendar-utils";
import { calendarEventLocation, toMapsEmbedUrl } from "@/lib/invitation/calendar-utils";
import {
  celebrationDayGroups,
  celebrationMomentsFromProgramme,
  programmeMapUrl,
  type CelebrationDay,
} from "@/lib/invitation/celebration-days";
import {
  detectCalendarPlatform,
  setSmartCalendarReminder,
  setSmartCalendarReminders,
} from "@/lib/invitation/smart-calendar";
import { hourglassEngraving, weddingBoardUsesHourglass } from "@/lib/invitation/hourglass-identity";
import { useCountdown } from "@/hooks/use-countdown";
import { SeraphineHourglass } from "./seraphine-hourglass";
import { Bell, BellRing, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/memory/icons/social-brand-icons";
import { celebrationPath } from "@/lib/music/invitation-audio-manager";

export type ForeverAfarisWeddingProps = InvitationRenderProps & {
  contactEmail?: string | null;
  mapsLink?: string | null;
  /** Guest-facing gallery URLs supplied by the portal. */
  galleryUrls?: string[];
};

function resolveBoard(design: InvitationRenderProps["design"]): ResolvedWeddingBoard {
  const fromStudio = (design.studio as { weddingBoard?: WeddingBoardContent } | undefined)
    ?.weddingBoard;
  return mergeWeddingBoard(fromStudio);
}

/**
 * Fluid type scale — readable on ~360px phones through desktop, without
 * locking guests into fixed 10–13px labels that collapse on retina mobiles.
 */
const T = {
  label: "text-[clamp(0.8125rem,2.1vw,0.95rem)]",
  labelTight: "text-[clamp(0.75rem,1.9vw,0.875rem)]",
  body: "text-[clamp(1.0625rem,2.6vw,1.25rem)]",
  bodyLg: "text-[clamp(1.125rem,2.8vw,1.35rem)]",
  name: "mx-auto block w-fit whitespace-nowrap font-[family-name:var(--font-cormorant)] text-[clamp(1.45rem,6.4vw,2.2rem)] font-medium italic leading-[1.05] tracking-[0.012em]",
  nameClose:
    "mx-auto block w-fit whitespace-nowrap font-[family-name:var(--font-cormorant)] text-[clamp(1.05rem,4.2vw,1.45rem)] font-medium italic leading-[1.05] tracking-[0.01em]",
  script: "font-[family-name:var(--font-great-vibes)] text-[clamp(2.5rem,7.5vw,3.6rem)] leading-none",
  scriptSm: "font-[family-name:var(--font-great-vibes)] text-[clamp(2.1rem,6.5vw,3rem)] leading-tight",
  sectionLabel: "text-[clamp(0.8125rem,2vw,0.95rem)] uppercase tracking-[0.3em]",
  cta: "text-[clamp(0.78rem,1.9vw,0.9rem)] uppercase tracking-[0.2em]",
  programmeTime:
    "mb-1.5 inline-flex max-w-full rounded-full px-3 py-2 font-[family-name:var(--font-cinzel)] text-[clamp(0.95rem,2.8vw,1.08rem)] font-semibold uppercase leading-snug tracking-[0.1em]",
  programmeTitle:
    "break-words font-[family-name:var(--font-cinzel)] text-[clamp(1.05rem,2.8vw,1.25rem)] font-semibold leading-snug",
  programmeDesc:
    "mt-1 whitespace-pre-line break-words font-[family-name:var(--font-cormorant)] text-[clamp(0.98rem,2.4vw,1.125rem)] leading-relaxed",
} as const;

/* -------------------------------- motion -------------------------------- */

const EASE_SILK = [0.22, 1, 0.36, 1] as const;

function useReveal() {
  const reduced = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 26 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0.2 : 0.8, ease: EASE_SILK },
    },
  };
  return { reduced, variants };
}

function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section";
}) {
  const { variants, reduced } = useReveal();
  const staticPreview = useInvitationStaticPreview();
  // Live invites scroll inside `.invite-viewport-root` (fixed + overflow-y),
  // not the window. Framer's whileInView defaults to the browser viewport, so
  // sections that are on-screen in the invite scroller can stay opacity:0
  // forever — including the full Order of the Day. Animate in on mount instead.
  const common = {
    className,
    variants,
    initial: staticPreview || reduced ? ("show" as const) : ("hidden" as const),
    animate: "show" as const,
    transition: { delay },
  };
  if (as === "section") return <motion.section {...common}>{children}</motion.section>;
  return <motion.div {...common}>{children}</motion.div>;
}

/** Thin champagne divider with a centre diamond. */
function Divider({ palette: C }: { palette: FaPalette }) {
  return (
    <div className="my-8 flex items-center justify-center gap-3" aria-hidden>
      <span className="h-px w-16" style={{ background: `linear-gradient(90deg, transparent, ${C.gold})` }} />
      <span
        className="h-1.5 w-1.5 rotate-45"
        style={{ background: C.gold, boxShadow: `0 0 8px ${C.goldSoft}` }}
      />
      <span className="h-px w-16" style={{ background: `linear-gradient(90deg, ${C.gold}, transparent)` }} />
    </div>
  );
}

/**
 * Date triad — tap to smart-save reminder (Apple .ics / Google / Outlook).
 * Keeps the Forever Afaris champagne layout; affordance is whisper-quiet.
 */
function WeddingDateSaveRow({
  weekday,
  displayDate,
  timeLabel,
  palette: C,
  calendarEvent,
  calendarEvents,
  days,
  staticPreview,
}: {
  weekday: string;
  displayDate: string;
  timeLabel: string;
  palette: FaPalette;
  calendarEvent: CalendarEventInput;
  calendarEvents?: CalendarEventInput[];
  days?: CelebrationDay[];
  staticPreview: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [calendarApp, setCalendarApp] = useState("your calendar");

  const multiDay = (days?.length ?? 0) >= 2;

  useEffect(() => {
    const p = detectCalendarPlatform();
    setCalendarApp(p === "apple" ? "Apple Calendar" : p === "google" ? "Google Calendar" : "Outlook Calendar");
  }, []);

  const platformHint = multiDay
    ? `Tap to add every celebration to ${calendarApp}`
    : `Tap to add to ${calendarApp}`;

  async function saveDate() {
    if (staticPreview || state === "loading") return;
    setState("loading");
    setMessage("");
    const result =
      days && days.length >= 2 && calendarEvents && calendarEvents.length > 1
        ? await setSmartCalendarReminders(calendarEvents)
        : await setSmartCalendarReminder(calendarEvent);
    setState(result.success ? "done" : "error");
    setMessage(result.message);
    if (result.success) {
      window.setTimeout(() => {
        setState("idle");
        setMessage("");
      }, 3600);
    }
  }

  const statusLabel =
    state === "loading"
      ? "Opening your calendar…"
      : state === "done"
        ? "Check your calendar to confirm"
        : state === "error"
          ? "Couldn’t save — tap to try again"
          : platformHint;

  const sharedMonth =
    multiDay && days!.every((day) => day.month === days![0].month && day.year === days![0].year);
  const spoken = multiDay
    ? days!
        .map(
          (day) =>
            `${day.weekday} ${day.day} ${day.month}, ${day.moments
              .map((moment) => `${moment.title} at ${moment.timeLabel}`)
              .join(", ")}`
        )
        .join(". ")
    : `${weekday} ${displayDate} ${timeLabel}`;

  return (
    <div className={`mx-auto w-full ${multiDay ? "max-w-[26rem]" : "max-w-[22rem]"}`}>
      <button
        type="button"
        disabled={staticPreview || state === "loading"}
        onClick={() => void saveDate()}
        aria-label={`${spoken}. ${statusLabel}`}
        title={staticPreview ? "Preview" : statusLabel}
        className={`group relative mx-auto w-full transition-all duration-300 touch-manipulation select-none hover:brightness-[1.02] active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-70 ${
          multiDay
            ? "flex flex-col px-1 py-1 text-left"
            : "flex max-w-[22rem] items-stretch justify-center gap-4 py-4 text-center"
        }`}
        style={{
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          outlineColor: C.gold,
          background:
            state === "done"
              ? `color-mix(in srgb, ${C.goldSoft} 22%, transparent)`
              : "transparent",
        }}
      >
        {multiDay ? (
          <>
            {sharedMonth ? (
              <p
                className="py-3 text-center font-[family-name:var(--font-cinzel)] text-[0.72rem] font-semibold uppercase tracking-[0.34em]"
                style={{ color: C.goldDeep }}
              >
                {days![0].month} {days![0].year}
              </p>
            ) : null}
            {days!.map((day, index) => (
              <div
                key={day.key}
                className="px-1 py-3.5"
                style={{
                  borderTop: index > 0 || sharedMonth ? `1px solid ${C.border}` : undefined,
                }}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span
                    className="font-[family-name:var(--font-cinzel)] text-[0.68rem] font-semibold uppercase tracking-[0.28em]"
                    style={{ color: C.cocoa }}
                  >
                    {day.weekday}
                  </span>
                  <span
                    className="font-[family-name:var(--font-cinzel)] text-[1.7rem] font-semibold leading-none tracking-[0.04em]"
                    style={{ color: C.ink }}
                  >
                    {day.day}
                  </span>
                </div>
                <ul className="mt-3 space-y-3">
                  {day.moments.map((moment) => (
                    <li
                      key={moment.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5"
                    >
                      <span
                        className="font-[family-name:var(--font-cinzel)] text-[clamp(0.82rem,2.4vw,0.95rem)] font-semibold leading-snug"
                        style={{ color: C.ink }}
                      >
                        {moment.title}
                      </span>
                      <span
                        className="whitespace-nowrap font-[family-name:var(--font-cinzel)] text-[0.78rem] font-semibold tracking-[0.12em]"
                        style={{ color: C.goldDeep }}
                      >
                        {moment.timeLabel}
                      </span>
                      {moment.place ? (
                        <span
                          className="col-span-2 font-[family-name:var(--font-cormorant)] text-[clamp(0.98rem,2.5vw,1.08rem)] leading-snug"
                          style={{ color: C.cocoa }}
                        >
                          {moment.place}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        ) : (
          <>
            <div
              className={`flex flex-col justify-center text-right ${T.labelTight} uppercase tracking-[0.2em]`}
              style={{ color: C.cocoa }}
            >
              <span>{weekday}</span>
            </div>
            <div
              className="px-3 font-[family-name:var(--font-cinzel)] text-[clamp(1.15rem,3.2vw,1.4rem)] font-semibold"
              style={{
                color: C.ink,
                borderLeft: `1px solid ${C.border}`,
                borderRight: `1px solid ${C.border}`,
              }}
            >
              <div className="py-1">{displayDate}</div>
            </div>
            <div
              className="flex min-w-[5.5rem] flex-col justify-center whitespace-nowrap text-left text-[clamp(1.05rem,2.8vw,1.25rem)] font-semibold uppercase tracking-[0.12em]"
              style={{ color: C.cocoa }}
            >
              <span>{timeLabel}</span>
            </div>
          </>
        )}
      </button>
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={staticPreview || state === "loading"}
          onClick={() => void saveDate()}
          aria-label={staticPreview ? "Save the date" : statusLabel}
          title={staticPreview ? "Preview" : statusLabel}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-300 hover:scale-[1.04] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-70"
          style={{
            color: C.ink,
            background: `linear-gradient(145deg, ${C.goldSoft}, ${C.gold})`,
            boxShadow: `0 12px 22px -14px ${C.goldDeep}`,
            outlineColor: C.gold,
          }}
        >
          {state === "done" ? (
            <BellRing className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.75} aria-hidden />
          ) : (
            <Bell className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.75} aria-hidden />
          )}
        </button>
        <p
          className={`text-left font-[family-name:var(--font-cormorant)] ${T.label} tracking-[0.08em] transition-opacity duration-300`}
          style={{
            color: state === "error" ? C.rose : state === "done" ? C.goldDeep : C.cocoa,
            opacity: staticPreview ? 0.45 : state === "idle" ? 0.85 : 1,
          }}
          aria-live="polite"
        >
          {staticPreview ? "Save the date" : message || statusLabel}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ countdown ------------------------------- */

function diffParts(target: number) {
  const now = Date.now();
  const delta = Math.max(0, target - now);
  const s = Math.floor(delta / 1000);
  return {
    expired: delta === 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

function guestPhoneLinks(
  phone: string,
  message: string
): { telHref: string; whatsAppHref: string } | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;
  const e164 = digits.startsWith("233")
    ? digits
    : digits.startsWith("0")
      ? `233${digits.slice(1)}`
      : digits;
  return {
    telHref: `tel:+${e164}`,
    whatsAppHref: `https://wa.me/${e164}?text=${encodeURIComponent(message)}`,
  };
}

function ConfirmContacts({
  contacts,
  eventTitle,
  palette: C,
  staticPreview,
  embedded = false,
}: {
  contacts: { name: string; phone: string }[];
  eventTitle: string;
  palette: FaPalette;
  staticPreview: boolean;
  embedded?: boolean;
}) {
  const rows = contacts.flatMap((contact) => {
    const name = contact.name.trim();
    const links = guestPhoneLinks(
      contact.phone,
      `Hello ${name}, I would like to confirm my attendance for ${eventTitle}.`
    );
    return name && links ? [{ name, ...links }] : [];
  });
  if (!rows.length) return null;

  const action =
    "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2 font-[family-name:var(--font-cinzel)] text-[0.58rem] uppercase tracking-[0.12em]";

  return (
    <div className={embedded ? "text-left" : "mx-auto mt-6 max-w-[22rem] text-left"}>
      {embedded ? null : (
        <p className={`${T.label} uppercase tracking-[0.28em]`} style={{ color: C.cocoa }}>
          Kindly confirm with
        </p>
      )}
      <ul className={embedded ? "flex flex-col gap-2" : "mt-4 flex flex-col gap-2"}>
        {rows.map((row) => {
          const callLabel = (
            <>
              <Phone className="h-3 w-3" aria-hidden />
              Call
            </>
          );
          const whatsAppLabel = (
            <>
              <WhatsAppIcon title="" className="h-3 w-3" />
              WhatsApp
            </>
          );
          return (
            <li key={`${row.name}-${row.telHref}`} className="flex items-center justify-between gap-3">
              <span
                className="min-w-0 truncate font-[family-name:var(--font-cinzel)] text-[0.78rem] font-semibold uppercase tracking-[0.14em]"
                style={{ color: C.ink }}
              >
                {row.name}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                {staticPreview ? (
                  <span className={action} style={{ color: C.ink, borderColor: C.gold }}>
                    {callLabel}
                  </span>
                ) : (
                  <a
                    href={row.telHref}
                    className={action}
                    style={{ color: C.ink, borderColor: C.gold, background: C.linen }}
                    aria-label={`Call ${row.name}`}
                  >
                    {callLabel}
                  </a>
                )}
                {staticPreview ? (
                  <span className={action} style={{ color: C.ink, borderColor: C.gold }}>
                    {whatsAppLabel}
                  </span>
                ) : (
                  <a
                    href={row.whatsAppHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={action}
                    style={{ color: C.ink, borderColor: C.gold, background: C.linen }}
                    aria-label={`WhatsApp ${row.name}`}
                  >
                    {whatsAppLabel}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CoupleNameLockup({
  one,
  two,
  palette: C,
  compact = false,
  featured = false,
  gilded = false,
}: {
  one: string;
  two: string;
  palette: FaPalette;
  compact?: boolean;
  featured?: boolean;
  gilded?: boolean;
}) {
  const nameClass = featured
    ? "mx-auto block w-fit max-w-full whitespace-nowrap font-[family-name:var(--font-cormorant)] text-[clamp(1.35rem,6.2vw,2.28rem)] font-normal italic leading-[1.15] tracking-[0.02em]"
    : compact
      ? T.nameClose
      : T.name;
  const ink = featured || gilded ? C.storyInk : C.ink;
  if (featured) {
    return (
      <>
        <span className={nameClass} style={{ color: ink }}>
          {one}
        </span>
        <span
          className="my-1 block text-center font-[family-name:var(--font-cormorant)] text-[clamp(1.2rem,4.4vw,1.7rem)] font-normal italic leading-none tracking-[0.02em]"
          style={{ color: ink }}
        >
          and
        </span>
        <span className={nameClass} style={{ color: ink }}>
          {two}
        </span>
      </>
    );
  }
  return (
    <>
      <span className={nameClass} style={{ color: ink }}>
        {one}
      </span>
      <span className={`flex items-center justify-center ${compact ? "my-0.5 gap-2" : "my-1.5 gap-3"}`}>
        <span
          className={`${compact ? "w-7" : "w-10"} h-px`}
          style={{ background: `linear-gradient(90deg, transparent, ${ink})` }}
          aria-hidden
        />
        <span
          className={`font-[family-name:var(--font-great-vibes)] leading-none ${compact ? "text-[clamp(1.65rem,4.8vw,2.05rem)]" : "text-[clamp(2.15rem,6.2vw,2.85rem)]"}`}
          style={{ color: ink }}
        >
          and
        </span>
        <span
          className={`${compact ? "w-7" : "w-10"} h-px`}
          style={{ background: `linear-gradient(90deg, ${ink}, transparent)` }}
          aria-hidden
        />
      </span>
      <span className={nameClass} style={{ color: ink }}>
        {two}
      </span>
    </>
  );
}

function storyParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

function WeddingHourglass({
  targetIso,
  name1,
  name2,
  seal,
  displayDate,
  palette: C,
}: {
  targetIso: string;
  name1: string;
  name2: string;
  seal: string;
  displayDate: string;
  palette: FaPalette;
}) {
  const count = useCountdown(targetIso);
  const engraving = hourglassEngraving({
    name1,
    name2,
    seal,
    displayDate,
  });
  return (
    <SeraphineHourglass
      count={count}
      monogram={engraving.monogram}
      coupleLine={engraving.coupleLine}
      dateLine={engraving.dateLine}
      tag={engraving.tag}
      dial="light"
      ink={C.ink}
      labelInk={C.cocoa}
      rule={C.gold}
    />
  );
}

function WeddingCountdown({
  targetIso,
  heading,
  expiredMessage,
  palette: C,
}: {
  targetIso: string;
  heading: string;
  expiredMessage: string;
  palette: FaPalette;
}) {
  const target = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const valid = Number.isFinite(target);
  // Start empty so SSR and the first client paint agree, ticking numbers
  // only appear after mount, which avoids a React #418 text mismatch.
  const [parts, setParts] = useState<ReturnType<typeof diffParts> | null>(null);

  useEffect(() => {
    if (!valid) return;
    setParts(diffParts(target));
    const id = setInterval(() => setParts(diffParts(target)), 1000);
    return () => clearInterval(id);
  }, [target, valid]);

  // Null until mount (and when the ISO is unusable), SSR and the first
  // client paint both render nothing, so the ticking numbers never hydrate
  // against a different clock.
  if (!valid || !parts) return null;

  const cells: [number, string][] = [
    [parts.days, "Days"],
    [parts.hours, "Hours"],
    [parts.minutes, "Minutes"],
    [parts.seconds, "Seconds"],
  ];

  return (
    <div className="text-center">
      <p className={T.scriptSm} style={{ color: C.goldDeep }}>
        {heading}
      </p>
      {parts.expired ? (
        <p className={`mt-4 ${T.sectionLabel}`} style={{ color: C.cocoa }}>
          {expiredMessage}
        </p>
      ) : (
        <div className="mt-5 flex items-stretch justify-center gap-2.5 sm:gap-4">
          {cells.map(([value, label]) => (
            <div
              key={label}
              className="flex min-w-[68px] flex-col items-center rounded-xl px-2 py-3 sm:min-w-[84px]"
              style={{
                background: `linear-gradient(180deg, ${C.linen}, ${C.ivory})`,
                border: `1px solid ${C.border}`,
                boxShadow: `0 12px 26px -18px ${C.goldDeep}`,
              }}
            >
              <span
                className="font-[family-name:var(--font-cinzel)] text-[clamp(1.75rem,5vw,2.35rem)] font-semibold tabular-nums"
                style={{ color: C.ink }}
              >
                {String(value).padStart(2, "0")}
              </span>
              <span
                className={`mt-1 ${T.labelTight} uppercase tracking-[0.22em]`}
                style={{ color: C.cocoa }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- scratch to reveal --------------------------- */

/**
 * Canvas keepsake the guest rubs away with a finger. Falls back to a plain
 * "reveal" button for keyboards, screen readers and reduced motion.
 */
function ScratchCard({
  prompt,
  message,
  palette: C,
}: {
  prompt: string;
  message: string;
  palette: FaPalette;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const drawing = useRef(false);
  const cleared = useRef(0);
  const reduced = useReducedMotion();

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, C.goldSoft);
    gradient.addColorStop(0.5, C.gold);
    gradient.addColorStop(1, C.goldDeep);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, [C.gold, C.goldDeep, C.goldSoft]);

  useEffect(() => {
    if (reduced) return;
    paint();
    window.addEventListener("resize", paint);
    return () => window.removeEventListener("resize", paint);
  }, [paint, reduced]);

  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || revealed) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(e.clientX - rect.left, e.clientY - rect.top, 22, 0, Math.PI * 2);
    ctx.fill();
    cleared.current += 1;
    // ~45 strokes clears enough of the foil to call it revealed
    if (cleared.current > 45) setRevealed(true);
  };

  return (
    <div
      className="relative mx-auto mt-5 max-w-[22rem] overflow-hidden rounded-2xl"
      style={{ border: `1px solid ${C.border}`, background: `linear-gradient(180deg, ${C.linen}, ${C.ivory})` }}
    >
      <p
        className={`px-6 py-8 text-center font-[family-name:var(--font-cormorant)] ${T.bodyLg} leading-relaxed`}
        style={{ color: C.cocoa }}
      >
        {message}
      </p>
      {!revealed && !reduced && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ cursor: "grab" }}
          onPointerDown={(e) => {
            drawing.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            scratch(e);
          }}
          onPointerMove={scratch}
          onPointerUp={() => {
            drawing.current = false;
          }}
          onPointerLeave={() => {
            drawing.current = false;
          }}
        />
      )}
      {!revealed && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className={`absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full px-4 py-1.5 ${T.cta} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
          style={{ color: C.ink, background: `${C.linen}dd`, border: `1px solid ${C.border}` }}
        >
          {prompt}
        </button>
      )}
    </div>
  );
}

/* ------------------------------- template ------------------------------- */

export function ForeverAfarisWeddingTemplate(props: ForeverAfarisWeddingProps) {
  const {
    invitation,
    event,
    design,
    guestId,
    guestName,
    contactEmail,
    memoryUploadUrl,
    memoryAlbumUrl,
  } = props;
  const staticPreview = useInvitationStaticPreview();
  const board = resolveBoard(design);
  const features = board.features;
  const reduced = useReducedMotion();

  const C = useMemo(
    () =>
      resolveWeddingPalette({
        accentColor: board.accentColor,
        blushColor: board.blushColor,
        inkColor: board.inkColor,
        canvasColor: board.canvasColor,
      }),
    [board.accentColor, board.blushColor, board.inkColor, board.canvasColor]
  );

  const invitedGuestName = guestName?.trim() || null;
  const { name1: parsed1, name2: parsed2 } = parseCoupleNames(event.title, event.hostName);
  const dateParts = formatInvitationDateParts(event.startDateRaw ?? event.startDate);

  const couple1 = board.coupleName1 || parsed1;
  const couple2 = board.coupleName2 || parsed2;
  const displayDate = board.displayDate || `${dateParts.month?.toUpperCase()} • ${dateParts.day} • ${dateParts.year}`;
  const weekday = board.weekday || dateParts.weekday?.toUpperCase() || "";
  const timeLabel = board.timeLabel || dateParts.time || "";
  const venueName = board.venueName || event.venueName || "";
  // Hero eyebrow is the single announcement phrase, family heading only if distinct.
  const familyHeading = distinctInvitationPhrase(board.familyHeading, board.eyebrow);

  const mapsHref =
    board.mapUrl?.trim() ||
    buildDirectionsUrl({
      mapsLink: event.mapsLink || props.mapsLink,
      venueName: board.venueName || event.venueName,
      landmark: event.landmark,
    });

  const organizerPhone = event.contactPhone?.trim() || null;
  const organizerEmail = contactEmail?.trim() || null;
  const showRespond = Boolean(features.rsvp || organizerPhone || organizerEmail);

  const heroPortrait = useMemo(() => {
    if (design.heroCleared) return null;
    const hero = (design.media ?? []).find(
      (m) => m.type === "image" && m.role === "hero"
    );
    return hero?.url ?? event.coverImageUrl ?? null;
  }, [design.heroCleared, design.media, event.coverImageUrl]);

  const galleryImages = useMemo(() => {
    // Explicit gallery uploads own this section. An image must stay in Moments
    // even when the host also reuses it as hero, cover, intro, or background.
    // Reference media is appended for legacy published snapshots, then deduped.
    const fromUploads = (props.galleryUrls ?? []).map((url) => ({
      url,
      name: undefined as string | undefined,
      video: isVideoUrl(url),
    }));
    const fromMedia = (design.media ?? [])
      .filter(
        (m) =>
          m.role === "reference" &&
          (m.type === "image" || m.type === "video" || isVideoUrl(m.url))
      )
      .map((m) => ({
        url: m.url,
        name: m.name,
        video: m.type === "video" || isVideoUrl(m.url),
      }));

    const seen = new Set<string>();
    return [...fromUploads, ...fromMedia].filter((item) => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [design.media, props.galleryUrls]);

  const [openMoment, setOpenMoment] = useState<number | null>(null);
  const [momentPage, setMomentPage] = useState(1);
  const momentsPerPage = 4;
  const momentItems = useMemo(
    () =>
      galleryImages.map((item) => ({
        url: item.url,
        type: item.video ? ("video" as const) : ("image" as const),
        caption: item.name?.trim() || null,
      })),
    [galleryImages]
  );
  const momentPageCount = Math.max(1, Math.ceil(galleryImages.length / momentsPerPage));
  const safeMomentPage = Math.min(momentPage, momentPageCount);
  const pagedMoments = galleryImages
    .map((item, index) => ({ ...item, index }))
    .slice((safeMomentPage - 1) * momentsPerPage, safeMomentPage * momentsPerPage);

  useEffect(() => {
    if (openMoment === null || typeof document === "undefined") return;
    const scroller = document.querySelector<HTMLElement>(".invite-viewport-live");
    if (!scroller) return;
    const previous = scroller.style.overflowY;
    scroller.style.overflowY = "hidden";
    return () => {
      scroller.style.overflowY = previous;
    };
  }, [openMoment]);

  const countdownTarget =
    board.countdownTarget?.trim() || event.startDateRaw || event.startDate;

  const celebrationDays = useMemo(() => {
    const source = `${event.startDateRaw || ""} ${event.startDate || ""} ${board.displayDate || ""}`;
    const yearMatch = source.match(/\b(20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : Number.NaN;
    return celebrationDayGroups(
      celebrationMomentsFromProgramme(
        board.programmeItems,
        year,
        event.startDateRaw || event.startDate || ""
      )
    );
  }, [board.displayDate, board.programmeItems, event.startDate, event.startDateRaw]);

  const celebrationEvents = useMemo<CalendarEventInput[]>(() => {
    if (celebrationDays.length < 2) return [];
    const couple =
      couple1 && couple2 ? `${couple1} & ${couple2}` : event.title?.trim() || "Wedding celebration";
    return celebrationDays.flatMap((day) =>
      day.moments.map((moment) => ({
        title: `${couple} — ${moment.title}`,
        startDateRaw: moment.startIso,
        endDateRaw: moment.endIso,
        venue: moment.place || undefined,
        timeZone: /(?:Z|\+00:00)$/.test(moment.startIso) ? "Africa/Accra" : undefined,
        reminderMinutesBefore: [24 * 60, 60],
        description: `${moment.weekday} ${moment.day} ${moment.month} ${moment.year} · ${moment.timeLabel}${
          moment.place ? `\n${moment.place}` : ""
        }`,
      }))
    );
  }, [celebrationDays, couple1, couple2, event.title]);

  const venueStops = useMemo(() => {
    const sharedMap = board.mapUrl?.trim() || "";
    const seen = new Set<string>();
    return celebrationDays.flatMap((day) =>
      day.moments.flatMap((moment) => {
        const item = board.programmeItems.find((entry) => entry.id === moment.id);
        const pinUrl = programmeMapUrl(item, moment.place, venueName, sharedMap);
        if (!pinUrl || seen.has(pinUrl)) return [];
        seen.add(pinUrl);
        const address = pinUrl === sharedMap ? board.venueAddress?.trim() || "" : "";
        const coords = extractMapsCoordinates(pinUrl);
        const guestMapUrl = coords
          ? googleMapsDirectionsHref({ label: moment.place, lat: coords.lat, lng: coords.lng })
          : item?.mapLink?.trim() || pinUrl;
        const href = coords
          ? guestMapUrl
          : resolveMapsLocationHref({
              mapsUrl: guestMapUrl,
              locationName: moment.place,
              address,
            });
        const base = celebrationEvents.find((entry) => entry.title.endsWith(`— ${moment.title}`));
        const placeLine = calendarEventLocation(moment.place, address);
        const event: CalendarEventInput = {
          title: base?.title || moment.title,
          startDateRaw: base?.startDateRaw || moment.startIso,
          endDateRaw: base?.endDateRaw || moment.endIso,
          timeZone: base?.timeZone,
          reminderMinutesBefore: base?.reminderMinutesBefore ?? [24 * 60, 60],
          venue: placeLine || undefined,
          description: [base?.description, href || guestMapUrl].filter(Boolean).join("\n"),
        };
        return [
          {
            id: moment.id,
            when: `${moment.weekday} ${moment.day} ${moment.month} · ${moment.timeLabel}`,
            title: moment.title,
            place: moment.place,
            address,
            mapsUrl: href || guestMapUrl,
            pinUrl,
            event,
          },
        ];
      })
    );
  }, [board.mapUrl, board.programmeItems, board.venueAddress, celebrationDays, celebrationEvents, venueName]);

  const calendarEvent = useMemo<CalendarEventInput>(
    () => ({
      title:
        couple1 && couple2
          ? `${couple1} & ${couple2}`
          : event.title?.trim() || "Wedding celebration",
      startDateRaw: event.startDateRaw || event.startDate || "",
      venue: [venueName, board.venueAddress].filter(Boolean).join(" · ") || undefined,
      description: [board.invitationCopy, board.receptionText, board.accessNote]
        .filter(Boolean)
        .join("\n")
        .slice(0, 500),
    }),
    [
      board.accessNote,
      board.invitationCopy,
      board.receptionText,
      board.venueAddress,
      couple1,
      couple2,
      event.startDate,
      event.startDateRaw,
      event.title,
      venueName,
    ]
  );

  const greetedName = invitedGuestName || board.greetingFallbackName;

  /* ------------------------------ scenes ------------------------------ */

  const scenes: Partial<Record<WeddingSectionId, React.ReactNode>> = {
    hero: (
      <Reveal as="section" className="text-center">
        {features.guestWelcome && invitedGuestName && !props.placeCard && (
          <div
            className="mx-auto mb-6 inline-flex flex-col rounded-2xl px-6 py-3"
            style={{ background: `${C.linen}cc`, border: `1px solid ${C.border}` }}
            data-invite-field="guest-welcome"
          >
            <span className={`${T.label} uppercase tracking-[0.28em]`} style={{ color: C.cocoa }}>
              Invited guest
            </span>
            <span
              className="font-[family-name:var(--font-cinzel)] text-[clamp(1.2rem,3.5vw,1.5rem)]"
              style={{ color: C.goldDeep }}
              data-invite-field="guest-name"
            >
              {invitedGuestName}
            </span>
          </div>
        )}

        {features.heroPortrait && heroPortrait && (
          <HeroPortrait
            url={heroPortrait}
            caption={board.heroCaption}
            palette={C}
            reduced={Boolean(reduced)}
          />
        )}

        <p className={`${T.label} uppercase tracking-[0.3em]`} style={{ color: C.cocoa }}>
          {board.eyebrow}
        </p>

        {board.scriptTitle && (
          <p
            className="mt-3 font-[family-name:var(--font-great-vibes)] text-[clamp(2.2rem,6.4vw,3.15rem)] leading-none"
            style={{ color: C.goldDeep }}
          >
            {board.scriptTitle}
          </p>
        )}

        <h1 className="mx-auto mt-7 w-full">
          <CoupleNameLockup one={couple1} two={couple2} palette={C} featured />
        </h1>

        <p
          className={`mx-auto mt-6 max-w-[34rem] font-[family-name:var(--font-cormorant)] ${T.bodyLg} leading-relaxed`}
          style={{ color: C.cocoa }}
        >
          {board.invitationCopy}
        </p>
      </Reveal>
    ),

    family:
      features.familyIntro && board.familyIntro ? (
        <Reveal as="section" className="text-center">
          {familyHeading ? (
            <h2 className={T.sectionLabel} style={{ color: C.gold }}>
              {familyHeading}
            </h2>
          ) : null}
          <p
            className={
              familyHeading
                ? `mx-auto mt-4 max-w-[34rem] font-[family-name:var(--font-cormorant)] ${T.body} leading-relaxed`
                : `mx-auto max-w-[34rem] font-[family-name:var(--font-cormorant)] ${T.body} leading-relaxed`
            }
            style={{ color: C.cocoa }}
          >
            {board.familyIntro}
          </p>
        </Reveal>
      ) : null,

    details: (
      <Reveal as="section" className="text-center">
        {calendarEvent.startDateRaw ? (
          <WeddingDateSaveRow
            weekday={weekday}
            displayDate={displayDate}
            timeLabel={timeLabel}
            palette={C}
            calendarEvent={calendarEvent}
            calendarEvents={celebrationEvents}
            days={celebrationDays}
            staticPreview={staticPreview}
          />
        ) : (
          <div
            className="mx-auto flex max-w-[22rem] items-stretch justify-center gap-4 py-4"
            style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}
          >
            <div
              className={`flex flex-col justify-center text-right ${T.labelTight} uppercase tracking-[0.2em]`}
              style={{ color: C.cocoa }}
            >
              <span>{weekday}</span>
            </div>
            <div
              className="px-3 font-[family-name:var(--font-cinzel)] text-[clamp(1.15rem,3.2vw,1.4rem)] font-semibold"
              style={{
                color: C.ink,
                borderLeft: `1px solid ${C.border}`,
                borderRight: `1px solid ${C.border}`,
              }}
            >
              <div className="py-1">{displayDate}</div>
            </div>
            <div
              className="flex min-w-[5.5rem] flex-col justify-center whitespace-nowrap text-left text-[clamp(1.05rem,2.8vw,1.25rem)] font-semibold uppercase tracking-[0.12em]"
              style={{ color: C.cocoa }}
            >
              <span>{timeLabel}</span>
            </div>
          </div>
        )}

        {!features.location && venueName ? (
          <p
            className="mt-5 font-[family-name:var(--font-cinzel)] text-[clamp(0.95rem,2.5vw,1.15rem)] tracking-[0.14em]"
            style={{ color: C.ink }}
          >
            {venueName}
          </p>
        ) : null}

        {features.location ? (
          venueStops.length >= 2 ? (
            <div className="mt-7 grid w-full grid-cols-1 items-stretch gap-8 text-center sm:grid-cols-2 sm:gap-5 md:gap-6 lg:gap-8">
              {venueStops.map((stop) => (
                <VenueMapCard
                  key={stop.id}
                  stop={stop}
                  palette={C}
                  buttonLabel={board.mapButtonLabel}
                  staticPreview={staticPreview}
                />
              ))}
            </div>
          ) : (
          <div className="mt-7 text-center">
            <VenueSketch palette={C} />
            <p
              className="mt-4 font-[family-name:var(--font-cinzel)] text-[clamp(0.95rem,2.5vw,1.15rem)] tracking-[0.14em]"
              style={{ color: C.ink }}
            >
              {venueName}
            </p>
            {board.venueAddress && (
              <p
                className={`mt-1 font-[family-name:var(--font-cormorant)] ${T.body}`}
                style={{ color: C.cocoa }}
              >
                {board.venueAddress}
              </p>
            )}
            {mapsHref && !staticPreview && (
              <Link
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 ${T.cta} transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
                style={{
                  color: C.ink,
                  background: `linear-gradient(135deg, ${C.goldSoft}, ${C.gold})`,
                  boxShadow: `0 12px 26px -14px ${C.goldDeep}`,
                }}
              >
                {board.mapButtonLabel}
              </Link>
            )}
          </div>
          )
        ) : null}

        {board.receptionText &&
        !celebrationDays.some((day) =>
          day.moments.some((moment) => /reception/i.test(moment.title))
        ) ? (
          <p className={`mt-5 ${T.scriptSm}`} style={{ color: C.goldDeep }}>
            {board.receptionText}
          </p>
        ) : null}
        {board.accessNote && (
          <p
            className={`mx-auto mt-4 w-fit max-w-full rounded-full border px-4 py-2 ${T.labelTight} font-semibold uppercase leading-relaxed tracking-[0.2em]`}
            style={{
              color: C.cocoa,
              borderColor: C.rose,
              background: `color-mix(in srgb, ${C.rose} 12%, transparent)`,
              boxShadow: `0 6px 20px -14px ${C.cocoa}`,
            }}
          >
            {board.accessNote}
          </p>
        )}
      </Reveal>
    ),

    countdown: features.countdown ? (
      <Reveal as="section">
        {weddingBoardUsesHourglass(
          design.experience?.countdownStyle as string | undefined,
          board.coupleName1,
          board.coupleName2
        ) ? (
          <div className="text-center">
            <p className={T.scriptSm} style={{ color: C.goldDeep }}>
              {board.countdownHeading}
            </p>
            <div className="mx-auto mt-4 w-full max-w-[22rem]">
              <WeddingHourglass
                targetIso={countdownTarget}
                name1={board.coupleName1}
                name2={board.coupleName2}
                seal={board.sealMonogram}
                displayDate={board.displayDate}
                palette={C}
              />
            </div>
          </div>
        ) : (
          <WeddingCountdown
            targetIso={countdownTarget}
            heading={board.countdownHeading}
            expiredMessage={board.countdownExpiredMessage}
            palette={C}
          />
        )}
      </Reveal>
    ) : null,

    greeting:
      features.greeting && board.greetingBody ? (
        <Reveal as="section" className="text-center">
          <h2 className={T.scriptSm} style={{ color: C.goldDeep }}>
            {board.greetingHeading}
          </h2>
          {/* Guest name already shown in welcome, never repeat it here. */}
          {!(features.guestWelcome && invitedGuestName) && (
            <>
              <p
                className="mt-3 font-[family-name:var(--font-cinzel)] text-[clamp(1.1rem,3vw,1.35rem)] tracking-[0.1em]"
                style={{ color: C.ink }}
                data-invite-field="greeting-name"
              >
                {greetedName}
              </p>
              <div className="mx-auto mt-3 h-px w-12" style={{ background: C.gold }} />
            </>
          )}
          <p
            className={`mx-auto mt-4 max-w-[34rem] font-[family-name:var(--font-cormorant)] ${T.bodyLg} italic leading-relaxed`}
            style={{ color: C.cocoa }}
          >
            {board.greetingBody}
          </p>
        </Reveal>
      ) : null,

    programme:
      features.programme && board.programmeItems.length > 0 ? (
        <section className="mx-auto w-full min-w-0 max-w-[34rem]">
          <Reveal>
            <h2 className={`text-center ${T.scriptSm}`} style={{ color: C.goldDeep }}>
              {board.programmeHeading}
            </h2>
          </Reveal>
          {/* Always-visible list — never gate programme copy behind scroll IO. */}
          <ol className="relative mx-auto mt-6 w-full space-y-6 text-center sm:space-y-7">
            {board.programmeItems.map((item) => (
              <li key={item.id} className="relative min-w-0 text-center">
                <span
                  aria-hidden
                  className="mx-auto mb-2 block h-[9px] w-[9px] rounded-full"
                  style={{ background: C.gold, boxShadow: `0 0 0 3px ${C.ivory}, 0 0 10px ${C.goldSoft}` }}
                />
                {item.time ? (
                  <p
                    className={T.programmeTime}
                    style={{
                      color: C.ink,
                      background: `color-mix(in srgb, ${C.gold} 28%, ${C.linen})`,
                      boxShadow: `inset 0 0 0 1px ${C.gold}`,
                    }}
                  >
                    {item.time}
                  </p>
                ) : null}
                <p className={`${T.programmeTitle} text-center`} style={{ color: C.ink }}>
                  {item.title}
                </p>
                {item.description && (
                  <ProgrammeNote
                    id={item.id}
                    title={item.title}
                    description={item.description}
                    palette={C}
                  />
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : null,

    // Venue renders inside details so it always follows date/time and precedes
    // the reception phrase, independent of an older saved section order.
    venue: null,

    dressCode: features.dressCode ? (
      <Reveal as="section" className="text-center">
        <h2 className={T.sectionLabel} style={{ color: C.gold }}>
          {board.dressCodeHeading}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {board.dressCodeOccasions?.length ? (
            board.dressCodeOccasions.map((occasion) => (
              <DressCard
                key={occasion.kicker || occasion.title}
                kicker={occasion.kicker}
                label={occasion.title}
                body={occasion.detail}
                palette={C}
              />
            ))
          ) : (
            <>
              <DressCard label="Ladies" body={board.dressCodeLadies} palette={C} />
              <DressCard label="Gents" body={board.dressCodeGents} palette={C} />
            </>
          )}
        </div>
      </Reveal>
    ) : null,

    guestPolicy: features.guestPolicy ? (
      <Reveal as="section" className="text-center">
        <h2
          className="mx-auto max-w-[34rem] font-[family-name:var(--font-cinzel)] text-[clamp(0.95rem,2.5vw,1.15rem)] font-semibold uppercase tracking-[0.12em]"
          style={{ color: C.ink }}
        >
          {board.guestPolicyHeading}
        </h2>
        <p
          className={`mx-auto mt-4 max-w-[34rem] font-[family-name:var(--font-cormorant)] ${T.body} leading-relaxed`}
          style={{ color: C.cocoa }}
        >
          {board.guestPolicyBody}
        </p>
      </Reveal>
    ) : null,

    rsvp: showRespond ? (
      <Reveal as="section">
        <TraditionalMarriageRespond
          collectEmail={false}
          invitationId={invitation.id}
          guestId={guestId}
          guestName={invitedGuestName}
          eventTitle={event.title}
          rsvpHeading={board.rsvpHeading}
          showRsvp={Boolean(features.rsvp)}
          partyAllowance={
            props.partyAllowance ??
            props.placeCard?.party.allowance ??
            props.placeCard?.recipient.partySize ??
            1
          }
          initialRsvpStatus={props.initialRsvpStatus}
          initialAttendingCount={props.initialAttendingCount}
          organizerPhone={board.rsvpContacts.length ? null : organizerPhone}
          organizerEmail={board.rsvpContacts.length ? null : organizerEmail}
          reachHosts={
            board.rsvpContacts.length ? (
              <ConfirmContacts
                embedded
                contacts={board.rsvpContacts}
                eventTitle={event.title}
                palette={C}
                staticPreview={staticPreview}
              />
            ) : undefined
          }
        />
      </Reveal>
    ) : null,

    story:
      features.story && board.storyBody ? (
        <Reveal as="section" className="text-center">
          <h2 className={T.scriptSm} style={{ color: C.goldDeep }}>
            {board.storyHeading}
          </h2>
          <div className="mx-auto mt-6 flex max-w-[32rem] flex-col gap-4 text-left">
            {storyParagraphs(board.storyBody).map((paragraph) => (
              <p
                key={paragraph}
                className={`font-[family-name:var(--font-cormorant)] italic leading-[1.65] ${
                  isEdwinLordinaBook(couple1, couple2)
                    ? "text-[clamp(1.1875rem,3vw,1.4rem)]"
                    : T.body
                }`}
                style={{ color: C.storyInk }}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </Reveal>
      ) : null,

    gallery:
      features.gallery && galleryImages.length > 0 ? (
        <Reveal as="section">
          <h2 className={`text-center ${T.scriptSm}`} style={{ color: C.goldDeep }}>
            {board.galleryHeading}
          </h2>
          <div className="mx-auto mt-5 grid w-full grid-cols-2 gap-2.5 min-[375px]:gap-3 sm:gap-4 lg:gap-5">
            {pagedMoments.map((m) => (
              <button
                key={`${m.url}-${m.index}`}
                type="button"
                className="relative block w-full overflow-hidden rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ aspectRatio: "3 / 4", border: `1px solid ${C.border}`, outlineColor: C.gold }}
                aria-label={`View ${m.name || "wedding moment"} full screen`}
                onClick={() => setOpenMoment(m.index)}
              >
                {m.video ? (
                  <video
                    src={m.url}
                    playsInline
                    muted
                    preload="metadata"
                    aria-hidden
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <Image
                    src={m.url}
                    alt=""
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 46vw, (max-width: 1024px) 42vw, 440px"
                    className="object-cover"
                    unoptimized={shouldUnoptimizeNextImage(m.url)}
                  />
                )}
              </button>
            ))}
          </div>
          {momentPageCount > 1 ? (
            <div className="mt-5 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={safeMomentPage <= 1}
                onClick={() => setMomentPage((current) => Math.max(1, current - 1))}
                className={`${T.cta} disabled:opacity-35`}
                style={{ color: C.ink }}
              >
                Previous
              </button>
              <span className={T.labelTight} style={{ color: C.cocoa }}>
                {safeMomentPage} / {momentPageCount}
              </span>
              <button
                type="button"
                disabled={safeMomentPage >= momentPageCount}
                onClick={() => setMomentPage((current) => Math.min(momentPageCount, current + 1))}
                className={`${T.cta} disabled:opacity-35`}
                style={{ color: C.ink }}
              >
                Next
              </button>
            </div>
          ) : null}
          {openMoment !== null && typeof document !== "undefined"
            ? createPortal(
                <InvitationMediaLightbox
                  items={momentItems}
                  initialIndex={openMoment}
                  onClose={() => setOpenMoment(null)}
                  closeLabel="Close"
                />,
                document.body
              )
            : null}
        </Reveal>
      ) : null,

    scratch:
      features.scratch && board.scratchMessage && !staticPreview ? (
        <Reveal as="section" className="text-center">
          <h2 className={T.scriptSm} style={{ color: C.goldDeep }}>
            {board.scratchHeading}
          </h2>
          <ScratchCard prompt={board.scratchPrompt} message={board.scratchMessage} palette={C} />
        </Reveal>
      ) : null,

    memory:
      features.memory && (memoryUploadUrl || memoryAlbumUrl) && !staticPreview ? (
        <Reveal as="section" className="text-center">
          <h2 className={T.scriptSm} style={{ color: C.goldDeep }}>
            {board.memoryHeading}
          </h2>
          <p
            className={`mx-auto mt-3 max-w-[34rem] font-[family-name:var(--font-cormorant)] ${T.body} leading-relaxed`}
            style={{ color: C.cocoa }}
          >
            {board.memoryBody}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {memoryUploadUrl && (
              <Link
                href={celebrationPath(memoryUploadUrl)}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-3 ${T.cta} transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
                style={{
                  color: C.ink,
                  background: `linear-gradient(135deg, ${C.goldSoft}, ${C.gold})`,
                  boxShadow: `0 12px 26px -14px ${C.goldDeep}`,
                }}
              >
                {board.memoryCta}
              </Link>
            )}
            {memoryAlbumUrl && (
              <Link
                href={celebrationPath(memoryAlbumUrl)}
                className={`inline-flex items-center gap-2 border-b pb-0.5 ${T.cta} transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
                style={{ color: C.cocoa, borderColor: C.border }}
              >
                View the album
              </Link>
            )}
          </div>
        </Reveal>
      ) : null,

    closing: features.closing ? (
      <Reveal as="section" className="text-center">
        <h2 className={T.script} style={{ color: C.goldDeep }}>
          {board.closingHeading}
        </h2>
        <p
          className={`mx-auto mt-4 max-w-[34rem] font-[family-name:var(--font-cormorant)] ${T.bodyLg} leading-relaxed`}
          style={{ color: C.cocoa }}
        >
          {board.closingMessage}
        </p>
        {board.closingSignature && couple1 && couple2 ? (
          <p className="mx-auto mt-8 w-full" aria-label={board.closingSignature}>
            <CoupleNameLockup one={couple1} two={couple2} palette={C} gilded />
          </p>
        ) : board.closingSignature ? (
          <p className={`mt-4 ${T.scriptSm}`} style={{ color: C.ink }}>
            {board.closingSignature}
          </p>
        ) : null}
        {board.hashtag && (
          <p
            className="mt-5 font-[family-name:var(--font-great-vibes)] text-[clamp(2.15rem,7vw,2.85rem)] leading-none"
            style={{ color: C.goldDeep }}
          >
            {board.hashtag}
          </p>
        )}
        {!staticPreview && (
          <button
            type="button"
            onClick={requestInvitationReplay}
            className={`mt-7 inline-flex items-center gap-2 rounded-full px-5 py-2.5 ${T.cta} transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
            style={{ color: C.cocoa, background: `${C.linen}cc`, border: `1px solid ${C.border}` }}
          >
            ↻ {board.replayLabel}
          </button>
        )}
      </Reveal>
    ) : null,
  };

  const visible = board.sectionOrder
    .map((id) => ({ id, node: scenes[id] }))
    .filter((entry): entry is { id: WeddingSectionId; node: React.ReactNode } => {
      if (!entry.node) return false;
      if (props.placeCard && entry.id === "greeting") return false;
      return true;
    });

  const streamSections = isEdwinLordinaBook(couple1, couple2) && !staticPreview;
  const visibleById = new Map(visible.map((entry) => [entry.id, entry]));

  const renderEntry = (id: WeddingSectionId, showDivider: boolean) => {
    const entry = visibleById.get(id);
    if (!entry) return null;
    return (
      <div key={entry.id} className="min-w-0">
        {showDivider ? <Divider palette={C} /> : null}
        {entry.node}
        {entry.id === "hero" && props.placeCard && (
          <ClientErrorBoundary fallback={null}>
            <PlaceCard
              config={props.placeCard.config}
              recipient={props.placeCard.recipient}
              party={props.placeCard.party}
              seating={props.placeCard.seating}
              design={design}
              className="mt-8 px-0"
            />
            {scenes.greeting ? <div className="mt-8">{scenes.greeting}</div> : null}
          </ClientErrorBoundary>
        )}
      </div>
    );
  };

  return (
    <div
      className="relative min-h-[100dvh] w-full"
      style={{
        background: `linear-gradient(180deg, ${C.ivory} 0%, ${C.blush} 45%, ${C.ivory} 100%)`,
        color: C.ink,
      }}
    >
      <PageFlora palette={C} />
      <div className="relative mx-auto w-full max-w-[480px] px-4 pb-[max(4rem,env(safe-area-inset-bottom))] pt-8 min-[375px]:px-5 sm:max-w-[640px] sm:px-8 sm:pt-10 md:max-w-[800px] md:px-10 lg:max-w-[960px] lg:pt-14">
        {streamSections ? (
          <WeddingScroll
            sections={visible.map((entry, index) => ({
              id: entry.id,
              node: renderEntry(entry.id, index > 0),
            }))}
          />
        ) : (
          visible.map((entry, index) => renderEntry(entry.id, index > 0))
        )}
      </div>
    </div>
  );
}

/* ------------------------------- helpers -------------------------------- */

/** Hero photograph in a champagne arch, drifting gently against the scroll. */
function HeroPortrait({
  url,
  caption,
  palette: C,
  reduced,
}: {
  url: string;
  caption?: string;
  palette: FaPalette;
  reduced: boolean;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ["start end", "end start"],
  });
  const drift = useSpring(useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]), {
    stiffness: 80,
    damping: 24,
  });

  return (
    <div className="mb-8">
      <div
        ref={frameRef}
        className="relative mx-auto overflow-hidden"
        style={{
          width: "min(78vw, 320px)",
          aspectRatio: "3 / 4",
          borderRadius: "9999px 9999px 14px 14px",
          border: `1px solid ${C.goldSoft}`,
          boxShadow: `0 26px 50px -26px ${C.goldDeep}`,
          background: C.linen,
        }}
      >
        <motion.div className="absolute inset-[-10%]" style={reduced ? undefined : { y: drift }}>
          <Image
            src={url}
            alt={caption || "The couple"}
            fill
            priority
            sizes="(max-width: 640px) 78vw, 320px"
            className="object-cover object-[center_22%]"
            unoptimized={shouldUnoptimizeNextImage(url)}
          />
        </motion.div>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, transparent 55%, ${C.ivory}cc 100%)`,
            borderRadius: "inherit",
          }}
        />
      </div>
      {caption && (
        <p
          className={`mt-3 text-center font-[family-name:var(--font-cormorant)] ${T.body} italic`}
          style={{ color: C.cocoa }}
        >
          {caption}
        </p>
      )}
    </div>
  );
}

/** A blank line between a dish and the next section is collapsed to one space upstream. */
function peelSectionLabel(line: string): string[] {
  const match = line.match(/^(.*\S)\s+([A-Z][A-Z &/-]{2,20})$/);
  if (!match) return [line];
  const [, dish, label] = match;
  if (!dish || dish === dish.toUpperCase()) return [line];
  return [dish, label];
}

function isLongProgrammeNote(description: string): boolean {
  const lines = description.split("\n").map((line) => line.trim()).filter(Boolean);
  return description.length > 140 || lines.length > 3;
}

const MENU_SMALL_WORDS = new Set(["and", "or", "in", "of", "with", "the", "a"]);

/** Title-case a dish the way a printed menu would, keeping names that are already set. */
function menuPhrase(raw: string): string {
  const cleaned = raw
    .replace(/\s*\(([^)]+)\)/g, (_, inner: string) => {
      const note = String(inner).trim();
      const titled = note.charAt(0).toUpperCase() + note.slice(1);
      return /shito/i.test(note) ? ` ${titled}` : `, ${titled}`;
    })
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ");
  const phrased = words
    .map((word, index) => {
      if (word !== word.toLowerCase()) return word;
      const lower = word.toLowerCase();
      if (index > 0 && MENU_SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
  return phrased.replace(/\b(Deep|Stir|Pan) Fried\b/g, "$1-Fried");
}

function menuSections(lines: { text: string; heading: boolean }[]) {
  const sections: { heading: string; dishes: string[] }[] = [];
  for (const line of lines) {
    if (line.heading) {
      sections.push({ heading: line.text, dishes: [] });
      continue;
    }
    if (!sections.length) sections.push({ heading: "", dishes: [] });
    sections[sections.length - 1]?.dishes.push(menuPhrase(line.text));
  }
  return sections.filter((section) => section.heading || section.dishes.length);
}

function ProgrammeNote({
  id,
  title,
  description,
  palette: C,
}: {
  id: string;
  title: string;
  description: string;
  palette: FaPalette;
}) {
  const [open, setOpen] = useState(false);
  if (!isLongProgrammeNote(description)) {
    return (
      <p
        className={`${T.programmeDesc} inline max-w-full italic leading-[1.35] [box-decoration-break:clone]`}
        data-programme-place=""
        style={{
          color: C.ink,
          backgroundImage: `linear-gradient(transparent 0.55em, color-mix(in srgb, ${C.gold} 58%, white) 0.55em)`,
          WebkitBoxDecorationBreak: "clone",
          boxDecorationBreak: "clone",
          padding: "0 0.2em 0.08em",
        }}
      >
        {description}
      </p>
    );
  }

  const menu = /menu/i.test(title);
  const panelId = `programme-note-${id}`;
  const lines = description
    .split("\n")
    .flatMap((line) => peelSectionLabel(line.trim()))
    .filter(Boolean)
    .map((text) => ({
      text,
      heading: text === text.toUpperCase() && /[A-Z]/.test(text) && text.length < 24,
    }));

  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 font-[family-name:var(--font-cinzel)] text-[0.74rem] font-semibold uppercase tracking-[0.18em] transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          color: C.ink,
          background: `linear-gradient(135deg, ${C.goldSoft}, ${C.gold})`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 12px 22px -16px ${C.goldDeep}`,
          outlineColor: C.goldDeep,
        }}
      >
        {open ? (menu ? "Hide the menu" : "Hide details") : menu ? "View the menu" : "View details"}
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 border-b-[1.5px] border-r-[1.5px]"
          style={{
            borderColor: C.ink,
            transform: open ? "rotate(-135deg) translateY(1px)" : "rotate(45deg) translateY(-1px)",
          }}
        />
      </button>
      {open ? (
        menu ? (
          <div
            id={panelId}
            className="mt-4 rounded-[1.35rem] px-5 py-7 text-center sm:px-8"
            style={{
              background: `linear-gradient(180deg, ${C.ivory} 0%, ${C.linen} 100%)`,
              border: `1px solid ${C.border}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.8), 0 22px 40px -30px ${C.ink}`,
            }}
          >
            {menuSections(lines).map((section, sectionIndex) => (
              <div key={section.heading || sectionIndex} className={sectionIndex === 0 ? "" : "mt-6"}>
                {section.heading ? (
                  <div className="mb-2.5 flex items-center justify-center gap-3">
                    <span
                      className="h-px w-8"
                      style={{ background: `linear-gradient(90deg, transparent, ${C.gold})` }}
                      aria-hidden
                    />
                    <p
                      className="font-[family-name:var(--font-cinzel)] text-[0.68rem] font-semibold uppercase tracking-[0.32em]"
                      style={{ color: C.goldDeep }}
                    >
                      {section.heading}
                    </p>
                    <span
                      className="h-px w-8"
                      style={{ background: `linear-gradient(90deg, ${C.gold}, transparent)` }}
                      aria-hidden
                    />
                  </div>
                ) : null}
                <ul className="space-y-1">
                  {section.dishes.map((dish) => (
                    <li
                      key={dish}
                      className="font-[family-name:var(--font-cormorant)] text-[clamp(1.15rem,3vw,1.35rem)] italic leading-tight"
                      style={{ color: C.ink }}
                    >
                      {dish}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div id={panelId} className="mt-3 space-y-1">
            {lines.map((line, index) =>
              line.heading ? (
                <p
                  key={`${line.text}-${index}`}
                  className={`${index === 0 ? "" : "pt-2"} font-[family-name:var(--font-cinzel)] text-[0.72rem] uppercase tracking-[0.18em]`}
                  style={{ color: C.goldDeep }}
                >
                  {line.text}
                </p>
              ) : (
                <p
                  key={`${line.text}-${index}`}
                  className="font-[family-name:var(--font-cormorant)] text-[clamp(0.98rem,2.4vw,1.125rem)] leading-snug"
                  style={{ color: C.cocoa }}
                >
                  {line.text}
                </p>
              )
            )}
          </div>
        )
      ) : null}
    </div>
  );
}

function DressCard({
  kicker,
  label,
  body,
  palette: C,
}: {
  kicker?: string;
  label: string;
  body: string;
  palette: FaPalette;
}) {
  return (
    <div
      className="rounded-2xl px-5 py-5 text-left"
      style={{ background: `linear-gradient(180deg, ${C.linen}, ${C.ivory})`, border: `1px solid ${C.border}` }}
    >
      {kicker ? (
        <p
          className="font-[family-name:var(--font-cinzel)] text-[0.68rem] font-semibold uppercase tracking-[0.2em]"
          style={{ color: C.goldDeep }}
        >
          {kicker}
        </p>
      ) : null}
      {label.trim() ? (
        <p className={`${T.scriptSm} ${kicker ? "mt-1" : ""}`} style={{ color: C.goldDeep }}>
          {label}
        </p>
      ) : null}
      <p
        className={`mt-2 font-[family-name:var(--font-cormorant)] ${T.body} leading-relaxed`}
        style={{ color: C.cocoa }}
      >
        {body}
      </p>
    </div>
  );
}

function VenueMapCard({
  stop,
  palette: C,
  buttonLabel,
  staticPreview,
}: {
  stop: {
    when: string;
    title: string;
    place: string;
    address: string;
    mapsUrl: string;
    pinUrl: string;
    event: CalendarEventInput;
  };
  palette: FaPalette;
  buttonLabel: string;
  staticPreview: boolean;
}) {
  const pinLink = stop.pinUrl || stop.mapsUrl;
  const hasPin = Boolean(extractMapsCoordinates(pinLink));
  const embedUrl = hasPin ? null : toMapsEmbedUrl(pinLink, stop.place, 17);

  return (
    <article className="flex h-full w-full min-w-0 flex-col">
      <div className="flex flex-1 flex-col">
        <p
          className={`${T.labelTight} font-[family-name:var(--font-cinzel)] font-extrabold uppercase tracking-[0.16em]`}
          style={{ color: C.goldDeep }}
        >
          {stop.when}
        </p>
        <h3
          className="mt-2 text-balance font-[family-name:var(--font-cinzel)] text-[clamp(0.95rem,2.2vw,1.12rem)] font-extrabold leading-snug tracking-[0.08em]"
          style={{ color: C.ink }}
        >
          {stop.title}
        </h3>
        <p
          className={`mt-2 text-balance font-[family-name:var(--font-cormorant)] font-bold ${T.body}`}
          style={{ color: C.ink }}
        >
          {stop.place}
        </p>
        {stop.address ? (
          <p className={`text-balance font-[family-name:var(--font-cormorant)] font-bold ${T.body}`} style={{ color: C.cocoa }}>
            {stop.address}
          </p>
        ) : null}
      </div>
      {hasPin || embedUrl ? (
        <div
          className="relative mt-4 w-full shrink-0 overflow-hidden"
          style={{
            borderRadius: 22,
            border: `1px solid ${C.border}`,
            boxShadow: `0 22px 36px -24px ${C.ink}`,
          }}
        >
          {hasPin ? (
            <InvitationMapPreview mapsLink={pinLink} place={stop.place} />
          ) : (
            <iframe
              title={`Map of ${stop.place}`}
              src={embedUrl ?? undefined}
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
              className="pointer-events-none h-56 w-full bg-[#FBF6EF]"
            />
          )}
          {!staticPreview && stop.mapsUrl ? (
            <Link
              href={stop.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${stop.place} in Google Maps`}
              className="absolute inset-0"
            />
          ) : null}
        </div>
      ) : null}
      {!staticPreview && stop.mapsUrl ? (
        <Link
          href={stop.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex min-h-[3.25rem] w-full items-center justify-center rounded-full px-4 py-3 text-center text-[clamp(0.72rem,1.5vw,0.84rem)] font-medium uppercase leading-snug tracking-[0.12em] transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            color: C.ink,
            background: `linear-gradient(135deg, ${C.goldSoft}, ${C.gold})`,
            boxShadow: `0 12px 26px -14px ${C.goldDeep}`,
          }}
        >
          {buttonLabel}
        </Link>
      ) : null}
    </article>
  );
}

/** Minimal architectural venue line-sketch (SVG, no asset needed). */
function VenueSketch({ palette: C }: { palette: FaPalette }) {
  return (
    <svg aria-hidden viewBox="0 0 200 90" className="mx-auto h-20 w-auto">
      <g fill="none" stroke={C.gold} strokeWidth="1.4" strokeLinecap="round">
        <path d="M40 78 V44 Q40 30 54 30 H146 Q160 30 160 44 V78" />
        <path d="M54 78 V50 H84 V78 M116 78 V50 H146 V78" />
        <path d="M100 78 V56 Q100 48 108 48 Q100 42 100 34" />
        <path d="M30 78 H170" />
        <path d="M70 30 Q100 8 130 30" />
        <circle cx="100" cy="20" r="2.4" fill={C.gold} stroke="none" />
      </g>
    </svg>
  );
}

/** Fixed botanical wash behind the scroll, keeps the page feeling like paper. */
function PageFlora({ palette: C }: { palette: FaPalette }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        style={{ opacity: 0.16 }}
      >
        <g stroke={C.sage} fill="none" strokeWidth="1.2">
          <path d="M-20 120 Q60 90 90 30" />
          <path d="M420 240 Q340 210 310 150" />
          <path d="M-20 620 Q70 590 100 520" />
          <path d="M420 720 Q330 690 300 620" />
        </g>
        <g fill={C.rose} fillOpacity="0.25" stroke="none">
          <circle cx="86" cy="34" r="7" />
          <circle cx="312" cy="152" r="6" />
          <circle cx="98" cy="522" r="7" />
          <circle cx="302" cy="622" r="6" />
        </g>
      </svg>
    </div>
  );
}
