"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { triggerHapticLight } from "@/lib/haptics";
import { playRevealSounds } from "@/lib/experience/reveal-sounds";
import type { EnvelopeVisualTheme } from "@/lib/experience/opening-experiences";
import { normalizeSealInitials } from "@/lib/invitation/vision-board";
import { EmbroideredEnvelopeFace } from "@/components/experience/embroidered-envelope-face";
import {
  DEFAULT_RESOLVED_SEAL_STYLE,
  getSealDesignPreset,
  sealFaceCssBackground,
  sealInkStyle,
  SEAL_FONT_STACKS,
  SEAL_SIZE_SCALE,
  type ResolvedSealStyle,
} from "@/lib/invitation/seal-design";

interface EnvelopeCollectionRevealProps {
  theme: EnvelopeVisualTheme;
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  musicEnabled?: boolean;
  enableSounds?: boolean;
  /** Couple initials on the wax seal (e.g. "C | J"). Falls back to theme.sealIcon / ✦. */
  sealInitials?: string;
  /** Memorial emblem for funeral wax seals (e.g. ✝) — preferred over couple initials. */
  sealEmblem?: string;
  /** Designed seal (color/material) + font/size/color overrides for the wax seal text. */
  sealStyle?: ResolvedSealStyle;
  /** Fires on the open gesture, preferred music unlock path. */
  onBegin?: () => void;
  onComplete: () => void;
  /** Invitation peeks under the flap as it lifts. */
  children?: ReactNode;
  /**
   * Catalogue / studio glimpse: sealed face only, absolute fill, no open gesture.
   * Used so preview tiles show the real opening DNA before tap-to-view.
   */
  staticPreview?: boolean;
  /**
   * Framed catalogue / studio live preview, absolute fill inside the tile
   * instead of viewport-fixed (avoids zero-height collapse under CSS transforms).
   */
  embedded?: boolean;
  /**
   * Start opening on mount (catalogue “Tap to open envelope” already consumed
   * the user gesture, do not require a second tap on a sealed face).
   */
  autoOpen?: boolean;
}

/**
 * Photoreal TM (Forever Afaris–inspired):
 * idle → unsealing (seal lifts clear) → opening (flap unfolds) → done.
 * CSS envelopes stay on the simpler idle → opening → done path.
 */
type Phase = "idle" | "unsealing" | "opening" | "done";

/** Theatrical open, flap unveils (CSS seals lift first). */
export const ENVELOPE_OPEN_MS = 3000;
export const ENVELOPE_OPEN_REDUCED_MS = 650;
/**
 * Photoreal TM cinematic open (Forever Afaris timing DNA):
 * tap → seal lifts (~1.9s) → flap unfolds dramatically → invite unveils → settle.
 * Music only, no crack/pop SFX.
 */
export const ENVELOPE_PHOTO_OPEN_MS = 5600;
export const ENVELOPE_PHOTO_OPEN_REDUCED_MS = 900;
/** Seal-clear beat before the flap commits (matches Forever Afaris unseal window). */
export const ENVELOPE_PHOTO_UNSEAL_MS = 1900;
const OPEN_EASE = "cubic-bezier(0.22, 0.61, 0.18, 1)";
/** Soft luxury ease, long ease-out, no snap. */
const PHOTO_OPEN_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const DEFAULT_STAGE =
  "linear-gradient(180deg, #071428 0%, #0c3f3c 40%, #0a2a36 70%, #050d16 100%)";
const DEFAULT_FRAME = "rgba(56, 189, 248, 0.88)";
const DEFAULT_OUTER = "rgba(212, 166, 58, 0.42)";

function resolveSealLabel(
  sealInitials: string | undefined,
  sealEmblem: string | undefined,
  theme: EnvelopeVisualTheme
): string {
  const emblem = sealEmblem?.trim();
  if (emblem) return emblem;
  const normalized = normalizeSealInitials(sealInitials);
  if (normalized) return normalized;
  return theme.sealIcon ?? "✦";
}

/** Minimal ripple glyph, reads as "tap here" without a generic stock hand/cursor icon. */
function EnvelopeTapGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="3.1" fill="currentColor" />
      <circle cx="12" cy="12" r="7.4" stroke="currentColor" strokeWidth="1.3" opacity="0.55" />
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.1" opacity="0.28" />
    </svg>
  );
}

/**
 * Full-viewport immersive envelope, teal→navy stage, cyan frame, gold edges,
 * navy body, mustard flap, wax seal with initials. No instructional copy:
 * the envelope is the experience.
 */
export function EnvelopeCollectionReveal({
  theme,
  eventTitle,
  enableSounds,
  sealInitials,
  sealEmblem,
  sealStyle,
  onBegin,
  onComplete,
  children,
  staticPreview = false,
  embedded = false,
  autoOpen = false,
}: EnvelopeCollectionRevealProps) {
  const reduceMotion = useReducedMotion();
  const shouldAutoOpen = Boolean(autoOpen) && !staticPreview;
  /** Always mount sealed so the open transition has a from→to (autoOpen flips next frame). */
  const [phase, setPhase] = useState<Phase>("idle");
  const started = useRef(false);
  const completeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoOpenBootstrapped = useRef(false);

  /** Cream embroidered face, photoreal art fill + interactive seal when themed. */
  const photoreal = Boolean(theme.photoreal);
  const openEase = photoreal ? PHOTO_OPEN_EASE : OPEN_EASE;
  const durationMs = reduceMotion
    ? photoreal
      ? ENVELOPE_PHOTO_OPEN_REDUCED_MS
      : ENVELOPE_OPEN_REDUCED_MS
    : photoreal
      ? ENVELOPE_PHOTO_OPEN_MS
      : ENVELOPE_OPEN_MS;
  /** Slow whole-stamp lift for CSS envelopes; photoreal seal lifts in its own beat. */
  const sealDurationMs = reduceMotion
    ? photoreal
      ? 420
      : 220
    : photoreal
      ? ENVELOPE_PHOTO_UNSEAL_MS
      : 780;
  /**
   * Photoreal: flap peels softly during unseal, then commits after the seal clears.
   * CSS envelopes: flap follows after the seal float.
   */
  const flapDelayMs = reduceMotion
    ? 0
    : photoreal
      ? 0
      : Math.round(sealDurationMs * 0.55);
  /** Invitation unveils once the flap is mid-open (after unseal on photoreal). */
  const unveilDelayMs = reduceMotion
    ? 0
    : photoreal
      ? ENVELOPE_PHOTO_UNSEAL_MS + Math.round((durationMs - ENVELOPE_PHOTO_UNSEAL_MS) * 0.28)
      : 220;
  const isUnsealing = phase === "unsealing";
  const isEnvelopeOpening = phase === "opening";
  const isOpening = isUnsealing || isEnvelopeOpening;
  const sealLabel = resolveSealLabel(sealInitials, sealEmblem, theme);
  const useMemorialEmblem = Boolean(sealEmblem?.trim());
  const useInitialsGlyph = !useMemorialEmblem && Boolean(normalizeSealInitials(sealInitials));

  const stageBg = theme.stageBg ?? theme.bodyBg ?? DEFAULT_STAGE;
  const frameColor = theme.frameColor ?? (theme.royal ? DEFAULT_FRAME : `${theme.accent}`);
  const outerEdge = theme.outerEdgeColor ?? theme.borderColor ?? DEFAULT_OUTER;
  const resolvedSealStyle = sealStyle ?? DEFAULT_RESOLVED_SEAL_STYLE;
  const sealPreset = getSealDesignPreset(resolvedSealStyle.design);
  const defaultSealTextColor = useMemorialEmblem
    ? sealPreset.wordColor
    : theme.accent === "#757575"
      ? "#fff"
      : "#F5E6B8";
  const sealTextColor = resolvedSealStyle.textColor || defaultSealTextColor;
  const sealSizeScale = SEAL_SIZE_SCALE[resolvedSealStyle.size];
  const sealFontFamily =
    resolvedSealStyle.fontFamily !== "auto" ? SEAL_FONT_STACKS[resolvedSealStyle.fontFamily] : undefined;
  const sealInk = sealInkStyle(sealTextColor, Boolean(sealPreset.dark), useInitialsGlyph);
  const sealBackground =
    resolvedSealStyle.design && resolvedSealStyle.design !== "classic-peach-pearl"
      ? sealFaceCssBackground(resolvedSealStyle.design)
      : theme.sealGradient;
  const stageBase = photoreal ? "#ebe2d6" : "#050a12";

  const clearOpenTimers = useCallback(() => {
    if (completeTimer.current) {
      clearTimeout(completeTimer.current);
      completeTimer.current = null;
    }
    if (unsealTimer.current) {
      clearTimeout(unsealTimer.current);
      unsealTimer.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    clearOpenTimers();
    setPhase("done");
    onComplete();
  }, [clearOpenTimers, onComplete]);

  /** Staged photoreal open, or single-beat CSS open. */
  const runOpenSequence = useCallback(() => {
    clearOpenTimers();
    if (photoreal && !reduceMotion) {
      setPhase("unsealing");
      unsealTimer.current = setTimeout(() => {
        setPhase("opening");
      }, ENVELOPE_PHOTO_UNSEAL_MS);
      completeTimer.current = setTimeout(finish, durationMs + 80);
      return;
    }
    setPhase("opening");
    completeTimer.current = setTimeout(finish, durationMs + 80);
  }, [clearOpenTimers, durationMs, finish, photoreal, reduceMotion]);

  const beginOpen = useCallback(() => {
    if (staticPreview || started.current || phase !== "idle") return;
    started.current = true;
    triggerHapticLight();
    // Unlock template music on the gesture, photoreal TM is music-only (no crack/pop SFX).
    onBegin?.();
    if (enableSounds && !photoreal) {
      playRevealSounds(true);
    }
    runOpenSequence();
  }, [enableSounds, onBegin, phase, photoreal, runOpenSequence, staticPreview]);

  useEffect(() => {
    return () => {
      clearOpenTimers();
    };
  }, [clearOpenTimers]);

  /**
   * Catalogue “Tap to open envelope” already happened.
   * Paint one sealed frame, then open so CSS / motion transitions actually run.
   * Music unlock runs immediately (sticky activation from the affordance tap).
   */
  useEffect(() => {
    if (!shouldAutoOpen || autoOpenBootstrapped.current) return;
    autoOpenBootstrapped.current = true;
    if (started.current) return;
    started.current = true;
    triggerHapticLight();
    onBegin?.();
    if (enableSounds && !photoreal) {
      playRevealSounds(true);
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        runOpenSequence();
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [shouldAutoOpen, onBegin, enableSounds, photoreal, runOpenSequence]);

  useEffect(() => {
    if (staticPreview || phase !== "idle") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        beginOpen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beginOpen, phase, staticPreview]);

  if (phase === "done") return null;

  const shellClass = staticPreview
    ? "absolute inset-0 overflow-hidden pointer-events-none"
    : embedded
      ? "absolute inset-0 z-[100] overflow-hidden"
      : "fixed inset-0 z-[100] invite-viewport-live overflow-hidden";

  return (
    <div
      className={shellClass}
      style={{
        background: stageBase,
        perspective: reduceMotion ? undefined : "1600px",
        perspectiveOrigin: "50% 18%",
        /* Ensure absolute/fixed children have a real box in framed previews. */
        minHeight: staticPreview || embedded ? "100%" : undefined,
        height: staticPreview || embedded ? "100%" : undefined,
        width: staticPreview || embedded ? "100%" : undefined,
      }}
      role={staticPreview ? "img" : "dialog"}
      aria-modal={staticPreview ? undefined : true}
      aria-label={
        isOpening
          ? `Opening invitation for ${eventTitle}`
          : `Sealed envelope. Open invitation for ${eventTitle}`
      }
    >
      {/* Invitation peeks underneath as the envelope opens */}
      <div
        className="absolute inset-0 z-0"
        style={{
          opacity: isEnvelopeOpening ? 1 : 0,
          transform: isEnvelopeOpening
            ? "scale(1)"
            : reduceMotion
              ? "scale(1)"
              : "scale(0.965)",
          transition: `opacity ${Math.min(
            durationMs,
            photoreal ? 2200 : 1200
          )}ms ${photoreal ? PHOTO_OPEN_EASE : "ease"} ${
            photoreal ? Math.round((durationMs - ENVELOPE_PHOTO_UNSEAL_MS) * 0.2) : unveilDelayMs
          }ms, transform ${
            photoreal ? Math.round(durationMs - ENVELOPE_PHOTO_UNSEAL_MS) : durationMs
          }ms ${openEase} ${
            photoreal ? Math.round((durationMs - ENVELOPE_PHOTO_UNSEAL_MS) * 0.15) : unveilDelayMs
          }ms`,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        {children}
      </div>

      {photoreal ? (
        <EmbroideredEnvelopeFace
          theme={theme}
          sealLabel={sealLabel}
          eventTitle={eventTitle}
          isUnsealing={isUnsealing}
          isOpening={isEnvelopeOpening}
          reduceMotion={Boolean(reduceMotion)}
          durationMs={durationMs}
          sealDurationMs={sealDurationMs}
          flapDelayMs={flapDelayMs}
          openEase={openEase}
          fitContainer={staticPreview}
          sealStyle={resolvedSealStyle}
        />
      ) : (
      <div
        className="absolute inset-0 z-10 flex items-stretch justify-stretch"
        style={{
          background: stageBg,
          opacity: isOpening ? 0 : 1,
          transform: isOpening
            ? reduceMotion
              ? "translateY(-6%)"
              : "translateY(-14%) scale(1.04)"
            : "translateY(0) scale(1)",
          transition: reduceMotion
            ? `opacity ${durationMs}ms ${OPEN_EASE}, transform ${durationMs}ms ${OPEN_EASE}`
            : `opacity ${Math.round(durationMs * 0.5)}ms ${OPEN_EASE} ${Math.round(
                durationMs * 0.42
              )}ms, transform ${durationMs}ms ${OPEN_EASE}`,
          pointerEvents: "none",
        }}
      >
        {/* Soft stage light */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 28%, rgba(212,166,58,0.14), transparent 58%), radial-gradient(ellipse 80% 60% at 50% 100%, rgba(11,138,131,0.18), transparent 55%)",
          }}
        />

        {/* Subtle gold outer edge lines */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: "max(0.35rem, env(safe-area-inset-top, 0px)) max(0.4rem, env(safe-area-inset-right, 0px)) max(0.35rem, env(safe-area-inset-bottom, 0px)) max(0.4rem, env(safe-area-inset-left, 0px))",
            border: `1px solid ${outerEdge}`,
            borderRadius: "2px",
          }}
        />

        {/* Bright cyan / blue inner frame */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: "max(0.85rem, env(safe-area-inset-top, 0px)) max(0.9rem, env(safe-area-inset-right, 0px)) max(0.85rem, env(safe-area-inset-bottom, 0px)) max(0.9rem, env(safe-area-inset-left, 0px))",
            border: `1.5px solid ${frameColor}`,
            boxShadow: `inset 0 0 0 1px rgba(56,189,248,0.15), 0 0 24px rgba(56,189,248,0.08)`,
            borderRadius: "3px",
          }}
        />

        {/* Envelope fills the framed stage, no copy below */}
        <div
          className={`absolute ${
            reduceMotion || isOpening ? "" : "inv-envelope-breathe"
          }`}
          style={{
            inset: "max(1.35rem, calc(env(safe-area-inset-top, 0px) + 0.55rem)) max(1.4rem, calc(env(safe-area-inset-right, 0px) + 0.55rem)) max(1.35rem, calc(env(safe-area-inset-bottom, 0px) + 0.55rem)) max(1.4rem, calc(env(safe-area-inset-left, 0px) + 0.55rem))",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Navy envelope body */}
          <div
            className="absolute inset-0 rounded-[1.15rem] sm:rounded-[1.35rem] overflow-hidden"
            style={{
              background: theme.bodyBg,
              border: `1.5px solid ${theme.borderColor}`,
              boxShadow:
                "0 28px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Paper grain / depth */}
            <div
              className="absolute inset-0 opacity-[0.22]"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 85% 55% at 50% 18%, rgba(255,255,255,0.1), transparent 55%), linear-gradient(165deg, transparent 35%, rgba(0,0,0,0.28) 100%)",
              }}
            />

            {/* Side pocket folds (subtle) */}
            <div
              className="absolute inset-y-[18%] left-0 w-[14%] opacity-30"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.35), transparent)",
                clipPath: "polygon(0 0, 100% 12%, 100% 88%, 0 100%)",
              }}
            />
            <div
              className="absolute inset-y-[18%] right-0 w-[14%] opacity-30"
              style={{
                background:
                  "linear-gradient(270deg, rgba(0,0,0,0.35), transparent)",
                clipPath: "polygon(0 12%, 100% 0, 100% 100%, 0 88%)",
              }}
            />

            {/* Kente strip */}
            {theme.kente && (
              <div className="absolute top-0 left-0 right-0 h-2.5 flex">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-full"
                    style={{
                      background: i % 3 === 0 ? "#D4A63A" : i % 3 === 1 ? "#0B8A83" : "#c0392b",
                    }}
                  />
                ))}
              </div>
            )}

            {/* Floral accents */}
            {theme.floral && (
              <div className="absolute inset-0 pointer-events-none opacity-40">
                {["top-[6%] left-[5%]", "top-[8%] right-[6%]", "bottom-[8%] left-[6%]", "bottom-[6%] right-[5%]"].map(
                  (pos, i) => (
                    <span
                      key={i}
                      className={`absolute ${pos} text-2xl text-pink-300`}
                      style={
                        reduceMotion
                          ? undefined
                          : {
                              animation: `inv-envelope-glint 3.2s ease-in-out ${i * 0.4}s infinite`,
                            }
                      }
                    >
                      ✿
                    </span>
                  )
                )}
              </div>
            )}
          </div>

          {/* Mustard-gold triangular flap pointing down */}
          <div
            className="absolute inset-x-0 top-0 z-20"
            style={{
              height: "52%",
              background: theme.flapGradient,
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              transformOrigin: "50% 0%",
              transform: isOpening
                ? reduceMotion
                  ? "translateY(-110%)"
                  : "translateY(-118%) rotateX(-32deg)"
                : "translateY(0) rotateX(0deg)",
              transition: `transform ${durationMs}ms ${OPEN_EASE} ${flapDelayMs}ms`,
              transformStyle: "preserve-3d",
              boxShadow: isOpening ? "none" : "0 18px 48px rgba(0,0,0,0.4)",
              filter: isOpening ? "brightness(1.06)" : undefined,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,245,220,0.4) 0%, transparent 42%, rgba(0,0,0,0.14) 100%)",
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              }}
            />
            {/* Thin gold outline along flap edges */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <polygon
                points="0,0 100,0 50,100"
                fill="none"
                stroke={theme.borderColor}
                strokeWidth="0.6"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {!reduceMotion && !isOpening && (
              <div
                className="absolute inset-0 opacity-45"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 38%, rgba(255,250,230,0.55) 50%, transparent 62%)",
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                  animation: "inv-envelope-glint 3.6s ease-in-out infinite",
                }}
              />
            )}
          </div>

          {/* Circular gold seal at flap tip */}
          <div
            className="absolute left-1/2 top-[52%] z-30"
            style={{
              transform: isOpening
                ? reduceMotion
                  ? "translate(-50%, -55%) scale(1.08)"
                  : "translate(-50%, calc(-50% - 22vh)) scale(1.4) rotate(16deg)"
                : "translate(-50%, -50%) scale(1)",
              opacity: isOpening ? 0 : 1,
              transition: `transform ${sealDurationMs}ms ${OPEN_EASE}, opacity ${Math.round(
                sealDurationMs * 0.85
              )}ms ease`,
            }}
          >
            <div
              className={`relative flex items-center justify-center rounded-full border-2 shadow-2xl ${
                reduceMotion || isOpening ? "" : "inv-seal-pulse"
              }`}
              style={{
                width: "min(26vw, 5.75rem)",
                height: "min(26vw, 5.75rem)",
                minWidth: "4.5rem",
                minHeight: "4.5rem",
                background: sealBackground,
                borderColor: theme.borderColor,
                boxShadow: `0 10px 36px rgba(0,0,0,0.4), 0 0 0 1px ${theme.borderColor}, inset 0 2px 10px rgba(255,255,255,0.35), 0 0 28px rgba(212,166,58,0.35)`,
              }}
            >
              <div
                className="absolute inset-[3px] rounded-full border pointer-events-none"
                style={{ borderColor: "rgba(245,230,184,0.4)" }}
              />
              <span
                className="relative font-display font-semibold tracking-[0.1em] leading-none select-none"
                style={{
                  color: sealTextColor,
                  fontSize: useInitialsGlyph
                    ? "clamp(1.2rem, 4.8vw, 1.75rem)"
                    : "clamp(1.25rem, 5vw, 1.8rem)",
                  fontFamily: sealFontFamily,
                  textShadow: resolvedSealStyle.textColor
                    ? sealInk.textShadow
                    : "0 1px 2px rgba(0,0,0,0.4)",
                  transform: sealSizeScale !== 1 ? `scale(${sealSizeScale})` : undefined,
                  transformOrigin: "50% 50%",
                }}
              >
                {sealLabel}
              </span>
              {!reduceMotion && !isOpening && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#F5E6B8]/85 blur-[0.5px]"
                  style={{ animation: "inv-envelope-glint 2.8s ease-in-out infinite" }}
                  aria-hidden
                />
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/*
        Guided tap affordance, the envelope/seal itself IS the control, but a
        guest who has never seen this ceremony before shouldn't have to guess
        that it's interactive. Uses the theme's own copy ("Tap the seal to
        open", "Press the wax seal", ...) so every envelope variant stays on
        brand instead of one generic instruction.
      */}
      {!staticPreview && !shouldAutoOpen && (
        <div
          className="absolute inset-x-0 z-30 flex justify-center pointer-events-none px-6"
          style={{
            bottom: "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 2rem))",
            opacity: isOpening ? 0 : 1,
            transition: "opacity 260ms ease",
          }}
          aria-hidden
        >
          <span
            className={`inline-flex items-center gap-2 rounded-full border backdrop-blur-sm px-4 py-2 ${
              reduceMotion ? "" : "inv-tap-hint-pulse"
            }`}
            style={{
              borderColor: `color-mix(in srgb, ${theme.accent} 55%, transparent)`,
              background: "rgba(4, 10, 16, 0.4)",
              color: theme.accent,
              fontFamily: "var(--font-cinzel), 'Cinzel', serif",
              fontSize: "0.62rem",
              fontWeight: 600,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            <EnvelopeTapGlyph />
            {theme.label || "Tap to open"}
          </span>
        </div>
      )}

      {/* Full-area hit target, seal/envelope IS the control; the chip above just labels it */}
      {!staticPreview && !shouldAutoOpen && phase === "idle" && (
        <button
          type="button"
          onClick={beginOpen}
          className="absolute inset-0 z-40 touch-manipulation bg-transparent border-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-12px] focus-visible:outline-[#D4A63A]/85"
          aria-label={theme.label ? `${theme.label}, open invitation` : "Tap to open invitation"}
        />
      )}
    </div>
  );
}
