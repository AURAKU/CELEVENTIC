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
import {
  parseMemorialNameCard,
  resolveDeceasedName,
  resolveFuneralCoverCopy,
} from "@/lib/invite-blueprints/funeral-invitation-copy";
import type { InvitationEventData } from "@/types/invitation-design";
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
  /** Invitation display name — used as funeral honouree when title is generic. */
  invitationName?: string | null;
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
  /** Catalogue tile poster — absolute fill, no interaction, no motion. */
  staticPreview?: boolean;
  /** Replaces the default "Tap to …" chip when a ceremony authors its own CTA. */
  ctaLabelOverride?: string | null;
  /** Optional house monogram shown above the fashion whisper beat. */
  brandMarkLetter?: string | null;
  /** Optional brand mark image. Prefer a letter when no asset is uploaded. */
  brandMarkUrl?: string | null;
  eventBeatOverride?: { eyebrow?: string; script?: string; plain?: string } | null;
  /** Small lines above the fashion beat (place / dates). */
  kickerLines?: string[] | null;
  /** Hide the pill CTA; the full stage remains the control. */
  hideCtaChip?: boolean;
  /** Fashion-film silk atmosphere — never a living-room photo. */
  fashionAtmosphere?: boolean;
  ariaLabelOverride?: string | null;
}

const FONT_SCALE_VALUES: Record<NonNullable<TapToBeginExperienceProps["fontScale"]>, number> = {
  compact: 0.92,
  cozy: 1,
  spacious: 1.2,
  bold: 1.4,
};

function isFuneralExperience(layoutSlug?: string, category?: string): boolean {
  const hay = `${layoutSlug ?? ""} ${category ?? ""}`.toLowerCase();
  return (
    category === "funeral" ||
    hay.includes("memorial") ||
    hay.includes("funeral") ||
    hay.includes("candle") ||
    hay.includes("tribute")
  );
}

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

function shouldAutoScrim(layoutSlug?: string, category?: string): boolean {
  return isPatternedWelcomeLayout(layoutSlug, category) || isFuneralExperience(layoutSlug, category);
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
  eventBeatOverride?: { eyebrow?: string; script?: string; plain?: string } | null;
}): EventBeat {
  if (input.eventBeatOverride?.eyebrow && input.eventBeatOverride?.script) {
    return { eyebrow: input.eventBeatOverride.eyebrow, script: input.eventBeatOverride.script };
  }
  if (input.eventBeatOverride?.plain?.trim()) {
    return { plain: input.eventBeatOverride.plain.trim() };
  }
  if (input.layoutSlug === "luxury-fashion-flagship") {
    return { eyebrow: "THE HOUSE", script: "UNVEILED" };
  }
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
  if (isFuneralExperience(input.layoutSlug, input.category)) {
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
  if (layoutSlug === "luxury-fashion-flagship" || hay.includes("fashion-flagship")) {
    return "Enter";
  }
  if (
    isFuneralExperience(layoutSlug, category) ||
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
  invitationName,
  name1,
  name2,
  layoutSlug,
  category,
  fontFamily,
  fontScale = "cozy",
  textColorOverride,
  accentColorOverride,
  scrim = "auto",
  staticPreview = false,
  ctaLabelOverride,
  brandMarkLetter,
  brandMarkUrl,
  eventBeatOverride,
  kickerLines,
  hideCtaChip = false,
  fashionAtmosphere = false,
  ariaLabelOverride,
}: TapToBeginExperienceProps) {
  const reduceMotion = useReducedMotion() || staticPreview;
  const [exiting, setExiting] = useState(false);
  const completed = useRef(false);
  const exitingRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accent = accentColor ?? CELEVENTIC_PALETTE.teal;

  const hero =
    fashionAtmosphere || layoutSlug === "luxury-fashion-flagship"
      ? null
      : atmosphereUrl?.trim()
        ? resolveMediaUrl(atmosphereUrl)
        : null;

  // Smart contrast, classify the uploaded photo (light vs dark) so overlay text
  // always flips to a legible scheme instead of assuming every photo is dark.
  // Defaults to "dark" (today's design) until sampling resolves, and stays "dark"
  // when there's no photo at all (matches the built-in navy fallback backdrop).
  const [contrastMode, setContrastMode] = useState<ImageContrastMode>("dark");
  useEffect(() => {
    let cancelled = false;
    if (fashionAtmosphere || layoutSlug === "luxury-fashion-flagship") {
      setContrastMode("light");
      return;
    }
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
  }, [fashionAtmosphere, hero, layoutSlug]);

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
    () => resolveEventBeat({ ceremonyLabel, eventTitle, layoutSlug, category, eventBeatOverride }),
    [ceremonyLabel, eventTitle, layoutSlug, category, eventBeatOverride]
  );

  const couple = useMemo(
    () => resolveNames(name1, name2, eventTitle, hostName, layoutSlug, category),
    [name1, name2, eventTitle, hostName, layoutSlug, category]
  );

  const isFuneral = useMemo(
    () => isFuneralExperience(layoutSlug, category),
    [layoutSlug, category]
  );

  const funeralMemorial = useMemo(() => {
    if (!isFuneral) return null;
    const preferred =
      name1?.trim() ||
      invitationName?.trim() ||
      null;
    const eventStub: InvitationEventData = {
      title: eventTitle ?? "",
      hostName: hostName ?? "",
      description: null,
      startDate: "",
      venueName: null,
      landmark: null,
      mapsLink: null,
      contactPhone: null,
      dressCode: null,
      deceasedName: preferred,
    };
    const copy = resolveFuneralCoverCopy(eventStub, ceremonyLabel, invitationName, preferred);
    const name = resolveDeceasedName(eventStub, invitationName, preferred);
    const lines = parseMemorialNameCard(name);
    const subtitle =
      copy.subtitle && copy.subtitle !== name && copy.subtitle !== copy.eyebrow
        ? copy.subtitle
        : null;
    return { name, subtitle, lines };
  }, [isFuneral, eventTitle, hostName, ceremonyLabel, name1, invitationName]);

  // When the couple is the hero signal, don't also print a ceremony title above
  // them — that was duplicating shortened first names with full legal names.
  const showEventBeat = Boolean(
    !couple && (beat.plain?.trim() || (beat.eyebrow && beat.script))
  );

  // A lone "BEGIN" floating over a photo reads as decorative type, not a control, // guests need the verb ("tap") spelled out so the gesture is obvious on first look.
  const beginVerb = resolveBeginVerb(layoutSlug, category);
  const ctaText =
    layoutSlug === "luxury-fashion-flagship"
      ? "TAP TO OPEN"
      : ctaLabelOverride?.trim() || `Tap to ${beginVerb}`;
  const markUrl = brandMarkUrl?.trim() ? resolveMediaUrl(brandMarkUrl) : null;
  const markLetter = brandMarkLetter?.trim() || null;
  const scrimActive = scrim === "on" || (scrim === "auto" && shouldAutoScrim(layoutSlug, category));
  const stageClass = [styles.stage, scrimActive ? styles.plate : ""].filter(Boolean).join(" ");
  const showHostFallback =
    !couple &&
    !funeralMemorial &&
    layoutSlug !== "luxury-fashion-flagship" &&
    Boolean(hostName?.trim()) &&
    hostName!.trim() !== eventTitle?.trim();

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
    if (staticPreview) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        beginExit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beginExit, staticPreview]);

  const ariaLabel =
    ariaLabelOverride?.trim() ||
    `${ctaText}${
    couple
      ? `, ${couple.name1} and ${couple.name2}`
      : funeralMemorial
        ? `, in loving memory of ${funeralMemorial.name}`
        : beat.plain || [beat.eyebrow, beat.script].filter(Boolean).join(" ")
          ? `, ${beat.plain ?? [beat.eyebrow, beat.script].filter(Boolean).join(" ")}`
          : ""
  }`;

  const rootClass = [
    styles.root,
    staticPreview ? styles.rootEmbedded : "",
    invitationFontVars,
    "invite-viewport-live",
    staticPreview ? "" : "safe-area-pt safe-area-pb safe-area-pl safe-area-pr",
    reduceMotion ? styles.static : "",
    exiting ? styles.exiting : "",
    fashionAtmosphere || layoutSlug === "luxury-fashion-flagship" ? styles.fashionRoot : "",
  ]
    .filter(Boolean)
    .join(" ");

  const shellProps = {
    className: rootClass,
    onClick: staticPreview ? undefined : beginExit,
    "aria-label": staticPreview ? undefined : ariaLabel,
    "data-contrast": contrastMode,
    style: {
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
    } as CSSProperties,
  };

  const stageContent = (
    <>
      {!staticPreview ? (
        <p className={styles.srStatus} aria-live="polite">
          {ariaLabel}
        </p>
      ) : null}

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

      <div className={stageClass}>
        {markUrl || (markLetter && !markUrl) ? (
          <div className={`${styles.brandMark} ${markUrl ? styles.brandMarkLogo : ""}`} aria-hidden>
            {markUrl ? (
              <Image
                src={markUrl}
                alt=""
                width={560}
                height={560}
                sizes="(max-width: 768px) 48vw, 280px"
                className={styles.brandMarkImg}
                unoptimized={shouldUnoptimizeNextImage(markUrl)}
              />
            ) : (
              <span className={styles.brandMarkLetter}>{markLetter}</span>
            )}
          </div>
        ) : null}
        {kickerLines?.filter((line) => line.trim()).length ? (
          <div className={styles.kickerStack}>
            {kickerLines
              .filter((line) => line.trim())
              .map((line) => (
                <p key={line} className={styles.kickerBeat}>
                  {line}
                </p>
              ))}
          </div>
        ) : null}
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
              <span className={styles.coupleName}>{couple.name1}</span>
              <span className={styles.inlineAmp}>&amp;</span>
              <span className={styles.coupleName}>{couple.name2}</span>
            </p>
          </div>
        ) : funeralMemorial ? (
          <div className={styles.memorialNameCard}>
            <span className={styles.memorialNameCardRule} aria-hidden />
            <div className={styles.memorialNameStack}>
              {funeralMemorial.lines.honorific ? (
                <p className={styles.memorialHonorific}>{funeralMemorial.lines.honorific}</p>
              ) : null}
              <p className={styles.memorialName}>{funeralMemorial.lines.primary}</p>
              {funeralMemorial.lines.aka || funeralMemorial.lines.years ? (
                <p className={styles.memorialAka}>
                  {funeralMemorial.lines.aka ? (
                    <span className={styles.memorialAkaLabel}>
                      A.K.A {funeralMemorial.lines.aka}
                    </span>
                  ) : null}
                  {funeralMemorial.lines.aka && funeralMemorial.lines.years ? (
                    <span className={styles.memorialAkaDot} aria-hidden>
                      ·
                    </span>
                  ) : null}
                  {funeralMemorial.lines.years ? (
                    <span className={styles.memorialYears}>{funeralMemorial.lines.years}</span>
                  ) : null}
                </p>
              ) : funeralMemorial.subtitle ? (
                <p className={styles.memorialSubtitle}>{funeralMemorial.subtitle}</p>
              ) : null}
            </div>
            <span className={styles.memorialNameCardRule} aria-hidden />
          </div>
        ) : showHostFallback ? (
          <p className={styles.hostLine}>{hostName}</p>
        ) : null}

        <div className={styles.cta}>
          {hideCtaChip || layoutSlug === "luxury-fashion-flagship" ? (
            <span className={styles.fashionHint}>{ctaText}</span>
          ) : (
            <span className={styles.ctaChip}>
              <span className={styles.ctaTapMark} aria-hidden>
                <TapGlyph />
              </span>
              <span className={styles.ctaWord}>{ctaText}</span>
            </span>
          )}
          {!staticPreview ? (
            <span className={styles.ctaHint} aria-hidden>
              or press Enter
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  if (staticPreview) {
    return (
      <div {...shellProps} role="img" aria-hidden>
        {stageContent}
      </div>
    );
  }

  return (
    <button type="button" {...shellProps}>
      {stageContent}
    </button>
  );
}
