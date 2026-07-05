"use client";

import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { HeroMedia } from "../shared/hero-media";
import { InvitationRsvpPanel } from "../shared/invitation-rsvp-panel";
import { InvitationActions } from "../shared/invitation-actions";
import { StudioButton } from "../shared/studio-button";

export function FloralGardenTemplate({ invitation, event, design, guestId, guestName }: InvitationRenderProps) {
  const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);
  const { colors, studio } = design;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#fdf8f3" }}>
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden inv-fade-in border border-rose-100">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-rose-100/80 to-transparent pointer-events-none" />
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-rose-200/40 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-emerald-200/30 blur-2xl" />
        <HeroMedia coverImageUrl={event.coverImageUrl} media={design.media} animation={design.animation} className="h-52" overlay={false} />
        <div className="relative px-8 py-8 text-center space-y-4 inv-text-on-light" style={{ color: colors.text }}>
          <div className="flex justify-center gap-2 text-rose-600 text-lg">✿ ✿ ✿</div>
          <p className="text-xs tracking-[0.2em] uppercase text-rose-800">{design.introText ?? "Together with their families"}</p>
          <h1 className="font-[family-name:var(--font-great-vibes)] text-4xl text-rose-900" style={{ fontSize: studio?.scriptSize ?? studio?.headingSize }}>
            {name1}{name2 && ` & ${name2}`}
          </h1>
          {invitation.message && <p className="text-sm text-rose-900 italic" style={{ fontSize: studio?.bodySize }}>{invitation.message}</p>}
          <div className="py-3 border-y border-rose-100 space-y-1">
            <p className="font-display text-lg text-rose-950">{date.day} {date.monthShort} {date.year}</p>
            <p className="text-sm text-rose-800">{date.time}</p>
          </div>
          {(event.venueName || event.landmark) && (
            <p className="text-sm text-rose-950">{event.venueName}{event.landmark ? ` · ${event.landmark}` : ""}</p>
          )}
          <InvitationRsvpPanel invitationId={invitation.id} guestId={guestId} guestName={guestName} accentColor={colors.secondary} label={studio?.rsvpLabel} />
          <StudioButton studio={studio} accent={colors.secondary}>
            <InvitationActions event={event} pdfUrl={design.media?.find((m) => m.type === "pdf")?.url} />
          </StudioButton>
        </div>
      </div>
    </div>
  );
}
