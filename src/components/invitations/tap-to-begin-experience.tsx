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
/** Deep warm gold — legible script/accent tone when the photo classifies as light. */
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

function resolveBeginLabel(layoutSlug?: string, category?: string): string {
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
 * Music-unlock gate — cinematic, content-aware, single begin action.
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
}: TapToBeginExperienceProps) {
  const reduceMotion = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const completed = useRef(false);
  const exitingRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accent = accentColor ?? CELEVENTIC_PALETTE.teal;

  const hero = atmosphereUrl?.trim() ? resolveMediaUrl(atmosphereUrl) : null;

  // Smart contrast — classify the uploaded photo (light vs dark) so overlay text
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
  // legible against the resolved photo — a deep bronze reads fine on paper but
  // disappears (dark-on-dark) as accent text over a dark photo, and the mirror
  // case on a light photo. Otherwise fall back to a known-legible gold per mode.
  const brandGoldCandidate =
    primaryColor && /gold|#d4a|#c4a|#8b69|#a183|#5c3d/i.test(primaryColor) ? primaryColor : undefined;
  const gold = pickLegibleAccent(
    brandGoldCandidate,
    contrastMode,
    contrastMode === "light" ? DEEP_GOLD_ON_LIGHT : CELEVENTIC_PALETTE.gold
  );

  const beat = useMemo(
    () => resolveEventBeat({ ceremonyLabel, eventTitle, layoutSlug, category }),
    [ceremonyLabel, eventTitle, layoutSlug, category]
  );

  const couple = useMemo(
    () => resolveNames(name1, name2, eventTitle, hostName, layoutSlug, category),
    [name1, name2, eventTitle, hostName, layoutSlug, category]
  );

  const beginLabel = resolveBeginLabel(layoutSlug, category);
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

  const ariaLabel = `${beginLabel} — ${beat.plain ?? [beat.eyebrow, beat.script].filter(Boolean).join(" ")}${
    couple ? `, ${couple.name1} and ${couple.name2}` : ""
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

      <div className={styles.stage}>
        <p className={styles.brand}>Celeventic</p>

        {beat.eyebrow && beat.script ? (
          <>
            <p className={styles.eventBeat}>{beat.eyebrow}</p>
            <p className={styles.scriptBeat}>{beat.script}</p>
          </>
        ) : (
          <p className={styles.eventBeat}>{beat.plain}</p>
        )}

        {couple ? (
          <div className={styles.names}>
            <p className={styles.name}>{couple.name1}</p>
            <p className={styles.amp}>&amp;</p>
            <p className={styles.name}>{couple.name2}</p>
          </div>
        ) : showHostFallback ? (
          <p className={styles.hostLine}>{hostName}</p>
        ) : null}

        <div className={styles.cta}>
          <p className={styles.ctaWord}>{beginLabel}</p>
          {!reduceMotion && !exiting ? <span className={styles.ctaRule} aria-hidden /> : null}
        </div>
      </div>
    </button>
  );
}
