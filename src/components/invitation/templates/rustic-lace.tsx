"use client";

import Image from "next/image";
import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { LaceBorder } from "../shared/invitation-ornaments";
import { HeroMedia } from "../shared/hero-media";
import { InvitationRsvpPanel } from "../shared/invitation-rsvp-panel";
import { InvitationActions } from "../shared/invitation-actions";

export function RusticLaceTemplate({ invitation, event, design, guestId, guestName, qrDataUrl }: InvitationRenderProps) {
  const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);
  const hero = design.media?.find((m) => m.role === "hero");

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#2a1810" }}>
      <div
        className="relative w-full max-w-md shadow-2xl inv-fade-in overflow-hidden"
        style={{
          background: hero
            ? undefined
            : "linear-gradient(180deg, #4a3020 0%, #3d2314 30%, #2a1810 100%)",
        }}
      >
        {hero ? (
          <HeroMedia media={design.media} animation={design.animation} className="absolute inset-0" overlay />
        ) : (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(0,0,0,0.15) 48px, rgba(0,0,0,0.15) 50px)`,
            }}
          />
        )}
        <LaceBorder position="top" />
        <LaceBorder position="bottom" />
        <div className="relative z-10 px-8 py-24 text-center text-white space-y-5 font-[family-name:var(--font-cormorant)]">
          <p className="text-xs leading-relaxed opacity-90 max-w-xs mx-auto">
            {design.introText ?? invitation.message ?? "It is with great joy that we invite you to celebrate with us"}
          </p>
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl tracking-[0.12em] uppercase">
            {name2 ? `${name1} & ${name2}` : name1}
          </h1>
          <div className="flex items-center justify-center gap-4 py-2">
            <span className="text-xs lowercase tracking-wider opacity-80">{date.weekday}</span>
            <div className="flex items-center gap-3">
              <div className="h-12 w-px bg-white/40" />
              <div className="text-center">
                <p className="font-[family-name:var(--font-playfair)] text-4xl font-light">{date.day}</p>
                <p className="text-xs tracking-wider">{date.year}</p>
                <p className="text-[10px] opacity-80">{date.time}</p>
              </div>
              <div className="h-12 w-px bg-white/40" />
            </div>
            <span className="text-xs lowercase tracking-wider opacity-80">{date.month}</span>
          </div>
          {(event.venueName || event.landmark) && (
            <p className="text-sm font-[family-name:var(--font-playfair)] tracking-wide">
              {event.venueName}
              {event.landmark && <><br /><span className="text-xs opacity-80">{event.landmark}</span></>}
            </p>
          )}
          {qrDataUrl && (
            <Image src={qrDataUrl} alt="QR" width={100} height={100} className="mx-auto rounded" />
          )}
          <InvitationRsvpPanel invitationId={invitation.id} guestId={guestId} guestName={guestName} accentColor="#C9A227" variant="dark" />
          <InvitationActions event={event} pdfUrl={design.media?.find((m) => m.type === "pdf")?.url} variant="dark" />
        </div>
      </div>
    </div>
  );
}
