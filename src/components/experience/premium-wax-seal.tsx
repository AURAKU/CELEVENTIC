"use client";

import Image from "next/image";
import { useId } from "react";
import {
  DEFAULT_RESOLVED_SEAL_STYLE,
  getSealDesignPreset,
  sealInkStyle,
  SEAL_FONT_STACKS,
  SEAL_FONT_WEIGHTS,
  SEAL_SIZE_SCALE,
  type ResolvedSealStyle,
  type SealFontChoice,
} from "@/lib/invitation/seal-design";

/** Memorial photoreal seal — transparent WebP, sits on the envelope paper. */
export const MEMORIAL_PORTRAIT_WAX_SEAL_SRC =
  "/experience/memorial/wax-seal-portrait.webp";

function sealLetterCount(label: string): number {
  return label.replace(/[\s|·•.]/g, "").length;
}

function isSealMonogram(label: string): boolean {
  const t = label.trim();
  if (!t) return false;
  const letters = t.replace(/[\s|·•.]/g, "");
  return letters.length > 0 && letters.length <= 3 && /^[a-zA-ZÀ-ÿ]+$/.test(letters);
}

function sealTypography(
  label: string,
  compact: boolean,
  fontOverride?: Exclude<SealFontChoice, "auto"> | null
): {
  fontSize: string;
  lineHeight: number;
  letterSpacing: string;
  maxWidth: string;
  fontFamily: string;
  fontWeight: number;
  isMonogram: boolean;
} {
  const letters = sealLetterCount(label);
  const multiWord = /\s/.test(label.trim()) && !isSealMonogram(label);
  const monogram = isSealMonogram(label);
  const pipeMonogram = monogram && /\s*\|\s*/.test(label);
  const overrideFamily = fontOverride ? SEAL_FONT_STACKS[fontOverride] : null;
  const overrideWeight = fontOverride ? SEAL_FONT_WEIGHTS[fontOverride] : null;
  const base = computeBaseSealTypography();
  return overrideFamily && overrideWeight
    ? { ...base, fontFamily: overrideFamily, fontWeight: overrideWeight }
    : base;

  function computeBaseSealTypography() {
    if (monogram) {
      const tracking = pipeMonogram
        ? "0.02em"
        : letters === 1
          ? "0.04em"
          : letters === 2
            ? "0.16em"
            : "0.1em";
      if (compact) {
        return {
          fontSize: pipeMonogram
            ? "clamp(0.95rem, 4.4vw, 1.4rem)"
            : "clamp(1.15rem, 5vw, 1.65rem)",
          lineHeight: 1,
          letterSpacing: tracking,
          maxWidth: "88%",
          fontFamily: "var(--font-cinzel), Cinzel, 'Times New Roman', serif",
          fontWeight: 600,
          isMonogram: true,
        };
      }
      return {
        fontSize: pipeMonogram
          ? "clamp(1.55rem, 6.6vw, 2.7rem)"
          : "clamp(1.95rem, 7.8vw, 3.15rem)",
        lineHeight: 1,
        letterSpacing: tracking,
        maxWidth: "86%",
        fontFamily: "var(--font-cinzel), Cinzel, 'Times New Roman', serif",
        fontWeight: 600,
        isMonogram: true,
      };
    }

    if (compact) {
      if (letters <= 4 && !multiWord) {
        return {
          fontSize: "clamp(0.82rem, 3.8vw, 1.15rem)",
          lineHeight: 1.05,
          letterSpacing: "0.02em",
          maxWidth: "84%",
          fontFamily: "var(--font-great-vibes), 'Great Vibes', cursive",
          fontWeight: 400,
          isMonogram: false,
        };
      }
      return {
        fontSize: "clamp(0.6rem, 2.9vw, 0.9rem)",
        lineHeight: multiWord ? 1.05 : 1.1,
        letterSpacing: "0.01em",
        maxWidth: "86%",
        fontFamily: "var(--font-great-vibes), 'Great Vibes', cursive",
        fontWeight: 400,
        isMonogram: false,
      };
    }

    if (letters <= 4 && !multiWord) {
      return {
        fontSize: "clamp(1.25rem, 5.4vw, 2rem)",
        lineHeight: 1.05,
        letterSpacing: "0.03em",
        maxWidth: "82%",
        fontFamily: "var(--font-great-vibes), 'Great Vibes', cursive",
        fontWeight: 400,
        isMonogram: false,
      };
    }
    return {
      fontSize: "clamp(0.95rem, 4.2vw, 1.45rem)",
      lineHeight: multiWord ? 1.02 : 1.08,
      letterSpacing: "0.015em",
      maxWidth: "86%",
      fontFamily: "var(--font-great-vibes), 'Great Vibes', cursive",
      fontWeight: 400,
      isMonogram: false,
    };
  }
}

/**
 * Organic poured-wax silhouette — irregular rim, not a perfect coin.
 * Coordinates are relative to a 100×100 viewBox centered near 50,50.
 */
const WAX_POUR_OUTER =
  "M50.2 5.4 C58.6 4.6, 67.8 6.8, 75.4 11.2 C83.8 16.2, 90.6 23.8, 94.2 33.1 C97.4 41.8, 97.8 51.6, 95.6 60.8 C93.2 71.2, 87.4 80.1, 79.1 86.2 C70.6 92.4, 59.8 95.8, 49.4 95.6 C39.2 95.4, 28.6 91.6, 20.8 84.8 C13.4 78.4, 8.2 69.2, 6.1 59.1 C4.2 49.4, 5.1 39.2, 9.4 30.2 C14.2 20.1, 22.8 12.4, 33.1 8.2 C38.4 6.1, 44.2 5.8, 50.2 5.4 Z";

const WAX_POUR_RIM =
  "M50.1 9.8 C57.6 9.1, 65.8 11.1, 72.6 15.1 C80.1 19.6, 86.2 26.4, 89.4 34.8 C92.2 42.6, 92.6 51.4, 90.6 59.6 C88.4 68.8, 83.2 76.8, 75.8 82.2 C68.2 87.6, 58.6 90.6, 49.6 90.4 C40.6 90.2, 31.2 86.8, 24.2 80.8 C17.6 75.1, 12.8 66.8, 10.9 57.8 C9.2 49.2, 10.1 40.1, 13.9 32.1 C18.2 23.2, 25.8 16.4, 34.9 12.6 C39.6 10.6, 44.8 10.2, 50.1 9.8 Z";

const WAX_POUR_FACE =
  "M50 16.2 C56.4 15.6, 63.2 17.2, 68.8 20.6 C75.1 24.4, 80.2 30.2, 82.8 37.2 C85.2 43.8, 85.4 51.2, 83.6 58.1 C81.6 65.8, 77.1 72.4, 70.8 76.8 C64.4 81.2, 56.4 83.6, 48.9 83.4 C41.4 83.2, 33.6 80.4, 27.8 75.4 C22.4 70.6, 18.4 63.6, 16.9 56.1 C15.6 48.9, 16.4 41.4, 19.6 34.8 C23.2 27.4, 29.6 21.8, 37.2 18.6 C41.2 16.9, 45.6 16.5, 50 16.2 Z";

const WAX_DRIP_A =
  "M78.2 78.4 C81.6 82.8, 84.8 88.6, 83.4 93.2 C82.2 96.8, 77.8 97.6, 75.2 94.8 C72.4 91.8, 72.8 85.6, 74.1 81.2 C74.8 79.1, 76.4 76.8, 78.2 78.4 Z";

const WAX_DRIP_B =
  "M18.6 72.8 C15.2 76.4, 12.4 82.1, 13.8 86.6 C14.9 90.1, 19.2 90.8, 21.6 88.1 C24.2 85.1, 24.1 79.2, 22.8 75.1 C22.1 72.9, 20.4 70.9, 18.6 72.8 Z";

/**
 * Poured wax seal — irregular rim, satin body, impressed well, embedded beads.
 * Shared by photoreal embroidered envelopes and cinematic CSS envelopes.
 */
export function PremiumWaxSeal({
  sealLabel,
  isOpening,
  isUnsealing = false,
  reduceMotion,
  compact = false,
  sealStyle,
  pulseClass = "inv-seal-pulse-peach",
  photorealSrc,
}: {
  sealLabel: string;
  isOpening: boolean;
  isUnsealing?: boolean;
  reduceMotion: boolean;
  compact?: boolean;
  sealStyle?: ResolvedSealStyle;
  /** Idle pulse animation class — defaults to peach pulse. */
  pulseClass?: string;
  /** Transparent photoreal seal plate (memorial). Replaces SVG wax + label. */
  photorealSrc?: string | null;
}) {
  const uid = useId().replace(/:/g, "");
  const resolvedStyle = sealStyle ?? DEFAULT_RESOLVED_SEAL_STYLE;
  const preset = getSealDesignPreset(resolvedStyle.design);
  const type = sealTypography(
    sealLabel,
    compact,
    resolvedStyle.fontFamily === "auto" ? null : resolvedStyle.fontFamily
  );
  const sizeScale = SEAL_SIZE_SCALE[resolvedStyle.size];
  const inkColor =
    resolvedStyle.textColor || (type.isMonogram ? preset.monogramColor : preset.wordColor);
  const ink = sealInkStyle(inkColor, Boolean(preset.dark), type.isMonogram);
  const waxDeep = `waxDeep-${uid}`;
  const waxFace = `waxFace-${uid}`;
  const waxRim = `waxRim-${uid}`;
  const waxWell = `waxWell-${uid}`;
  const glossGrad = `waxGloss-${uid}`;
  const beadGrad = `waxBead-${uid}`;
  const waxNoise = `waxNoise-${uid}`;
  const waxDisplace = `waxDisplace-${uid}`;
  const lifting = isOpening || isUnsealing;

  if (photorealSrc) {
    return (
      <div
        className={`relative flex h-full w-full items-center justify-center ${
          reduceMotion || lifting ? "" : pulseClass
        }`}
        style={{
          filter: reduceMotion || lifting
            ? isUnsealing
              ? "drop-shadow(0 16px 18px rgba(12, 8, 4, 0.55)) drop-shadow(0 2px 4px rgba(0,0,0,0.35))"
              : "drop-shadow(0 10px 14px rgba(12, 8, 4, 0.48)) drop-shadow(0 1px 3px rgba(0,0,0,0.28))"
            : "drop-shadow(0 12px 16px rgba(12, 8, 4, 0.5)) drop-shadow(0 2px 5px rgba(0,0,0,0.32))",
        }}
      >
        <Image
          src={photorealSrc}
          alt=""
          fill
          sizes={compact ? "(max-width: 768px) 28vw, 7.5rem" : "(max-width: 768px) 42vw, 16rem"}
          className="object-contain select-none pointer-events-none"
          priority
          draggable={false}
          aria-hidden
        />
        <span className="sr-only">{sealLabel}</span>
      </div>
    );
  }

  const beads = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2 - Math.PI / 2;
    const wobble = 0.55 * Math.sin(i * 1.9) + 0.25 * Math.cos(i * 3.1);
    const r = 33.2 + wobble;
    return {
      cx: 50 + Math.cos(angle) * r,
      cy: 49.6 + Math.sin(angle) * r,
      r: 1.35 + (i % 4 === 0 ? 0.35 : i % 3 === 0 ? 0.12 : 0),
      key: i,
    };
  });

  const displayText =
    type.isMonogram
      ? sealLabel.trim()
      : /\s/.test(sealLabel.trim())
        ? sealLabel.trim().split(/\s+/).join("\n")
        : sealLabel;

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center ${
        reduceMotion || lifting ? "" : pulseClass
      }`}
      style={{
        filter: reduceMotion || lifting
          ? isUnsealing
            ? "drop-shadow(0 18px 22px rgba(40, 28, 12, 0.48))"
            : "drop-shadow(0 12px 18px rgba(40, 28, 12, 0.42))"
          : "drop-shadow(0 14px 20px rgba(40, 28, 12, 0.4))",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <radialGradient id={waxDeep} cx="48%" cy="55%" r="62%">
            {preset.deep.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </radialGradient>
          <radialGradient id={waxFace} cx="36%" cy="30%" r="70%">
            {preset.face.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </radialGradient>
          <linearGradient id={waxRim} x1="18%" y1="12%" x2="82%" y2="88%">
            {preset.rim.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
          <radialGradient id={waxWell} cx="42%" cy="36%" r="64%">
            {preset.well.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </radialGradient>
          {/* Soft satin catch — not glass-chrome */}
          <radialGradient id={glossGrad} cx="32%" cy="26%" r="46%">
            <stop offset="0%" stopColor="rgba(255,252,245,0.42)" />
            <stop offset="35%" stopColor="rgba(255,245,230,0.16)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id={beadGrad} cx="32%" cy="28%" r="68%">
            {preset.bead.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </radialGradient>
          <filter id={waxNoise} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" result="noise" />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 0.55
                      0 0 0 0 0.42
                      0 0 0 0 0.28
                      0 0 0 0.18 0"
              result="tinted"
            />
            <feBlend in="SourceGraphic" in2="tinted" mode="multiply" />
          </filter>
          <filter id={waxDisplace} x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" result="disp" />
            <feDisplacementMap in="SourceGraphic" in2="disp" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* Contact shadow on paper */}
        <ellipse cx="51" cy="56" rx="39" ry="36" fill="rgba(30,20,10,0.28)" opacity="0.7" />

        {/* Outer pour — irregular wax puddle */}
        <path d={WAX_POUR_OUTER} fill={`url(#${waxDeep})`} filter={`url(#${waxDisplace})`} />
        {/* Side drips that break the coin silhouette */}
        <path d={WAX_DRIP_A} fill={`url(#${waxDeep})`} opacity="0.95" />
        <path d={WAX_DRIP_B} fill={`url(#${waxDeep})`} opacity="0.92" />

        {/* Raised rim ring */}
        <path d={WAX_POUR_RIM} fill={`url(#${waxRim})`} />
        <path
          d={WAX_POUR_RIM}
          fill="none"
          stroke={preset.dark ? "rgba(255,230,180,0.22)" : "rgba(255,245,230,0.35)"}
          strokeWidth="0.7"
        />

        {/* Main wax face + subtle surface grain */}
        <path d={WAX_POUR_FACE} fill={`url(#${waxFace})`} filter={`url(#${waxNoise})`} />

        {/* Impressed center well */}
        <ellipse cx="50" cy="49.5" rx="24.5" ry="23.8" fill={`url(#${waxWell})`} opacity="0.5" />
        <ellipse
          cx="50"
          cy="49.5"
          rx="24.5"
          ry="23.8"
          fill="none"
          stroke={preset.dark ? "rgba(0,0,0,0.35)" : "rgba(90,55,35,0.28)"}
          strokeWidth="1.1"
        />
        <ellipse
          cx="50.4"
          cy="50.2"
          rx="24.5"
          ry="23.8"
          fill="none"
          stroke={preset.dark ? "rgba(255,230,180,0.12)" : "rgba(255,245,230,0.22)"}
          strokeWidth="0.55"
        />

        {/* Embedded pearl beads — slightly irregular orbit */}
        {beads.map((b) => (
          <g key={b.key}>
            <circle cx={b.cx} cy={b.cy} r={b.r * 1.15} fill="rgba(40,25,15,0.18)" />
            <circle cx={b.cx} cy={b.cy} r={b.r} fill={`url(#${beadGrad})`} />
            <circle
              cx={b.cx - 0.28}
              cy={b.cy - 0.32}
              r={b.r * 0.32}
              fill="rgba(255,255,255,0.55)"
            />
          </g>
        ))}

        {/* Soft satin highlight (matte wax, not chrome) */}
        <ellipse cx="38" cy="34" rx="16" ry="11" fill={`url(#${glossGrad})`} />
        <path
          d="M24 30 C31 22, 44 20, 54 26"
          fill="none"
          stroke="rgba(255,252,245,0.28)"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>

      <span
        className="relative z-[1] select-none text-center"
        style={{
          color: inkColor,
          fontSize: type.fontSize,
          lineHeight: type.lineHeight,
          letterSpacing: type.letterSpacing,
          maxWidth: type.maxWidth,
          fontFamily: type.fontFamily,
          fontWeight: type.fontWeight,
          fontStyle: "normal",
          textTransform: type.isMonogram ? "uppercase" : "none",
          WebkitTextStroke: ink.webkitTextStroke,
          textShadow: ink.textShadow,
          whiteSpace: type.isMonogram
            ? "nowrap"
            : /\s/.test(sealLabel.trim())
              ? "pre-line"
              : "nowrap",
          wordBreak: "break-word",
          paddingInline: "4%",
          transform: sizeScale !== 1 ? `scale(${sizeScale})` : undefined,
          transformOrigin: "50% 50%",
        }}
      >
        {displayText}
      </span>
    </div>
  );
}
