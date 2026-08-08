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
  /**
   * Beats this tap will play, in order (e.g. Bow unties → Music begins →
   * Invite opens). Rendered as a chain so the promise is the experience.
   */
  steps?: string[];
  onOpen: (e: React.MouseEvent) => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Soft tap gate over a faithful template glimpse.
 * Bottom-anchored pill + light scrim, design stays readable; clicks always fire.
 */
export function PreviewTapAffordance({
  compact,
  hasMusic,
  label = "Tap to view invitation",
  subtitle,
  steps,
  onOpen,
  className,
  "aria-label": ariaLabel = "Tap to open live template preview",
}: PreviewTapAffordanceProps) {
  const beats = steps?.filter(Boolean) ?? [];
  const describedBy = beats.length ? `${ariaLabel} — ${beats.join(", then ")}` : ariaLabel;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen(e);
      }}
      className={cn(
        // Above glimpse (z-10) and any decorative layers, never under the poster
        "absolute inset-0 z-30 flex flex-col items-center justify-end w-full h-full",
        // Soft bottom scrim only, keep envelope / cover readable (no heavy wash)
        "bg-gradient-to-t from-black/40 via-black/[0.07] to-transparent",
        "pt-8 pb-3 sm:pb-4 px-3",
        "transition-colors hover:from-black/48 hover:via-black/10 active:scale-[0.997]",
        "touch-manipulation cursor-pointer border-0",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-white/80",
        className
      )}
      aria-label={describedBy}
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

        {beats.length > 0 && (
          <span
            className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[10px] text-white/85"
            aria-hidden
          >
            {beats.map((beat, i) => (
              <span key={beat} className="flex items-center gap-1">
                {i > 0 && <span className="text-white/40">·</span>}
                {beat === "Music begins" && <Music2 className="h-2.5 w-2.5" />}
                {beat}
              </span>
            ))}
          </span>
        )}

        {beats.length === 0 && hasMusic && (
          <span className="text-[10px] text-white/85 flex items-center gap-1" aria-hidden>
            <Music2 className="h-3 w-3" /> Includes music, tap to begin
          </span>
        )}

        {subtitle && !compact ? (
          <span
            className="text-[10px] text-white/70 text-center max-w-[16rem] leading-snug"
            aria-hidden
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </button>
  );
}
