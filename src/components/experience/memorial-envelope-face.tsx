"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { PremiumWaxSeal, MEMORIAL_PORTRAIT_WAX_SEAL_SRC } from "@/components/experience/premium-wax-seal";
import {
  MEMORIAL_ENVELOPE_ART,
  MEMORIAL_ENVELOPE_OPEN_ART,
  MEMORIAL_ENVELOPE_ASPECT,
  MEMORIAL_INVITATION_BG_SRC,
  MEMORIAL_SEAL_CX_PCT,
  MEMORIAL_SEAL_CY_PCT,
  MEMORIAL_SEAL_WIDTH_FRAC,
} from "@/components/experience/memorial-envelope-layout";
import { invitationFontVars } from "@/lib/invitation-fonts";

const EASE_SILK = [0.22, 1, 0.36, 1] as const;
/** Unhurried seal peel — slow motion, memorial pacing. */
const EASE_SEAL_LIFT = [0.33, 0.08, 0.18, 1] as const;
const EASE_SEAL_SOAR = [0.22, 0.7, 0.2, 1] as const;

/**
 * Photoreal memorial envelope — full art plate + interactive portrait wax seal.
 * Tap lifts the seal (doves handled by parent), then the envelope peels open
 * into the invitation underneath.
 */
export function MemorialEnvelopeFace({
  eventTitle,
  sealLabel,
  isUnsealing = false,
  isOpening,
  reduceMotion,
  durationMs,
  sealDurationMs,
  fitContainer = false,
}: {
  eventTitle: string;
  sealLabel: string;
  isUnsealing?: boolean;
  isOpening: boolean;
  reduceMotion: boolean;
  durationMs: number;
  sealDurationMs: number;
  fitContainer?: boolean;
}) {
  const lifting = isUnsealing || isOpening;
  const sealLiftSec = Math.max(0.45, sealDurationMs / 1000);
  const flapOpenSec = reduceMotion
    ? 0.35
    : Math.max(2.4, ((durationMs - sealDurationMs) / 1000) * 0.88);

  const envelopeWidth = fitContainer
    ? "100%"
    : // Height-first immersive fill: allow gentle side crop on tall phones.
      `min(118vw, calc((100dvh - 4rem) * ${MEMORIAL_ENVELOPE_ASPECT}))`;

  const shellFadeDelay = isOpening ? Math.round(flapOpenSec * 1000 * 0.28) : 0;
  const shellFadeMs = isOpening
    ? Math.round(flapOpenSec * 1000 * 0.78)
    : Math.round(durationMs * 0.18);

  /** Swap to seal-cleared art once the interactive seal starts lifting. */
  const artSrc = lifting ? MEMORIAL_ENVELOPE_OPEN_ART : MEMORIAL_ENVELOPE_ART;

  return (
    <motion.div
      className={`absolute inset-0 z-10 flex items-center justify-center overflow-hidden ${invitationFontVars}`}
      style={{
        backgroundColor: "#050505",
        backgroundImage: [
          "radial-gradient(ellipse 82% 62% at 50% 44%, rgba(26,22,18,0.55) 0%, rgba(10,9,8,0.72) 52%, rgba(5,5,5,0.88) 100%)",
          `url(${MEMORIAL_INVITATION_BG_SRC})`,
        ].join(", "),
        backgroundSize: "auto, cover",
        backgroundPosition: "center, center",
        backgroundRepeat: "no-repeat",
        pointerEvents: "none",
        padding: fitContainer
          ? "0"
          : "max(0.1rem, env(safe-area-inset-top, 0px)) 0 max(3.6rem, calc(env(safe-area-inset-bottom, 0px) + 3rem)) 0",
        perspective: reduceMotion ? undefined : "1600px",
        perspectiveOrigin: "50% 35%",
      }}
      initial={false}
      animate={
        isOpening
          ? {
              opacity: 0,
              y: reduceMotion ? "-2%" : "-5%",
              scale: reduceMotion ? 1.01 : 1.04,
            }
          : isUnsealing
            ? { opacity: 1, y: 0, scale: 1.015 }
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
          : { duration: 1.15, ease: EASE_SILK }
      }
    >
      <motion.div
        className={`relative ${reduceMotion || lifting ? "" : "inv-envelope-breathe"}`}
        style={{
          width: envelopeWidth,
          aspectRatio: `${MEMORIAL_ENVELOPE_ASPECT} / 1`,
          maxWidth: fitContainer ? "100%" : "118vw",
          maxHeight: fitContainer ? "100%" : "calc(100dvh - 4rem)",
          height: "auto",
          transformStyle: "preserve-3d",
          filter:
            "drop-shadow(0 28px 64px rgba(0,0,0,0.65)) drop-shadow(0 0 0 1px rgba(224,184,74,0.12))",
        }}
        role="img"
        aria-label={`Sealed invitation envelope for ${eventTitle}`}
        animate={
          isOpening
            ? {
                rotateX: reduceMotion ? -8 : -24,
                y: reduceMotion ? "-4%" : "-10%",
              }
            : isUnsealing
              ? { rotateX: -4, y: "-1.5%" }
              : { rotateX: 0, y: 0 }
        }
        transition={{
          duration: isOpening ? flapOpenSec : Math.max(1.8, sealLiftSec * 0.85),
          ease: EASE_SILK,
        }}
      >
        {/* Full photoreal envelope plate */}
        <div className="absolute inset-0 overflow-hidden rounded-[0.2rem]">
          <Image
            src={artSrc}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 100vw"
            className="object-contain select-none pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Soft glow behind the seal — invites the tap */}
        <AnimatePresence>
          {!lifting && !reduceMotion ? (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${MEMORIAL_SEAL_CX_PCT}%`,
                top: `${MEMORIAL_SEAL_CY_PCT}%`,
                width: `${MEMORIAL_SEAL_WIDTH_FRAC * 140}%`,
                aspectRatio: "1",
                transform: "translate(-50%, -50%)",
                background:
                  "radial-gradient(circle, rgba(224,184,74,0.28) 0%, rgba(224,184,74,0.08) 42%, transparent 70%)",
                filter: "blur(6px)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.45, 0.85, 0.45] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            />
          ) : null}
        </AnimatePresence>

        {/* Interactive portrait wax seal */}
        <div
          className="absolute z-30 flex items-center justify-center"
          style={{
            left: `${MEMORIAL_SEAL_CX_PCT}%`,
            top: `${MEMORIAL_SEAL_CY_PCT}%`,
            width: `${MEMORIAL_SEAL_WIDTH_FRAC * 100}%`,
            aspectRatio: "0.92",
            transform: "translate(-50%, -50%)",
          }}
        >
          <motion.div
            className="relative h-full w-full"
            style={{
              transformStyle: "preserve-3d",
              willChange: lifting ? "transform, opacity" : undefined,
            }}
            initial={{ scale: 1, opacity: 1, rotateX: 0, rotateZ: 0, x: 0, y: 0 }}
            animate={
              reduceMotion
                ? isOpening
                  ? { y: "-120%", scale: 0.88, opacity: 0, rotateX: 0, rotateZ: 0 }
                  : { y: "0%", scale: 1, opacity: 1, rotateX: 0, rotateZ: 0 }
                : isOpening
                  ? {
                      y: "-480%",
                      x: "6%",
                      scale: 0.46,
                      opacity: 0,
                      rotateX: -68,
                      rotateZ: 14,
                    }
                  : isUnsealing
                    ? {
                        y: "-175%",
                        x: "-3%",
                        scale: 1.1,
                        opacity: 1,
                        rotateX: -32,
                        rotateZ: 6,
                      }
                    : {
                        y: "0%",
                        x: "0%",
                        scale: 1,
                        opacity: 1,
                        rotateX: 0,
                        rotateZ: 0,
                      }
            }
            transition={
              lifting
                ? {
                    duration: isOpening
                      ? Math.max(2.8, flapOpenSec * 0.92)
                      : Math.max(2.6, sealLiftSec * 0.95),
                    ease: isOpening ? EASE_SEAL_SOAR : EASE_SEAL_LIFT,
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
              photorealSrc={MEMORIAL_PORTRAIT_WAX_SEAL_SRC}
              pulseClass="inv-seal-glow"
            />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
