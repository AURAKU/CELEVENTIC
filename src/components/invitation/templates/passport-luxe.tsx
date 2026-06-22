"use client";

import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { HeroMedia } from "../shared/hero-media";
import { InvitationRsvpPanel } from "../shared/invitation-rsvp-panel";
import { InvitationActions } from "../shared/invitation-actions";
import { StudioButton } from "../shared/studio-button";

export function PassportLuxeTemplate({ invitation, event, design, guestId, guestName, qrDataUrl }: InvitationRenderProps) {
  const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);
  const { colors, studio } = design;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a1628" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-[#D4A63A]/30 inv-fade-in">
        <div className="bg-gradient-to-br from-[#0B3D3A] to-[#062A28] px-6 py-4 flex items-center justify-between border-b border-[#D4A63A]/20">
          <span className="text-[10px] tracking-[0.35em] uppercase text-[#D4A63A]/80">Passport</span>
          <span className="text-[10px] text-white/40">INV-{invitation.uniqueLink.slice(0, 6).toUpperCase()}</span>
        </div>
        <HeroMedia coverImageUrl={event.coverImageUrl} media={design.media} animation={design.animation} className="h-48" />
        <div className="px-8 py-8 space-y-5 text-center" style={{ color: colors.text, background: colors.background }}>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#D4A63A]">{design.introText ?? "Official invitation"}</p>
          <h1 className="font-display text-2xl tracking-wide" style={{ color: colors.primary, fontSize: studio?.headingSize }}>
            {name1}{name2 && ` & ${name2}`}
          </h1>
          {invitation.message && <p className="text-sm opacity-70 italic" style={{ fontSize: studio?.bodySize }}>{invitation.message}</p>}
          <div className="flex justify-center gap-4 text-sm">
            <span>{date.day} {date.monthShort} {date.year}</span>
            <span className="opacity-40">|</span>
            <span>{date.time}</span>
          </div>
          {(event.venueName || event.landmark) && (
            <p className="text-sm font-medium">{event.venueName}{event.landmark ? ` · ${event.landmark}` : ""}</p>
          )}
          <InvitationRsvpPanel invitationId={invitation.id} guestId={guestId} guestName={guestName} accentColor={colors.secondary} label={studio?.rsvpLabel} />
          <StudioButton studio={studio} accent={colors.secondary}>
            <InvitationActions event={event} pdfUrl={design.media?.find((m) => m.type === "pdf")?.url} />
          </StudioButton>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#D4A63A] via-[#F5E6B8] to-[#D4A63A]" />
      </div>
    </div>
  );
}
