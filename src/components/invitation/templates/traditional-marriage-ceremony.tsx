"use client";

import Image from "next/image";
import Link from "next/link";
import { Armchair } from "lucide-react";
import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { TraditionalMarriageJourney } from "./traditional-marriage-journey";
import { TraditionalMarriageRespond } from "./traditional-marriage-respond";
import { TM_PALETTE as PALETTE } from "./traditional-marriage-palette";
import {
  DEFAULT_VISION_BOARD,
  TRADITIONAL_MARRIAGE_ART_URL,
  mergeVisionBoard,
  type VisionBoardContent,
} from "@/lib/invitation/vision-board";
import { shouldUnoptimizeNextImage } from "@/lib/uploads/media-url";
import { useInvitationStaticPreview } from "@/components/invitation/invitation-static-preview";

export type TraditionalMarriageProps = InvitationRenderProps & {
  seatLabel?: string | null;
  seatTable?: string | null;
  admissionQrDataUrl?: string | null;
  mapsLink?: string | null;
  /** Organizer email for the merged respond & reach section */
  contactEmail?: string | null;
  /** Portal has a #gifts section */
  hasGiftsSection?: boolean;
  /** Portal has a #schedule timeline section */
  hasTimelineSection?: boolean;
};

function resolveBoard(design: InvitationRenderProps["design"]): ReturnType<typeof mergeVisionBoard> {
  const fromStudio = (design.studio as { visionBoard?: VisionBoardContent } | undefined)?.visionBoard;
  return mergeVisionBoard(fromStudio);
}

function normalizeTimeLabel(value: string): string {
  // Card art uses "10:00AM" (no space)
  return value.replace(/\s+(AM|PM)$/i, (_, meridiem: string) => meridiem.toUpperCase());
}

export function TraditionalMarriageCeremonyTemplate(props: TraditionalMarriageProps) {
  const {
    invitation,
    event,
    design,
    guestId,
    guestName,
    qrDataUrl,
    admissionManualCode,
    seatLabel,
    seatTable,
    admissionQrDataUrl,
    contactEmail,
    hasGiftsSection,
    hasTimelineSection,
  } = props;

  const staticPreview = useInvitationStaticPreview();
  const board = resolveBoard(design);
  const features = board.features;
  /** Live `/invite/{link}?guest=` passes the real guest; preview may pass a sample. Never invent a name. */
  const invitedGuestName = guestName?.trim() || null;
  const { name1: parsed1, name2: parsed2 } = parseCoupleNames(event.title, event.hostName);
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);

  const couple1 = board.coupleName1 || parsed1 || DEFAULT_VISION_BOARD.coupleName1;
  const couple2 = board.coupleName2 || parsed2 || DEFAULT_VISION_BOARD.coupleName2;
  const weekday = board.weekday || date.weekday?.toUpperCase() || "THURSDAY";
  const monthLabel = board.monthLabel || date.month?.toUpperCase() || "AUGUST";
  const dayNumber = board.dayNumber || String(date.day);
  const timeLabel = normalizeTimeLabel(
    board.timeLabel || date.time || DEFAULT_VISION_BOARD.timeLabel
  );
  const dress =
    board.dressCodeLine ||
    (event.dressCode
      ? `DRESS CODE: ${event.dressCode.toUpperCase()}`
      : DEFAULT_VISION_BOARD.dressCodeLine);
  const mapsHref = event.mapsLink || props.mapsLink || null;
  const passQr = admissionQrDataUrl || qrDataUrl;
  const organizerPhone = event.contactPhone?.trim() || null;
  const organizerEmail = contactEmail?.trim() || null;
  const showReachHosts = Boolean(organizerPhone || organizerEmail);
  const showRespondSection = Boolean(features.rsvp || showReachHosts);
  const seatDisplay =
    seatTable || seatLabel
      ? [seatTable ? `Table ${seatTable}` : null, seatLabel ? (/^seat\b/i.test(seatLabel) ? seatLabel : `Seat ${seatLabel}`) : null]
          .filter(Boolean)
          .join(" · ")
      : null;

  const artUrl =
    design.media?.find((m) => m.role === "background" || m.role === "hero")?.url ||
    event.coverImageUrl ||
    TRADITIONAL_MARRIAGE_ART_URL;

  // Exact clone = full card art. Live type = editable recreation. Never both (avoids duplicate copy).
  const useExactArt = board.showArtBackdrop && !board.liveTypography;
  const useLiveType = board.liveTypography;

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center py-4 sm:py-8 px-3 sm:px-4"
      style={{
        background: `linear-gradient(180deg, ${PALETTE.peach} 0%, ${PALETTE.peachDeep} 55%, #F3D9CE 100%)`,
        color: PALETTE.ink,
      }}
    >
      {/* Invited guest name — personalized per guest link; hidden when unknown */}
      {features.guestWelcome && invitedGuestName && (
        <div
          className="w-full max-w-[420px] mb-3 rounded-2xl bg-white/70 border px-4 py-3 text-center shadow-sm backdrop-blur-sm"
          style={{ borderColor: PALETTE.border }}
          data-invite-field="guest-welcome"
        >
          <p
            className="text-[11px] tracking-[0.28em] uppercase"
            style={{ color: PALETTE.bronzeDeep }}
          >
            Invited guest
          </p>
          <p
            className="font-[family-name:var(--font-cinzel)] text-lg tracking-wide"
            style={{ color: PALETTE.bronzeDeep }}
            data-invite-field="guest-name"
            aria-label={`Invited guest: ${invitedGuestName}`}
          >
            {invitedGuestName}
          </p>
          {features.seating && seatDisplay && (
            <p
              className="mt-1 text-sm font-medium flex items-center justify-center gap-1.5"
              style={{ color: PALETTE.bronzeDeep }}
            >
              <Armchair className="h-3.5 w-3.5" />
              {seatDisplay}
            </p>
          )}
        </div>
      )}

      <article
        className="relative w-full max-w-[420px] overflow-hidden rounded-sm shadow-[0_25px_60px_-20px_rgba(92,61,46,0.45)]"
        style={{ backgroundColor: PALETTE.peach }}
      >
        {/* Exact visual clone of the invitation card */}
        {useExactArt && (
          <div className="relative w-full" style={{ aspectRatio: "744 / 1024" }}>
            <Image
              src={artUrl}
              alt="Traditional Marriage Ceremony invitation"
              fill
              sizes="(max-width: 420px) 100vw, 420px"
              className="object-cover object-center"
              priority
              unoptimized={shouldUnoptimizeNextImage(artUrl)}
            />
            {/* Interactive hotspots over printed location + keep system QR available below */}
            {features.location && mapsHref && !staticPreview && (
              <Link
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-[7%] left-[4%] w-[42%] h-[14%] rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A18373]"
                aria-label={board.locationCta}
              />
            )}
          </div>
        )}

        {/* Editable live typography — mirrors card fonts/layout, never stacked on printed text */}
        {useLiveType && (
          <div
            className="relative px-7 sm:px-9 pt-10 pb-8 text-center"
            style={{ backgroundColor: PALETTE.peach }}
          >
            <div className="space-y-0.5">
              <p
                className="font-[family-name:var(--font-cinzel)] text-[1.65rem] sm:text-[1.85rem] tracking-[0.28em] font-semibold leading-none"
                style={{ color: PALETTE.bronze }}
              >
                {board.eyebrow}
              </p>
              <p
                className="font-[family-name:var(--font-great-vibes)] text-[2.35rem] sm:text-[2.65rem] leading-none pt-1"
                style={{ color: PALETTE.bronze }}
              >
                {board.scriptTitle}
              </p>
            </div>

            <p
              className="mt-5 font-[family-name:var(--font-cormorant)] text-[10px] sm:text-[11px] leading-[1.55] tracking-[0.14em] uppercase max-w-[19rem] mx-auto"
              style={{ color: PALETTE.ink }}
            >
              {board.familyInvite}
            </p>

            <div className="mt-5 space-y-0.5">
              <h1
                className="font-[family-name:var(--font-cinzel)] text-[1.15rem] sm:text-[1.25rem] tracking-[0.2em] font-semibold"
                style={{ color: PALETTE.bronze }}
              >
                {couple1}
              </h1>
              <p
                className="font-[family-name:var(--font-great-vibes)] text-[2rem] leading-none py-0.5"
                style={{ color: PALETTE.bronze }}
              >
                &amp;
              </p>
              <h1
                className="font-[family-name:var(--font-cinzel)] text-[1.05rem] sm:text-[1.15rem] tracking-[0.16em] font-semibold leading-snug max-w-[18rem] mx-auto"
                style={{ color: PALETTE.bronze }}
              >
                {couple2}
              </h1>
            </div>

            <div
              className="mt-5 mx-auto flex items-center justify-center gap-3 sm:gap-4 py-2.5 max-w-[20rem]"
              style={{ borderTop: `1px solid ${PALETTE.ink}33`, borderBottom: `1px solid ${PALETTE.ink}33` }}
            >
              <div
                className="text-right font-[family-name:var(--font-cormorant)] text-[10px] sm:text-[11px] tracking-[0.18em] uppercase leading-tight min-w-[4.5rem]"
                style={{ color: PALETTE.ink }}
              >
                <div>{weekday}</div>
                <div>{monthLabel}</div>
              </div>
              <div
                className="font-[family-name:var(--font-cinzel)] text-[3.25rem] sm:text-[3.5rem] font-bold leading-none tabular-nums px-1"
                style={{ color: PALETTE.ink }}
              >
                {dayNumber}
              </div>
              <div
                className="text-left font-[family-name:var(--font-cormorant)] text-[10px] sm:text-[11px] tracking-[0.16em] uppercase min-w-[4.5rem]"
                style={{ color: PALETTE.ink }}
              >
                {timeLabel}
              </div>
            </div>

            <p
              className="mt-4 font-[family-name:var(--font-cormorant)] text-[9px] sm:text-[10px] tracking-[0.12em] uppercase leading-relaxed max-w-[20rem] mx-auto"
              style={{ color: PALETTE.dress }}
            >
              {dress}
            </p>

            <p
              className="mt-4 font-[family-name:var(--font-great-vibes)] text-[1.65rem] sm:text-[1.85rem] leading-snug"
              style={{ color: PALETTE.bronzeDeep }}
            >
              {board.sentiment}
            </p>

            {/* Live footer — mirrors card: location + RSVP + hashtag (single copy only) */}
            <div className="mt-7 grid grid-cols-2 gap-3 items-start text-left">
              <div className="flex flex-col items-start gap-2">
                {features.qr && passQr ? (
                  <Image
                    src={passQr}
                    alt="Location / admission QR"
                    width={88}
                    height={88}
                    className="rounded-sm bg-white p-1 border border-black/10"
                    unoptimized
                  />
                ) : (
                  <div className="w-[88px] h-[88px] rounded-sm bg-white/80 border border-dashed border-[#C4A484] flex items-center justify-center text-[9px] text-center px-1" style={{ color: PALETTE.bronzeDeep }}>
                    QR on guest link
                  </div>
                )}
                {features.location && mapsHref && !staticPreview ? (
                  <Link
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-[family-name:var(--font-cormorant)] text-[9px] tracking-[0.12em] uppercase underline underline-offset-2"
                    style={{ color: PALETTE.ink }}
                  >
                    {board.locationCta}
                  </Link>
                ) : features.location ? (
                  <span
                    className="font-[family-name:var(--font-cormorant)] text-[9px] tracking-[0.12em] uppercase"
                    style={{ color: PALETTE.ink }}
                  >
                    {board.locationCta}
                  </span>
                ) : null}
              </div>

              <div className="space-y-1 pt-0.5">
                <p
                  className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.28em] uppercase"
                  style={{ color: PALETTE.ink }}
                >
                  {board.rsvpHeading}
                </p>
                {board.rsvpContacts.map((c) => (
                  <a
                    key={`${c.name}-${c.phone}`}
                    href={`tel:${c.phone.replace(/\s/g, "")}`}
                    className="block font-[family-name:var(--font-cormorant)] text-[9px] sm:text-[10px] tracking-[0.06em] uppercase leading-snug hover:opacity-80"
                    style={{ color: PALETTE.ink }}
                  >
                    {c.name} - {c.phone}
                  </a>
                ))}
              </div>
            </div>

            {board.hashtag && (
              <p
                className="mt-5 font-[family-name:var(--font-cinzel)] text-sm font-bold tracking-wide"
                style={{ color: PALETTE.ink }}
              >
                {board.hashtag}
              </p>
            )}
          </div>
        )}

        {/* Art mode: slim system strip only — no repeated invitation wording */}
        {useExactArt && (features.qr || features.admissionCode) && (
          <div
            className="px-5 py-4 flex flex-wrap items-center justify-center gap-4 border-t"
            style={{ borderColor: `${PALETTE.border}99`, backgroundColor: PALETTE.peach }}
          >
            {features.qr && passQr && (
              <div className="flex flex-col items-center gap-1">
                <Image
                  src={passQr}
                  alt="Guest admission QR"
                  width={72}
                  height={72}
                  className="rounded-sm bg-white p-1 border border-black/10"
                  unoptimized
                />
                <span className="text-[9px] tracking-[0.14em] uppercase" style={{ color: PALETTE.bronzeDeep }}>
                  Admission pass
                </span>
              </div>
            )}
            {features.admissionCode && admissionManualCode && (
              <p className="text-[10px] tracking-widest" style={{ color: PALETTE.bronzeDeep }}>
                Gate code · <span className="font-mono font-bold">{admissionManualCode}</span>
              </p>
            )}
          </div>
        )}
      </article>

      {/* Lower chrome: Kindly Respond + Continue With Us — no chips / DIGITAL RSVP / utility cards */}
      <div className="w-full max-w-[420px] mt-5 space-y-5 pb-8">
        {showRespondSection && (
          <TraditionalMarriageRespond
            invitationId={invitation.id}
            guestId={guestId}
            guestName={invitedGuestName}
            eventTitle={event.title}
            rsvpHeading={board.rsvpHeading || "R.S.V.P"}
            showRsvp={Boolean(features.rsvp)}
            organizerPhone={organizerPhone}
            organizerEmail={organizerEmail}
          />
        )}

        <TraditionalMarriageJourney
          event={event}
          mapsHref={features.location ? mapsHref : null}
          pdfUrl={design.media?.find((m) => m.type === "pdf")?.url}
          showGifts={Boolean(features.contributions && hasGiftsSection)}
          showTimeline={Boolean(features.timeline && hasTimelineSection)}
        />
      </div>
    </div>
  );
}
