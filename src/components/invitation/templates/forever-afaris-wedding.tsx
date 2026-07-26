"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";
import { shouldUnoptimizeNextImage } from "@/lib/uploads/media-url";
import { useInvitationStaticPreview } from "@/components/invitation/invitation-static-preview";
import {
  mergeWeddingBoard,
  type ResolvedWeddingBoard,
  type WeddingBoardContent,
} from "@/lib/invitation/wedding-board";
import { requestInvitationReplay } from "@/lib/experience/replay-invitation";
import { FA_PALETTE as C } from "./forever-afaris-wedding-palette";
import { TraditionalMarriageRespond } from "./traditional-marriage-respond";

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

/* -------------------------------- motion -------------------------------- */

function useReveal() {
  const reduced = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 26 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0.2 : 0.8, ease: [0.22, 1, 0.36, 1] },
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
  const { variants } = useReveal();
  const common = {
    className,
    variants,
    initial: "hidden" as const,
    whileInView: "show" as const,
    viewport: { once: true, amount: 0.35 },
    transition: { delay },
  };
  if (as === "section") return <motion.section {...common}>{children}</motion.section>;
  return <motion.div {...common}>{children}</motion.div>;
}

/** Thin champagne divider with a centre diamond. */
function Divider() {
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

function WeddingCountdown({
  targetIso,
  heading,
  expiredMessage,
}: {
  targetIso: string;
  heading: string;
  expiredMessage: string;
}) {
  const target = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const valid = Number.isFinite(target);
  const [parts, setParts] = useState(() => (valid ? diffParts(target) : null));

  useEffect(() => {
    if (!valid) return;
    setParts(diffParts(target));
    const id = setInterval(() => setParts(diffParts(target)), 1000);
    return () => clearInterval(id);
  }, [target, valid]);

  if (!valid || !parts) return null;

  const cells: [number, string][] = [
    [parts.days, "Days"],
    [parts.hours, "Hours"],
    [parts.minutes, "Minutes"],
    [parts.seconds, "Seconds"],
  ];

  return (
    <div className="text-center">
      <p
        className="font-[family-name:var(--font-great-vibes)] text-3xl"
        style={{ color: C.goldDeep }}
      >
        {heading}
      </p>
      {parts.expired ? (
        <p className="mt-4 text-sm uppercase tracking-[0.28em]" style={{ color: C.cocoa }}>
          {expiredMessage}
        </p>
      ) : (
        <div className="mt-5 flex items-stretch justify-center gap-2.5 sm:gap-4">
          {cells.map(([value, label]) => (
            <div
              key={label}
              className="flex min-w-[62px] flex-col items-center rounded-xl px-2 py-3 sm:min-w-[76px]"
              style={{
                background: `linear-gradient(180deg, ${C.linen}, ${C.ivory})`,
                border: `1px solid ${C.border}`,
                boxShadow: `0 12px 26px -18px ${C.goldDeep}`,
              }}
            >
              <span
                className="font-[family-name:var(--font-cinzel)] text-3xl font-semibold tabular-nums sm:text-4xl"
                style={{ color: C.ink }}
              >
                {String(value).padStart(2, "0")}
              </span>
              <span
                className="mt-1 text-[9px] uppercase tracking-[0.22em] sm:text-[10px]"
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

  const invitedGuestName = guestName?.trim() || null;
  const { name1: parsed1, name2: parsed2 } = parseCoupleNames(event.title, event.hostName);
  const dateParts = formatInvitationDateParts(event.startDateRaw ?? event.startDate);

  const couple1 = board.coupleName1 || parsed1;
  const couple2 = board.coupleName2 || parsed2;
  const displayDate = board.displayDate || `${dateParts.month?.toUpperCase()} • ${dateParts.day} • ${dateParts.year}`;
  const weekday = board.weekday || dateParts.weekday?.toUpperCase() || "";
  const timeLabel = board.timeLabel || dateParts.time || "";
  const venueName = board.venueName || event.venueName || "";

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

  const galleryImages = useMemo(() => {
    const fromMedia = (design.media ?? [])
      .filter((m) => m.type === "image" && (m.role === "hero" || m.role === "reference"))
      .map((m) => ({ url: m.url, name: m.name }));
    const fromPortal = (props.galleryUrls ?? []).map((url) => ({ url, name: undefined }));
    const seen = new Set<string>();
    return [...fromMedia, ...fromPortal].filter((item) => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [design.media, props.galleryUrls]);

  const countdownTarget =
    board.countdownTarget?.trim() || event.startDateRaw || event.startDate;

  return (
    <div
      className="relative min-h-[100dvh] w-full"
      style={{
        background: `linear-gradient(180deg, ${C.ivory} 0%, ${C.blush} 45%, ${C.ivory} 100%)`,
        color: C.ink,
      }}
    >
      <div className="mx-auto w-full max-w-[480px] px-5 pb-16 pt-10 sm:px-7">
        {/* ---------------------------------------------------- HERO */}
        <Reveal as="section" className="text-center">
          {features.guestWelcome && invitedGuestName && (
            <div
              className="mx-auto mb-6 inline-flex flex-col rounded-2xl px-6 py-3"
              style={{ background: `${C.linen}cc`, border: `1px solid ${C.border}` }}
              data-invite-field="guest-welcome"
            >
              <span className="text-[10px] uppercase tracking-[0.28em]" style={{ color: C.cocoa }}>
                Invited guest
              </span>
              <span
                className="font-[family-name:var(--font-cinzel)] text-lg"
                style={{ color: C.goldDeep }}
                data-invite-field="guest-name"
              >
                {invitedGuestName}
              </span>
            </div>
          )}

          <p className="text-[11px] uppercase tracking-[0.34em]" style={{ color: C.cocoa }}>
            {board.eyebrow}
          </p>

          {board.scriptTitle && (
            <p
              className="mt-3 font-[family-name:var(--font-great-vibes)] text-4xl leading-none"
              style={{ color: C.goldDeep }}
            >
              {board.scriptTitle}
            </p>
          )}

          <h1 className="mt-6 space-y-1">
            <span
              className="block font-[family-name:var(--font-cinzel)] text-2xl font-semibold leading-tight tracking-[0.12em] sm:text-[1.7rem]"
              style={{ color: C.ink }}
            >
              {couple1}
            </span>
            <span
              className="block font-[family-name:var(--font-great-vibes)] text-4xl leading-none"
              style={{ color: C.goldDeep }}
            >
              and
            </span>
            <span
              className="block font-[family-name:var(--font-cinzel)] text-xl font-semibold leading-tight tracking-[0.1em] sm:text-2xl"
              style={{ color: C.ink }}
            >
              {couple2}
            </span>
          </h1>

          <p
            className="mx-auto mt-6 max-w-[22rem] font-[family-name:var(--font-cormorant)] text-[13px] leading-relaxed"
            style={{ color: C.cocoa }}
          >
            {board.invitationCopy}
          </p>

          {board.hashtag && (
            <p
              className="mt-5 font-[family-name:var(--font-cinzel)] text-sm font-bold tracking-wide"
              style={{ color: C.gold }}
            >
              {board.hashtag}
            </p>
          )}
        </Reveal>

        <Divider />

        {/* ------------------------------------------- FAMILY INTRO */}
        {features.familyIntro && board.familyIntro && (
          <>
            <Reveal as="section" className="text-center">
              {board.familyHeading && (
                <h2 className="text-[12px] uppercase tracking-[0.34em]" style={{ color: C.gold }}>
                  {board.familyHeading}
                </h2>
              )}
              <p
                className="mx-auto mt-4 max-w-[24rem] font-[family-name:var(--font-cormorant)] text-[13.5px] leading-relaxed"
                style={{ color: C.cocoa }}
              >
                {board.familyIntro}
              </p>
            </Reveal>
            <Divider />
          </>
        )}

        {/* ------------------------------------------------- DETAILS */}
        <Reveal as="section" className="text-center">
          <div
            className="mx-auto flex max-w-[22rem] items-stretch justify-center gap-4 py-4"
            style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}
          >
            <div className="flex flex-col justify-center text-right text-[10px] uppercase tracking-[0.2em]" style={{ color: C.cocoa }}>
              <span>{weekday}</span>
            </div>
            <div
              className="px-3 font-[family-name:var(--font-cinzel)] text-lg font-semibold"
              style={{ color: C.ink, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}
            >
              <div className="py-1">{displayDate}</div>
            </div>
            <div className="flex flex-col justify-center text-left text-[10px] uppercase tracking-[0.2em]" style={{ color: C.cocoa }}>
              <span>{timeLabel}</span>
            </div>
          </div>

          <p className="mt-5 font-[family-name:var(--font-cinzel)] text-sm tracking-[0.14em]" style={{ color: C.ink }}>
            {venueName}
          </p>
          {board.receptionText && (
            <p className="mt-2 font-[family-name:var(--font-great-vibes)] text-2xl" style={{ color: C.goldDeep }}>
              {board.receptionText}
            </p>
          )}
          {board.accessNote && (
            <p className="mt-3 text-[10px] uppercase tracking-[0.3em]" style={{ color: C.rose }}>
              {board.accessNote}
            </p>
          )}
        </Reveal>

        {/* ------------------------------------------------ COUNTDOWN */}
        {features.countdown && (
          <>
            <Divider />
            <Reveal as="section">
              <WeddingCountdown
                targetIso={countdownTarget}
                heading={board.countdownHeading}
                expiredMessage={board.countdownExpiredMessage}
              />
            </Reveal>
          </>
        )}

        {/* --------------------------------------------------- VENUE / MAP */}
        {features.location && (
          <>
            <Divider />
            <Reveal as="section" className="text-center">
              <VenueSketch />
              <p className="mt-4 font-[family-name:var(--font-cinzel)] text-sm tracking-[0.14em]" style={{ color: C.ink }}>
                {venueName}
              </p>
              {board.venueAddress && (
                <p className="mt-1 font-[family-name:var(--font-cormorant)] text-[13px]" style={{ color: C.cocoa }}>
                  {board.venueAddress}
                </p>
              )}
              {mapsHref && !staticPreview && (
                <Link
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[11px] uppercase tracking-[0.22em] transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    color: C.ink,
                    background: `linear-gradient(135deg, ${C.goldSoft}, ${C.gold})`,
                    boxShadow: `0 12px 26px -14px ${C.goldDeep}`,
                  }}
                >
                  {board.mapButtonLabel}
                </Link>
              )}
            </Reveal>
          </>
        )}

        {/* -------------------------------------------------- PROGRAMME */}
        {features.programme && board.programmeItems.length > 0 && (
          <>
            <Divider />
            <Reveal as="section">
              <h2 className="text-center font-[family-name:var(--font-great-vibes)] text-3xl" style={{ color: C.goldDeep }}>
                {board.programmeHeading}
              </h2>
              <ol className="relative mt-6 space-y-6 pl-8">
                <span
                  aria-hidden
                  className="absolute bottom-2 left-[9px] top-2 w-px"
                  style={{ background: `linear-gradient(180deg, ${C.gold}, ${C.blushDeep})` }}
                />
                {board.programmeItems.map((item, i) => (
                  <Reveal key={item.id} delay={reduced ? 0 : i * 0.06}>
                    <li className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-8 top-1 h-[13px] w-[13px] rounded-full"
                        style={{ background: C.gold, boxShadow: `0 0 0 3px ${C.ivory}, 0 0 10px ${C.goldSoft}` }}
                      />
                      <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: C.gold }}>
                        {item.time}
                      </p>
                      <p className="font-[family-name:var(--font-cinzel)] text-base font-semibold" style={{ color: C.ink }}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="font-[family-name:var(--font-cormorant)] text-[13px]" style={{ color: C.cocoa }}>
                          {item.description}
                        </p>
                      )}
                    </li>
                  </Reveal>
                ))}
              </ol>
            </Reveal>
          </>
        )}

        {/* ------------------------------------------------ DRESS CODE */}
        {features.dressCode && (
          <>
            <Divider />
            <Reveal as="section" className="text-center">
              <h2 className="text-[12px] uppercase tracking-[0.34em]" style={{ color: C.gold }}>
                {board.dressCodeHeading}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <DressCard label="Ladies" body={board.dressCodeLadies} />
                <DressCard label="Gents" body={board.dressCodeGents} />
              </div>
            </Reveal>
          </>
        )}

        {/* --------------------------------------------- GUEST POLICY */}
        {features.guestPolicy && (
          <>
            <Divider />
            <Reveal as="section" className="text-center">
              <h2
                className="mx-auto max-w-[24rem] font-[family-name:var(--font-cinzel)] text-sm font-semibold uppercase tracking-[0.12em]"
                style={{ color: C.ink }}
              >
                {board.guestPolicyHeading}
              </h2>
              <p
                className="mx-auto mt-4 max-w-[24rem] font-[family-name:var(--font-cormorant)] text-[13.5px] leading-relaxed"
                style={{ color: C.cocoa }}
              >
                {board.guestPolicyBody}
              </p>
            </Reveal>
          </>
        )}

        {/* ------------------------------------------------------ STORY */}
        {features.story && board.storyBody && (
          <>
            <Divider />
            <Reveal as="section" className="text-center">
              <h2 className="font-[family-name:var(--font-great-vibes)] text-3xl" style={{ color: C.goldDeep }}>
                {board.storyHeading}
              </h2>
              <p
                className="mx-auto mt-4 max-w-[24rem] font-[family-name:var(--font-cormorant)] text-[14px] italic leading-relaxed"
                style={{ color: C.cocoa }}
              >
                {board.storyBody}
              </p>
            </Reveal>
          </>
        )}

        {/* ---------------------------------------------------- GALLERY */}
        {features.gallery && galleryImages.length > 0 && (
          <>
            <Divider />
            <Reveal as="section">
              <h2 className="text-center font-[family-name:var(--font-great-vibes)] text-3xl" style={{ color: C.goldDeep }}>
                {board.galleryHeading}
              </h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {galleryImages.slice(0, 6).map((m, i) => (
                  <div
                    key={`${m.url}-${i}`}
                    className="relative overflow-hidden rounded-lg"
                    style={{ aspectRatio: "3 / 4", border: `1px solid ${C.border}` }}
                  >
                    <Image
                      src={m.url}
                      alt={m.name || "Wedding moment"}
                      fill
                      loading="lazy"
                      sizes="(max-width: 480px) 45vw, 220px"
                      className="object-cover"
                      unoptimized={shouldUnoptimizeNextImage(m.url)}
                    />
                  </div>
                ))}
              </div>
            </Reveal>
          </>
        )}

        {/* ------------------------------------------------------- RSVP */}
        {showRespond && (
          <>
            <Divider />
            <Reveal as="section">
              <TraditionalMarriageRespond
                invitationId={invitation.id}
                guestId={guestId}
                guestName={invitedGuestName}
                eventTitle={event.title}
                rsvpHeading={board.rsvpHeading}
                showRsvp={Boolean(features.rsvp)}
                organizerPhone={organizerPhone}
                organizerEmail={organizerEmail}
              />
              {board.rsvpContacts.length > 0 && (
                <div className="mt-5 text-center">
                  <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: C.cocoa }}>
                    Kindly confirm with
                  </p>
                  <div className="mt-2 flex flex-col items-center gap-1">
                    {board.rsvpContacts.map((c) => (
                      <a
                        key={`${c.name}-${c.phone}`}
                        href={`tel:${c.phone.replace(/\s/g, "")}`}
                        className="font-[family-name:var(--font-cormorant)] text-[13px] uppercase tracking-[0.08em] hover:opacity-80"
                        style={{ color: C.ink }}
                      >
                        {c.name} — {c.phone}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Reveal>
          </>
        )}

        {/* ----------------------------------------------- MEMORY VAULT */}
        {features.memory && (memoryUploadUrl || memoryAlbumUrl) && !staticPreview && (
          <>
            <Divider />
            <Reveal as="section" className="text-center">
              <h2 className="font-[family-name:var(--font-great-vibes)] text-3xl" style={{ color: C.goldDeep }}>
                {board.memoryHeading}
              </h2>
              <p
                className="mx-auto mt-3 max-w-[22rem] font-[family-name:var(--font-cormorant)] text-[13.5px] leading-relaxed"
                style={{ color: C.cocoa }}
              >
                {board.memoryBody}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {memoryUploadUrl && (
                  <Link
                    href={memoryUploadUrl}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[11px] uppercase tracking-[0.22em] transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
                    href={memoryAlbumUrl}
                    className="inline-flex items-center gap-2 border-b pb-0.5 text-[11px] uppercase tracking-[0.22em] transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ color: C.cocoa, borderColor: C.border }}
                  >
                    View the album
                  </Link>
                )}
              </div>
            </Reveal>
          </>
        )}

        {/* ---------------------------------------------------- CLOSING */}
        {features.closing && (
          <>
            <Divider />
            <Reveal as="section" className="text-center">
              <h2 className="font-[family-name:var(--font-great-vibes)] text-4xl" style={{ color: C.goldDeep }}>
                {board.closingHeading}
              </h2>
              <p
                className="mx-auto mt-4 max-w-[22rem] font-[family-name:var(--font-cormorant)] text-[14px] leading-relaxed"
                style={{ color: C.cocoa }}
              >
                {board.closingMessage}
              </p>
              {board.closingSignature && (
                <p className="mt-4 font-[family-name:var(--font-great-vibes)] text-3xl" style={{ color: C.ink }}>
                  {board.closingSignature}
                </p>
              )}
              {board.hashtag && (
                <p className="mt-4 font-[family-name:var(--font-cinzel)] text-xs font-bold tracking-[0.2em]" style={{ color: C.gold }}>
                  {board.hashtag}
                </p>
              )}
              {!staticPreview && (
                <button
                  type="button"
                  onClick={requestInvitationReplay}
                  className="mt-7 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: C.cocoa, background: `${C.linen}cc`, border: `1px solid ${C.border}` }}
                >
                  ↻ Replay opening
                </button>
              )}
            </Reveal>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- helpers -------------------------------- */

function DressCard({ label, body }: { label: string; body: string }) {
  return (
    <div
      className="rounded-2xl px-5 py-5 text-left"
      style={{ background: `linear-gradient(180deg, ${C.linen}, ${C.ivory})`, border: `1px solid ${C.border}` }}
    >
      <p className="font-[family-name:var(--font-great-vibes)] text-2xl" style={{ color: C.goldDeep }}>
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-cormorant)] text-[13px] leading-relaxed" style={{ color: C.cocoa }}>
        {body}
      </p>
    </div>
  );
}

/** Minimal architectural venue line-sketch (SVG, no asset needed). */
function VenueSketch() {
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
