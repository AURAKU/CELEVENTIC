"use client";

import Image from "next/image";
import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { GoldFrame, FloralCorner } from "../shared/invitation-ornaments";
import { HeroMedia } from "../shared/hero-media";
import { InvitationRsvpPanel } from "../shared/invitation-rsvp-panel";
import { InvitationActions } from "../shared/invitation-actions";

export function CustomMediaTemplate({ invitation, event, design, guestId, guestName, qrDataUrl }: InvitationRenderProps) {
  const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);
  const { colors } = design;
  const hasVideoBg = design.media?.some((m) => m.type === "video" && m.role === "background");
  const pdfAsset = design.media?.find((m) => m.type === "pdf");

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: colors.background }}>
      {hasVideoBg && (
        <div className="fixed inset-0 z-0">
          <HeroMedia media={design.media?.filter((m) => m.role === "background")} animation="none" className="h-full w-full" overlay />
        </div>
      )}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-8">
        <div className="w-full max-w-lg inv-fade-in">
          <FloralCorner className="absolute -top-3 -left-3 z-20 opacity-50" />
          <FloralCorner className="absolute -top-3 -right-3 z-20 scale-x-[-1] opacity-50" />
          <div className="bg-white/95 backdrop-blur-sm shadow-2xl overflow-hidden rounded-sm">
            <GoldFrame />
            {!hasVideoBg && (
              <HeroMedia
                coverImageUrl={event.coverImageUrl}
                media={design.media}
                animation={design.animation ?? "ken-burns"}
                className="h-64 sm:h-72"
              />
            )}
            <div className="px-8 py-10 text-center space-y-4" style={{ color: colors.text }}>
              <p className="text-xs tracking-[0.25em] uppercase opacity-50">{design.introText}</p>
              <h1 className="font-[family-name:var(--font-great-vibes)] text-4xl sm:text-5xl" style={{ color: colors.primary }}>
                {name2 ? `${name1} & ${name2}` : name1}
              </h1>
              {invitation.message && (
                <p className="text-sm italic opacity-70 font-[family-name:var(--font-cormorant)] leading-relaxed">{invitation.message}</p>
              )}
              <div className="py-2">
                <p className="font-[family-name:var(--font-playfair)] text-lg tracking-wider">{date.formatted}</p>
                {(event.venueName || event.landmark) && (
                  <p className="text-sm mt-2 opacity-80">{event.venueName}{event.landmark ? `, ${event.landmark}` : ""}</p>
                )}
              </div>
              {pdfAsset && (
                <p className="text-xs text-brand-600">Designed from your uploaded sample</p>
              )}
              {qrDataUrl && <Image src={qrDataUrl} alt="QR" width={110} height={110} className="mx-auto rounded" />}
              <InvitationRsvpPanel invitationId={invitation.id} guestId={guestId} guestName={guestName} accentColor={colors.primary} />
              <InvitationActions event={event} pdfUrl={pdfAsset?.url} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
