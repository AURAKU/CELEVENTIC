"use client";
// flap+seal: seal is a child of the flap transform (cohesive lift, no float-away)
// rect-fill: classic landscape envelope + embroidery cover-fill

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import type { EnvelopeVisualTheme } from "@/lib/experience/opening-experiences";
import { TRADITIONAL_MARRIAGE_ENVELOPE_ART_URL } from "@/lib/invitation/vision-board";
import { invitationFontVars } from "@/lib/invitation-fonts";
import {
  DEFAULT_RESOLVED_SEAL_STYLE,
  getSealDesignPreset,
  sealInkStyle,
  SEAL_FONT_STACKS,
  SEAL_FONT_WEIGHTS,
  SEAL_SIZE_SCALE,
  type ResolvedSealStyle,
} from "@/lib/invitation/seal-design";

interface EmbroideredEnvelopeFaceProps {
  theme: EnvelopeVisualTheme;
  sealLabel: string;
  eventTitle: string;
  isOpening: boolean;
  reduceMotion: boolean;
  durationMs: number;
  /** Kept for call-site compatibility; photoreal open no longer floats the seal alone. */
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

/** Natural V-flap tip — interactive seal anchors exactly here. */
const PHOTO_FLAP_PCT = 54.5;
/**
 * Premium stamp fills the cream disc / plate under the V-tip.
 * Sized to fully cover leftover faint circle — peach seal only, no halo peek.
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

/** Desktop vs mobile envelope aspect — fills screen without grey letterboxing. */
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
 * - Primary: photoreal IMG_8701 fills body + V-flap (object-cover), peach seal on flap tip.
 * - Open: flap + seal rotate as one (seal never floats away alone).
 * - Fallback: CSS/SVG composition if the face art fails to load.
 */
export function EmbroideredEnvelopeFace({
  theme,
  sealLabel,
  eventTitle,
  isOpening,
  reduceMotion,
  durationMs,
  sealDurationMs: _sealDurationMs,
  flapDelayMs,
  openEase,
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

  /** Maximize envelope in viewport — landscape box constrained by width AND height. */
  const envelopeWidth = fitContainer
    ? "100%"
    : `min(99.2vw, calc((100dvh - 0.28rem) * ${envelopeAspect}), 56rem)`;

  return (
    <div
      className={`absolute inset-0 z-10 flex items-center justify-center ${invitationFontVars}`}
      style={{
        background: stageBg,
        /* Hold the envelope on-stage while the flap opens; fade only after the lift reads. */
        opacity: isOpening ? 0 : 1,
        transform: isOpening
          ? reduceMotion
            ? "translateY(-4%) scale(1.01)"
            : "translateY(-6%) scale(1.03)"
          : "translateY(0) scale(1)",
        transition: reduceMotion
          ? `opacity ${durationMs}ms ${openEase}, transform ${durationMs}ms ${openEase}`
          : `opacity ${Math.round(durationMs * 0.28)}ms ${openEase} ${Math.round(
              durationMs * 0.68
            )}ms, transform ${Math.round(durationMs * 0.55)}ms ${openEase} ${Math.round(
              durationMs * 0.38
            )}ms`,
        pointerEvents: "none",
        padding: fitContainer
          ? "0"
          : "max(0.12rem, env(safe-area-inset-top, 0px)) max(0.18rem, env(safe-area-inset-right, 0px)) max(0.12rem, env(safe-area-inset-bottom, 0px)) max(0.18rem, env(safe-area-inset-left, 0px))",
        /* Perspective lives here so rotateX on the flap+seal unit is never flattened. */
        perspective: reduceMotion ? undefined : "1600px",
        perspectiveOrigin: "50% 0%",
      }}
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

      <div
        className={`relative z-10 ${
          reduceMotion || isOpening ? "" : "inv-envelope-breathe"
        }`}
        style={{
          /* Classic landscape invitation envelope — fills screen, adapts mobile/desktop. */
          width: envelopeWidth,
          aspectRatio: `${envelopeAspect} / 1`,
          maxHeight: fitContainer ? "100%" : "calc(100dvh - 0.28rem)",
          height: "auto",
          transformStyle: "preserve-3d",
          borderRadius: "0.12rem",
          boxShadow:
            "0 24px 70px rgba(80, 50, 30, 0.22), 0 0 0 1px rgba(196, 154, 120, 0.34)",
          /* Flap+seal may swing past the face; keep clipped while sealed. */
          overflow: isOpening ? "visible" : "hidden",
          background: "#efe6dc",
        }}
        role="img"
        aria-label={`Sealed embroidered invitation envelope for ${eventTitle}`}
      >
        {/* Envelope body — cream underlay, photo fills shape when ready */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            filter: isOpening ? "brightness(1.08)" : undefined,
            transition: `filter ${durationMs}ms ${openEase}`,
            background: PAPER,
          }}
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

        {/* Flap + seal assembly — ONE rotateX; seal is a child so it never floats alone */}
        <div
          className="absolute inset-x-0 top-0 z-20"
          style={{
            height: `${flapHeightPct}%`,
            transformOrigin: "50% 0%",
            transform: isOpening
              ? reduceMotion
                ? "translateY(-105%)"
                /* Stay under 90° so the embroidered face stays visible while lifting. */
                : "translateY(-1%) rotateX(-82deg)"
              : "translateY(0) rotateX(0deg)",
            transition: `transform ${durationMs}ms ${openEase} ${flapDelayMs}ms`,
            transformStyle: "preserve-3d",
            /* Seal protrudes past the V-tip; never clip the assembly. */
            overflow: "visible",
            willChange: isOpening ? "transform" : undefined,
          }}
          aria-hidden
        >
          {/* Cream underside — reads as paper when the flap lifts toward camera */}
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

          {/* V-flap face only (clipped triangle) — NO backface hide (that made the flap vanish past ~90°) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              boxShadow: isOpening ? "none" : "0 18px 40px rgba(80,50,30,0.16)",
              filter: isOpening ? "brightness(1.1)" : undefined,
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

            {!reduceMotion && !isOpening && (
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

          {/*
            Peach wax stamp — child of flap transform (same rotateX).
            Anchored on the V-tip; covers cream plate; never floats away alone.
          */}
          <div
            className="absolute left-1/2 z-30"
            style={{
              top: "100%",
              width: sealWidth,
              height: "auto",
              aspectRatio: "1",
              minWidth: fitContainer ? "4.25rem" : "9.25rem",
              minHeight: fitContainer ? "4.25rem" : "9.25rem",
              maxWidth: fitContainer ? "7.75rem" : "17rem",
              /* Centered on tip; parent flap owns ALL open motion — no seal-only transform. */
              transform: "translate3d(-50%, -50%, 1.5px)",
            }}
          >
            <PremiumWaxSeal
              sealLabel={sealLabel}
              isOpening={isOpening}
              reduceMotion={reduceMotion}
              compact={fitContainer}
              sealStyle={sealStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Zoom+pan cover-fill — embroidery covers rectangle; art seal under interactive stamp. */
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
    // Local public template — body + flap share identical pan/zoom
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
        /* Premium color grade — richer peach embroidery, sharper presence */
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

/**
 * Seal lettering:
 * - 1–3 letter monograms (incl. `C | J`) → Cinzel capitals
 * - Custom words/phrases → Great Vibes at true 400 weight (no faux-bold)
 */
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
  fontOverride?: Exclude<import("@/lib/invitation/seal-design").SealFontChoice, "auto"> | null
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

  function computeBaseSealTypography(): {
    fontSize: string;
    lineHeight: number;
    letterSpacing: string;
    maxWidth: string;
    fontFamily: string;
    fontWeight: number;
    isMonogram: boolean;
  } {
  if (monogram) {
    // Pipe-spaced 2-letter needs slightly tighter tracking so it fits the well
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
 * Luxury pearlescent peach wax — circular poured stamp cloned from IMG_8701:
 * soft peach face, raised rim, pearl bead ring, gloss — never bronze, never halo.
 * Rides the flap tip as a child transform (never floats away alone).
 * Host/admin seal text renders dynamically.
 */
function PremiumWaxSeal({
  sealLabel,
  isOpening,
  reduceMotion,
  compact = false,
  sealStyle,
}: {
  sealLabel: string;
  isOpening: boolean;
  reduceMotion: boolean;
  compact?: boolean;
  sealStyle?: ResolvedSealStyle;
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

  // Monograms (incl. C | J) stay single-line; multi-word phrases stack.
  const displayText =
    type.isMonogram
      ? sealLabel.trim()
      : /\s/.test(sealLabel.trim())
        ? sealLabel.trim().split(/\s+/).join("\n")
        : sealLabel;

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center ${
        reduceMotion || isOpening ? "" : "inv-seal-pulse-peach"
      }`}
      style={{
        filter: reduceMotion || isOpening
          ? "drop-shadow(0 12px 18px rgba(120, 70, 50, 0.38))"
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
          {/* Deep poured base — preset-driven material color */}
          <radialGradient id={waxDeep} cx="48%" cy="55%" r="62%">
            {preset.deep.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </radialGradient>
          {/* Luminous face — preset-driven material color */}
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
            <stop offset="0%" stopColor={preset.dark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.35)"} />
            <stop offset="50%" stopColor={preset.dark ? "rgba(255,255,255,0.08)" : "rgba(255,230,210,0.12)"} />
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

        {/* Soft contact shadow — tight, no white halo */}
        <ellipse cx="51.5" cy="54" rx="41" ry="39" fill="rgba(120,70,50,0.2)" opacity="0.55" />

        {/* Deep poured base */}
        <circle cx="50" cy="50" r="46.5" fill={`url(#${waxDeep})`} filter={`url(#${softShadow})`} />

        {/* Raised rim */}
        <circle cx="50" cy="50" r="43.2" fill={`url(#${waxRim})`} />
        <circle
          cx="50"
          cy="50"
          r="43.2"
          fill="none"
          stroke="rgba(255,248,240,0.55)"
          strokeWidth="1.1"
        />

        {/* Main pearlescent face */}
        <circle cx="50" cy="50" r="37.4" fill={`url(#${waxFace})`} />
        <circle cx="50" cy="50" r="37.4" fill={`url(#${pearlSheen})`} />
        <circle
          cx="50"
          cy="50"
          r="37.4"
          fill="none"
          stroke="rgba(255,248,240,0.4)"
          strokeWidth="0.7"
        />

        {/* Recessed stamp well */}
        <circle cx="50" cy="50" r="28.5" fill={`url(#${waxWell})`} opacity="0.42" />
        <circle
          cx="50"
          cy="50"
          r="28.5"
          fill="none"
          stroke="rgba(140,80,60,0.22)"
          strokeWidth="1"
        />
        <circle
          cx="50"
          cy="50"
          r="28.5"
          fill="none"
          stroke="rgba(255,245,235,0.28)"
          strokeWidth="0.65"
          transform="translate(0.35 0.4)"
        />

        {/* Pearl bead ring on the raised rim */}
        {beads.map((b) => (
          <g key={b.key}>
            <circle cx={b.cx} cy={b.cy} r={b.r} fill={`url(#${beadGrad})`} />
            <circle
              cx={b.cx - 0.35}
              cy={b.cy - 0.4}
              r={b.r * 0.4}
              fill="rgba(255,255,255,0.85)"
            />
          </g>
        ))}

        {/* Gloss highlight — wet pearlescent catch-light */}
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

      {!reduceMotion && !isOpening && (
        <span
          className="absolute left-[18%] top-[14%] h-2.5 w-3.5 rounded-full bg-[#fff8f0]/8 blur-[1px]"
          style={{ animation: "inv-envelope-glint 2.8s ease-in-out infinite" }}
          aria-hidden
        />
      )}
    </div>
  );
}
