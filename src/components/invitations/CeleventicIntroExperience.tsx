"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  CELEVENTIC_LOGO_FULL,
  CELEVENTIC_PALETTE,
  INTRO_SKIP_AVAILABLE_MS,
  type IntroDurationSec,
} from "@/lib/experience/celeventic-palette";
import { BRAND_MOTTO } from "@/lib/constants";
import { getIntroVariant } from "@/lib/experience/intro-variants";
import type { IntroVariantId } from "@/lib/experience/experience-types";

interface ThemeTransitionColors {
  accent?: string;
  primary?: string;
  background?: string;
}

interface CeleventicIntroExperienceProps {
  durationSec?: IntroDurationSec;
  onComplete: () => void;
  logoUrl?: string;
  themeColors?: ThemeTransitionColors;
  /** Branded choreography — same logo, different worlds per template family */
  variant?: IntroVariantId;
}

/** Per-variant background. The logo always sits on a complementary field. */
/** Map Phase-4 SKU intros onto a visual family while keeping distinct IDs. */
function introVisualFamily(variant: IntroVariantId): IntroVariantId {
  switch (variant) {
    case "seal-impress":
    case "foil-rise":
      return "gold-foil";
    case "petal-cascade":
    case "vine-grow":
      return "logo-bloom";
    case "neon-pulse":
    case "ticket-tear":
      return "particle-burst";
    case "marble-veil":
    case "prism-refract":
      return "glass-shimmer";
    case "drum-pulse":
    case "folio-open":
      return "fabric-unfold";
    case "lace-draw":
    case "quill-script":
      return "ink-reveal";
    case "hex-assemble":
    case "ring-orbit":
      return "orbit";
    case "lily-breathe":
    case "chapel-glow":
      return "candlelight";
    case "drape-fall":
      return "light-sweep";
    case "canvas-wipe":
      return "engine-grid";
    case "aurora-rise":
      return "constellation";
    default:
      return variant;
  }
}

function variantBackground(variant: IntroVariantId, accent: string): string {
  switch (introVisualFamily(variant)) {
    case "spotlight":
      return "radial-gradient(circle at 50% 30%, #14110d 0%, #030303 75%)";
    case "film-title":
      return "#050505";
    case "glass-shimmer":
      return `linear-gradient(160deg, #0b1d2a 0%, #10303d 60%, ${accent}26 100%)`;
    case "light-sweep":
      return `linear-gradient(140deg, ${CELEVENTIC_PALETTE.navy} 0%, #101c33 100%)`;
    case "ink-reveal":
      return "linear-gradient(165deg, #1b130c 0%, #241a10 100%)";
    case "logo-bloom":
      return `radial-gradient(circle at 50% 60%, ${accent}1f 0%, #0d1512 55%, #06100c 100%)`;
    case "particle-burst":
      return `radial-gradient(circle at 50% 50%, #1c1030 0%, #0a0618 70%)`;
    case "orbit":
      return `radial-gradient(circle at 50% 40%, #201a08 0%, #0c0a04 70%)`;
    case "gold-foil":
      return `radial-gradient(circle at 50% 35%, #3a2e12 0%, #120e06 70%)`;
    case "candlelight":
      return "radial-gradient(circle at 50% 40%, #2a1a0c 0%, #080604 75%)";
    case "constellation":
      return "radial-gradient(circle at 50% 45%, #0c1228 0%, #04060f 75%)";
    case "fabric-unfold":
      return `linear-gradient(160deg, #3a1508 0%, #1a0a06 55%, ${accent}33 100%)`;
    default:
      return `linear-gradient(165deg, ${CELEVENTIC_PALETTE.navy} 0%, #061a18 35%, ${accent}22 100%)`;
  }
}

/** Decorative layer behind the logo — transform/opacity motion only. */
function VariantLayer({ variant, accent }: { variant: IntroVariantId; accent: string }) {
  switch (introVisualFamily(variant)) {
    case "engine-grid":
      return (
        <>
          <div className="absolute inset-0 celeventic-intro-grid opacity-30 pointer-events-none" />
          <div className="absolute inset-0 celeventic-intro-scanlines pointer-events-none" />
        </>
      );
    case "logo-bloom":
      return (
        <>
          {[0, 1, 2].map((ring) => (
            <motion.div
              key={ring}
              className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
              style={{
                width: 180 + ring * 130,
                height: 180 + ring * 130,
                marginLeft: -(90 + ring * 65),
                marginTop: -(90 + ring * 65),
                border: `1px solid ${accent}`,
              }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.35, 0], scale: [0.4, 1.05, 1.25] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: ring * 0.5, ease: "easeOut" }}
            />
          ))}
        </>
      );
    case "particle-burst":
      return (
        <>
          {Array.from({ length: 18 }).map((_, i) => {
            const angle = (i / 18) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full pointer-events-none"
                style={{
                  background: i % 3 === 0 ? CELEVENTIC_PALETTE.gold : i % 3 === 1 ? accent : CELEVENTIC_PALETTE.coral,
                }}
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: Math.cos(angle) * 170,
                  y: Math.sin(angle) * 170,
                  opacity: [0, 1, 0],
                  scale: [0.6, 1.2, 0.4],
                }}
                transition={{ duration: 1.6, repeat: Infinity, delay: (i % 6) * 0.12, ease: "easeOut" }}
              />
            );
          })}
        </>
      );
    case "spotlight":
      return (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 40% 55% at 50% 42%, rgba(255,241,204,0.22) 0%, transparent 70%)",
          }}
          initial={{ opacity: 0, scale: 1.3 }}
          animate={{ opacity: [0, 1, 0.85], scale: [1.3, 1, 1.02] }}
          transition={{ duration: 2.2, ease: "easeOut" }}
        />
      );
    case "ink-reveal":
      return (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 45%, ${accent}30 0%, transparent 60%)` }}
          initial={{ clipPath: "circle(0% at 50% 45%)" }}
          animate={{ clipPath: "circle(72% at 50% 45%)" }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      );
    case "glass-shimmer":
      return (
        <>
          {[0, 1].map((bar) => (
            <motion.div
              key={bar}
              className="absolute top-[-20%] h-[140%] w-24 pointer-events-none"
              style={{
                background: "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.16) 50%, transparent 100%)",
                rotate: "14deg",
              }}
              initial={{ x: "-30vw", opacity: 0 }}
              animate={{ x: "110vw", opacity: [0, 1, 0] }}
              transition={{ duration: 2.1, repeat: Infinity, delay: bar * 1.05, ease: "easeInOut" }}
            />
          ))}
        </>
      );
    case "light-sweep":
      return (
        <motion.div
          className="absolute top-0 h-full w-40 pointer-events-none"
          style={{
            background: `linear-gradient(100deg, transparent 0%, ${accent}33 50%, transparent 100%)`,
          }}
          initial={{ x: "-20vw" }}
          animate={{ x: "110vw" }}
          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" }}
        />
      );
    case "film-title":
      return (
        <>
          <div className="absolute top-0 inset-x-0 h-[12vh] bg-black pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-[12vh] bg-black pointer-events-none" />
          <div className="absolute inset-0 celeventic-intro-scanlines opacity-60 pointer-events-none" />
        </>
      );
    case "orbit":
      return (
        <>
          {[220, 320, 430].map((size, i) => (
            <motion.div
              key={size}
              className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
              style={{
                width: size,
                height: size,
                marginLeft: -size / 2,
                marginTop: -size / 2,
                border: `1px ${i === 1 ? "solid" : "dashed"} ${i === 1 ? CELEVENTIC_PALETTE.gold : accent}`,
                opacity: 0.35 - i * 0.08,
              }}
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{ duration: 16 + i * 8, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </>
      );
    case "gold-foil":
      return (
        <>
          {[200, 300].map((size, i) => (
            <motion.div
              key={size}
              className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
              style={{
                width: size,
                height: size,
                marginLeft: -size / 2,
                marginTop: -size / 2,
                border: `1px solid ${CELEVENTIC_PALETTE.gold}`,
                opacity: 0.28,
              }}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: [0.7, 1.05, 1], opacity: [0, 0.4, 0.2] }}
              transition={{ duration: 2.2, delay: i * 0.25, ease: "easeOut" }}
            />
          ))}
        </>
      );
    case "candlelight":
      return (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 35% 50% at 50% 48%, rgba(255,186,100,0.28) 0%, transparent 70%)",
          }}
          animate={{ opacity: [0.45, 0.9, 0.55, 0.85] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      );
    case "constellation":
      return (
        <>
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-white pointer-events-none"
              style={{
                left: `${12 + ((i * 17) % 76)}%`,
                top: `${18 + ((i * 23) % 64)}%`,
              }}
              animate={{ opacity: [0.15, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 2 + (i % 4) * 0.4, repeat: Infinity, delay: i * 0.08 }}
            />
          ))}
        </>
      );
    case "fabric-unfold":
      return (
        <motion.div
          className="absolute inset-x-[8%] top-[18%] bottom-[18%] rounded-sm pointer-events-none"
          style={{
            border: `1px solid ${accent}`,
            boxShadow: `inset 0 0 40px ${accent}22`,
          }}
          initial={{ scaleY: 0.2, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 0.55 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      );
    default:
      return null;
  }
}

/** Per-variant logo entrance (crisp, centered, never stretched). */
function logoMotion(variant: IntroVariantId) {
  switch (introVisualFamily(variant)) {
    case "logo-bloom":
      return { initial: { opacity: 0, scale: 0.65 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 1.4, ease: [0.22, 1, 0.36, 1] as const } };
    case "particle-burst":
      return { initial: { opacity: 0, scale: 0.4 }, animate: { opacity: 1, scale: 1 }, transition: { type: "spring" as const, stiffness: 160, damping: 14, delay: 0.25 } };
    case "spotlight":
    case "candlelight":
      return { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.8, ease: "easeOut" as const } };
    case "ink-reveal":
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 1.2, delay: 0.5 } };
    case "glass-shimmer":
      return { initial: { opacity: 0, scale: 1.08 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 1.1, ease: "easeOut" as const } };
    case "light-sweep":
      return { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } };
    case "film-title":
      return { initial: { opacity: 0, scale: 1.15 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 2.2, ease: "easeOut" as const } };
    case "orbit":
      return { initial: { opacity: 0, scale: 0.85, rotate: -4 }, animate: { opacity: 1, scale: 1, rotate: 0 }, transition: { duration: 1.2, ease: "easeOut" as const } };
    default:
      return { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 1, ease: "easeOut" as const } };
  }
}

export function CeleventicIntroExperience({
  durationSec = 3,
  onComplete,
  logoUrl = CELEVENTIC_LOGO_FULL,
  themeColors,
  variant = "engine-grid",
}: CeleventicIntroExperienceProps) {
  const reduceMotion = useReducedMotion();
  const [canSkip, setCanSkip] = useState(false);
  const [exiting, setExiting] = useState(false);

  const meta = getIntroVariant(variant);
  const accent = themeColors?.accent ?? CELEVENTIC_PALETTE.teal;
  const bgTarget = themeColors?.background ?? CELEVENTIC_PALETTE.navy;

  useEffect(() => {
    // Reduced motion: hold a static branded frame briefly (no animation,
    // no white flash), then continue.
    const holdSec = reduceMotion ? 0.7 : durationSec;
    const skipTimer = setTimeout(() => setCanSkip(true), INTRO_SKIP_AVAILABLE_MS);
    const completeTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(onComplete, reduceMotion ? 0 : 600);
    }, holdSec * 1000);

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(completeTimer);
    };
  }, [durationSec, onComplete, reduceMotion]);

  function handleSkip() {
    if (!canSkip) return;
    setExiting(true);
    setTimeout(onComplete, reduceMotion ? 0 : 400);
  }

  // Static accessible frame — prefers-reduced-motion always wins.
  if (reduceMotion) {
    return (
      <div
        className="fixed inset-0 z-[190] flex flex-col items-center justify-center gap-6 invite-viewport-live"
        style={{ background: variantBackground(variant, accent) }}
        aria-label="Celeventic"
      >
        <Image src={logoUrl} alt="Celeventic" width={220} height={90} className="w-[200px] h-auto object-contain" priority />
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">{BRAND_MOTTO}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-[190] flex items-center justify-center overflow-hidden celeventic-intro-root invite-viewport-live"
      style={{ background: exiting ? bgTarget : variantBackground(variant, accent) }}
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.65, ease: "easeInOut" }}
    >
      <VariantLayer variant={variant} accent={accent} />

      {/* Foreground: crisp official logo, centered, fit to frame */}
      <motion.div
        className="relative z-10 flex flex-col items-center px-6 text-center max-w-md safe-area-pb safe-area-pt"
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 0 : 1, y: exiting ? -16 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {meta.showHud && (
          <div className="celeventic-intro-hud mb-8 px-6 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
            <p className="text-[10px] uppercase tracking-[0.45em] text-white/50 font-medium mb-1">
              Celeventic Experience Engine
            </p>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent my-2" />
            <p className="text-xs uppercase tracking-[0.35em] text-white/70 font-semibold">{BRAND_MOTTO}</p>
          </div>
        )}

        <motion.div {...logoMotion(variant)} className="mb-6">
          <Image
            src={logoUrl}
            alt="Celeventic"
            width={260}
            height={110}
            className="w-[210px] sm:w-[240px] h-auto object-contain drop-shadow-[0_2px_18px_rgba(0,0,0,0.4)]"
            priority
          />
        </motion.div>

        <motion.p
          className={`text-white/60 tracking-wide ${variant === "film-title" ? "text-[11px] uppercase tracking-[0.5em]" : "text-sm"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: exiting ? 0 : 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          {meta.tagline}
        </motion.p>

        <motion.div
          className="mt-8 h-1 w-48 rounded-full overflow-hidden bg-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accent}, ${CELEVENTIC_PALETTE.gold})` }}
            initial={{ width: "0%" }}
            animate={{ width: exiting ? "100%" : "85%" }}
            transition={{ duration: durationSec * 0.9, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>

      {canSkip && !exiting && (
        <motion.button
          type="button"
          onClick={handleSkip}
          className="absolute safe-area-inset-bottom safe-area-inset-right z-20 px-4 py-2 rounded-full text-xs font-medium text-white/70 border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:text-white transition-colors touch-manipulation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          Skip intro
        </motion.button>
      )}
    </motion.div>
  );
}
