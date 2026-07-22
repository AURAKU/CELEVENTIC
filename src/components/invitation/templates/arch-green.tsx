"use client";

import Image from "next/image";
import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { VineBorder } from "../shared/invitation-ornaments";
import { InvitationRsvpPanel } from "../shared/invitation-rsvp-panel";
import { InvitationActions } from "../shared/invitation-actions";

export function ArchGreenTemplate({ invitation, event, design, guestId, guestName, qrDataUrl }: InvitationRenderProps) {
  const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);
  const { colors } = design;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8" style={{ backgroundColor: "#0f1a14" }}>
      <div
        className="relative w-full max-w-sm inv-fade-in overflow-hidden rounded-t-[50%] rounded-b-lg shadow-2xl"
        style={{ backgroundColor: colors.background, color: colors.text, minHeight: "580px" }}
      >
        <VineBorder color={colors.text} />
        <div className="relative px-8 pt-20 pb-10 text-center space-y-4 inv-text-on-dark inv-phrase-emphasis">
          <p className="text-[10px] tracking-[0.3em] uppercase inv-muted-on-dark font-[family-name:var(--font-cormorant)]">
            {design.introText}
          </p>
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-cinzel)] text-2xl tracking-[0.35em] uppercase">
              {name1.split(" ")[0]}
            </h1>
            {name1.includes(" ") && (
              <p className="text-[10px] tracking-[0.2em] uppercase inv-muted-on-dark">{name1.split(" ").slice(1).join(" ")}</p>
            )}
          </div>
          <p className="font-[family-name:var(--font-great-vibes)] text-3xl">and</p>
          {name2 && (
            <div className="space-y-1">
              <h1 className="font-[family-name:var(--font-cinzel)] text-2xl tracking-[0.35em] uppercase">
                {name2.split(" ")[0]}
              </h1>
              {name2.includes(" ") && (
                <p className="text-[10px] tracking-[0.2em] uppercase inv-muted-on-dark">{name2.split(" ").slice(1).join(" ")}</p>
              )}
            </div>
          )}
          {invitation.message && (
            <p className="text-sm italic inv-caption-on-dark font-[family-name:var(--font-cormorant)] leading-relaxed px-2">
              {invitation.message}
            </p>
          )}
          <div className="pt-4 space-y-2 font-[family-name:var(--font-cormorant)]">
            <p className="text-xs tracking-[0.2em] uppercase inv-muted-on-dark">{date.weekday}</p>
            <p className="text-lg tracking-wider">{date.month} {date.day}, {date.year}</p>
            <p className="text-sm inv-caption-on-dark">{date.time}</p>
          </div>
          {event.venueName && (
            <div className="pt-2">
              <p className="text-xs tracking-[0.25em] uppercase font-[family-name:var(--font-cinzel)]">{event.venueName}</p>
              {event.landmark && <p className="text-xs inv-muted-on-dark mt-1">{event.landmark}</p>}
            </div>
          )}
          {qrDataUrl && (
            <div className="flex justify-center pt-2">
              <Image src={qrDataUrl} alt="QR" width={100} height={100} className="rounded bg-white/10 p-1"  unoptimized />
            </div>
          )}
          <InvitationRsvpPanel
            invitationId={invitation.id}
            guestId={guestId}
            guestName={guestName}
            accentColor={colors.accent}
            textColor={colors.text}
            variant="dark"
          />
          <InvitationActions event={event} pdfUrl={design.media?.find((m) => m.type === "pdf")?.url} variant="dark" />
        </div>
        <VineBorder color={colors.text} />
        <div className="absolute bottom-16 left-0 right-0 rotate-180"><VineBorder color={colors.text} /></div>
      </div>
    </div>
  );
}
