"use client";

import { Gift } from "lucide-react";

export interface GiftInviteCardProps {
  /** Public gift link. The card renders nothing without it. */
  giftUrl: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  privacyNote: string;
  /** Branded QR pointing at `giftUrl`, for guests holding a printed card. */
  qrImageUrl?: string | null;
  accentColor?: string;
  variant?: "light" | "dark";
}

const INK = "#3A2A2E";

/**
 * The gift entry point inside a digital invitation.
 *
 * Deliberately quiet: a title, a line of copy, one button and an optional QR.
 * There is no total, no goal, no contributor list and no progress bar, a guest
 * standing in the room must not be able to infer what anyone else gave. Colours
 * come from the invitation's own palette so the card reads as part of the
 * template rather than a bolted-on payment widget.
 */
export function GiftInviteCard({
  giftUrl,
  title,
  subtitle,
  ctaLabel,
  privacyNote,
  qrImageUrl,
  accentColor = "#D4A63A",
  variant = "light",
}: GiftInviteCardProps) {
  if (!giftUrl) return null;

  const dark = variant === "dark";

  return (
    <div
      className="relative mx-auto max-w-md overflow-hidden rounded-[1.35rem] border px-7 py-8 text-center"
      style={{
        borderColor: `${accentColor}55`,
        background: dark
          ? "linear-gradient(165deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.94) 100%)"
          : "linear-gradient(165deg, #ffffff 0%, #fdfaf3 55%, #ffffff 100%)",
        boxShadow: `inset 0 0 0 1px ${accentColor}22, 0 22px 44px -28px rgba(58,42,46,0.45)`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />

      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background: `${accentColor}1F`,
          color: accentColor,
          border: `1px solid ${accentColor}66`,
          boxShadow: `0 0 0 4px ${accentColor}12`,
        }}
      >
        <Gift className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
      </div>

      <h3
        className={`font-display text-xl font-semibold leading-snug ${dark ? "text-white" : "text-[#3A2A2E]"}`}
      >
        {title}
      </h3>
      <p className={`mt-2.5 text-sm leading-relaxed ${dark ? "text-white/70" : "text-[#3A2A2E]/75"}`}>
        {subtitle}
      </p>

      <a
        href={giftUrl}
        className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold tracking-[0.14em] shadow-md transition-[transform,filter,box-shadow] duration-300 hover:-translate-y-0.5 hover:brightness-[1.06] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        style={{
          background: accentColor,
          color: INK,
          boxShadow: `0 12px 28px -12px ${accentColor}`,
          outlineColor: accentColor,
        }}
      >
        <Gift className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        {ctaLabel}
      </a>

      {qrImageUrl && (
        <div className="mt-6">
          <div className="inline-block rounded-xl bg-white p-3 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt={`QR code to ${ctaLabel.toLowerCase()}`}
              width={132}
              height={132}
              className="h-[132px] w-[132px]"
              loading="lazy"
            />
          </div>
          <p className={`mt-2 text-[11px] ${dark ? "text-white/50" : "text-slate-500"}`}>
            Scan to open on another device
          </p>
        </div>
      )}

      <p
        className="mt-5 text-[10px] font-medium uppercase tracking-[0.18em]"
        style={{ color: accentColor, opacity: dark ? 0.7 : 0.9 }}
      >
        {privacyNote}
      </p>
    </div>
  );
}
