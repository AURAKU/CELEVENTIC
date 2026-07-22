"use client";

import Image from "next/image";
import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { GoldFrame, InterlockingRings } from "../shared/invitation-ornaments";
import { HeroMedia } from "../shared/hero-media";
import { InvitationRsvpPanel } from "../shared/invitation-rsvp-panel";
import { InvitationActions } from "../shared/invitation-actions";

export function ClassicGoldTemplate({ invitation, event, design, guestId, guestName, qrDataUrl }: InvitationRenderProps) {
  const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);
  const { colors } = design;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8" style={{ backgroundColor: "#f5f3ef" }}>
      <div
        className="relative w-full max-w-md bg-white shadow-2xl inv-fade-in overflow-hidden"
        style={{ color: colors.text }}
      >
        <GoldFrame />
        <HeroMedia
          coverImageUrl={event.coverImageUrl}
          media={design.media}
          animation={design.animation}
          layout={design.layout}
          className="h-56 sm:h-64"
          overlay={false}
        />
        <div className="relative px-8 py-10 text-center space-y-5 font-[family-name:var(--font-cormorant)] inv-text-on-light">
          <p className="text-xs tracking-[0.25em] uppercase inv-muted-on-light">
            {design.introText ?? "together with their families"}
          </p>
          <h1 className="font-[family-name:var(--font-playfair)] text-xl sm:text-2xl tracking-[0.15em] uppercase leading-relaxed" style={{ color: colors.primary }}>
            {name1}
            {name2 && (
              <>
                <InterlockingRings color={colors.accent} />
                {name2}
              </>
            )}
          </h1>
          {invitation.message && (
            <p className="text-sm italic inv-caption-on-light leading-relaxed">{invitation.message}</p>
          )}
          <p className="text-xs tracking-widest inv-muted-on-light uppercase">
            invite you to share this magical moment
          </p>
          <div className="flex items-center justify-center gap-3 font-[family-name:var(--font-playfair)]">
            <span className="text-2xl font-light">{String(date.day).padStart(2, "0")}</span>
            <span className="text-stone-500">|</span>
            <span className="text-sm uppercase tracking-wider">{date.monthShort}</span>
            <span className="text-stone-500">|</span>
            <span className="text-2xl font-light">{date.year}</span>
          </div>
          <p className="text-sm inv-caption-on-light">at {date.time}</p>
          {(event.venueName || event.landmark) && (
            <p className="text-sm font-medium" style={{ color: colors.primary }}>
              {event.venueName}{event.landmark ? `, ${event.landmark}` : ""}
            </p>
          )}
          {event.contactPhone && (
            <p className="text-xs inv-muted-on-light">RSVP: {event.contactPhone}</p>
          )}
          {event.dressCode && <p className="text-xs inv-muted-on-light">Dress Code: {event.dressCode}</p>}
          {qrDataUrl && (
            <div className="flex justify-center pt-2">
              <Image src={qrDataUrl} alt="QR Code" width={120} height={120} className="rounded"  unoptimized />
            </div>
          )}
          <InvitationRsvpPanel
            invitationId={invitation.id}
            guestId={guestId}
            guestName={guestName}
            accentColor={colors.secondary}
          />
          <InvitationActions
            event={event}
            pdfUrl={design.media?.find((m) => m.type === "pdf")?.url}
          />
        </div>
      </div>
    </div>
  );
}
