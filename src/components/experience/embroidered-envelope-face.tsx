"use client";
// Cinematic open (Forever Afaris DNA): seal lifts clear → flap unfolds → unveil.
// rect-fill: classic landscape envelope + embroidery cover-fill

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { EnvelopeVisualTheme } from "@/lib/experience/opening-experiences";
import { TRADITIONAL_MARRIAGE_ENVELOPE_ART_URL } from "@/lib/invitation/vision-board";
import { invitationFontVars } from "@/lib/invitation-fonts";
import {
  DEFAULT_RESOLVED_SEAL_STYLE,
  type ResolvedSealStyle,
} from "@/lib/invitation/seal-design";
import { PremiumWaxSeal } from "@/components/experience/premium-wax-seal";

/** Matches Forever Afaris silk ease for seal / flap beats. */
const EASE_SILK = [0.22, 1, 0.36, 1] as const;
const EASE_GATE = [0.16, 1, 0.3, 1] as const;

interface EmbroideredEnvelopeFaceProps {
  theme: EnvelopeVisualTheme;
  sealLabel: string;
  eventTitle: string;
  /** Seal lifting clear of the paper (first cinematic beat). */
  isUnsealing?: boolean;
  /** Flap committing to a full dramatic unfold (second beat). */
  isOpening: boolean;
  reduceMotion: boolean;
  durationMs: number;
  /** Seal-clear duration; drives the independent stamp lift. */
  sealDurationMs: number;
  flapDelayMs: number;
  openEase: string;
  /** Size to parent tile (catalogue glimpse) instead of full viewport. */
  fitContainer?: boolean;
  /** Designed seal (color/material) + font/size/color overrides. Defaults to classic peach pearl. */
  sealStyle?: ResolvedSealStyle;
}

/**
 * Classic invitation envelope proportions (landscape, not square).
 * Tuned wide enough to read as a real envelope, tall enough to fill the stage
 * without large grey letterbox bands on mobile or desktop.
 */
const ENVELOPE_ASPECT_MOBILE = 1.18;
const ENVELOPE_ASPECT_DESKTOP = 1.28;
/** Source art intrinsic ratio (IMG_8701 ≈ square). */
const ART_ASPECT_NUM = 937 / 957;

/**
 * IMG_8701 art metrics (source is seal-cleaned; embroidery retained).
 * Photo seal center → panned under the interactive wax stamp at the V-flap tip.
 */
const ART_SEAL_X = 0.5518;
const ART_SEAL_Y = 0.6238;

/** Natural V-flap tip, interactive seal anchors exactly here. */
const PHOTO_FLAP_PCT = 54.5;
/**
 * Premium stamp fills the cream disc / plate under the V-tip.
 * Sized to fully cover leftover faint circle, peach seal only, no halo peek.
 */
const PHOTO_SEAL_WIDTH = "40%";
const FALLBACK_SEAL_WIDTH = "36%";

/**
 * Cover-zoom so embroidery fills the landscape rectangle with no grey paper gaps.
 * Slightly higher so florals stay rich after aspect conversion on larger stage.
 */
const PHOTO_ZOOM = 1.12;

const PAPER =
  "linear-gradient(165deg, #faf6f0 0%, #f3ebe3 42%, #ebe2d6 78%, #e4d9cc 100%)";
const FLAP_PAPER =
  "linear-gradient(180deg, #fbf7f1 0%, #f4ece4 48%, #ebe3d8 100%)";

function subscribeMq(mq: MediaQueryList, onChange: () => void) {
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Desktop vs mobile envelope aspect, fills screen without grey letterboxing. */
function useEnvelopeAspect(fitContainer: boolean): number {
  const isDesktop = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => undefined;
      const mq = window.matchMedia("(min-width: 768px)");
      return subscribeMq(mq, onStoreChange);
    },
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(min-width: 768px)").matches
        : true,
    () => true
  );
  if (fitContainer) return ENVELOPE_ASPECT_DESKTOP;
  return isDesktop ? ENVELOPE_ASPECT_DESKTOP : ENVELOPE_ASPECT_MOBILE;
}

/**
 * Absolute % cover layout that maps art seal center onto the interactive seal
 * while guaranteeing embroidery covers the full envelope rectangle.
 */
function photoFillLayout(
  boxAspect: number,
  targetX = 0.5,
  targetY = PHOTO_FLAP_PCT / 100
) {
  const coverScale = Math.max(boxAspect / ART_ASPECT_NUM, 1) * PHOTO_ZOOM;
  const widthPct = (ART_ASPECT_NUM * coverScale * 100) / boxAspect;
  const heightPct = 100 * coverScale;
  const leftPct = targetX * 100 - ART_SEAL_X * widthPct;
  const topPct = targetY * 100 - ART_SEAL_Y * heightPct;
  return { widthPct, heightPct, leftPct, topPct };
}

/**
 * Hybrid embroidered cream envelope:
 * - Primary: photoreal IMG_8701 fills body + V-flap (object-cover), peach seal on tip.
 * - Open (Forever Afaris DNA): seal lifts clear → flap peels then unfolds dramatically.
 * - Fallback: CSS/SVG composition if the face art fails to load.
 */
export function EmbroideredEnvelopeFace({
  theme,
  sealLabel,
  eventTitle,
  isUnsealing = false,
  isOpening,
  reduceMotion,
  durationMs,
  sealDurationMs,
  flapDelayMs: _flapDelayMs,
  openEase: _openEase,
  fitContainer = false,
  sealStyle,
}: EmbroideredEnvelopeFaceProps) {
  const faceArtUrl = theme.faceArtUrl ?? TRADITIONAL_MARRIAGE_ENVELOPE_ART_URL;
  const envelopeAspect = useEnvelopeAspect(fitContainer);
  const [artState, setArtState] = useState<"loading" | "ready" | "error">(
    faceArtUrl ? "loading" : "error"
  );
  const usePhoto = Boolean(faceArtUrl) && artState === "ready";
  /** Prefer photo geometry while loading so seal/flap don’t jump when art arrives. */
  const preferPhotoLayout = Boolean(faceArtUrl) && artState !== "error";
  const lifting = isUnsealing || isOpening;
  const sealLiftSec = Math.max(0.45, sealDurationMs / 1000);
  const flapOpenSec = reduceMotion
    ? 0.35
    : Math.max(1.1, (durationMs - sealDurationMs) / 1000 * 0.72);

  useEffect(() => {
    if (!faceArtUrl) {
      setArtState("error");
      return;
    }
    let cancelled = false;
    setArtState("loading");
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setArtState("ready");
    };
    img.onerror = () => {
      if (!cancelled) setArtState("error");
    };
    img.src = faceArtUrl;
    return () => {
      cancelled = true;
    };
  }, [faceArtUrl]);

  const stageBg =
    theme.stageBg ??
    "linear-gradient(180deg, #f8f2ea 0%, #f0e6dc 36%, #e9ddd2 68%, #e2d4c6 100%)";

  const flapHeightPct = preferPhotoLayout ? PHOTO_FLAP_PCT : 54;
  const sealWidth = preferPhotoLayout ? PHOTO_SEAL_WIDTH : FALLBACK_SEAL_WIDTH;

  /** Maximize envelope in viewport, landscape box constrained by width AND height. */
  const envelopeWidth = fitContainer
    ? "100%"
    : `min(99.2vw, calc((100dvh - 0.28rem) * ${envelopeAspect}), 56rem)`;

  /**
   * Hold the envelope fully visible through seal lift + flap unfold.
   * Only dissolve once the flap has committed — never mid-lift.
   */
  const shellFadeDelay = isOpening
    ? Math.round(flapOpenSec * 1000 * 0.55)
    : 0;
  const shellFadeMs = isOpening
    ? Math.round(flapOpenSec * 1000 * 0.55)
    : Math.round(durationMs * 0.2);

  return (
    <motion.div
      className={`absolute inset-0 z-10 flex items-center justify-center ${invitationFontVars}`}
      style={{
        background: stageBg,
        pointerEvents: "none",
        padding: fitContainer
          ? "0"
          : "max(0.12rem, env(safe-area-inset-top, 0px)) max(0.18rem, env(safe-area-inset-right, 0px)) max(0.12rem, env(safe-area-inset-bottom, 0px)) max(0.18rem, env(safe-area-inset-left, 0px))",
        perspective: reduceMotion ? undefined : "1600px",
        perspectiveOrigin: "50% 0%",
      }}
      initial={false}
      animate={
        isOpening
          ? {
              opacity: 0,
              y: reduceMotion ? "-3%" : "-7%",
              scale: reduceMotion ? 1.01 : 1.055,
            }
          : isUnsealing
            ? { opacity: 1, y: 0, scale: 1.025 }
            : { opacity: 1, y: 0, scale: 1 }
      }
      transition={
        isOpening
          ? {
              opacity: {
                duration: shellFadeMs / 1000,
                delay: shellFadeDelay / 1000,
                ease: EASE_SILK,
              },
              y: { duration: flapOpenSec, ease: EASE_SILK },
              scale: { duration: flapOpenSec, ease: EASE_SILK },
            }
          : { duration: 0.9, ease: EASE_SILK }
      }
    >
      {/* Soft linen atmosphere */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 50% 32%, rgba(255,248,240,0.95), transparent 62%), radial-gradient(ellipse 90% 50% at 50% 100%, rgba(196,140,110,0.12), transparent 55%)",
        }}
        aria-hidden
      />

      <motion.div
        className={`relative z-10 ${
          reduceMotion || lifting ? "" : "inv-envelope-breathe"
        }`}
        style={{
          /* Classic landscape invitation envelope, fills screen, adapts mobile/desktop. */
          width: envelopeWidth,
          aspectRatio: `${envelopeAspect} / 1`,
          maxHeight: fitContainer ? "100%" : "calc(100dvh - 0.28rem)",
          height: "auto",
          transformStyle: "preserve-3d",
          borderRadius: "0.12rem",
          boxShadow:
            "0 24px 70px rgba(80, 50, 30, 0.22), 0 0 0 1px rgba(196, 154, 120, 0.34)",
          /* Flap+seal may swing past the face; keep clipped while sealed. */
          overflow: lifting ? "visible" : "hidden",
          background: "#efe6dc",
        }}
        animate={
          isOpening
            ? { filter: "brightness(1.1)" }
            : isUnsealing
              ? { filter: "brightness(1.04)" }
              : { filter: "brightness(1)" }
        }
        transition={{ duration: 1.1, ease: EASE_SILK }}
        role="img"
        aria-label={`Sealed embroidered invitation envelope for ${eventTitle}`}
      >
        {/* Envelope body, cream underlay, photo fills shape when ready */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ background: PAPER }}
        >
          {/* Rich emboss always under photo so loading never looks blank gray */}
          <EmbossTexture opacity={usePhoto ? 0.12 : 0.6} />
          <PaperGrain />
          {usePhoto && faceArtUrl ? (
            <EnvelopePhotoFill src={faceArtUrl} alt="" boxAspect={envelopeAspect} />
          ) : (
            <>
              <div
                className="absolute inset-y-[20%] left-0 w-[18%] opacity-45"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(160,120,90,0.2), transparent)",
                  clipPath: "polygon(0 0, 100% 14%, 100% 86%, 0 100%)",
                }}
                aria-hidden
              />
              <div
                className="absolute inset-y-[20%] right-0 w-[18%] opacity-45"
                style={{
                  background:
                    "linear-gradient(270deg, rgba(160,120,90,0.2), transparent)",
                  clipPath: "polygon(0 14%, 100% 0, 100% 100%, 0 86%)",
                }}
                aria-hidden
              />
              <div
                className="absolute left-1/2 top-[52%] h-[28%] w-[70%] -translate-x-1/2 opacity-55"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(140,100,70,0.14), transparent 70%)",
                }}
                aria-hidden
              />
            </>
          )}
        </div>

        {!usePhoto && (
          <div
            className="absolute inset-0 pointer-events-none opacity-35"
            style={{
              background:
                "radial-gradient(ellipse 55% 35% at 50% 54%, rgba(255,250,245,0.5), transparent 70%)",
            }}
            aria-hidden
          />
        )}

        {/*
          Top V-flap — soft peel while the seal lifts, then a dramatic unfold.
          Seal is a sibling (not a child) so it can float clear independently.
        */}
        <motion.div
          className="absolute inset-x-0 top-0 z-20 origin-top"
          style={{
            height: `${flapHeightPct}%`,
            transformStyle: "preserve-3d",
            overflow: "visible",
            willChange: lifting ? "transform" : undefined,
            zIndex: isOpening ? 12 : 20,
          }}
          initial={{ rotateX: 0 }}
          animate={{
            rotateX: reduceMotion
              ? isOpening
                ? -28
                : 0
              : isOpening
                ? -152
                : isUnsealing
                  ? -22
                  : 0,
          }}
          transition={{
            duration: isOpening ? flapOpenSec : sealLiftSec,
            ease: EASE_GATE,
            delay: isOpening ? 0.05 : isUnsealing ? 0.32 : 0,
          }}
          aria-hidden
        >
          {/* Cream underside, reads as paper when the flap lifts toward camera */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              background: FLAP_PAPER,
              transform: "rotateX(180deg)",
              backfaceVisibility: "hidden",
              boxShadow: "inset 0 8px 24px rgba(80,50,30,0.12)",
            }}
          />

          {/* V-flap face only (clipped triangle) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              boxShadow: lifting ? "none" : "0 18px 40px rgba(80,50,30,0.16)",
              filter: lifting ? "brightness(1.1)" : undefined,
              transform: "translateZ(0.5px)",
            }}
          >
            {usePhoto && faceArtUrl ? (
              /* Full-envelope-sized photo so flap pixels align with body */
              <div
                className="absolute left-0 top-0 w-full overflow-hidden"
                style={{ height: `${10000 / flapHeightPct}%` }}
              >
                <EnvelopePhotoFill src={faceArtUrl} alt="" boxAspect={envelopeAspect} />
              </div>
            ) : (
              <div className="absolute inset-0" style={{ background: FLAP_PAPER }}>
                <EmbossTexture opacity={0.7} denser />
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polygon
                    points="0,0 100,0 50,100"
                    fill="none"
                    stroke="rgba(196,154,120,0.35)"
                    strokeWidth="0.45"
                    vectorEffect="non-scaling-stroke"
                  />
                  <polygon
                    points="1.2,1 98.8,1 50,97.5"
                    fill="none"
                    stroke="rgba(255,252,248,0.45)"
                    strokeWidth="0.35"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div
                  className="absolute left-[6%] top-[14%] h-[78%] w-[82%]"
                  style={{
                    filter: "drop-shadow(0 2px 3px rgba(120,80,50,0.14))",
                  }}
                >
                  <EmbroideryCluster />
                </div>
              </div>
            )}

            {!reduceMotion && !lifting && (
              <div
                className="absolute inset-0 opacity-35"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 36%, rgba(255,252,248,0.55) 50%, transparent 64%)",
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                  animation: "inv-envelope-glint 4s ease-in-out infinite",
                }}
              />
            )}
          </div>
        </motion.div>

        {/* Soft paper contact ring left behind as the seal lifts clear */}
        <AnimatePresence>
          {isUnsealing && !isOpening && !reduceMotion && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute left-1/2 z-[18] rounded-full"
              style={{
                top: `${flapHeightPct}%`,
                width: sealWidth,
                maxWidth: fitContainer ? "7.75rem" : "17rem",
                minWidth: fitContainer ? "4.25rem" : "9.25rem",
                aspectRatio: "1",
                x: "-50%",
                y: "-50%",
                border: "1px solid rgba(160, 90, 70, 0.28)",
                boxShadow: "inset 0 0 16px rgba(160, 90, 70, 0.14)",
                background:
                  "radial-gradient(circle, rgba(255,248,240,0.72) 0%, transparent 70%)",
              }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: [0, 0.75, 0.22], scale: [0.85, 1.02, 1.1] }}
              exit={{ opacity: 0, scale: 1.18 }}
              transition={{ duration: sealLiftSec, ease: EASE_SILK }}
            />
          )}
        </AnimatePresence>

        {/*
          Peach wax stamp — sibling of the flap so it can lift clear first
          (Forever Afaris seal choreography), then soar away as the flap opens.
        */}
        <motion.div
          className="absolute left-1/2 z-30 flex items-center justify-center"
          style={{
            top: `${flapHeightPct}%`,
            width: sealWidth,
            height: "auto",
            aspectRatio: "1",
            minWidth: fitContainer ? "4.25rem" : "9.25rem",
            minHeight: fitContainer ? "4.25rem" : "9.25rem",
            maxWidth: fitContainer ? "7.75rem" : "17rem",
            x: "-50%",
            transformStyle: "preserve-3d",
            willChange: lifting ? "transform, opacity" : undefined,
          }}
          initial={{ y: "-50%", scale: 1, opacity: 1, rotateX: 0, rotateZ: 0 }}
          animate={
            reduceMotion
              ? isOpening
                ? { y: "-120%", scale: 0.92, opacity: 0, rotateX: 0, rotateZ: 0 }
                : { y: "-50%", scale: 1, opacity: 1, rotateX: 0, rotateZ: 0 }
              : isOpening
                ? {
                    y: "-340%",
                    scale: 0.76,
                    opacity: 0,
                    rotateX: -52,
                    rotateZ: -9,
                    filter: "drop-shadow(0 28px 24px rgba(120, 70, 50, 0.22))",
                  }
                : isUnsealing
                  ? {
                      y: "-175%",
                      scale: 1.07,
                      opacity: 1,
                      rotateX: -30,
                      rotateZ: -4,
                      filter: "drop-shadow(0 22px 20px rgba(120, 70, 50, 0.34))",
                    }
                  : {
                      y: "-50%",
                      scale: 1,
                      opacity: 1,
                      rotateX: 0,
                      rotateZ: 0,
                      filter: "drop-shadow(0 10px 14px rgba(120, 70, 50, 0.28))",
                    }
          }
          transition={
            lifting
              ? {
                  duration: isOpening ? Math.min(1.2, flapOpenSec) : sealLiftSec,
                  ease: EASE_SILK,
                }
              : { duration: 0.01 }
          }
        >
          <PremiumWaxSeal
            sealLabel={sealLabel}
            isOpening={lifting}
            isUnsealing={isUnsealing && !isOpening}
            reduceMotion={reduceMotion}
            compact={fitContainer}
            sealStyle={sealStyle}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/** Zoom+pan cover-fill, embroidery covers rectangle; art seal under interactive stamp. */
function EnvelopePhotoFill({
  src,
  alt,
  boxAspect,
}: {
  src: string;
  alt: string;
  boxAspect: number;
}) {
  const layout = photoFillLayout(boxAspect);
  return (
    // Local public template, body + flap share identical pan/zoom
    <img
      src={src}
      alt={alt}
      draggable={false}
      decoding="async"
      className="absolute max-w-none pointer-events-none select-none"
      style={{
        width: `${layout.widthPct}%`,
        height: `${layout.heightPct}%`,
        left: `${layout.leftPct}%`,
        top: `${layout.topPct}%`,
        objectFit: "cover",
        objectPosition: "50% 50%",
        display: "block",
        imageRendering: "auto",
        WebkitBackfaceVisibility: "hidden",
        backfaceVisibility: "hidden",
        transform: "translateZ(0)",
        /* Premium color grade, richer peach embroidery, sharper presence */
        filter: "saturate(1.12) contrast(1.06) brightness(1.03)",
      }}
    />
  );
}

/** Tone-on-tone embossed floral / leafy paper pattern. */
function EmbossTexture({
  opacity = 0.5,
  denser = false,
}: {
  opacity?: number;
  denser?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const id = denser ? `emboss-dense-${uid}` : `emboss-body-${uid}`;
  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{ opacity }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <pattern
          id={id}
          width={denser ? 72 : 88}
          height={denser ? 72 : 88}
          patternUnits="userSpaceOnUse"
          patternTransform={denser ? "rotate(-8)" : "rotate(-6)"}
        >
          <path
            d="M18 44 C22 28, 38 18, 48 30 C58 18, 74 28, 78 44 C72 58, 56 66, 48 56 C40 66, 24 58, 18 44 Z"
            fill="none"
            stroke="rgba(255,252,248,0.7)"
            strokeWidth="1.1"
          />
          <path
            d="M18 44 C22 28, 38 18, 48 30 C58 18, 74 28, 78 44 C72 58, 56 66, 48 56 C40 66, 24 58, 18 44 Z"
            fill="none"
            stroke="rgba(170,130,100,0.22)"
            strokeWidth="1.1"
            transform="translate(0.8 0.9)"
          />
          <path
            d="M8 12 C14 4, 28 6, 32 16 C28 24, 14 22, 8 12 Z"
            fill="none"
            stroke="rgba(255,252,248,0.55)"
            strokeWidth="0.9"
          />
          <path
            d="M8 12 C14 4, 28 6, 32 16 C28 24, 14 22, 8 12 Z"
            fill="none"
            stroke="rgba(160,120,90,0.18)"
            strokeWidth="0.9"
            transform="translate(0.6 0.7)"
          />
          <path
            d="M52 8 C58 2, 70 8, 68 20 C62 28, 50 20, 52 8 Z"
            fill="none"
            stroke="rgba(255,252,248,0.5)"
            strokeWidth="0.85"
          />
          <path
            d="M52 8 C58 2, 70 8, 68 20 C62 28, 50 20, 52 8 Z"
            fill="none"
            stroke="rgba(160,120,90,0.16)"
            strokeWidth="0.85"
            transform="translate(0.5 0.6)"
          />
          <path
            d="M40 70 Q48 58, 56 70 Q64 82, 72 70"
            fill="none"
            stroke="rgba(180,140,110,0.14)"
            strokeWidth="0.75"
          />
          <path
            d="M12 58 Q20 48, 28 60"
            fill="none"
            stroke="rgba(255,250,245,0.4)"
            strokeWidth="0.7"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

function PaperGrain() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.18] mix-blend-multiply"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
      }}
      aria-hidden
    />
  );
}

/**
 * Asymmetrical 3D embroidery: peach rose, pearl-center blooms,
 * satin-stitched leaves, pearl sprigs, teardrop buds.
 */
function EmbroideryCluster() {
  const uid = useId().replace(/:/g, "");
  const roseGrad = `roseGrad-${uid}`;
  const petalGrad = `petalGrad-${uid}`;
  const pearlGrad = `pearlGrad-${uid}`;
  const leafFill = `leafFill-${uid}`;
  const budGrad = `budGrad-${uid}`;
  const softEmboss = `softEmboss-${uid}`;

  return (
    <svg
      viewBox="0 0 320 240"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id={roseGrad} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f6d0bc" />
          <stop offset="45%" stopColor="#e8b49a" />
          <stop offset="100%" stopColor="#c98a72" />
        </radialGradient>
        <radialGradient id={petalGrad} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f4cbb8" />
          <stop offset="100%" stopColor="#d9a08a" />
        </radialGradient>
        <radialGradient id={pearlGrad} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f4efe8" />
          <stop offset="100%" stopColor="#d8cfc4" />
        </radialGradient>
        <linearGradient id={leafFill} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7f2ea" />
          <stop offset="100%" stopColor="#e4d9cc" />
        </linearGradient>
        <linearGradient id={budGrad} x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#f0c4b0" />
          <stop offset="100%" stopColor="#d49882" />
        </linearGradient>
        <filter id={softEmboss} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0.5" dy="1.2" stdDeviation="1.1" floodColor="#8a6048" floodOpacity="0.28" />
        </filter>
      </defs>

      <g
        fill="none"
        stroke="#e8dfd4"
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity="0.95"
      >
        <path d="M168 178 C150 150, 118 120, 92 78" />
        <path d="M155 170 C130 140, 95 115, 70 95" />
        <path d="M175 165 C188 130, 210 95, 235 68" />
        <path d="M160 160 C145 125, 155 95, 148 58" />
        <path d="M145 175 C110 155, 78 148, 48 142" />
        <path d="M170 155 C195 145, 230 140, 268 128" />
      </g>

      <g filter={`url(#${softEmboss})`}>
        <SatinLeaf x={55} y={95} rot={-35} scale={1.05} fillId={leafFill} />
        <SatinLeaf x={95} y={128} rot={-55} scale={0.85} fillId={leafFill} />
        <SatinLeaf x={200} y={88} rot={28} scale={0.95} fillId={leafFill} />
        <SatinLeaf x={230} y={118} rot={48} scale={0.72} fillId={leafFill} />
        <SatinLeaf x={120} y={72} rot={-12} scale={0.68} fillId={leafFill} />
        <SatinLeaf x={40} y={130} rot={-70} scale={0.62} fillId={leafFill} />
      </g>

      <PearlSprig cx={88} cy={70} pearls={[0, 1, 2, 3]} angle={-40} pearlId={pearlGrad} />
      <PearlSprig cx={148} cy={52} pearls={[0, 1, 2]} angle={-8} pearlId={pearlGrad} />
      <PearlSprig cx={238} cy={62} pearls={[0, 1, 2, 3]} angle={25} pearlId={pearlGrad} />
      <PearlSprig cx={48} cy={138} pearls={[0, 1]} angle={-85} pearlId={pearlGrad} />
      <PearlSprig cx={265} cy={125} pearls={[0, 1, 2]} angle={15} pearlId={pearlGrad} />

      <Bud x={72} y={88} rot={-30} fillId={budGrad} embossId={softEmboss} />
      <Bud x={218} y={78} rot={22} fillId={budGrad} embossId={softEmboss} />
      <Bud x={132} y={55} rot={-5} fillId={budGrad} embossId={softEmboss} />
      <Bud x={255} y={110} rot={40} fillId={budGrad} embossId={softEmboss} />

      <PearlFlower
        cx={118}
        cy={118}
        r={22}
        petalId={petalGrad}
        pearlId={pearlGrad}
        embossId={softEmboss}
      />

      <g filter={`url(#${softEmboss})`} transform="translate(168 148)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <ellipse
            key={deg}
            cx={Math.cos((deg * Math.PI) / 180) * 14}
            cy={Math.sin((deg * Math.PI) / 180) * 12}
            rx={16 - i * 0.3}
            ry={11}
            fill={`url(#${roseGrad})`}
            stroke="#c48a72"
            strokeWidth="0.45"
            opacity={0.92}
            transform={`rotate(${deg})`}
          />
        ))}
        {[20, 80, 140, 200, 260, 320].map((deg) => (
          <ellipse
            key={`m${deg}`}
            cx={Math.cos((deg * Math.PI) / 180) * 7}
            cy={Math.sin((deg * Math.PI) / 180) * 6}
            rx={11}
            ry={8}
            fill="#e8b49a"
            stroke="#d49882"
            strokeWidth="0.4"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle cx={0} cy={0} r={9} fill="#f0c4b0" stroke="#c98a72" strokeWidth="0.5" />
        <path
          d="M0 -5.5 A5.5 5.5 0 1 1 -4 3.5"
          fill="none"
          stroke="#c48a72"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx={1} cy={-1} r={3.2} fill="#f6d5c2" />
        <circle cx={-0.5} cy={0.5} r={1.4} fill="#d49882" opacity="0.7" />
      </g>

      <PearlFlower
        cx={205}
        cy={155}
        r={14}
        petalId={petalGrad}
        pearlId={pearlGrad}
        embossId={softEmboss}
      />
    </svg>
  );
}

function SatinLeaf({
  x,
  y,
  rot,
  scale = 1,
  fillId,
}: {
  x: number;
  y: number;
  rot: number;
  scale?: number;
  fillId: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <path
        d="M0 0 C6 -14, 18 -22, 28 -8 C18 4, 8 10, 0 0 Z"
        fill={`url(#${fillId})`}
        stroke="#ddd2c4"
        strokeWidth="0.7"
      />
      {[4, 8, 12, 16, 20, 24].map((t) => (
        <line
          key={t}
          x1={t * 0.85}
          y1={-t * 0.35 - 2}
          x2={t * 0.95 + 2}
          y2={-t * 0.15 + 3}
          stroke="#faf6f0"
          strokeWidth="1.15"
          strokeLinecap="round"
          opacity="0.85"
        />
      ))}
      <path
        d="M2 -1 C10 -10, 18 -12, 26 -6"
        fill="none"
        stroke="#cfc3b4"
        strokeWidth="0.55"
      />
    </g>
  );
}

function PearlFlower({
  cx,
  cy,
  r,
  petalId,
  pearlId,
  embossId,
}: {
  cx: number;
  cy: number;
  r: number;
  petalId: string;
  pearlId: string;
  embossId: string;
}) {
  const petals = 5;
  return (
    <g filter={`url(#${embossId})`} transform={`translate(${cx} ${cy})`}>
      {Array.from({ length: petals }).map((_, i) => {
        const deg = (i * 360) / petals - 90;
        const px = Math.cos((deg * Math.PI) / 180) * (r * 0.55);
        const py = Math.sin((deg * Math.PI) / 180) * (r * 0.55);
        return (
          <ellipse
            key={i}
            cx={px}
            cy={py}
            rx={r * 0.48}
            ry={r * 0.32}
            fill={`url(#${petalId})`}
            stroke="#c98a72"
            strokeWidth="0.4"
            transform={`rotate(${deg} ${px} ${py})`}
          />
        );
      })}
      <circle
        cx={0}
        cy={0}
        r={r * 0.22}
        fill={`url(#${pearlId})`}
        stroke="#d8cfc4"
        strokeWidth="0.4"
      />
      <circle cx={-r * 0.05} cy={-r * 0.06} r={r * 0.08} fill="#fff" opacity="0.85" />
    </g>
  );
}

function PearlSprig({
  cx,
  cy,
  pearls,
  angle,
  pearlId,
}: {
  cx: number;
  cy: number;
  pearls: number[];
  angle: number;
  pearlId: string;
}) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${angle})`}>
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-28 - pearls.length * 4}
        stroke="#e8dfd4"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {pearls.map((i) => {
        const y = -10 - i * 9;
        const size = 3.2 - i * 0.25;
        return (
          <g key={i}>
            <circle
              cx={0}
              cy={y}
              r={size}
              fill={`url(#${pearlId})`}
              stroke="#d4cbc0"
              strokeWidth="0.35"
            />
            <circle cx={-0.7} cy={y - 0.8} r={size * 0.35} fill="#fff" opacity="0.75" />
          </g>
        );
      })}
    </g>
  );
}

function Bud({
  x,
  y,
  rot,
  fillId,
  embossId,
}: {
  x: number;
  y: number;
  rot: number;
  fillId: string;
  embossId: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} filter={`url(#${embossId})`}>
      <ellipse
        cx={0}
        cy={0}
        rx={5.5}
        ry={8}
        fill={`url(#${fillId})`}
        stroke="#c98a72"
        strokeWidth="0.4"
      />
      <path
        d="M0 -7 C2 -2, 2 3, 0 7"
        fill="none"
        stroke="#f4cbb8"
        strokeWidth="1"
        opacity="0.7"
      />
    </g>
  );
}
