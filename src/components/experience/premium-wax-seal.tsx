"use client";

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
 * Poured wax seal — preset-driven material, bead ring, gloss catch-light.
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
}: {
  sealLabel: string;
  isOpening: boolean;
  isUnsealing?: boolean;
  reduceMotion: boolean;
  compact?: boolean;
  sealStyle?: ResolvedSealStyle;
  /** Idle pulse animation class — defaults to peach pulse. */
  pulseClass?: string;
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
  const softShadow = `waxShadow-${uid}`;
  const pearlSheen = `waxPearl-${uid}`;
  const lifting = isOpening || isUnsealing;

  const beads = Array.from({ length: 36 }, (_, i) => {
    const angle = (i / 36) * Math.PI * 2 - Math.PI / 2;
    const wobble = 0.22 * Math.sin(i * 2.4);
    const r = 38.6 + wobble;
    return {
      cx: 50 + Math.cos(angle) * r,
      cy: 50 + Math.sin(angle) * r,
      r: 1.55 + (i % 3 === 0 ? 0.28 : 0),
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
            ? "drop-shadow(0 18px 22px rgba(120, 70, 50, 0.42))"
            : "drop-shadow(0 12px 18px rgba(120, 70, 50, 0.38))"
          : undefined,
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
          <radialGradient id={waxFace} cx="34%" cy="28%" r="72%">
            {preset.face.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </radialGradient>
          <linearGradient id={waxRim} x1="18%" y1="10%" x2="82%" y2="90%">
            {preset.rim.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
          <radialGradient id={waxWell} cx="40%" cy="34%" r="68%">
            {preset.well.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </radialGradient>
          <radialGradient id={glossGrad} cx="30%" cy="24%" r="48%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.88)" />
            <stop offset="40%" stopColor="rgba(255,248,242,0.32)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id={pearlSheen} cx="42%" cy="38%" r="55%">
            <stop
              offset="0%"
              stopColor={preset.dark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.35)"}
            />
            <stop
              offset="50%"
              stopColor={preset.dark ? "rgba(255,255,255,0.08)" : "rgba(255,230,210,0.12)"}
            />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id={beadGrad} cx="32%" cy="28%" r="68%">
            {preset.bead.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </radialGradient>
          <filter id={softShadow} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="1.1" dy="2.8" stdDeviation="2.2" floodColor="#8a5040" floodOpacity="0.36" />
          </filter>
        </defs>

        <ellipse cx="51.5" cy="54" rx="41" ry="39" fill="rgba(120,70,50,0.2)" opacity="0.55" />
        <circle cx="50" cy="50" r="46.5" fill={`url(#${waxDeep})`} filter={`url(#${softShadow})`} />
        <circle cx="50" cy="50" r="43.2" fill={`url(#${waxRim})`} />
        <circle cx="50" cy="50" r="43.2" fill="none" stroke="rgba(255,248,240,0.55)" strokeWidth="1.1" />
        <circle cx="50" cy="50" r="37.4" fill={`url(#${waxFace})`} />
        <circle cx="50" cy="50" r="37.4" fill={`url(#${pearlSheen})`} />
        <circle cx="50" cy="50" r="37.4" fill="none" stroke="rgba(255,248,240,0.4)" strokeWidth="0.7" />
        <circle cx="50" cy="50" r="28.5" fill={`url(#${waxWell})`} opacity="0.42" />
        <circle cx="50" cy="50" r="28.5" fill="none" stroke="rgba(140,80,60,0.22)" strokeWidth="1" />
        <circle
          cx="50"
          cy="50"
          r="28.5"
          fill="none"
          stroke="rgba(255,245,235,0.28)"
          strokeWidth="0.65"
          transform="translate(0.35 0.4)"
        />
        {beads.map((b) => (
          <g key={b.key}>
            <circle cx={b.cx} cy={b.cy} r={b.r} fill={`url(#${beadGrad})`} />
            <circle cx={b.cx - 0.35} cy={b.cy - 0.4} r={b.r * 0.4} fill="rgba(255,255,255,0.85)" />
          </g>
        ))}
        <ellipse cx="36" cy="33" rx="20" ry="14" fill={`url(#${glossGrad})`} />
        <path
          d="M22 28 C30 18, 46 16, 58 24"
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.75"
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

      {!reduceMotion && !lifting && (
        <span
          className="absolute left-[18%] top-[14%] h-2.5 w-3.5 rounded-full bg-[#fff8f0]/8 blur-[1px]"
          style={{ animation: "inv-envelope-glint 2.8s ease-in-out infinite" }}
          aria-hidden
        />
      )}
    </div>
  );
}
