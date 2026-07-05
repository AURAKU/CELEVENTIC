"use client";

import Image from "next/image";
import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { InterlockingRings, GoldFrame } from "../shared/invitation-ornaments";
import { HeroMedia } from "../shared/hero-media";
import { InvitationRsvpPanel } from "../shared/invitation-rsvp-panel";
import { InvitationActions } from "../shared/invitation-actions";

export function LuxuryRingsTemplate({ invitation, event, design, guestId, guestName, qrDataUrl }: InvitationRenderProps) {
  const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);
  const { colors } = design;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "radial-gradient(ellipse at center, #1a1a1a 0%, #000 100%)" }}>
      <div className="relative w-full max-w-md inv-fade-in">
        <div className="absolute -inset-px rounded-lg bg-gradient-to-b from-[#D4AF37]/40 via-transparent to-[#D4AF37]/20" />
        <div className="relative overflow-hidden rounded-lg" style={{ backgroundColor: colors.background, color: colors.text }}>
          <GoldFrame />
          <HeroMedia
            coverImageUrl={event.coverImageUrl}
            media={design.media}
            animation={design.animation}
            className="h-48"
            overlay
          />
          <div className="px-8 py-10 text-center space-y-5 inv-text-on-dark inv-phrase-emphasis">
            <p className="text-[10px] tracking-[0.35em] uppercase inv-muted-on-dark">{design.introText}</p>
            <h1 className="font-[family-name:var(--font-cinzel)] text-lg sm:text-xl tracking-[0.2em] uppercase leading-loose">
              {name1}
              {name2 && (
                <>
                  <InterlockingRings color={colors.secondary} size={24} />
                  {name2}
                </>
              )}
            </h1>
            {invitation.message && <p className="text-sm italic inv-caption-on-dark font-[family-name:var(--font-cormorant)]">{invitation.message}</p>}
            <div className="h-px w-16 mx-auto bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
            <p className="font-[family-name:var(--font-cinzel)] text-sm tracking-[0.3em]">
              {String(date.day).padStart(2, "0")} · {date.monthShort.toUpperCase()} · {date.year}
            </p>
            <p className="text-xs inv-muted-on-dark">{date.time}</p>
            {event.venueName && <p className="text-sm tracking-wider">{event.venueName}</p>}
            {event.contactPhone && <p className="text-xs inv-muted-on-dark">RSVP {event.contactPhone}</p>}
            {qrDataUrl && <Image src={qrDataUrl} alt="QR" width={100} height={100} className="mx-auto rounded" />}
            <InvitationRsvpPanel invitationId={invitation.id} guestId={guestId} guestName={guestName} accentColor={colors.secondary} textColor={colors.text} variant="dark" />
            <InvitationActions event={event} pdfUrl={design.media?.find((m) => m.type === "pdf")?.url} variant="dark" />
          </div>
        </div>
      </div>
    </div>
  );
}
