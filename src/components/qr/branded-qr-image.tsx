"use client";

import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import { QR_EXPORT_SIZES } from "@/lib/qr/qr-constants";

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
}

/** Premium branded QR display with multi-size PNG + SVG download */
export function BrandedQrImage({
  src,
  alt = "Celeventic QR code",
  size = 200,
  token,
  className,
  showDownload = true,
  showSizeOptions = true,
  caption,
}: BrandedQrImageProps) {
  const displaySrc =
    token && src.startsWith("data:")
      ? `/api/qr/image?token=${encodeURIComponent(token)}&size=512`
      : src;

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div
        className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_4px_24px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900"
        style={{ width: size + 24, height: size + 24 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displaySrc}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          className="w-full h-full object-contain rounded-xl"
        />
      </div>
      {caption && <p className="text-xs text-slate-500 text-center max-w-[220px]">{caption}</p>}
      {showDownload && token && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {showSizeOptions &&
            QR_EXPORT_SIZES.map((px) => (
              <a
                key={px}
                href={`/api/qr/image?token=${encodeURIComponent(token)}&size=${px}&download=1`}
                download
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 touch-manipulation min-h-[36px] px-2 rounded-lg border border-brand-100"
              >
                <Download className="h-3 w-3" />
                {px}px
              </a>
            ))}
          <a
            href={`/api/qr/image?token=${encodeURIComponent(token)}&format=svg&download=1`}
            download
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 touch-manipulation min-h-[36px] px-2"
          >
            SVG
          </a>
        </div>
      )}
    </div>
  );
}
