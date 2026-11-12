import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  SMARTCARD_BRAND_TAGLINE,
  SMARTCARD_PRODUCT_SHORT_NAME,
} from "@/lib/digital-business-card/product";

/** Official CeleYou orb, cropped from the master lockup. */
export const CELEYOU_MARK_SRC = "/digital-cards/brands/celeyou-mark.png";
/** Official CeleYou orb + wordmark, no tagline. */
export const CELEYOU_WORDMARK_SRC = "/digital-cards/brands/celeyou-wordmark.png";
/** Official CeleYou lockup: orb, wordmark, registered mark, and tagline. */
export const CELEYOU_LOCKUP_SRC = "/digital-cards/brands/celeyou-lockup.png";

/** True CeleYou inks. Never replace these with a template accent. */
export const CELEYOU_BRAND_TEAL = "#0B8A83";
export const CELEYOU_BRAND_TEAL_DEEP = "#073F3C";
export const CELEYOU_BRAND_MINT = "#7FF0E4";
export const CELEYOU_BRAND_WELL = "#034746";

/**
 * Official CeleYou teal on every template.
 * Dark plates do not switch to mint; the origin mark stays one color.
 */
export function celeYouBrandStroke(_darkInkOnPlate?: boolean) {
  return CELEYOU_BRAND_TEAL;
}

type CeleYouMarkIconProps = {
  className?: string;
};

/** Official CeleYou orb. Drop-in wherever a Lucide icon was standing in for the product. */
export function CeleYouMarkIcon({ className }: CeleYouMarkIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={CELEYOU_MARK_SRC} alt="" className={cn("shrink-0 object-contain", className)} />
  );
}

export type CeleYouThemeInk = {
  accent: string;
  border: string;
  text: string;
  muted: string;
};

type CeleYouThemedMarkProps = {
  theme?: CeleYouThemeInk;
  className?: string;
  style?: CSSProperties;
};

/**
 * Official CeleYou orb at true color, shown in full.
 * Never cropped to fill a square. Theme foil never tints the PNG.
 */
export function CeleYouThemedMark({
  theme: _theme,
  className,
  style,
}: CeleYouThemedMarkProps) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 overflow-visible bg-transparent isolate", className)}
      style={{ mixBlendMode: "normal", opacity: 1, ...style }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CELEYOU_MARK_SRC}
        alt=""
        className="celecard-origin-ink col-start-1 row-start-1 h-full w-full object-contain object-center"
        style={{ mixBlendMode: "normal", opacity: 1 }}
      />
    </span>
  );
}

type CeleYouBrandMarkProps = {
  variant?: "mark" | "chip" | "lockup";
  tone?: "dark" | "light";
  className?: string;
  markClassName?: string;
  showTagline?: boolean;
};

export function CeleYouBrandMark({
  variant = "mark",
  tone = "light",
  className,
  markClassName,
  showTagline = false,
}: CeleYouBrandMarkProps) {
  if (variant === "lockup") {
    const src = showTagline ? CELEYOU_LOCKUP_SRC : CELEYOU_WORDMARK_SRC;
    return (
      <span className={cn("inline-flex items-center", className)} aria-label={SMARTCARD_PRODUCT_SHORT_NAME}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={showTagline ? `${SMARTCARD_PRODUCT_SHORT_NAME}. ${SMARTCARD_BRAND_TAGLINE}` : SMARTCARD_PRODUCT_SHORT_NAME}
          className={cn("h-16 w-auto object-contain", markClassName)}
        />
      </span>
    );
  }

  const mark = <CeleYouMarkIcon className={cn("h-8 w-8", markClassName)} />;

  if (variant === "mark") {
    return (
      <span className={cn("inline-flex", className)} aria-hidden>
        {mark}
      </span>
    );
  }

  const cele = tone === "dark" ? "text-white" : "text-[#073F3C]";
  const you = tone === "dark" ? "text-[#7FF0E4]" : "text-[#12B8A8]";
  const registered = tone === "dark" ? "text-teal-100/55" : "text-[#0A4A48]/45";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border py-1 pl-1 pr-3.5",
        tone === "dark"
          ? "border-teal-200/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(4,24,28,0.42))] shadow-[0_0_36px_rgba(45,212,191,0.38),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md"
          : "border-[#0B8A83]/16 bg-white shadow-[0_10px_24px_rgba(10,74,72,0.12)]",
        className
      )}
      aria-label={SMARTCARD_PRODUCT_SHORT_NAME}
    >
      <span
        className={cn(
          "grid place-items-center rounded-full bg-white",
          tone === "dark" ? "shadow-[0_0_18px_rgba(45,212,191,0.55)]" : "shadow-[0_4px_14px_rgba(10,74,72,0.18)]"
        )}
      >
        {mark}
      </span>
      <span className="inline-flex items-start font-display text-[13px] font-bold tracking-[-0.035em] sm:text-[15px]">
        <span className={cele}>Cele</span>
        <span className={you}>You</span>
        <sup className={cn("ml-[0.12em] mt-[0.18em] text-[8px] font-semibold leading-none", registered)}>®</sup>
      </span>
    </span>
  );
}
