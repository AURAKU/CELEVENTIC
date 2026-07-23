"use client";

import { Hand, Music2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewTapAffordanceProps {
  compact?: boolean;
  hasMusic?: boolean;
  /** Override primary label (default: Tap to view invitation) */
  label?: string;
  /** Optional secondary line under the CTA */
  subtitle?: string;
  onOpen: (e: React.MouseEvent) => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Soft tap gate over a faithful template glimpse.
 * Bottom-anchored pill + light scrim — design stays readable; clicks always fire.
 */
export function PreviewTapAffordance({
  compact,
  hasMusic,
  label = "Tap to view invitation",
  subtitle,
  onOpen,
  className,
  "aria-label": ariaLabel = "Tap to open live template preview",
}: PreviewTapAffordanceProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen(e);
      }}
      className={cn(
        // Above glimpse (z-10) and any decorative layers — never under the poster
        "absolute inset-0 z-30 flex flex-col items-center justify-end w-full h-full",
        // Soft bottom scrim only — keep envelope / cover readable (no heavy wash)
        "bg-gradient-to-t from-black/40 via-black/[0.07] to-transparent",
        "pt-8 pb-3 sm:pb-4 px-3",
        "transition-colors hover:from-black/48 hover:via-black/10 active:scale-[0.997]",
        "touch-manipulation cursor-pointer border-0",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-white/80",
        className
      )}
      aria-label={ariaLabel}
    >
      <span
        className={cn(
          "pointer-events-none flex flex-col items-center gap-1.5 rounded-2xl border border-white/35 bg-black/45 text-white shadow-lg backdrop-blur-[2px]",
          compact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"
        )}
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full bg-white/20 border border-white/25",
              compact ? "h-6 w-6" : "h-8 w-8"
            )}
          >
            <Play className={cn("text-white fill-white", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          </span>
          <span
            className={cn(
              "font-medium drop-shadow-sm flex items-center gap-1.5",
              compact ? "text-[10px]" : "text-xs sm:text-sm"
            )}
          >
            <Hand className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
            {label}
          </span>
        </span>
        {hasMusic && (
          <span className="text-[10px] text-white/85 flex items-center gap-1">
            <Music2 className="h-3 w-3" /> Includes music — tap to begin
          </span>
        )}
        {subtitle ? (
          <span className="text-[10px] text-white/80 text-center max-w-[16rem] leading-snug">
            {subtitle}
          </span>
        ) : null}
      </span>
    </button>
  );
}
