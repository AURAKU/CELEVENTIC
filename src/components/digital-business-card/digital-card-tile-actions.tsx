"use client";

import { Check, Download, Share2 } from "lucide-react";

export function DigitalCardTileActions({
  accent,
  border,
  onShare,
  downloadHref,
  copied,
}: {
  accent: string;
  border: string;
  onShare: () => void;
  downloadHref?: string | null;
  copied?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute right-1.5 top-1.5 z-10 sm:right-2 sm:top-2">
      <div
        className="pointer-events-auto flex items-center gap-0.5 rounded-full border p-0.5 shadow-[0_8px_20px_rgba(15,23,42,0.16)]"
        style={{ background: "rgba(255,254,248,0.94)", borderColor: border }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onShare();
          }}
          aria-label={copied ? "Link copied" : "Share this card"}
          className="grid h-8 w-8 place-items-center rounded-full"
          style={{ color: accent }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
        </button>
        {downloadHref ? (
          <a
            href={downloadHref}
            aria-label="Download this card"
            onClick={(event) => event.stopPropagation()}
            className="grid h-8 w-8 place-items-center rounded-full"
            style={{ color: accent }}
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
