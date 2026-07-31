"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Maximize2, Printer, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAdmissionCode } from "@/lib/admission/pass-code";
import {
  entryPassTheme,
  resolveEntryPassPreset,
  type EntryPassPreset,
} from "@/components/admission/entry-pass-theme";
import {
  QR_PASS_DISPLAY_MIN_PX,
  QR_PASS_DISPLAY_SOURCE_PX,
} from "@/lib/qr/qr-constants";

export interface GuestEntryPassProps {
  /** Signed pass token, the QR payload. Never a database id. */
  token: string;
  /** Human-readable admission code (4 or 6 digits). */
  code: string;
  /** Guest, couple, family, or group name shown on the pass. */
  displayName: string;
  eventName: string;
  eventDate?: string | null;
  venueName?: string | null;
  /** Kept for callers; capacity copy lives on the place card only. */
  partySize?: number;
  /** @deprecated Guest-facing admission counts are never shown on the pass. */
  admittedCount?: number;
  status?: string;
  /** @deprecated Table/seat belong on the place card when assigned. */
  tableNumber?: string | null;
  /** @deprecated Table/seat belong on the place card when assigned. */
  seatLabel?: string | null;
  instructions?: string | null;
  allowDownload?: boolean;
  allowPrint?: boolean;
  /** @deprecated Party-size chips are never shown on the guest entry pass. */
  showPartySize?: boolean;
  /** Invitation layout slug, drives the theme preset. */
  layout?: string | null;
  preset?: EntryPassPreset;
  className?: string;
}

const QR_DISPLAY_PX = QR_PASS_DISPLAY_MIN_PX;
/** Prefer pixelated (Chromium) with crisp-edges fallback for Safari. */
const QR_IMAGE_RENDERING = { imageRendering: "pixelated" as const };

/**
 * The Guest Entry Pass shown at the bottom of a published invitation.
 *
 * Readability at the gate beats decoration: the QR is rendered on a plain
 * white plate at a fixed minimum size, works from a screenshot, and the
 * fullscreen view maximises brightness contrast for scanning in the dark.
 *
 * Capacity and seating live on the personalised place card — this surface is
 * QR + admission code + save/print actions only.
 */
export function GuestEntryPass({
  token,
  code,
  displayName,
  eventName,
  eventDate,
  venueName,
  status = "ACTIVE",
  instructions,
  allowDownload = true,
  allowPrint = true,
  layout,
  preset,
  className,
}: GuestEntryPassProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement | null>(null);
  const theme = entryPassTheme(preset ?? resolveEntryPassPreset(layout));
  const formattedCode = useMemo(() => formatAdmissionCode(code), [code]);

  const imageUrl = useCallback(
    (size: number, opts: { format?: "png" | "svg"; download?: boolean } = {}) => {
      const params = new URLSearchParams({ token, size: String(size), mode: "pass" });
      if (opts.format === "svg") params.set("format", "svg");
      if (opts.download) params.set("download", "1");
      return `/api/admission/pass-image?${params.toString()}`;
    },
    [token]
  );

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!shareOpen) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!shareRef.current?.contains(event.target as Node)) {
        setShareOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShareOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [shareOpen]);

  const isUsable = status !== "REVOKED" && status !== "REISSUED" && status !== "EXPIRED";
  const showShareMenu = (allowDownload || allowPrint) && isUsable;

  return (
    <section
      aria-labelledby="entry-pass-heading"
      data-entry-pass
      className={cn("px-4 pb-10 pt-2 print:px-0 print:pb-0", className)}
    >
      <div
        className={cn(
          "mx-auto max-w-md overflow-hidden rounded-3xl border shadow-[0_10px_40px_rgba(15,23,42,0.08)] print:shadow-none print:border-black",
          theme.surface,
          theme.border
        )}
      >
        <header className="px-6 pt-6 text-center">
          <p
            id="entry-pass-heading"
            className={cn("text-[11px] font-semibold uppercase tracking-[0.32em]", theme.eyebrow)}
          >
            Your Entry Pass
          </p>
          <h3 className={cn("mt-2 text-xl font-semibold leading-tight", theme.heading)}>
            {displayName}
          </h3>
          <p className={cn("mt-1 text-sm", theme.body)}>{eventName}</p>
          {(eventDate || venueName) && (
            <p className={cn("mt-0.5 text-xs", theme.body)}>
              {[eventDate, venueName].filter(Boolean).join(" · ")}
            </p>
          )}
        </header>

        <div className="mt-5 flex flex-col items-center px-6">
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label="Enlarge entry pass QR code for scanning"
            className="rounded-2xl border border-slate-300 bg-white p-4 transition-transform active:scale-[0.98] print:border-black"
            style={{ width: QR_DISPLAY_PX + 32, height: QR_DISPLAY_PX + 32 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(QR_PASS_DISPLAY_SOURCE_PX)}
              alt={`Entry pass QR code for ${displayName}`}
              width={QR_DISPLAY_PX}
              height={QR_DISPLAY_PX}
              loading="eager"
              decoding="sync"
              className="h-full w-full object-contain"
              style={QR_IMAGE_RENDERING}
            />
          </button>

          <p className={cn("mt-2 flex items-center gap-1 text-[11px]", theme.body)}>
            <Sun className="h-3 w-3 shrink-0" style={{ color: theme.accent }} aria-hidden />
            Turn brightness up · a screenshot scans just as well
          </p>

          <div
            className={cn(
              "mt-4 w-full rounded-2xl border px-4 py-3 text-center",
              theme.codePlate
            )}
          >
            <p className={cn("text-[10px] uppercase tracking-[0.24em]", theme.eyebrow)}>
              Admission code
            </p>
            <p
              className={cn(
                "font-mono text-3xl font-bold tabular-nums tracking-[0.3em]",
                theme.codeText
              )}
            >
              {formattedCode}
            </p>
            <p className={cn("mt-1 text-[11px]", theme.body)}>
              Read this out if the QR can&apos;t be scanned
            </p>
          </div>
        </div>

        {instructions && (
          <>
            <div className={cn("mx-6 mt-5 h-px", theme.divider)} />
            <p className={cn("px-6 py-4 text-center text-xs leading-relaxed", theme.body)}>
              {instructions}
            </p>
          </>
        )}

        {isUsable && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-6 pb-6 pt-2 print:hidden">
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className={cn(
                "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors",
                theme.action
              )}
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              Full screen
            </button>

            {showShareMenu && (
              <div className="relative" ref={shareRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={shareOpen}
                  onClick={() => setShareOpen((open) => !open)}
                  className={cn(
                    "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors",
                    theme.action
                  )}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Save or print
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", shareOpen && "rotate-180")}
                    aria-hidden
                  />
                </button>

                {shareOpen && (
                  <div
                    role="menu"
                    aria-label="Save or print entry pass"
                    className="absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                  >
                    {allowPrint && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShareOpen(false);
                          window.print();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Printer className="h-3.5 w-3.5" aria-hidden />
                        Print / PDF
                      </button>
                    )}
                    {allowDownload && (
                      <>
                        <a
                          role="menuitem"
                          href={imageUrl(1024, { download: true })}
                          download
                          onClick={() => setShareOpen(false)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden />
                          Download PNG
                        </a>
                        <a
                          role="menuitem"
                          href={imageUrl(1024, { format: "svg", download: true })}
                          download
                          onClick={() => setShareOpen(false)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden />
                          Download SVG
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-white p-6 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={`Entry pass for ${displayName}`}
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-slate-100"
            aria-label="Close full screen pass"
            autoFocus
          >
            <X className="h-5 w-5" aria-hidden />
          </button>

          <p className="text-lg font-semibold text-slate-900">{displayName}</p>
          <p className="mb-5 text-sm text-slate-500">{eventName}</p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl(QR_PASS_DISPLAY_SOURCE_PX)}
            alt={`Entry pass QR code for ${displayName}`}
            className="h-[min(82vw,420px)] w-[min(82vw,420px)] bg-white object-contain p-3"
            style={QR_IMAGE_RENDERING}
          />

          <p className="mt-5 font-mono text-3xl font-bold tabular-nums tracking-[0.3em] text-slate-900">
            {formattedCode}
          </p>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            <Sun className="h-3.5 w-3.5 text-amber-500" aria-hidden />
            Set brightness to maximum and avoid glare
          </p>
        </div>
      )}
    </section>
  );
}
