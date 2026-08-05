"use client";

import { useMemo, useState } from "react";
import { formatAdmissionCode } from "@/lib/admission/pass-code";
import { QR_PASS_DISPLAY_MIN_PX, QR_PASS_DISPLAY_SOURCE_PX } from "@/lib/qr/qr-constants";
import { BRAND_LOGO_MARK } from "@/lib/brand/constants";

const QR_IMAGE_RENDERING = { imageRendering: "pixelated" as const };

export function VendorPassCard({
  title,
  vendorName,
  eventTitle,
  passMode,
  passType,
  teamCapacity,
  admittedCount,
  admissionCode,
  accessZones,
  validUntil,
  contactName,
  publicToken,
  status,
}: {
  title: string;
  vendorName: string;
  eventTitle?: string | null;
  passMode: string;
  passType: string;
  teamCapacity: number;
  admittedCount?: number;
  admissionCode: string;
  accessZones: string[];
  validUntil?: string | null;
  contactName?: string | null;
  /** Public pass token used to load the branded QR / card image APIs. */
  publicToken: string;
  status?: string;
}) {
  const code = useMemo(() => formatAdmissionCode(admissionCode), [admissionCode]);
  const [codeRevealed, setCodeRevealed] = useState(false);
  const remaining = Math.max(0, teamCapacity - (admittedCount ?? 0));
  const zones = accessZones.length ? accessZones.join(" · ") : "General Event Area";
  const passKind =
    passMode === "INDIVIDUAL" ? "Individual Pass" : `Team Pass · ${teamCapacity}`;
  const typeLabel = passType.replace(/_/g, " ");
  const capacityLine =
    passMode === "INDIVIDUAL"
      ? "1 person authorized"
      : `${admittedCount ?? 0} admitted · ${remaining} remaining of ${teamCapacity}`;

  const qrSrc = useMemo(() => {
    const params = new URLSearchParams({
      publicToken,
      kind: "qr",
      mode: "brand",
      size: String(QR_PASS_DISPLAY_SOURCE_PX),
    });
    return `/api/vendor-pass/qr-image?${params.toString()}`;
  }, [publicToken]);

  return (
    <article
      data-vendor-access-card
      className="overflow-hidden rounded-3xl border border-brand-200/70 bg-ivory shadow-[0_24px_60px_-36px_rgba(11,138,131,0.45)] print:shadow-none print:border-brand-600"
    >
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-brand-800 px-5 py-6 text-white">
        <div className="absolute inset-0 opacity-[0.12]" aria-hidden>
          <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-gold-400 blur-2xl" />
          <div className="absolute -bottom-12 left-10 h-32 w-32 rounded-full bg-white blur-2xl" />
        </div>

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND_LOGO_MARK}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-xl bg-white/95 object-contain p-1 shadow-sm"
            />
            <div className="min-w-0">
              <p className="text-[15px] font-bold uppercase tracking-[0.22em] text-white/80">
                Celeventic
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold-300">
                Vendor &amp; Team Access
              </p>
            </div>
          </div>
          {status && status !== "ACTIVE" ? (
            <span className="shrink-0 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-300">
              {status}
            </span>
          ) : null}
        </div>

        <p className="relative mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">
          {passKind}
        </p>
        {eventTitle ? (
          <p className="relative mt-2 text-sm text-white/80 line-clamp-2">{eventTitle}</p>
        ) : null}
        <h1 className="relative mt-1 text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
          {title}
        </h1>
        <p className="relative mt-1 text-base font-medium text-white/90">{vendorName}</p>
        <p className="relative mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
          {typeLabel}
        </p>
      </header>

      <div className="flex flex-col items-center bg-ivory px-5 py-6">
        <div
          className="rounded-2xl border border-brand-200/80 bg-white p-3 shadow-[0_8px_24px_-12px_rgba(11,138,131,0.35)] print:shadow-none"
          style={{ width: QR_PASS_DISPLAY_MIN_PX + 24, height: QR_PASS_DISPLAY_MIN_PX + 24 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={`Vendor access QR for ${vendorName}`}
            width={QR_PASS_DISPLAY_MIN_PX}
            height={QR_PASS_DISPLAY_MIN_PX}
            className="h-full w-full object-contain"
            style={QR_IMAGE_RENDERING}
            loading="eager"
            decoding="sync"
          />
        </div>

        <div className="mt-6 w-full max-w-sm text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand-600">
            Access
          </p>
          <p className="mt-1.5 text-base font-semibold leading-snug text-slate-900 sm:text-lg">
            {zones}
          </p>
          <p className="mt-1 text-sm font-semibold text-brand-700 sm:text-base">
            ({vendorName})
          </p>
          <p className="mt-2 text-xs text-slate-500">{capacityLine}</p>
        </div>
      </div>

      {/* Security wristband — code lives here (not the main face) so it isn’t shoulder-readable */}
      <div
        data-vendor-security-band
        className="relative overflow-hidden border-y border-brand-900/40 bg-gradient-to-r from-brand-900 via-brand-700 to-brand-900 px-4 py-3 print:py-2.5"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(-55deg, transparent, transparent 10px, rgba(212,175,55,0.35) 10px, rgba(212,175,55,0.35) 12px)",
          }}
        />
        <button
          type="button"
          className="relative flex w-full items-center justify-between gap-3 text-left print:pointer-events-none"
          onClick={() => setCodeRevealed((v) => !v)}
          aria-pressed={codeRevealed}
          aria-label={
            codeRevealed
              ? `Admission code ${code}. Tap to hide.`
              : "Hold privately — tap to reveal admission code"
          }
        >
          <span className="min-w-0">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.28em] text-gold-300/90">
              Security band · admission
            </span>
            <span
              className={`mt-0.5 block font-mono text-sm font-bold tabular-nums tracking-[0.22em] text-white transition-[filter] print:blur-none print:text-white ${
                codeRevealed ? "blur-none" : "select-none blur-[5px]"
              }`}
            >
              {code}
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/80 print:hidden">
            {codeRevealed ? "Hide" : "Reveal"}
          </span>
        </button>
      </div>

      <footer className="space-y-1.5 border-t border-brand-100 bg-white/80 px-5 py-4 text-sm text-slate-600">
        {validUntil ? (
          <p>
            <span className="font-semibold text-slate-900">Valid until: </span>
            {new Date(validUntil).toLocaleString()}
          </p>
        ) : null}
        {contactName ? (
          <p>
            <span className="font-semibold text-slate-900">Contact: </span>
            {contactName}
          </p>
        ) : null}
        <p className="pt-1 text-[11px] font-medium tracking-wide text-slate-400">
          celeventic.com · Celebrate · Event · Ticket
        </p>
      </footer>
    </article>
  );
}
