"use client";

import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { HeroMedia } from "../shared/hero-media";
import { InvitationRsvpPanel } from "../shared/invitation-rsvp-panel";
import { InvitationActions } from "../shared/invitation-actions";
import { StudioButton } from "../shared/studio-button";

export function GlassAcrylicTemplate({ invitation, event, design, guestId, guestName }: InvitationRenderProps) {
  const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);
  const { colors, studio } = design;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8" style={{ background: "linear-gradient(160deg, #0a1628 0%, #1a3a5c 50%, #0B8A83 100%)" }}>
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden inv-fade-in backdrop-blur-xl border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.4)]"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        <HeroMedia coverImageUrl={event.coverImageUrl} media={design.media} animation={design.animation} className="h-56 opacity-90" overlay />
        <div className="relative px-8 py-10 text-center space-y-5 inv-text-on-glass">
          <p className="text-xs tracking-[0.25em] uppercase inv-muted-on-dark">{design.introText ?? "You are invited"}</p>
          <h1 className="font-display text-3xl font-light" style={{ fontSize: studio?.headingSize }}>
            {name1}{name2 && <span className="block mt-1 text-[#7dd3fc]">& {name2}</span>}
          </h1>
          {invitation.message && <p className="text-sm inv-caption-on-dark italic" style={{ fontSize: studio?.bodySize }}>{invitation.message}</p>}
          <div className="rounded-2xl bg-white/15 border border-white/20 px-6 py-4 space-y-1 inv-readable-panel">
            <p className="text-lg font-light">{date.day} {date.monthShort} {date.year}</p>
            <p className="text-sm inv-muted-on-dark">{date.time}</p>
            {(event.venueName || event.landmark) && (
              <p className="text-sm inv-caption-on-dark pt-2">{event.venueName}{event.landmark ? `, ${event.landmark}` : ""}</p>
            )}
          </div>
          <InvitationRsvpPanel invitationId={invitation.id} guestId={guestId} guestName={guestName} accentColor="#7dd3fc" label={studio?.rsvpLabel} />
          <StudioButton studio={studio} accent="#7dd3fc">
            <InvitationActions event={event} pdfUrl={design.media?.find((m) => m.type === "pdf")?.url} />
          </StudioButton>
        </div>
      </div>
    </div>
  );
}
