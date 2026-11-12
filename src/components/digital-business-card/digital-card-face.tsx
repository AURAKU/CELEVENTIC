"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { resolveDigitalCardTheme, type DigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  applyCeleCardDesign,
  celeCardFaceLead,
  celeCardNameScaleFactor,
  celeCardPaperStyle,
  type CeleCardDesign,
  type CeleCardGrain,
  type CeleCardNameScale,
} from "@/lib/digital-business-card/design";
import { SMARTCARD_BRAND_TAGLINE, SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
import { CELEYOU_BRAND_TEAL, CeleYouMarkIcon } from "@/components/digital-business-card/celeyou-brand-mark";
import { CELECARD_PORTRAIT_MAX_EDGE, isCeleCardPhotoUrl } from "@/lib/digital-business-card/portraits";
import {
  resolveCeleCardPortraitFrame,
  type CeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";
import {
  celecardCompanyDisplayLines,
  celecardCompanyFitCqw,
  celecardDisplayNameLines,
  celecardNameFitCqw,
  celecardNameShouldStack,
  celecardTitleDisplayLines,
  celecardTitleFitCqw,
  celecardTypeVoice,
} from "@/lib/digital-business-card/type-voice";
import { DigitalCardAtmosphere } from "@/components/digital-business-card/digital-card-atmosphere";
import { DigitalCardHouseAvatar } from "@/components/digital-business-card/digital-card-house-avatar";
import { CeleCardQrBadge } from "@/components/digital-business-card/celecard-qr-badge";
import { CeleCardCompanyMark, celeCardShowsCompanyMark } from "@/components/digital-business-card/demo-company-mark";
import {
  celeYouCardOpenHref,
  markCeleYouTapHintSeen,
  readCeleYouTapHintSeen,
} from "@/lib/digital-business-card/card-interaction";

export type DigitalCardFaceProps = {
  themeId: string;
  displayName: string;
  title?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  qrSrc?: string | null;
  /** Live webpage tap. Canonical public profile, never the owner dashboard. */
  qrHref?: string | null;
  /** Tap the QR only. Dummy previews send explorers to the template gallery. */
  qrBadgeHref?: string | null;
  /** Dummy or saved company mark next to the house name. */
  companyLogo?: boolean;
  /** Cropped owner upload that sits beside the company name. */
  companyLogoUrl?: string | null;
  className?: string;
  compact?: boolean;
  /** Circle, square, or soft-square. Theme default if omitted. */
  portraitFrame?: CeleCardPortraitFrame | null;
  /** Owner overrides for layout, atmosphere, ornament, and blended paper. */
  design?: CeleCardDesign | null;
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Keeps frame and ornament strokes out of the origin mark and the CeleYou lockup. */
function copySafeMask(compact?: boolean): CSSProperties {
  const origin = compact ? "9cqw 6cqw" : "10.5cqw 6.8cqw";
  const lockup = compact ? "58cqw 7.2cqw" : "54cqw 8cqw";
  const top = `radial-gradient(ellipse ${origin} at 50% 0%, transparent 0 72%, #000 73%)`;
  const bottom = `radial-gradient(ellipse ${lockup} at 50% 100%, transparent 0 72%, #000 73%)`;
  return {
    WebkitMaskImage: `${top}, ${bottom}`,
    maskImage: `${top}, ${bottom}`,
    WebkitMaskComposite: "source-in",
    maskComposite: "intersect",
  };
}

function HouseFrame({
  theme,
  compact,
  rich = true,
}: {
  theme: DigitalCardTheme;
  compact?: boolean;
  rich?: boolean;
}) {
  const inset = compact ? "inset-[1.4cqw]" : "inset-[2cqw]";
  const corner = compact ? "h-[3.2cqw] w-[3.2cqw]" : "h-[4.4cqw] w-[4.4cqw]";
  const brand = CELEYOU_BRAND_TEAL;
  const mask = copySafeMask(compact);
  return (
    <div className={cn("pointer-events-none absolute rounded-[14px]", inset)} aria-hidden>
      <div
        className="absolute inset-0 rounded-[12px]"
        style={{ boxShadow: `inset 0 0 0 1px ${theme.border}`, ...mask }}
      />
      {rich ? (
        <div
          className="absolute inset-[4px] rounded-[10px]"
          style={{ boxShadow: `inset 0 0 0 1px ${brand}`, ...mask }}
        />
      ) : null}
      <span className={cn("absolute left-0 top-0 border-l-[2.5px] border-t-[2.5px]", corner)} style={{ borderColor: brand }} />
      <span className={cn("absolute right-0 top-0 border-r-[2.5px] border-t-[2.5px]", corner)} style={{ borderColor: brand }} />
      <span className={cn("absolute bottom-0 left-0 border-b-[2.5px] border-l-[2.5px]", corner)} style={{ borderColor: brand }} />
      <span className={cn("absolute bottom-0 right-0 border-b-[2.5px] border-r-[2.5px]", corner)} style={{ borderColor: brand }} />
    </div>
  );
}

function CornerFlourish({
  color,
  compact,
  className,
}: {
  color: string;
  compact?: boolean;
  className: string;
}) {
  const size = compact ? 18 : 24;
  return (
    <svg
      className={cn("absolute", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 21 C3 12 8 8 21 8"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M7 21 C7 14 11 11 21 11"
        stroke={color}
        strokeWidth="0.9"
        opacity="0.55"
        strokeLinecap="round"
      />
      <circle cx="8.5" cy="8.5" r="1.15" fill={color} />
    </svg>
  );
}

function PearlRing({
  color,
  compact,
}: {
  color: string;
  compact?: boolean;
}) {
  const count = compact ? 22 : 32;
  const beads = Array.from({ length: count }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-[7px] rounded-[12px]" aria-hidden>
      {beads.map((i) => {
        const t = i / count;
        const ang = t * Math.PI * 2 - Math.PI / 2;
        const x = 50 + Math.cos(ang) * 48;
        const y = 50 + Math.sin(ang) * 47;
        return (
          <span
            key={i}
            className="absolute h-[1.15cqw] w-[1.15cqw] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              background: i % 2 === 0 ? color : "#fff7ed",
              boxShadow: `0 0 0 0.5px ${color}`,
            }}
          />
        );
      })}
    </div>
  );
}

function OrnamentLayer({ theme, compact }: { theme: DigitalCardTheme; compact?: boolean }) {
  const ornament = theme.ornament ?? "foil";
  const unique =
    ornament === "halftone" ||
    ornament === "sunburst" ||
    ornament === "kente" ||
    ornament === "neon" ||
    ornament === "cel" ||
    ornament === "marquee" ||
    ornament === "wave" ||
    ornament === "grid" ||
    ornament === "bead" ||
    ornament === "inset" ||
    ornament === "ribbon" ||
    ornament === "filigree";

  return (
    <>
      <HouseFrame theme={theme} compact={compact} rich={!unique && ornament !== "none"} />
      {ornament === "double" ? (
        <div
          className={cn("pointer-events-none absolute rounded-[8px]", compact ? "inset-[3cqw]" : "inset-[3.8cqw]")}
          style={{ boxShadow: `inset 0 0 0 1.5px ${theme.accent}`, ...copySafeMask(compact) }}
          aria-hidden
        />
      ) : null}
      {ornament === "filigree" ? (
        <div className="pointer-events-none absolute inset-[1.6cqw]" aria-hidden>
          <CornerFlourish color={theme.accent} compact={compact} className="left-0 top-0" />
          <CornerFlourish color={theme.accent} compact={compact} className="right-0 top-0 scale-x-[-1]" />
          <CornerFlourish color={theme.accent} compact={compact} className="bottom-0 left-0 scale-y-[-1]" />
          <CornerFlourish color={theme.accent} compact={compact} className="bottom-0 right-0 scale-x-[-1] scale-y-[-1]" />
        </div>
      ) : null}
      {ornament === "crest" ? (
        <div className="pointer-events-none absolute inset-[1.8cqw]" aria-hidden>
          <CornerFlourish color={theme.accent} compact={compact} className="left-0 top-0" />
          <CornerFlourish color={theme.accent} compact={compact} className="right-0 top-0 scale-x-[-1]" />
          <CornerFlourish color={theme.accent} compact={compact} className="bottom-0 left-0 scale-y-[-1]" />
          <CornerFlourish color={theme.accent} compact={compact} className="bottom-0 right-0 scale-x-[-1] scale-y-[-1]" />
        </div>
      ) : null}
      {ornament === "bead" ? <PearlRing color={theme.accent} compact={compact} /> : null}
      {ornament === "inset" ? (
        <div
          className="pointer-events-none absolute inset-[2.2cqw] rounded-[12px]"
          style={{
            boxShadow: `inset 0 0 0 1px ${theme.border}, inset 0 10px 22px rgba(8,10,16,0.22), inset 0 -1px 0 rgba(255,255,255,0.28)`,
            ...copySafeMask(compact),
          }}
          aria-hidden
        />
      ) : null}
      {ornament === "ribbon" ? (
        <div className="pointer-events-none absolute right-0 top-0 h-[22cqw] w-[22cqw] overflow-hidden" aria-hidden>
          <span
            className="absolute -right-[7cqw] top-[5.5cqw] h-[5.2cqw] w-[34cqw] rotate-45"
            style={{
              background: `linear-gradient(90deg, ${theme.accent} 0%, ${theme.accent}cc 48%, ${theme.accent} 100%)`,
              boxShadow: "0 6px 14px rgba(8,10,16,0.22)",
            }}
          />
        </div>
      ) : null}
      {ornament === "halftone" ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
          style={{
            backgroundImage: "radial-gradient(currentColor 1.1px, transparent 1.2px)",
            backgroundSize: compact ? "7px 7px" : "9px 9px",
            color: theme.accent,
          }}
          aria-hidden
        />
      ) : null}
      {ornament === "sunburst" ? (
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-[140%] w-[70%] opacity-40"
          style={{
            background:
              "conic-gradient(from 210deg, transparent 0 8deg, rgba(232,200,114,0.35) 8deg 10deg, transparent 10deg 18deg)",
          }}
          aria-hidden
        />
      ) : null}
      {ornament === "kente" ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-3 sm:w-4"
          style={{
            background:
              "repeating-linear-gradient(180deg, #fbbf24 0 6px, #b45309 6px 10px, #f59e0b 10px 14px, #7c2d12 14px 18px)",
          }}
          aria-hidden
        />
      ) : null}
      {ornament === "neon" ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 0 12%, rgba(34,211,238,0.22) 12% 12.4%, transparent 12.4%), linear-gradient(0deg, transparent 0 88%, rgba(192,38,211,0.28) 88% 88.5%, transparent 88.5%)",
            boxShadow: `inset 0 0 40px ${theme.accentSoft}`,
            ...copySafeMask(compact),
          }}
          aria-hidden
        />
      ) : null}
      {ornament === "cel" ? (
        <div
          className="pointer-events-none absolute inset-2 rounded-xl border-[3px]"
          style={{ borderColor: theme.text, ...copySafeMask(compact) }}
          aria-hidden
        >
          <span
            className="absolute right-3 top-3 h-10 w-16 opacity-30"
            style={{
              background: "repeating-linear-gradient(105deg, transparent 0 6px, #0f172a 6px 7px)",
            }}
          />
        </div>
      ) : null}
      {ornament === "marquee" ? (
        <div className="pointer-events-none absolute inset-[6px] rounded-xl" aria-hidden>
          <div className="absolute inset-0 rounded-xl border-2" style={{ borderColor: theme.accent, ...copySafeMask(compact) }} />
          <div className="absolute inset-0 flex justify-between px-1 pt-0.5">
            {Array.from({ length: compact ? 18 : 28 }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: i % 2 === 0 ? theme.accent : "#fff7ed" }}
              />
            ))}
          </div>
        </div>
      ) : null}
      {ornament === "grid" ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: `linear-gradient(${theme.border} 1px, transparent 1px), linear-gradient(90deg, ${theme.border} 1px, transparent 1px)`,
            backgroundSize: "18px 18px",
          }}
          aria-hidden
        />
      ) : null}
      {ornament === "wave" ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" style={copySafeMask(compact)} aria-hidden>
          <svg className="absolute inset-x-0 top-[10%] h-[22%] w-full" viewBox="0 0 400 70" preserveAspectRatio="none">
            <path
              d="M0 42 Q50 68 100 42 T200 42 T300 42 T400 42"
              fill="none"
              stroke={theme.accent}
              strokeWidth="1.5"
              opacity="0.38"
            />
          </svg>
          <svg className="absolute inset-x-0 bottom-[16%] h-[30%] w-full" viewBox="0 0 400 80" preserveAspectRatio="none">
            <path d="M0 40 Q50 12 100 40 T200 40 T300 40 T400 40 V80 H0Z" fill={theme.accent} opacity="0.14" />
            <path
              d="M0 28 Q50 2 100 28 T200 28 T300 28 T400 28"
              fill="none"
              stroke={theme.accent}
              strokeWidth="1.6"
              opacity="0.55"
            />
          </svg>
        </div>
      ) : null}
    </>
  );
}

function isDarkInk(color: string) {
  const hex = color.replace("#", "");
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 148;
}

function plateFill(theme: DigitalCardTheme) {
  return isDarkInk(theme.text) ? "rgba(255,255,255,0.97)" : "rgba(8,10,16,0.94)";
}

function PaperFinish({ theme, grain }: { theme: DigitalCardTheme; grain?: CeleCardGrain | null }) {
  if (grain === "none") return null;
  const lightPaper = isDarkInk(theme.text);
  const linen = grain === "linen";
  const silk = grain === "silk";
  const speckle = grain === "speckle";
  const canvas = grain === "canvas";
  const tooth = silk
    ? "repeating-linear-gradient(118deg, transparent 0 3px, rgba(90,58,18,0.05) 3px 4px)"
    : speckle
      ? "radial-gradient(rgba(40,24,8,0.16) 0.6px, transparent 0.8px)"
      : canvas
        ? "repeating-linear-gradient(0deg, transparent 0 2px, rgba(90,58,18,0.08) 2px 3px), repeating-linear-gradient(90deg, transparent 0 2px, rgba(90,58,18,0.06) 2px 3px)"
        : linen
          ? "repeating-linear-gradient(0deg, transparent 0 1px, rgba(90,58,18,0.07) 1px 2px), repeating-linear-gradient(90deg, transparent 0 2px, rgba(90,58,18,0.05) 2px 3px)"
          : "repeating-linear-gradient(0deg, transparent 0 2px, rgba(90,58,18,0.05) 2px 3px), repeating-linear-gradient(90deg, transparent 0 3px, rgba(90,58,18,0.035) 3px 4px)";
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: lightPaper
            ? `radial-gradient(ellipse at 12% 22%, ${theme.accent}2e 0%, transparent 38%), radial-gradient(ellipse at 92% 88%, ${theme.accent}24 0%, transparent 46%), linear-gradient(118deg, rgba(255,252,245,0.28) 0%, transparent 36%, rgba(120,70,20,0.08) 100%)`
            : `radial-gradient(ellipse at 16% 18%, rgba(255,255,255,0.16) 0%, transparent 40%), linear-gradient(160deg, rgba(0,0,0,0.08) 0%, transparent 55%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 mix-blend-multiply"
        style={{
          opacity: silk ? 0.28 : speckle ? 0.32 : canvas ? 0.3 : linen ? 0.34 : 0.22,
          backgroundImage: tooth,
          backgroundSize: speckle ? "4px 4px" : undefined,
        }}
        aria-hidden
      />
    </>
  );
}

function CeleCardOrigin({
  theme,
}: {
  theme: DigitalCardTheme;
}) {
  const lightPaper = isDarkInk(theme.text);
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[8] flex justify-center isolate"
      aria-label={SMARTCARD_PRODUCT_SHORT_NAME}
    >
      <span className="celecard-origin-plate" data-paper={lightPaper ? "light" : "dark"}>
        <span className="celecard-origin-well">
          <CeleYouMarkIcon />
        </span>
      </span>
    </div>
  );
}

function CeleCardWordmark({
  theme,
}: {
  theme: DigitalCardTheme;
  compact?: boolean;
}) {
  const lightPaper = isDarkInk(theme.text);
  const cele = lightPaper ? "#073F3C" : "#F4FFFD";
  const you = lightPaper ? "#0B8A83" : "#7FF0E4";
  const slogan = lightPaper ? "#0A4A48" : "rgba(244,255,253,0.9)";
  const rule = lightPaper ? "rgba(11,138,131,0.55)" : "rgba(127,240,228,0.42)";
  return (
    <div
      className="celecard-wordmark pointer-events-none absolute inset-x-0 bottom-0 z-20"
      data-paper={lightPaper ? "light" : "dark"}
      aria-hidden
    >
      <span className="celecard-wordmark-name font-display">
        <span style={{ color: cele }}>Cele</span>
        <span style={{ color: you }}>You</span>
        <sup className="celecard-wordmark-mark" style={{ color: cele }}>
          ®
        </sup>
      </span>
      <span className="celecard-wordmark-slogan" style={{ color: slogan }}>
        <span className="celecard-wordmark-rule" style={{ background: rule }} />
        {SMARTCARD_BRAND_TAGLINE}
        <span className="celecard-wordmark-rule" style={{ background: rule }} />
      </span>
    </div>
  );
}

function FaceFitName({
  lines,
  className,
  style,
  nameScale,
  spokenName,
}: {
  lines: string[];
  className?: string;
  style?: CSSProperties;
  nameScale?: CeleCardNameScale | null;
  spokenName?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const stacked = lines.length > 1;
  const key = lines.join("\n");
  const scale = celeCardNameScaleFactor(nameScale);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      const width = el.clientWidth;
      if (width < 8) return;
      const face = el.closest(".celecard-face") as HTMLElement | null;
      const cardW = face?.clientWidth || width * 2.6;
      const maxPx = cardW * 0.07 * scale;
      const minPx = cardW * 0.0335 * scale;
      const maxHeight = cardW * (stacked ? 0.112 : 0.086) * scale + 2;
      el.style.whiteSpace = "nowrap";
      let lo = minPx;
      let hi = maxPx;
      let best = minPx;
      for (let i = 0; i < 14; i += 1) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        const overflowX = el.scrollWidth - width > 1.25;
        const overflowY = el.scrollHeight - maxHeight > 1.25;
        if (overflowX || overflowY) {
          hi = mid;
        } else {
          best = mid;
          lo = mid;
        }
      }
      el.style.fontSize = `${best}px`;
      el.style.whiteSpace = el.scrollWidth - width > 1.25 ? "normal" : "nowrap";
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const face = el.closest(".celecard-face");
    if (face) ro.observe(face);
    return () => ro.disconnect();
  }, [key, lines.length, scale]);

  const plate = lines.join(" ");
  const spoken = spokenName?.trim();

  return (
    <p
      ref={ref}
      className={cn("celecard-face-name min-w-0", className)}
      style={style}
      aria-label={spoken && spoken !== plate ? spoken : undefined}
      title={spoken && spoken !== plate ? spoken : undefined}
    >
      {lines.map((line, index) => (
        <span key={`${line}-${index}`} className="block whitespace-nowrap">
          {line}
        </span>
      ))}
    </p>
  );
}

function FaceFitTitle({
  title,
  compact,
  uppercase,
  italic,
  style,
}: {
  title: string;
  compact?: boolean;
  uppercase?: boolean;
  italic?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const lines = celecardTitleDisplayLines(title, { uppercase, compact });
  const key = lines.join("\n");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      const width = el.clientWidth;
      if (width < 8) return;
      const face = el.closest(".celecard-face") as HTMLElement | null;
      const cardW = face?.clientWidth || width * 3.2;
      const maxPx = cardW * 0.029;
      const minPx = cardW * 0.0215;
      const maxHeight = cardW * (lines.length > 2 ? 0.096 : lines.length > 1 ? 0.072 : 0.038) + 2;
      el.style.whiteSpace = "normal";
      let lo = minPx;
      let hi = maxPx;
      let best = minPx;
      for (let i = 0; i < 12; i += 1) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        const overflowX = el.scrollWidth - width > 1.25;
        const overflowY = el.scrollHeight - maxHeight > 1.25;
        if (overflowX || overflowY) {
          hi = mid;
        } else {
          best = mid;
          lo = mid;
        }
      }
      el.style.fontSize = `${best}px`;
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const face = el.closest(".celecard-face");
    if (face) ro.observe(face);
    return () => ro.disconnect();
  }, [key, lines.length]);

  return (
    <p
      ref={ref}
      className={cn(
        "celecard-face-title mt-[1.8cqw] leading-snug",
        uppercase ? "uppercase" : null
      )}
      style={{ ...style, fontStyle: italic ? "italic" : "normal" }}
      title={title}
    >
      {lines.map((line, index) => (
        <span key={`${line}-${index}`} className="block">
          {line}
        </span>
      ))}
    </p>
  );
}

function FaceFitCompany({
  company,
  compact,
  showMark,
  mark,
  uppercase,
  style,
}: {
  company: string;
  compact?: boolean;
  showMark?: boolean;
  mark?: ReactNode;
  uppercase?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const lines = celecardCompanyDisplayLines(company, { uppercase, compact });
  const key = lines.join("\n");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      const width = el.clientWidth;
      if (width < 8) return;
      const face = el.closest(".celecard-face") as HTMLElement | null;
      const cardW = face?.clientWidth || width * 3.2;
      const maxPx = cardW * 0.0265;
      const minPx = cardW * 0.0185;
      const maxHeight = cardW * (lines.length > 2 ? 0.084 : lines.length > 1 ? 0.064 : 0.034) + 2;
      el.style.whiteSpace = "normal";
      let lo = minPx;
      let hi = maxPx;
      let best = minPx;
      for (let i = 0; i < 12; i += 1) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        const overflowX = el.scrollWidth - width > 1.25;
        const overflowY = el.scrollHeight - maxHeight > 1.25;
        if (overflowX || overflowY) {
          hi = mid;
        } else {
          best = mid;
          lo = mid;
        }
      }
      el.style.fontSize = `${best}px`;
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const face = el.closest(".celecard-face");
    if (face) ro.observe(face);
    return () => ro.disconnect();
  }, [key, lines.length]);

  return (
    <span
      className={cn(
        "celecard-face-company flex min-w-0 items-start font-semibold",
        compact ? "mt-[0.8cqw]" : "mt-[0.55cqw]",
        showMark ? (compact ? "gap-[0.9cqw]" : "gap-[1.15cqw]") : null
      )}
    >
      {mark}
      <span
        ref={ref}
        className={cn(
          "celecard-face-company-text min-w-0",
          uppercase ? "uppercase" : null
        )}
        style={style}
        title={company}
      >
        {lines.map((line, index) => (
          <span key={`${line}-${index}`} className="block">
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}

function FaceIdentity({
  theme,
  displayName,
  title,
  company,
  compact,
  companyLogo,
  companyLogoUrl,
  nameClassName,
  nameStyle,
  design,
}: {
  theme: DigitalCardTheme;
  displayName: string;
  title?: string | null;
  company?: string | null;
  compact?: boolean;
  companyLogo?: boolean;
  companyLogoUrl?: string | null;
  mark?: boolean;
  nameClassName?: string;
  nameStyle?: CSSProperties;
  design?: CeleCardDesign | null;
}) {
  const showCompanyMark = celeCardShowsCompanyMark(company);
  const voice = celecardTypeVoice(theme, design?.lettering);
  const stacked = celecardNameShouldStack(displayName, voice.stacksDisplayName, compact);
  const companyUppercase = voice.companyTransform === "uppercase";
  const titleUppercase = companyUppercase && voice.originStyle === "credit";
  const titleLines = title ? celecardTitleDisplayLines(title, { uppercase: titleUppercase, compact }) : [];
  const companyLines = company
    ? celecardCompanyDisplayLines(company, { uppercase: companyUppercase, compact })
    : [];
  const nameLines = celecardDisplayNameLines(displayName, stacked);
  const fitCqw = celecardNameFitCqw(displayName, stacked, compact) * celeCardNameScaleFactor(design?.nameScale);
  return (
    <div className="min-w-0 flex-1">
      <FaceFitName
        lines={nameLines}
        spokenName={displayName}
        nameScale={design?.nameScale}
        className={nameClassName}
        style={{
          fontFamily: voice.heading,
          fontWeight: voice.nameWeight,
          letterSpacing: voice.nameTracking,
          fontStyle: voice.originStyle === "script" ? "italic" : undefined,
          color: theme.text,
          fontSize: `${fitCqw}cqw`,
          ...nameStyle,
        }}
      />
      {voice.rule === "foil" ? (
        <span className={cn("mt-[2.2cqw] block h-px", compact ? "w-[11cqw]" : "w-[10cqw]")} style={{ background: theme.accent, opacity: 0.7 }} aria-hidden />
      ) : voice.rule === "double" ? (
        <span className="mt-[2.2cqw] block w-[11cqw]" aria-hidden>
          <span className="block h-px" style={{ background: theme.accent, opacity: 0.85 }} />
          <span className="mt-[0.45cqw] block h-px" style={{ background: theme.accent, opacity: 0.4 }} />
        </span>
      ) : voice.rule === "bar" ? (
        <span className={cn("mt-[2.2cqw] block h-[0.55cqw]", compact ? "w-[10cqw]" : "w-[9cqw]")} style={{ background: theme.accent }} aria-hidden />
      ) : null}
      {title ? (
        <FaceFitTitle
          title={title}
          compact={compact}
          uppercase={titleUppercase}
          italic={voice.titleItalic}
          style={{
            color: theme.text,
            opacity: 0.88,
            fontFamily: voice.title,
            fontWeight: 500,
            letterSpacing: titleLines.length > 1 ? "0.02em" : voice.titleTracking,
            fontSize: `${celecardTitleFitCqw(title, { uppercase: titleUppercase, compact })}cqw`,
          }}
        />
      ) : null}
      {company ? (
        <FaceFitCompany
          company={company}
          compact={compact}
          showMark={showCompanyMark}
          mark={
            showCompanyMark ? (
              <CeleCardCompanyMark
                url={companyLogoUrl}
                name={company}
                accent={theme.accent}
                metal={theme.border}
                allowGenerated
                className="celecard-company-mark"
              />
            ) : null
          }
          uppercase={companyUppercase}
          style={{
            color: theme.accent,
            fontFamily: voice.origin,
            letterSpacing: companyLines.length > 1 ? "0.06em" : voice.companyTracking,
            fontSize: `${celecardCompanyFitCqw(company, { uppercase: companyUppercase, compact })}cqw`,
          }}
        />
      ) : null}
    </div>
  );
}

function QrMark({
  qrSrc,
  qrHref,
  ownerName,
  theme,
  avatarUrl,
}: {
  qrSrc?: string | null;
  qrHref?: string | null;
  ownerName?: string;
  compact?: boolean;
  theme: DigitalCardTheme;
  avatarUrl?: string | null;
}) {
  return (
    <CeleCardQrBadge
      qrSrc={qrSrc}
      href={qrHref}
      theme={theme}
      avatarUrl={avatarUrl}
      displayName={ownerName}
      ink={theme.qrInk}
      padClass="p-0"
      sizeClass="celecard-face-qr"
    />
  );
}

function portraitBox(portrait?: boolean) {
  return portrait ? "celecard-face-photo is-portrait-box" : "celecard-face-photo";
}

function FacePortraitImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={CELECARD_PORTRAIT_MAX_EDGE}
      height={CELECARD_PORTRAIT_MAX_EDGE}
      decoding="async"
      fetchPriority="high"
      draggable={false}
      className={cn("celecard-portrait-img h-full w-full object-cover object-center", className)}
    />
  );
}

function FacePhoto({
  avatarUrl,
  theme,
  portrait,
  displayName,
  portraitFrame,
}: {
  avatarUrl?: string | null;
  initials?: string;
  theme: DigitalCardTheme;
  compact?: boolean;
  portrait?: boolean;
  displayName: string;
  portraitFrame?: CeleCardPortraitFrame | null;
}) {
  const frame = resolveCeleCardPortraitFrame(theme, portraitFrame);
  const box = portraitBox(portrait || frame === "rounded" || frame === "arch");
  const well = portrait
    ? "rounded-[1.8cqw]"
    : frame === "square"
      ? "rounded-[0.55cqw]"
      : frame === "rounded"
        ? "rounded-[1.7cqw]"
        : frame === "arch"
          ? "rounded-t-[50%] rounded-b-[1.4cqw]"
          : "rounded-full";
  const houseRounded = frame === "circle" && !portrait ? "full" : frame === "square" && !portrait ? "none" : "lg";
  const mark = !isCeleCardPhotoUrl(avatarUrl) ? (
    <DigitalCardHouseAvatar
      theme={theme}
      avatarUrl={avatarUrl}
      rounded={houseRounded}
      className={cn("h-full w-full", well)}
    />
  ) : (
    <FacePortraitImg src={avatarUrl || ""} alt={`${displayName} portrait`} className={well} />
  );
  return (
    <span
      className={cn("relative shrink-0 overflow-hidden p-[0.55cqw]", box, well)}
      style={{
        background: `linear-gradient(145deg, ${theme.border} 0%, ${theme.accent} 46%, ${theme.border} 100%)`,
        boxShadow: `0 1px 0 rgba(255,255,255,0.38), 0 10px 22px rgba(8,10,16,0.22), inset 0 1px 0 rgba(255,255,255,0.28)`,
      }}
    >
      {mark}
    </span>
  );
}

function FacePortraitPanel({
  avatarUrl,
  theme,
  displayName,
}: {
  avatarUrl?: string | null;
  theme: DigitalCardTheme;
  displayName: string;
}) {
  if (isCeleCardPhotoUrl(avatarUrl) && avatarUrl) {
    return (
      <div className="celecard-portrait-panel h-full w-full overflow-hidden">
        <FacePortraitImg src={avatarUrl} alt={`${displayName} portrait`} />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ background: plateFill(theme) }}>
      <DigitalCardHouseAvatar theme={theme} avatarUrl={avatarUrl} className="h-[72%] w-[72%]" />
    </div>
  );
}

function CardPlate({
  theme,
  displayName,
  title,
  company,
  initials,
  avatarUrl,
  qrSrc,
  qrHref,
  compact,
  portraitFrame,
  companyLogo,
  companyLogoUrl,
  design,
}: {
  theme: DigitalCardTheme;
  displayName: string;
  title?: string | null;
  company?: string | null;
  initials: string;
  avatarUrl?: string | null;
  qrSrc?: string | null;
  qrHref?: string | null;
  compact?: boolean;
  portraitFrame?: CeleCardPortraitFrame | null;
  companyLogo?: boolean;
  companyLogoUrl?: string | null;
  design?: CeleCardDesign | null;
}) {
  const darkType = isDarkInk(theme.text);
  const composition = theme.composition;
  const portrait = composition === "portrait-led" || composition === "iconic";
  const lead = celeCardFaceLead(composition, design?.faceLead);
  const emboss = darkType
    ? "0 1px 0 rgba(255,255,255,0.5), 0 -1px 0 rgba(40,24,8,0.16)"
    : "0 1px 0 rgba(255,255,255,0.22), 0 2px 10px rgba(0,0,0,0.28)";
  const identity = (
    <FaceIdentity
      theme={theme}
      displayName={displayName}
      title={title}
      company={company}
      compact={compact}
      companyLogo={companyLogo}
      companyLogoUrl={companyLogoUrl}
      design={design}
      nameClassName="[overflow-wrap:normal] [word-break:normal]"
      nameStyle={{
        textShadow: emboss,
      }}
    />
  );
  const photo = (
    <FacePhoto
      avatarUrl={avatarUrl}
      initials={initials}
      theme={theme}
      compact={compact}
      displayName={displayName}
      portraitFrame={portraitFrame}
    />
  );
  const qr = (
    <QrMark
      qrSrc={qrSrc}
      qrHref={qrHref}
      ownerName={displayName}
      compact={compact}
      theme={theme}
      avatarUrl={avatarUrl}
    />
  );
  const veil = (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: darkType
          ? "linear-gradient(180deg, rgba(255,248,235,0.12) 0%, transparent 46%, rgba(120,70,20,0.08) 100%)"
          : "linear-gradient(165deg, rgba(255,255,255,0.1) 0%, transparent 42%, rgba(0,0,0,0.22) 100%)",
      }}
      aria-hidden
    />
  );

  if (composition === "grid") {
    return (
      <>
        {veil}
        <div className="celecard-face-body celecard-face-grid relative h-full min-h-0">
          {identity}
          <div className="celecard-face-grid-media">
            {photo}
            {qr}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {veil}
      <div className="celecard-face-body relative flex h-full min-h-0 items-stretch">
        {portrait ? (
          <div
            className={cn(
              "relative h-full shrink-0 overflow-hidden",
              composition === "iconic" ? "w-[40%]" : "w-[36%]"
            )}
          >
            <FacePortraitPanel avatarUrl={avatarUrl} theme={theme} displayName={displayName} />
          </div>
        ) : null}

        <div
          className={cn(
            "celecard-face-row min-w-0 flex-1",
            portrait ? "is-portrait" : null,
            composition === "type-first" || lead === "name" ? "is-type-first" : null,
            composition === "media-first" ? "is-media-first" : null,
            lead === "code" ? "is-code-led" : null
          )}
        >
          {portrait ? (
            lead === "code" ? (
              <>
                {qr}
                {identity}
              </>
            ) : (
              <>
                {identity}
                {qr}
              </>
            )
          ) : lead === "name" ? (
            <>
              {identity}
              {photo}
              {qr}
            </>
          ) : lead === "code" ? (
            <>
              {identity}
              {qr}
              {photo}
            </>
          ) : (
            <>
              {photo}
              {identity}
              {qr}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function DigitalCardFace({
  themeId,
  displayName,
  title,
  company,
  avatarUrl,
  qrSrc,
  qrHref,
  qrBadgeHref,
  className,
  compact,
  portraitFrame,
  companyLogo,
  companyLogoUrl,
  design,
}: DigitalCardFaceProps) {
  const pathname = usePathname();
  const openHref = celeYouCardOpenHref(qrHref, pathname);
  const [hintSeen, setHintSeen] = useState(false);

  useLayoutEffect(() => {
    if (!openHref) return;
    if (readCeleYouTapHintSeen()) {
      setHintSeen(true);
      return;
    }
    const timer = window.setTimeout(() => {
      markCeleYouTapHintSeen();
      setHintSeen(true);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [openHref]);

  function dismissTapHint() {
    markCeleYouTapHintSeen();
    setHintSeen(true);
  }

  function onOpenCard() {
    dismissTapHint();
  }

  const theme = applyCeleCardDesign(resolveDigitalCardTheme(themeId), design);
  const voice = celecardTypeVoice(theme, design?.lettering);
  const initials = initialsOf(displayName);
  const composition = theme.composition;
  const paper = celeCardPaperStyle(theme, design);
  const customPaper = Boolean(design?.paperUrl && paper);
  const lead = celeCardFaceLead(composition, design?.faceLead);

  const plate = (
    <div
      className="celecard-face celecard-foil relative overflow-hidden rounded-[1.15rem] border"
      data-compact={compact ? "true" : undefined}
      data-composition={composition}
      data-face-lead={lead}
      data-name-scale={design?.nameScale || undefined}
      data-qr-finish={design?.qrFinish || undefined}
      data-ornament={theme.ornament || undefined}
      style={{
        background: theme.cardBackground,
        borderColor: theme.border,
        color: theme.text,
        fontFamily: voice.meta,
        ["--celecard-accent" as string]: theme.accent,
        ["--celecard-paper" as string]: isDarkInk(theme.text) ? "#fff8ee" : "#061615",
        boxShadow: `0 18px 44px rgba(8,12,24,0.28), 0 1px 0 rgba(255,255,255,0.28), inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -3px 8px rgba(0,0,0,0.14)`,
      }}
    >
      {paper ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={paper.src}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: paper.opacity,
              mixBlendMode: paper.mixBlendMode,
              WebkitMaskImage: customPaper ? paper.mask : undefined,
              maskImage: customPaper ? paper.mask : undefined,
            }}
          />
          <div className="pointer-events-none absolute inset-0" style={{ background: paper.veil }} aria-hidden />
          {customPaper ? (
            <>
              <div className="pointer-events-none absolute inset-0" style={{ background: paper.copyVeil }} aria-hidden />
              <div className="pointer-events-none absolute inset-0" style={{ background: paper.edge }} aria-hidden />
            </>
          ) : null}
        </>
      ) : null}
      <PaperFinish theme={theme} grain={design?.grain} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ opacity: customPaper ? 0.08 : 0.12 }}
        aria-hidden
      >
        <DigitalCardAtmosphere atmosphere={theme.atmosphere ?? "none"} theme={theme} compact={compact} />
      </div>
      <OrnamentLayer theme={theme} compact={compact} />
      <CeleCardOrigin theme={theme} />
      <CeleCardWordmark theme={theme} compact={compact} />
      <CardPlate
        theme={theme}
        displayName={displayName}
        title={title}
        company={company}
        initials={initials}
        avatarUrl={avatarUrl}
        qrSrc={qrSrc}
        qrHref={qrBadgeHref ?? null}
        compact={compact}
        portraitFrame={portraitFrame}
        companyLogo={companyLogo}
        companyLogoUrl={companyLogoUrl}
        design={design}
      />
    </div>
  );

  const label = `Open ${displayName || "this"} CeleYou`;
  const wrapClass = cn("relative block w-full min-w-0", className);
  const face = (
    <span className="relative block w-full min-w-0">
      {plate}
      {openHref && !hintSeen ? (
        <span className="celecard-tap-hint" aria-hidden>
          Tap to Connect
        </span>
      ) : null}
    </span>
  );

  if (openHref) {
    const focusClass =
      "celecard-interactive rounded-[1.15rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B8A83]";
    if (openHref.startsWith("/")) {
      return (
        <Link
          href={openHref}
          aria-label={label}
          className={cn(wrapClass, focusClass)}
          onClick={onOpenCard}
        >
          {face}
        </Link>
      );
    }
    return (
      <a href={openHref} aria-label={label} className={cn(wrapClass, focusClass)} onClick={onOpenCard}>
        {face}
      </a>
    );
  }
  return <div className={wrapClass}>{plate}</div>;
}
