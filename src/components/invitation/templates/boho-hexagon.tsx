"use client";

import Image from "next/image";
import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { HexagonFrame, FloralCorner } from "../shared/invitation-ornaments";
import { HeroMedia } from "../shared/hero-media";
import { InvitationRsvpPanel } from "../shared/invitation-rsvp-panel";
import { InvitationActions } from "../shared/invitation-actions";

export function BohoHexagonTemplate({ invitation, event, design, guestId, guestName, qrDataUrl }: InvitationRenderProps) {
  const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);
  const { colors } = design;
  const displayNames = name2 ? `${name1} & ${name2}` : name1;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8" style={{ backgroundColor: colors.background }}>
      <div className="relative w-full max-w-md inv-fade-in">
        <FloralCorner className="-top-2 -left-2" />
        <FloralCorner className="-top-2 -right-2 scale-x-[-1]" />
        <FloralCorner className="-bottom-2 -left-2 scale-y-[-1]" />
        <FloralCorner className="-bottom-2 -right-2 scale-[-1]" />
        <div
          className="relative rounded-2xl shadow-xl overflow-hidden"
          style={{ backgroundColor: colors.background, color: colors.text }}
        >
          <HexagonFrame color={colors.secondary} />
          {(design.media?.length || event.coverImageUrl) && (
            <HeroMedia
              coverImageUrl={event.coverImageUrl}
              media={design.media}
              animation={design.animation}
              className="h-40 mx-8 mt-8 rounded-lg"
            />
          )}
          <div className="relative px-10 py-12 text-center space-y-5 inv-text-on-light">
            <p className="text-xs tracking-[0.2em] uppercase inv-muted-on-light font-[family-name:var(--font-cormorant)]">
              {design.introText}
            </p>
            <h1 className="font-[family-name:var(--font-great-vibes)] text-4xl sm:text-5xl" style={{ color: colors.primary }}>
              {displayNames}
            </h1>
            {invitation.message && (
              <p className="text-sm italic inv-caption-on-light font-[family-name:var(--font-cormorant)]">{invitation.message}</p>
            )}
            <div className="flex items-center justify-center gap-3 text-sm font-[family-name:var(--font-cormorant)] tracking-widest uppercase">
              <span>{date.monthShort}</span>
              <span className="text-2xl font-light border-y border-current px-3 py-1">{date.day}</span>
              <span>{date.time}</span>
            </div>
            {(event.venueName || event.landmark) && (
              <p className="text-xs tracking-[0.15em] uppercase inv-muted-on-light">
                {event.venueName}{event.landmark ? ` · ${event.landmark}` : ""}
              </p>
            )}
            {qrDataUrl && <Image src={qrDataUrl} alt="QR" width={100} height={100} className="mx-auto rounded"  unoptimized />}
            <InvitationRsvpPanel invitationId={invitation.id} guestId={guestId} guestName={guestName} accentColor={colors.secondary} />
            <InvitationActions event={event} pdfUrl={design.media?.find((m) => m.type === "pdf")?.url} />
          </div>
        </div>
      </div>
    </div>
  );
}
