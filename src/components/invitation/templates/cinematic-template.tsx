"use client";

import Image from "next/image";
import type { InvitationRenderProps } from "@/types/invitation-design";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { getCinematicTheme, isCinematicLayout } from "@/lib/invitation/cinematic-themes";
import { HeroMedia } from "../shared/hero-media";
import { InvitationRsvpPanel } from "../shared/invitation-rsvp-panel";
import { InvitationActions } from "../shared/invitation-actions";
import { styledInvitationButton } from "@/lib/invitation/invitation-button-styles";
import { cn } from "@/lib/utils";

export { isCinematicLayout };

export function CinematicTemplate({ invitation, event, design, guestId, guestName, qrDataUrl }: InvitationRenderProps) {
  const theme = getCinematicTheme(design.layout);
  const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);
  const { colors } = design;
  const buttonStyle = design.studio?.buttonStyle ?? theme?.buttonStyle ?? "gold";
  const bg = theme?.background ?? `linear-gradient(180deg, ${colors.background} 0%, #0a0a0a 100%)`;
  const headingSize = design.studio?.headingSize ?? 28;
  const bodySize = design.studio?.bodySize ?? 14;
  const scriptSize = design.studio?.scriptSize ?? 22;

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 sm:p-6 safe-area-pb cinematic-invite-root"
      style={{ background: bg, color: colors.text }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{ boxShadow: `inset 0 0 120px ${theme?.accentGlow ?? "rgba(0,0,0,0.3)"}` }}
      />
      <div className="relative w-full max-w-lg inv-fade-in z-10">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl",
            design.layout === "crystal-acrylic-luxury" && "backdrop-blur-xl bg-white/10",
            design.layout === "neon-celebration-party" && "border-fuchsia-500/30 shadow-[0_0_40px_rgba(232,121,249,0.2)]"
          )}
          style={{ backgroundColor: colors.background?.startsWith("rgba") ? undefined : colors.background }}
        >
          <HeroMedia
            coverImageUrl={event.coverImageUrl}
            media={design.media}
            animation={design.animation}
            className="h-52 sm:h-60"
            overlay
          />
          <div className="px-6 sm:px-10 py-8 sm:py-10 text-center space-y-5">
            <p
              className="uppercase opacity-70 tracking-[0.35em] font-light"
              style={{ fontSize: bodySize - 2 }}
            >
              {design.introText}
            </p>
            <h1
              className="font-[family-name:var(--font-cinzel)] tracking-[0.12em] uppercase leading-snug"
              style={{ fontSize: headingSize, color: colors.primary }}
            >
              {name1}
              {name2 && (
                <>
                  <span className="block my-2 opacity-60 text-lg">&</span>
                  {name2}
                </>
              )}
            </h1>
            {invitation.message && (
              <p
                className="italic opacity-80 font-[family-name:var(--font-cormorant)]"
                style={{ fontSize: scriptSize }}
              >
                {invitation.message}
              </p>
            )}
            <div
              className="h-px w-20 mx-auto"
              style={{ background: `linear-gradient(90deg, transparent, ${colors.secondary}, transparent)` }}
            />
            <p className="font-[family-name:var(--font-cinzel)] tracking-[0.25em]" style={{ fontSize: bodySize + 2 }}>
              {String(date.day).padStart(2, "0")} · {date.monthShort.toUpperCase()} · {date.year}
            </p>
            <p className="opacity-60" style={{ fontSize: bodySize }}>{date.time}</p>
            {event.venueName && (
              <p className="tracking-wide" style={{ fontSize: bodySize + 1 }}>{event.venueName}</p>
            )}
            {event.landmark && (
              <p className="opacity-60" style={{ fontSize: bodySize - 1 }}>{event.landmark}</p>
            )}
            {event.dressCode && (
              <p className="opacity-70" style={{ fontSize: bodySize - 1 }}>Dress code · {event.dressCode}</p>
            )}
            {qrDataUrl && (
              <Image src={qrDataUrl} alt="Guest pass QR" width={112} height={112} className="mx-auto rounded-lg" />
            )}
            <InvitationRsvpPanel
              invitationId={invitation.id}
              guestId={guestId}
              guestName={guestName}
              accentColor={colors.secondary}
              textColor={colors.text}
              variant="dark"
              buttonStyle={buttonStyle}
            />
            <InvitationActions event={event} pdfUrl={design.media?.find((m) => m.type === "pdf")?.url} variant="dark" buttonStyle={buttonStyle} />
          </div>
        </div>
        {theme && (
          <p className="text-center text-[10px] uppercase tracking-widest opacity-40 mt-4">{theme.name}</p>
        )}
      </div>
    </div>
  );
}
