"use client";

import { TM_PALETTE as PALETTE } from "./traditional-marriage-palette";
import { cn } from "@/lib/utils";
import {
  DEFAULT_THANK_YOU_FONT,
  resolveThankYouFontStack,
} from "@/lib/invitation-theme/fonts";
import type { FontId } from "@/lib/invitation-theme/theme-types";

/** Eyebrow ("WITH GRATITUDE") default — preserves the original TM look when unset. */
const DEFAULT_EYEBROW_FONT: FontId = "cormorant";
/** Script ("Thank you") default — preserves the original TM look when unset. */
const DEFAULT_SCRIPT_FONT: FontId = "great-vibes";

export interface TraditionalMarriageThankYouProps {
  /** Optional host/studio message; falls back to editorial default */
  message?: string | null;
  /** Body font — curated invitation FontId (Cormorant, Great Vibes, etc.) */
  fontFamily?: FontId | string | null;
  /** Eyebrow ("With gratitude") font — curated invitation FontId; defaults to Cormorant. */
  eyebrowFontFamily?: FontId | string | null;
  /** Script ("Thank you") font — curated invitation FontId; defaults to Great Vibes. */
  scriptFontFamily?: FontId | string | null;
  className?: string;
}

const DEFAULT_MESSAGE =
  "Your presence is a blessing. We are deeply honoured to share this sacred day with you.";

/**
 * Traditional Marriage closing — Great Vibes / Cormorant linen editorial.
 * Replaces the generic slate “Thank You” slab card.
 * Hosts edit body + fonts via experience.thankYouMessage / thankYouFontFamily /
 * thankYouEyebrowFontFamily / thankYouScriptFontFamily (or a Studio font preset).
 */
export function TraditionalMarriageThankYou({
  message,
  fontFamily,
  eyebrowFontFamily,
  scriptFontFamily,
  className,
}: TraditionalMarriageThankYouProps) {
  const body = message?.trim() || DEFAULT_MESSAGE;
  const bodyFont = resolveThankYouFontStack(fontFamily ?? DEFAULT_THANK_YOU_FONT);
  const eyebrowFont = resolveThankYouFontStack(eyebrowFontFamily ?? DEFAULT_EYEBROW_FONT);
  const scriptFont = resolveThankYouFontStack(scriptFontFamily ?? DEFAULT_SCRIPT_FONT);
  const isScript = fontFamily === "great-vibes";

  return (
    <section
      aria-labelledby="tm-thank-you-heading"
      className={cn(
        "tm-section-rise relative overflow-hidden rounded-sm border px-5 py-8 sm:px-7 sm:py-9 text-center shadow-[0_22px_48px_-28px_rgba(92,61,46,0.38)]",
        className
      )}
      style={{
        borderColor: PALETTE.border,
        background: `
          linear-gradient(165deg, ${PALETTE.peach} 0%, ${PALETTE.linen} 46%, ${PALETTE.peachDeep} 100%),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 11px,
            rgba(161,131,115,0.03) 11px,
            rgba(161,131,115,0.03) 12px
          )
        `,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-70"
        style={{
          background: `radial-gradient(ellipse at 50% -10%, ${PALETTE.mustardSoft}40 0%, transparent 68%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-3 rounded-sm border opacity-40"
        style={{ borderColor: `${PALETTE.mustard}55` }}
        aria-hidden
      />

      <div className="relative space-y-2.5">
        <p
          className="text-[11px] tracking-[0.36em] uppercase"
          style={{ color: PALETTE.bronzeDeep, fontFamily: eyebrowFont }}
        >
          With gratitude
        </p>
        <h2
          id="tm-thank-you-heading"
          className="text-[2.5rem] sm:text-[2.85rem] leading-none"
          style={{ color: PALETTE.bronze, fontFamily: scriptFont }}
        >
          Thank you
        </h2>
      </div>

      <div
        className="tm-hairline relative mx-auto mt-5 mb-5 h-px w-16"
        style={{ backgroundColor: `${PALETTE.mustard}70` }}
        aria-hidden
      />

      <p
        className={cn(
          "relative leading-relaxed max-w-[22rem] mx-auto whitespace-pre-line",
          isScript
            ? "text-[1.35rem] sm:text-[1.5rem]"
            : "text-[1.05rem] sm:text-[1.15rem]"
        )}
        style={{ color: PALETTE.dress, fontFamily: bodyFont }}
      >
        {body}
      </p>
    </section>
  );
}
