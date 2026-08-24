"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { triggerHapticLight } from "@/lib/haptics";
import { playRevealSounds } from "@/lib/experience/reveal-sounds";
import type { EnvelopeVisualTheme } from "@/lib/experience/opening-experiences";
import { normalizeSealInitials } from "@/lib/invitation/vision-board";
import { EmbroideredEnvelopeFace } from "@/components/experience/embroidered-envelope-face";
import { CinematicCssEnvelopeFace } from "@/components/experience/cinematic-css-envelope-face";
import {
  DEFAULT_RESOLVED_SEAL_STYLE,
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
 * CSS envelopes: idle → unsealing (seal lifts) → opening (flap unfolds) → done.
 */
type Phase = "idle" | "unsealing" | "opening" | "done";

/** Theatrical open for legacy CSS envelopes (now cinematic). */
export const ENVELOPE_OPEN_MS = 4800;
export const ENVELOPE_OPEN_REDUCED_MS = 750;
/** Seal-clear beat before the flap commits on CSS envelopes. */
export const ENVELOPE_CSS_UNSEAL_MS = 1700;
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
  const cssUnsealMs = ENVELOPE_CSS_UNSEAL_MS;
  const durationMs = reduceMotion
    ? photoreal
      ? ENVELOPE_PHOTO_OPEN_REDUCED_MS
      : ENVELOPE_OPEN_REDUCED_MS
    : photoreal
      ? ENVELOPE_PHOTO_OPEN_MS
      : ENVELOPE_OPEN_MS;
  /** Slow whole-stamp lift; photoreal + CSS both use a dedicated unseal beat. */
  const sealDurationMs = reduceMotion
    ? photoreal
      ? 420
      : 280
    : photoreal
      ? ENVELOPE_PHOTO_UNSEAL_MS
      : cssUnsealMs;
  const unsealMs = photoreal ? ENVELOPE_PHOTO_UNSEAL_MS : cssUnsealMs;
  const isUnsealing = phase === "unsealing";
  const isEnvelopeOpening = phase === "opening";
  const isOpening = isUnsealing || isEnvelopeOpening;
  const sealLabel = resolveSealLabel(sealInitials, sealEmblem, theme);
  const resolvedSealStyle = sealStyle ?? DEFAULT_RESOLVED_SEAL_STYLE;
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

  /** Staged open: seal lifts clear → flap unfolds → invite unveils. */
  const runOpenSequence = useCallback(() => {
    clearOpenTimers();
    if (!reduceMotion) {
      setPhase("unsealing");
      unsealTimer.current = setTimeout(() => {
        setPhase("opening");
      }, unsealMs);
      completeTimer.current = setTimeout(finish, durationMs + 80);
      return;
    }
    setPhase("opening");
    completeTimer.current = setTimeout(finish, durationMs + 80);
  }, [clearOpenTimers, durationMs, finish, reduceMotion, unsealMs]);

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
            photoreal ? 2200 : 2000
          )}ms ${photoreal ? PHOTO_OPEN_EASE : openEase} ${
            photoreal
              ? Math.round((durationMs - ENVELOPE_PHOTO_UNSEAL_MS) * 0.2)
              : Math.round((durationMs - cssUnsealMs) * 0.18)
          }ms, transform ${
            photoreal ? Math.round(durationMs - ENVELOPE_PHOTO_UNSEAL_MS) : Math.round(durationMs - cssUnsealMs)
          }ms ${openEase} ${
            photoreal
              ? Math.round((durationMs - ENVELOPE_PHOTO_UNSEAL_MS) * 0.15)
              : Math.round((durationMs - cssUnsealMs) * 0.14)
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
        <CinematicCssEnvelopeFace
          theme={theme}
          sealLabel={sealLabel}
          eventTitle={eventTitle}
          isUnsealing={isUnsealing}
          isOpening={isEnvelopeOpening}
          reduceMotion={Boolean(reduceMotion)}
          durationMs={durationMs}
          sealDurationMs={sealDurationMs}
          sealStyle={resolvedSealStyle}
          fitContainer={staticPreview}
        />
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
