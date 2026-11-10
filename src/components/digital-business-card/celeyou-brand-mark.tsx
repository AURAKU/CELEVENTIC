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

function parseRgb(color: string): [number, number, number] | null {
  const hexMatch = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex.split("").map((c) => `${c}${c}`).join("");
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  const rgbMatch = color.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  return null;
}

function rgbToHex(rgb: [number, number, number]) {
  return `#${rgb.map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("")}`;
}

function colorLuminance(color: string) {
  const rgb = parseRgb(color);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Pick ink + metal so the official mark can take a template's foil without washing out. */
export function celeYouThemeWash(theme: CeleYouThemeInk) {
  const accentRgb = parseRgb(theme.accent) ?? parseRgb(theme.text) ?? [11, 138, 131];
  const metalRgb = parseRgb(theme.border) ?? parseRgb(theme.muted) ?? accentRgb;
  let accent = rgbToHex(accentRgb);
  let metal = rgbToHex(metalRgb);
  if (colorLuminance(accent) > 0.78) {
    accent = rgbToHex(parseRgb(theme.text) ?? accentRgb);
  }
  if (colorLuminance(metal) > 0.82) {
    metal = accent;
  }
  return { accent, metal };
}

type CeleYouThemedMarkProps = {
  theme: CeleYouThemeInk;
  className?: string;
  fit?: "contain" | "cover";
};

/**
 * Official CeleYou orb, recolored to the template. Shape stays exact.
 * Hue and metal come from the theme. Light and detail stay from the master mark.
 */
export function CeleYouThemedMark({ theme, className, fit = "contain" }: CeleYouThemedMarkProps) {
  const wash = celeYouThemeWash(theme);
  const size = fit === "cover" ? "cover" : "contain";
  return (
    <span className={cn("relative isolate inline-grid shrink-0 overflow-hidden", className)} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CELEYOU_MARK_SRC}
        alt=""
        className={cn("col-start-1 row-start-1 h-full w-full", fit === "cover" ? "object-cover" : "object-contain")}
      />
      <span
        className="pointer-events-none col-start-1 row-start-1 h-full w-full"
        style={{
          background: `linear-gradient(145deg, ${wash.accent} 8%, ${wash.metal} 92%)`,
          mixBlendMode: "color",
          WebkitMaskImage: `url(${CELEYOU_MARK_SRC})`,
          maskImage: `url(${CELEYOU_MARK_SRC})`,
          WebkitMaskSize: size,
          maskSize: size,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
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
