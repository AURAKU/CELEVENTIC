"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Download, Maximize2, X, Sun } from "lucide-react";
import { QR_EXPORT_SIZES, QR_PASS_DISPLAY_MIN_PX, QR_PASS_DISPLAY_SOURCE_PX, type QrDisplayMode } from "@/lib/qr/qr-constants";

interface BrandedQrImageProps {
  /** Data URL or API path */
  src: string;
  alt?: string;
  size?: number;
  token?: string;
  className?: string;
  showDownload?: boolean;
  showSizeOptions?: boolean;
  caption?: string;
  /** pass = high-contrast black/white for phone-screen scanning at gates */
  mode?: QrDisplayMode;
  /** Show tap-to-enlarge for gate entry */
  allowFullscreen?: boolean;
  guestName?: string;
}

function resolveDisplaySrc(src: string, token?: string, mode: QrDisplayMode = "brand", size = 512): string {
  if (token) {
    const params = new URLSearchParams({ token, size: String(size) });
    if (mode === "pass") params.set("mode", "pass");
    return `/api/qr/image?${params.toString()}`;
  }
  if (src.startsWith("data:") && token) {
    const params = new URLSearchParams({ token, size: String(size) });
    if (mode === "pass") params.set("mode", "pass");
    return `/api/qr/image?${params.toString()}`;
  }
  return src;
}

/** Premium branded QR display with pass mode + fullscreen for gate scanning */
export function BrandedQrImage({
  src,
  alt = "Celeventic QR code",
  size = 200,
  token,
  className,
  showDownload = true,
  showSizeOptions = true,
  caption,
  mode = "brand",
  allowFullscreen = false,
  guestName,
}: BrandedQrImageProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const displaySize = mode === "pass" ? Math.max(size, QR_PASS_DISPLAY_MIN_PX) : size;
  const apiSize = mode === "pass" ? QR_PASS_DISPLAY_SOURCE_PX : 512;
  const displaySrc = resolveDisplaySrc(src, token, mode, apiSize);
  const fullscreenSrc = token
    ? resolveDisplaySrc(src, token, mode, QR_PASS_DISPLAY_SOURCE_PX)
    : displaySrc;

  return (
    <>
      <div className={cn("inline-flex flex-col items-center gap-2", className)}>
        <button
          type="button"
          onClick={() => allowFullscreen && setFullscreen(true)}
          className={cn(
            "rounded-2xl border bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-transform",
            mode === "pass" ? "border-slate-300" : "border-slate-200/80",
            allowFullscreen && "cursor-pointer active:scale-[0.98] hover:shadow-lg touch-manipulation"
          )}
          style={{ width: displaySize + 32, height: displaySize + 32 }}
          aria-label={allowFullscreen ? "Tap to enlarge QR pass" : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc}
            alt={alt}
            width={displaySize}
            height={displaySize}
            loading="eager"
            decoding="sync"
            className={cn(
              "h-full w-full object-contain qr-crisp",
              mode !== "pass" && "rounded-xl"
            )}
            style={{ imageRendering: "pixelated" }}
          />
        </button>

        {mode === "pass" && (
          <p className="text-[11px] text-slate-500 flex items-center gap-1 max-w-[260px] text-center">
            <Sun className="h-3 w-3 shrink-0 text-amber-500" />
            Turn brightness up · hold steady for gate scanning
          </p>
        )}

        {caption && <p className="text-xs text-slate-500 text-center max-w-[260px]">{caption}</p>}

        {allowFullscreen && (
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 touch-manipulation min-h-[40px] px-3"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Tap to enlarge for gate
          </button>
        )}

        {showDownload && token && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {showSizeOptions &&
              QR_EXPORT_SIZES.map((px) => (
                <a
                  key={px}
                  href={`/api/qr/image?token=${encodeURIComponent(token)}&size=${px}&mode=${mode}&download=1`}
                  download
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 touch-manipulation min-h-[36px] px-2 rounded-lg border border-brand-100"
                >
                  <Download className="h-3 w-3" />
                  {px}px
                </a>
              ))}
          </div>
        )}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white p-6"
          role="dialog"
          aria-modal
          aria-label="Admission pass QR code"
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {guestName && (
            <p className="text-lg font-semibold text-slate-900 mb-1">{guestName}</p>
          )}
          <p className="text-sm text-slate-500 mb-6">Show this at the entrance</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreenSrc}
            alt={alt}
            className="h-[min(85vw,420px)] w-[min(85vw,420px)] bg-white object-contain p-3 qr-crisp"
            style={{ imageRendering: "pixelated" }}
          />
          <p className="mt-6 text-xs text-slate-500 text-center max-w-xs flex items-center justify-center gap-1">
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            Max brightness · avoid screen glare
          </p>
        </div>
      )}
    </>
  );
}
