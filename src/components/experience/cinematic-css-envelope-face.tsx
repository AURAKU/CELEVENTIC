"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { EnvelopeVisualTheme } from "@/lib/experience/opening-experiences";
import { PremiumWaxSeal, MEMORIAL_PORTRAIT_WAX_SEAL_SRC } from "@/components/experience/premium-wax-seal";
import { invitationFontVars } from "@/lib/invitation-fonts";
import { DEFAULT_RESOLVED_SEAL_STYLE, type ResolvedSealStyle } from "@/lib/invitation/seal-design";

const EASE_SILK = [0.22, 1, 0.36, 1] as const;
const EASE_GATE = [0.16, 1, 0.3, 1] as const;

const ENVELOPE_ASPECT_MOBILE = 1.18;
const ENVELOPE_ASPECT_DESKTOP = 1.28;
const FLAP_PCT = 52;
const SEAL_WIDTH = "38%";

const DEFAULT_STAGE =
  "linear-gradient(180deg, #0a0a0a 0%, #141210 42%, #1a1612 72%, #0c0b09 100%)";
const DEFAULT_FRAME = "rgba(224, 184, 74, 0.72)";
const DEFAULT_OUTER = "rgba(201, 162, 39, 0.42)";

function subscribeMq(mq: MediaQueryList, onChange: () => void) {
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useEnvelopeAspect(fitContainer: boolean): number {
  const isDesktop = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => undefined;
      const mq = window.matchMedia("(min-width: 768px)");
      return subscribeMq(mq, onStoreChange);
    },
    () =>
      typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true,
    () => true
  );
  if (fitContainer) return ENVELOPE_ASPECT_DESKTOP;
  return isDesktop ? ENVELOPE_ASPECT_DESKTOP : ENVELOPE_ASPECT_MOBILE;
}

function PaperGrain({ intensity = 0.22 }: { intensity?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none mix-blend-multiply"
      style={{
        opacity: intensity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.65'/%3E%3C/svg%3E\")",
      }}
      aria-hidden
    />
  );
}

function PaperFibers({ dark }: { dark?: boolean }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity: dark ? 0.14 : 0.1,
        backgroundImage: dark
          ? "repeating-linear-gradient(92deg, transparent 0 7px, rgba(224,184,74,0.06) 7px 8px), repeating-linear-gradient(0deg, transparent 0 11px, rgba(0,0,0,0.08) 11px 12px)"
          : "repeating-linear-gradient(92deg, transparent 0 7px, rgba(90,70,50,0.05) 7px 8px), repeating-linear-gradient(0deg, transparent 0 11px, rgba(40,30,20,0.04) 11px 12px)",
        mixBlendMode: dark ? "soft-light" : "multiply",
      }}
      aria-hidden
    />
  );
}

export interface CinematicCssEnvelopeFaceProps {
  theme: EnvelopeVisualTheme;
  sealLabel: string;
  eventTitle: string;
  isUnsealing?: boolean;
  isOpening: boolean;
  reduceMotion: boolean;
  durationMs: number;
  sealDurationMs: number;
  sealStyle?: ResolvedSealStyle;
  fitContainer?: boolean;
  /** Memorial: seal flies clear of the frame with the dove unseal. */
  ceremonialFlyaway?: boolean;
}

/**
 * Cinematic CSS envelope — 3D V-flap, poured wax seal, staged unseal + unfold.
 * Used for themed envelopes (memorial, royal, kente, classic) that are not photoreal.
 */
export function CinematicCssEnvelopeFace({
  theme,
  sealLabel,
  eventTitle,
  isUnsealing = false,
  isOpening,
  reduceMotion,
  durationMs,
  sealDurationMs,
  sealStyle,
  fitContainer = false,
  ceremonialFlyaway = false,
}: CinematicCssEnvelopeFaceProps) {
  const envelopeAspect = useEnvelopeAspect(fitContainer);
  const lifting = isUnsealing || isOpening;
  const sealLiftSec = Math.max(0.45, sealDurationMs / 1000);
  const flapOpenSec = reduceMotion
    ? 0.35
    : Math.max(1.15, ((durationMs - sealDurationMs) / 1000) * 0.78);

  const stageBg = theme.stageBg ?? theme.bodyBg ?? DEFAULT_STAGE;
  const frameColor = theme.frameColor ?? (theme.royal ? DEFAULT_FRAME : theme.accent);
  const outerEdge = theme.outerEdgeColor ?? theme.borderColor ?? DEFAULT_OUTER;
  const memorialStage = Boolean(ceremonialFlyaway);

  const envelopeWidth = fitContainer
    ? "100%"
    : `min(96vw, calc((100dvh - 2.8rem) * ${envelopeAspect}), 52rem)`;

  const shellFadeDelay = isOpening ? Math.round(flapOpenSec * 1000 * 0.52) : 0;
  const shellFadeMs = isOpening ? Math.round(flapOpenSec * 1000 * 0.48) : Math.round(durationMs * 0.2);

  return (
    <motion.div
      className={`absolute inset-0 z-10 flex items-center justify-center ${invitationFontVars}`}
      style={{
        background: stageBg,
        pointerEvents: "none",
        padding: fitContainer
          ? "0"
          : "max(0.5rem, env(safe-area-inset-top, 0px)) max(0.55rem, env(safe-area-inset-right, 0px)) max(0.5rem, env(safe-area-inset-bottom, 0px)) max(0.55rem, env(safe-area-inset-left, 0px))",
        perspective: reduceMotion ? undefined : "1800px",
        perspectiveOrigin: "50% 12%",
      }}
      initial={false}
      animate={
        isOpening
          ? {
              opacity: 0,
              y: reduceMotion ? "-4%" : "-9%",
              scale: reduceMotion ? 1.01 : 1.06,
            }
          : isUnsealing
            ? { opacity: 1, y: 0, scale: 1.02 }
            : { opacity: 1, y: 0, scale: 1 }
      }
      transition={
        isOpening
          ? {
              opacity: { duration: shellFadeMs / 1000, delay: shellFadeDelay / 1000, ease: EASE_SILK },
              y: { duration: flapOpenSec, ease: EASE_SILK },
              scale: { duration: flapOpenSec, ease: EASE_SILK },
            }
          : { duration: 0.85, ease: EASE_SILK }
      }
    >
      {/* Stage atmosphere — spotlight on the envelope */}
      <div
        className="absolute inset-0"
        style={{
          background: memorialStage
            ? "radial-gradient(ellipse 72% 58% at 50% 34%, rgba(224,184,74,0.12), transparent 62%), radial-gradient(ellipse 90% 55% at 50% 100%, rgba(0,0,0,0.55), transparent 58%), radial-gradient(ellipse 55% 40% at 50% 28%, rgba(255,248,230,0.06), transparent 55%)"
            : "radial-gradient(ellipse 72% 58% at 50% 34%, rgba(255,248,240,0.1), transparent 62%), radial-gradient(ellipse 90% 55% at 50% 100%, rgba(0,0,0,0.35), transparent 58%), radial-gradient(ellipse 55% 40% at 50% 28%, rgba(212,166,58,0.12), transparent 55%)",
        }}
        aria-hidden
      />

      {/* Gold outer edge + inner frame */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: fitContainer
            ? "2%"
            : "max(0.35rem, env(safe-area-inset-top, 0px)) max(0.4rem, env(safe-area-inset-right, 0px)) max(0.35rem, env(safe-area-inset-bottom, 0px)) max(0.4rem, env(safe-area-inset-left, 0px))",
          border: `1px solid ${outerEdge}`,
          borderRadius: "3px",
        }}
        aria-hidden
      />
      <div
        className="absolute pointer-events-none"
        style={{
          inset: fitContainer
            ? "4%"
            : "max(0.85rem, env(safe-area-inset-top, 0px)) max(0.9rem, env(safe-area-inset-right, 0px)) max(0.85rem, env(safe-area-inset-bottom, 0px)) max(0.9rem, env(safe-area-inset-left, 0px))",
          border: `1.5px solid ${frameColor}`,
          boxShadow: memorialStage
            ? `inset 0 0 0 1px rgba(224,184,74,0.14), 0 0 28px rgba(224,184,74,0.12)`
            : `inset 0 0 0 1px rgba(224,184,74,0.1), 0 0 24px rgba(212,166,58,0.08)`,
          borderRadius: "4px",
        }}
        aria-hidden
      />

      {/* Soft light burst when the seal breaks */}
      <AnimatePresence>
        {isUnsealing && !isOpening && !reduceMotion && (
          <motion.div
            className="pointer-events-none absolute left-1/2 z-[5] rounded-full"
            style={{
              top: `${FLAP_PCT}%`,
              width: "min(42vw, 14rem)",
              height: "min(42vw, 14rem)",
              x: "-50%",
              y: "-50%",
              background:
                "radial-gradient(circle, rgba(255,248,235,0.55) 0%, rgba(212,166,58,0.22) 38%, transparent 72%)",
            }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.85, 0.35], scale: [0.6, 1.35, 1.6] }}
            exit={{ opacity: 0, scale: 1.8 }}
            transition={{ duration: sealLiftSec, ease: EASE_SILK }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <motion.div
        className={`relative z-10 ${reduceMotion || lifting ? "" : "inv-envelope-breathe"}`}
        style={{
          width: envelopeWidth,
          aspectRatio: `${envelopeAspect} / 1`,
          maxHeight: fitContainer ? "100%" : "calc(100dvh - 2.8rem)",
          transformStyle: "preserve-3d",
          borderRadius: "0.15rem",
          boxShadow: memorialStage
            ? "0 32px 90px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(224,184,74,0.18), inset 0 1px 0 rgba(255,245,220,0.06)"
            : "0 28px 80px rgba(0,0,0,0.42), 0 10px 28px rgba(0,0,0,0.22), 0 0 0 1px rgba(40,30,20,0.12), inset 0 1px 0 rgba(255,255,255,0.22)",
          overflow: lifting ? "visible" : "hidden",
        }}
        animate={
          isOpening
            ? { filter: "brightness(1.12)" }
            : isUnsealing
              ? { filter: "brightness(1.06)" }
              : { filter: "brightness(1)" }
        }
        transition={{ duration: 1.1, ease: EASE_SILK }}
        role="img"
        aria-label={`Sealed invitation envelope for ${eventTitle}`}
      >
        {/* Envelope body */}
        <div
          className="absolute inset-0 overflow-hidden rounded-[0.15rem]"
          style={{ background: theme.bodyBg }}
        >
          <PaperGrain intensity={memorialStage ? 0.28 : 0.2} />
          <PaperFibers dark={memorialStage} />
          <div
            className="absolute inset-0"
            style={{
              opacity: memorialStage ? 0.45 : 0.32,
              backgroundImage: memorialStage
                ? "radial-gradient(ellipse 80% 50% at 50% 12%, rgba(224,184,74,0.1), transparent 55%), linear-gradient(165deg, transparent 28%, rgba(0,0,0,0.45) 100%), linear-gradient(90deg, rgba(0,0,0,0.18) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.18) 100%)"
                : "radial-gradient(ellipse 85% 55% at 50% 18%, rgba(255,255,255,0.22), transparent 55%), linear-gradient(165deg, transparent 30%, rgba(0,0,0,0.18) 100%), linear-gradient(90deg, rgba(60,45,30,0.08) 0%, transparent 16%, transparent 84%, rgba(60,45,30,0.08) 100%)",
            }}
            aria-hidden
          />

          {/* Left / right side pockets — deeper fold AO */}
          <div
            className="absolute inset-y-[12%] left-0 w-[18%]"
            style={{
              background: memorialStage
                ? "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)"
                : "linear-gradient(90deg, rgba(40,30,20,0.28) 0%, rgba(40,30,20,0.1) 55%, transparent 100%)",
              clipPath: "polygon(0 0, 100% 14%, 100% 86%, 0 100%)",
              boxShadow: "inset 4px 0 12px rgba(0,0,0,0.12)",
            }}
            aria-hidden
          />
          <div
            className="absolute inset-y-[12%] right-0 w-[18%]"
            style={{
              background: memorialStage
                ? "linear-gradient(270deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)"
                : "linear-gradient(270deg, rgba(40,30,20,0.28) 0%, rgba(40,30,20,0.1) 55%, transparent 100%)",
              clipPath: "polygon(0 14%, 100% 0, 100% 100%, 0 86%)",
              boxShadow: "inset -4px 0 12px rgba(0,0,0,0.12)",
            }}
            aria-hidden
          />

          {/* Diagonal crease lines where flaps meet */}
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <line
              x1="0"
              y1="0"
              x2="50"
              y2={FLAP_PCT}
              stroke={memorialStage ? "rgba(0,0,0,0.35)" : "rgba(60,45,30,0.18)"}
              strokeWidth="0.35"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="100"
              y1="0"
              x2="50"
              y2={FLAP_PCT}
              stroke={memorialStage ? "rgba(0,0,0,0.35)" : "rgba(60,45,30,0.18)"}
              strokeWidth="0.35"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="0"
              y1="100"
              x2="50"
              y2={FLAP_PCT}
              stroke={memorialStage ? "rgba(0,0,0,0.28)" : "rgba(60,45,30,0.14)"}
              strokeWidth="0.3"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="100"
              y1="100"
              x2="50"
              y2={FLAP_PCT}
              stroke={memorialStage ? "rgba(0,0,0,0.28)" : "rgba(60,45,30,0.14)"}
              strokeWidth="0.3"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="0"
              y1="0"
              x2="50"
              y2={FLAP_PCT}
              stroke={memorialStage ? "rgba(224,184,74,0.12)" : "rgba(255,252,248,0.35)"}
              strokeWidth="0.2"
              vectorEffect="non-scaling-stroke"
              transform="translate(0.4 0.4)"
            />
            <line
              x1="100"
              y1="0"
              x2="50"
              y2={FLAP_PCT}
              stroke={memorialStage ? "rgba(224,184,74,0.12)" : "rgba(255,252,248,0.35)"}
              strokeWidth="0.2"
              vectorEffect="non-scaling-stroke"
              transform="translate(-0.4 0.4)"
            />
          </svg>

          {/* Bottom flap — richer fold depth */}
          <div
            className="absolute inset-x-0 bottom-0 h-[40%]"
            style={{
              background: theme.flapGradient,
              clipPath: "polygon(0 100%, 50% 26%, 100% 100%)",
              filter: "brightness(0.9)",
              boxShadow: memorialStage
                ? "inset 0 18px 28px rgba(0,0,0,0.35)"
                : "inset 0 14px 22px rgba(40,30,20,0.12)",
            }}
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none"
            style={{
              clipPath: "polygon(0 100%, 50% 26%, 100% 100%)",
              background: memorialStage
                ? "linear-gradient(180deg, rgba(224,184,74,0.08) 0%, transparent 40%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 42%)",
            }}
            aria-hidden
          />

          {/* Paper edge bevel */}
          <div
            className="absolute inset-0 pointer-events-none rounded-[0.15rem]"
            style={{
              boxShadow: memorialStage
                ? "inset 0 0 0 1px rgba(224,184,74,0.22), inset 0 0 0 2px rgba(0,0,0,0.25)"
                : "inset 0 0 0 1px rgba(255,255,255,0.45), inset 0 0 0 2px rgba(40,30,20,0.08)",
            }}
            aria-hidden
          />

          {theme.kente && (
            <div className="absolute top-0 left-0 right-0 h-2.5 flex z-[1]">
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-full"
                  style={{
                    background: i % 3 === 0 ? "#D4A63A" : i % 3 === 1 ? "#1a5c4a" : "#c0392b",
                  }}
                />
              ))}
            </div>
          )}

          {theme.floral && (
            <div className="absolute inset-0 pointer-events-none opacity-35 z-[1]">
              {["top-[5%] left-[4%]", "top-[7%] right-[5%]", "bottom-[7%] left-[5%]", "bottom-[5%] right-[4%]"].map(
                (pos, i) => (
                  <span
                    key={i}
                    className={`absolute ${pos} text-2xl text-pink-300`}
                    style={
                      reduceMotion
                        ? undefined
                        : { animation: `inv-envelope-glint 3.2s ease-in-out ${i * 0.4}s infinite` }
                    }
                  >
                    ✿
                  </span>
                )
              )}
            </div>
          )}
        </div>

        {/* Top V-flap — 3D peel then dramatic unfold */}
        <motion.div
          className="absolute inset-x-0 top-0 z-20 origin-top"
          style={{
            height: `${FLAP_PCT}%`,
            transformStyle: "preserve-3d",
            overflow: "visible",
            willChange: lifting ? "transform" : undefined,
            zIndex: isOpening ? 12 : 20,
          }}
          initial={{ rotateX: 0 }}
          animate={{
            rotateX: reduceMotion
              ? isOpening
                ? -32
                : 0
              : isOpening
                ? -158
                : isUnsealing
                  ? -24
                  : 0,
          }}
          transition={{
            duration: isOpening ? flapOpenSec : sealLiftSec,
            ease: EASE_GATE,
            delay: isOpening ? 0.06 : isUnsealing ? 0.28 : 0,
          }}
          aria-hidden
        >
          {/* Paper underside */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              background: memorialStage
                ? "linear-gradient(180deg, rgba(42,36,26,0.98) 0%, rgba(22,18,12,0.96) 100%)"
                : "linear-gradient(180deg, rgba(255,252,248,0.95) 0%, rgba(240,235,228,0.92) 100%)",
              transform: "rotateX(180deg)",
              backfaceVisibility: "hidden",
              boxShadow: memorialStage
                ? "inset 0 10px 28px rgba(0,0,0,0.35)"
                : "inset 0 10px 28px rgba(0,0,0,0.1)",
            }}
          />

          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              background: theme.flapGradient,
              boxShadow: lifting ? "none" : "0 20px 48px rgba(0,0,0,0.28)",
              filter: lifting ? "brightness(1.08)" : undefined,
              transform: "translateZ(0.5px)",
            }}
          >
            <PaperGrain intensity={memorialStage ? 0.26 : 0.18} />
            <PaperFibers dark={memorialStage} />
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background: memorialStage
                  ? "linear-gradient(135deg, rgba(224,184,74,0.14) 0%, transparent 42%, rgba(0,0,0,0.28) 100%)"
                  : "linear-gradient(135deg, rgba(255,245,220,0.45) 0%, transparent 42%, rgba(0,0,0,0.12) 100%)",
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              }}
            />
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
                strokeWidth="0.55"
                vectorEffect="non-scaling-stroke"
              />
              <polygon
                points="1.2,1 98.8,1 50,97.5"
                fill="none"
                stroke="rgba(255,252,248,0.45)"
                strokeWidth="0.4"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {!reduceMotion && !lifting && (
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 36%, rgba(255,252,248,0.55) 50%, transparent 64%)",
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                  animation: "inv-envelope-glint 3.8s ease-in-out infinite",
                }}
              />
            )}
          </div>
        </motion.div>

        {/* Wax imprint ring left on the paper as the seal lifts */}
        <AnimatePresence>
          {isUnsealing && !isOpening && !reduceMotion && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute left-1/2 z-[18] rounded-full"
              style={{
                top: `${FLAP_PCT}%`,
                width: SEAL_WIDTH,
                maxWidth: fitContainer ? "7.5rem" : "16rem",
                minWidth: fitContainer ? "4rem" : "8.5rem",
                aspectRatio: "1",
                x: "-50%",
                y: "-50%",
                border: "1px solid rgba(160, 120, 80, 0.32)",
                boxShadow: "inset 0 0 18px rgba(120, 80, 50, 0.16)",
                background:
                  "radial-gradient(circle, rgba(255,248,240,0.65) 0%, transparent 72%)",
              }}
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: [0, 0.8, 0.25], scale: [0.82, 1.04, 1.12] }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: sealLiftSec, ease: EASE_SILK }}
            />
          )}
        </AnimatePresence>

        {/* Poured wax seal — lifts clear, then soars away */}
        <motion.div
          className="absolute left-1/2 z-30 flex items-center justify-center"
          style={{
            top: `${FLAP_PCT}%`,
            width: ceremonialFlyaway ? "46%" : SEAL_WIDTH,
            aspectRatio: ceremonialFlyaway ? "0.92" : "1",
            minWidth: fitContainer ? "4rem" : ceremonialFlyaway ? "10rem" : "8.5rem",
            minHeight: fitContainer ? "4rem" : ceremonialFlyaway ? "10.5rem" : "8.5rem",
            maxWidth: fitContainer ? "7.5rem" : ceremonialFlyaway ? "18rem" : "16rem",
            x: "-50%",
            transformStyle: "preserve-3d",
            willChange: lifting ? "transform, opacity" : undefined,
          }}
          initial={{ y: "-50%", scale: 1, opacity: 1, rotateX: 0, rotateZ: 0 }}
          animate={
            reduceMotion
              ? isOpening
                ? { y: "-160%", scale: 0.88, opacity: 0, rotateX: 0, rotateZ: 0 }
                : { y: "-50%", scale: 1, opacity: 1, rotateX: 0, rotateZ: 0 }
              : isOpening
                ? {
                    y: ceremonialFlyaway ? "-560%" : "-360%",
                    x: ceremonialFlyaway ? "8%" : "-50%",
                    scale: ceremonialFlyaway ? 0.48 : 0.74,
                    opacity: 0,
                    rotateX: ceremonialFlyaway ? -78 : -58,
                    rotateZ: ceremonialFlyaway ? 22 : -12,
                    filter: "drop-shadow(0 32px 28px rgba(0,0,0,0.35))",
                  }
                : isUnsealing
                  ? {
                      y: ceremonialFlyaway ? "-220%" : "-185%",
                      x: ceremonialFlyaway ? "-42%" : "-50%",
                      scale: ceremonialFlyaway ? 1.1 : 1.08,
                      opacity: 1,
                      rotateX: ceremonialFlyaway ? -38 : -34,
                      rotateZ: ceremonialFlyaway ? 10 : -5,
                      filter: "drop-shadow(0 24px 22px rgba(0,0,0,0.38))",
                    }
                  : {
                      y: "-50%",
                      x: "-50%",
                      scale: 1,
                      opacity: 1,
                      rotateX: 0,
                      rotateZ: 0,
                      filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.32))",
                    }
          }
          transition={
            lifting
              ? {
                  duration: isOpening
                    ? Math.min(ceremonialFlyaway ? 1.65 : 1.25, flapOpenSec)
                    : sealLiftSec,
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
            photorealSrc={
              ceremonialFlyaway ? MEMORIAL_PORTRAIT_WAX_SEAL_SRC : null
            }
            pulseClass={
              (sealStyle ?? DEFAULT_RESOLVED_SEAL_STYLE).design === "classic-peach-pearl"
                ? "inv-seal-pulse-peach"
                : "inv-seal-glow"
            }
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
