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

/**
 * The gift entry point inside a digital invitation.
 *
 * Deliberately quiet: a title, a line of copy, one button and an optional QR.
 * There is no total, no goal, no contributor list and no progress bar — a guest
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
      className="mx-auto max-w-md rounded-2xl border p-7 text-center shadow-sm"
      style={{
        borderColor: `${accentColor}40`,
        background: dark
          ? "linear-gradient(145deg, rgba(15,23,42,0.88) 0%, rgba(30,41,59,0.92) 100%)"
          : "linear-gradient(145deg, #ffffff 0%, #fdfaf3 100%)",
      }}
    >
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: `${accentColor}1F`, color: accentColor }}
      >
        <Gift className="h-6 w-6" aria-hidden="true" />
      </div>

      <h3
        className={`font-display text-lg font-bold ${dark ? "text-white" : "text-[#0F172A]"}`}
      >
        {title}
      </h3>
      <p className={`mt-2 text-sm leading-relaxed ${dark ? "text-white/70" : "text-slate-600"}`}>
        {subtitle}
      </p>

      <a
        href={giftUrl}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white shadow-md transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        style={{ background: accentColor, outlineColor: accentColor }}
      >
        <Gift className="h-4 w-4" aria-hidden="true" />
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

      <p className={`mt-5 text-[11px] ${dark ? "text-white/50" : "text-slate-500"}`}>
        {privacyNote}
      </p>
    </div>
  );
}
