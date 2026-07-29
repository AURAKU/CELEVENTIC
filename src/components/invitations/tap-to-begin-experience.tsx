"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { CELEVENTIC_PALETTE } from "@/lib/experience/celeventic-palette";
import { invitationFontVars } from "@/lib/invitation-fonts";
import { parseCoupleNames } from "@/lib/invitation-templates";
import { resolveMediaUrl, shouldUnoptimizeNextImage } from "@/lib/uploads/media-url";
import {
  pickLegibleAccent,
  sampleImageContrastMode,
  type ImageContrastMode,
} from "@/lib/media/image-contrast";
import styles from "./tap-to-begin-experience.module.css";

const EXIT_MS = 480;
/** Deep warm gold, legible script/accent tone when the photo classifies as light. */
const DEEP_GOLD_ON_LIGHT = "#8A5A12";

export interface TapToBeginExperienceProps {
  onBegin: () => void;
  eventTitle?: string;
  hostName?: string;
  accentColor?: string;
  primaryColor?: string;
  backgroundColor?: string;
  /** Shared atmosphere from soft intro for a continuous visual field */
  atmosphereUrl?: string | null;
  /** design.introText or ceremony label */
  ceremonyLabel?: string | null;
  name1?: string | null;
  name2?: string | null;
  layoutSlug?: string;
  category?: string;
  /** Studio welcome-typography override, resolved CSS font stack (unset keeps each line's template default). */
  fontFamily?: string | null;
  /** Studio welcome-typography override, overall text scale. */
  fontScale?: "compact" | "cozy" | "spacious" | "bold";
  /** Studio welcome-typography override, manual body/ivory text color (bypasses smart auto-contrast). */
  textColorOverride?: string | null;
  /** Studio welcome-typography override, manual gold/script accent color (bypasses smart auto-contrast). */
  accentColorOverride?: string | null;
  /**
   * Legibility backdrop behind the welcome copy, a blurred plate that keeps text
   * readable over busy, multi-color patterned art (e.g. kente/Ankara photos).
   * "auto" (default) turns it on for templates known to use patterned welcome art;
   * "on"/"off" let the studio override that per invitation.
   */
  scrim?: "auto" | "on" | "off";
}

const FONT_SCALE_VALUES: Record<NonNullable<TapToBeginExperienceProps["fontScale"]>, number> = {
  compact: 0.92,
  cozy: 1,
  spacious: 1.2,
  bold: 1.4,
};

/** Templates whose welcome art is a busy, multi-color pattern (kente/Ankara, etc.), legibility plate defaults on. */
function isPatternedWelcomeLayout(layoutSlug?: string, category?: string): boolean {
  const hay = `${layoutSlug ?? ""} ${category ?? ""}`.toLowerCase();
  return (
    hay.includes("traditional-marriage") ||
    hay.includes("kente") ||
    hay.includes("ankara") ||
    hay.includes("kitenge")
  );
}

type EventBeat = {
  eyebrow?: string;
  script?: string;
  plain?: string;
};

function resolveEventBeat(input: {
  ceremonyLabel?: string | null;
  eventTitle?: string;
  layoutSlug?: string;
  category?: string;
}): EventBeat {
  const label = input.ceremonyLabel?.trim();
  if (label) {
    const m = label.match(/^(traditional)\s+(.+)$/i);
    if (m) return { eyebrow: m[1].toUpperCase(), script: titleCase(m[2]) };
    if (/marriage|wedding|ceremony|union|nikkah/i.test(label) && label.split(/\s+/).length <= 4) {
      const parts = label.split(/\s+/);
      if (parts.length >= 2) {
        return { eyebrow: parts[0].toUpperCase(), script: titleCase(parts.slice(1).join(" ")) };
      }
    }
    return { plain: label };
  }

  const hay = `${input.layoutSlug ?? ""} ${input.category ?? ""}`.toLowerCase();
  if (hay.includes("traditional-marriage")) {
    return { eyebrow: "TRADITIONAL", script: "Marriage Ceremony" };
  }
  if (hay.includes("memorial") || hay.includes("funeral") || hay.includes("candle") || hay.includes("tribute")) {
    return { plain: "In Loving Memory" };
  }
  if (input.eventTitle?.trim()) return { plain: input.eventTitle.trim() };
  return { plain: "Your Invitation" };
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/** The bare action verb ("Begin"/"Enter"), used to build the visible CTA and aria-label. */
function resolveBeginVerb(layoutSlug?: string, category?: string): string {
  const hay = `${layoutSlug ?? ""} ${category ?? ""}`.toLowerCase();
  if (
    hay.includes("memorial") ||
    hay.includes("funeral") ||
    hay.includes("tribute") ||
    hay.includes("candle") ||
    hay.includes("concert") ||
    hay.includes("neon") ||
    hay.includes("party") ||
    hay.includes("festival")
  ) {
    return "Enter";
  }
  return "Begin";
}

function resolveNames(
  name1: string | null | undefined,
  name2: string | null | undefined,
  eventTitle?: string,
  hostName?: string,
  layoutSlug?: string,
  category?: string
): { name1: string; name2: string } | null {
  const a = name1?.trim();
  const b = name2?.trim();
  if (a && b) return { name1: a, name2: b };

  const hay = `${layoutSlug ?? ""} ${category ?? ""}`.toLowerCase();
  const weddingLike =
    hay.includes("wedding") ||
    hay.includes("marriage") ||
    hay.includes("engagement") ||
    hay.includes("nikkah") ||
    hay.includes("union") ||
    /[&+]/.test(eventTitle ?? "") ||
    /[&+]/.test(hostName ?? "");

  if (!weddingLike) return null;
  const parsed = parseCoupleNames(eventTitle ?? "", hostName ?? "");
  if (parsed.name1 && parsed.name2) return { name1: parsed.name1, name2: parsed.name2 };
  return null;
}

/** Minimal ripple glyph, reads as "tap here" without a generic stock hand/cursor icon. */
function TapGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3.1" fill="currentColor" />
      <circle cx="12" cy="12" r="7.4" stroke="currentColor" strokeWidth="1.3" opacity="0.55" />
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.1" opacity="0.28" />
    </svg>
  );
}

const ORBS = [
  { left: "12%", top: "18%", size: 7, color: "gold", delay: "0s" },
  { left: "78%", top: "22%", size: 5, color: "accent", delay: "0.4s" },
  { left: "22%", top: "72%", size: 6, color: "gold", delay: "0.9s" },
  { left: "68%", top: "68%", size: 4, color: "accent", delay: "1.2s" },
  { left: "48%", top: "14%", size: 3, color: "ivory", delay: "0.2s" },
  { left: "88%", top: "48%", size: 5, color: "gold", delay: "1.6s" },
  { left: "8%", top: "48%", size: 4, color: "ivory", delay: "0.7s" },
  { left: "55%", top: "80%", size: 6, color: "accent", delay: "1.1s" },
];

/**
 * Music-unlock gate, cinematic, content-aware, single begin action.
 * One brand beat · one event beat · one CTA. No “touch anywhere” stack.
 */
export function TapToBeginExperience({
  onBegin,
  eventTitle,
  hostName,
  accentColor,
  primaryColor,
  backgroundColor,
  atmosphereUrl,
  ceremonyLabel,
  name1,
  name2,
  layoutSlug,
  category,
  fontFamily,
  fontScale = "cozy",
  textColorOverride,
  accentColorOverride,
  scrim = "auto",
}: TapToBeginExperienceProps) {
  const reduceMotion = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const completed = useRef(false);
  const exitingRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accent = accentColor ?? CELEVENTIC_PALETTE.teal;

  const hero = atmosphereUrl?.trim() ? resolveMediaUrl(atmosphereUrl) : null;

  // Smart contrast, classify the uploaded photo (light vs dark) so overlay text
  // always flips to a legible scheme instead of assuming every photo is dark.
  // Defaults to "dark" (today's design) until sampling resolves, and stays "dark"
  // when there's no photo at all (matches the built-in navy fallback backdrop).
  const [contrastMode, setContrastMode] = useState<ImageContrastMode>("dark");
  useEffect(() => {
    let cancelled = false;
    if (!hero) {
      setContrastMode("dark");
      return;
    }
    void sampleImageContrastMode(hero).then((mode) => {
      if (!cancelled && mode) setContrastMode(mode);
    });
    return () => {
      cancelled = true;
    };
  }, [hero]);

  // A brand primaryColor only wins as the script/accent "gold" when it stays
  // legible against the resolved photo, a deep bronze reads fine on paper but
  // disappears (dark-on-dark) as accent text over a dark photo, and the mirror
  // case on a light photo. Otherwise fall back to a known-legible gold per mode.
  const brandGoldCandidate =
    primaryColor && /gold|#d4a|#c4a|#8b69|#a183|#5c3d/i.test(primaryColor) ? primaryColor : undefined;
  const gold = accentColorOverride?.trim()
    ? accentColorOverride.trim()
    : pickLegibleAccent(
        brandGoldCandidate,
        contrastMode,
        contrastMode === "light" ? DEEP_GOLD_ON_LIGHT : CELEVENTIC_PALETTE.gold
      );
  const scaleValue = FONT_SCALE_VALUES[fontScale] ?? 1;

  const beat = useMemo(
    () => resolveEventBeat({ ceremonyLabel, eventTitle, layoutSlug, category }),
    [ceremonyLabel, eventTitle, layoutSlug, category]
  );

  const couple = useMemo(
    () => resolveNames(name1, name2, eventTitle, hostName, layoutSlug, category),
    [name1, name2, eventTitle, hostName, layoutSlug, category]
  );

  // When the couple is the hero signal, don't also print a ceremony title above
  // them — that was duplicating shortened first names with full legal names.
  const showEventBeat = Boolean(
    !couple && (beat.plain?.trim() || (beat.eyebrow && beat.script))
  );

  // A lone "BEGIN" floating over a photo reads as decorative type, not a control, // guests need the verb ("tap") spelled out so the gesture is obvious on first look.
  const beginVerb = resolveBeginVerb(layoutSlug, category);
  const ctaText = `Tap to ${beginVerb}`;
  const scrimActive = scrim === "on" || (scrim === "auto" && isPatternedWelcomeLayout(layoutSlug, category));
  const stageClass = [styles.stage, scrimActive ? styles.plate : ""].filter(Boolean).join(" ");
  const showHostFallback =
    !couple && Boolean(hostName?.trim()) && hostName!.trim() !== eventTitle?.trim();

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    if (exitTimer.current) clearTimeout(exitTimer.current);
    onBegin();
  }, [onBegin]);

  const beginExit = useCallback(() => {
    if (completed.current || exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    const delay = reduceMotion ? 0 : EXIT_MS;
    exitTimer.current = setTimeout(finish, delay);
  }, [finish, reduceMotion]);

  useEffect(() => {
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        beginExit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beginExit]);

  const rootClass = [
    styles.root,
    invitationFontVars,
    "invite-viewport-live",
    "safe-area-pt",
    "safe-area-pb",
    "safe-area-pl",
    "safe-area-pr",
    reduceMotion ? styles.static : "",
    exiting ? styles.exiting : "",
  ]
    .filter(Boolean)
    .join(" ");

  const ariaLabel = `Tap to ${beginVerb.toLowerCase()} the invitation${
    couple
      ? `, ${couple.name1} and ${couple.name2}`
      : beat.plain || [beat.eyebrow, beat.script].filter(Boolean).join(" ")
        ? `, ${beat.plain ?? [beat.eyebrow, beat.script].filter(Boolean).join(" ")}`
        : ""
  }`;

  return (
    <button
      type="button"
      className={rootClass}
      onClick={beginExit}
      aria-label={ariaLabel}
      data-contrast={contrastMode}
      style={
        {
          ["--tap-accent" as string]: accent,
          ["--tap-gold" as string]: gold,
          ["--tap-scale" as string]: scaleValue,
          ...(textColorOverride?.trim() ? { ["--tap-ivory" as string]: textColorOverride.trim() } : null),
          ...(fontFamily?.trim() ? { ["--tap-font-family" as string]: fontFamily.trim() } : null),
          ...(exiting && backgroundColor
            ? {
                background: `linear-gradient(180deg, #061018 0%, ${backgroundColor} 120%)`,
              }
            : null),
        } as CSSProperties
      }
    >
      <p className={styles.srStatus} aria-live="polite">
        {ariaLabel}
      </p>

      <div className={styles.hero} aria-hidden>
        {hero ? (
          <Image
            src={hero}
            alt=""
            fill
            priority
            sizes="100vw"
            className={styles.heroImg}
            unoptimized={shouldUnoptimizeNextImage(hero)}
          />
        ) : (
          <div className={styles.heroFallback} />
        )}
      </div>
      <div className={styles.grade} aria-hidden />

      {!reduceMotion ? (
        <div className={styles.bokeh} aria-hidden>
          {ORBS.map((orb, i) => (
            <span
              key={i}
              className={styles.orb}
              style={{
                left: orb.left,
                top: orb.top,
                width: orb.size,
                height: orb.size,
                animationDelay: orb.delay,
                background:
                  orb.color === "gold"
                    ? gold
                    : orb.color === "accent"
                      ? accent
                      : "rgba(250, 248, 244, 0.7)",
              }}
            />
          ))}
        </div>
      ) : null}

      <div className={stageClass}>
        {showEventBeat ? (
          beat.eyebrow && beat.script ? (
            <>
              <p className={styles.eventBeat}>{beat.eyebrow}</p>
              <p className={styles.scriptBeat}>{beat.script}</p>
            </>
          ) : (
            <p className={styles.eventBeat}>{beat.plain}</p>
          )
        ) : null}

        {couple ? (
          <div className={styles.names}>
            <p className={styles.coupleLine}>
              {couple.name1} <span className={styles.inlineAmp}>&amp;</span> {couple.name2}
            </p>
          </div>
        ) : showHostFallback ? (
          <p className={styles.hostLine}>{hostName}</p>
        ) : null}

        <div className={styles.cta}>
          <span className={styles.ctaChip}>
            <span className={styles.ctaTapMark} aria-hidden>
              <TapGlyph />
            </span>
            <span className={styles.ctaWord}>{ctaText}</span>
          </span>
          <span className={styles.ctaHint} aria-hidden>
            or press Enter
          </span>
        </div>
      </div>
    </button>
  );
}
