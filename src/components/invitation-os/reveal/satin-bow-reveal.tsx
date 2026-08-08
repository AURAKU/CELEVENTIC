"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { playSilkSlipSound } from "@/lib/experience/reveal-sounds";
import { triggerHapticLight } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * Satin Bow ceremony — an ivory card held by a blush satin band.
 * The guest unties the bow: loops slip apart, tails fall, the band slides off
 * the card, and the invitation blooms through.
 *
 * The same component renders three ways so a catalogue tile shows the real
 * thing rather than a description of it:
 * - `staticPreview` — tied bow poster, no interaction (picker / card glimpse)
 * - `embedded`      — absolute fill inside a framed preview
 * - default         — viewport-fixed ceremony for live guests
 */

type Phase = "tied" | "untying" | "opened";

const STAGE_W = 300;
const STAGE_H = 430;
const CARD_W = 212;
const CARD_H = 292;
const CARD_X = (STAGE_W - CARD_W) / 2;
const CARD_TOP = 54;
/** Belly-band sits on the lower third so the card face stays readable. */
const BAND_Y = CARD_TOP + 190;
const BAND_H = 30;

const UNTIE_MS = 900;
const OPEN_MS = 620;
const REDUCED_UNTIE_MS = 240;
const REDUCED_OPEN_MS = 260;

const IVORY_EDGE = "rgba(178,148,108,0.38)";
const GOLD_FOIL = "#C0982F";

const STAGE_BG =
  "radial-gradient(118% 88% at 50% 10%, #FFFDF9 0%, #F9F2E8 40%, #F0E4D4 72%, #E7D8C6 100%)";
const CARD_BG =
  "linear-gradient(155deg, #FCF8F2 0%, #F8F1E6 48%, #F0E6D7 100%)";
/** Cross-band sheen: shadow → satin → specular highlight → satin → shadow. */
const SATIN_BAND =
  "linear-gradient(180deg, #A97078 0%, #D79AA2 16%, #EDBEC3 34%, #FAE2E4 46%, #E7AEB5 62%, #C2848D 84%, #AC737B 100%)";
const SATIN_LOOP =
  "linear-gradient(135deg, #F6D9DC 0%, #E7AEB5 34%, #D1929B 62%, #B4787F 100%)";
const SATIN_TAIL =
  "linear-gradient(90deg, #B4787F 0%, #E2A9B0 30%, #F7DEE0 48%, #DDA1A9 68%, #B0747C 100%)";

/** Deterministic jitter so petals never differ between renders of one tile. */
function seeded(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

const PETALS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: 20 + seeded(i, 1) * (STAGE_W - 40),
  drift: (seeded(i, 2) - 0.5) * 90,
  size: 7 + seeded(i, 3) * 9,
  delay: seeded(i, 4) * 0.5,
  spin: (seeded(i, 5) - 0.5) * 320,
}));

interface SatinBowRevealProps {
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  onComplete: () => void;
  /** Fires on the untie gesture so the host can unlock audio. */
  onBegin?: () => void;
  /** Absolute fill inside a framed preview instead of viewport-fixed. */
  embedded?: boolean;
  /** Non-interactive tied-bow poster for catalogue tiles. */
  staticPreview?: boolean;
  /** A tap elsewhere already consumed the gesture — untie without a second tap. */
  autoOpen?: boolean;
  enableSounds?: boolean;
}

export function SatinBowReveal({
  guestName,
  eventTitle,
  hostName,
  onComplete,
  onBegin,
  embedded = false,
  staticPreview = false,
  autoOpen = false,
  enableSounds = true,
}: SatinBowRevealProps) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("tied");
  const [scale, setScale] = useState(1);
  const started = useRef(false);
  const timers = useRef<number[]>([]);

  const untied = phase !== "tied";
  const idle = !staticPreview && !reduceMotion && phase === "tied";
  /** Catalogue tiles anchor a tap pill along the bottom — keep the bow clear of it. */
  const posterInset = staticPreview ? 42 : 0;
  /** No tap caption on a poster, so crop the space it would have occupied. */
  const stageHeight = staticPreview ? CARD_TOP + CARD_H + 18 : STAGE_H;

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    },
    []
  );

  /** Fit the fixed design stage into whatever box the host gives us. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const fit = (width: number, height: number) => {
      if (!width || !height) return;
      const usableHeight = height - posterInset;
      const next = Math.min(1, (width - 16) / STAGE_W, (usableHeight - 16) / stageHeight);
      setScale(Math.max(0.18, next));
    };
    const observer = new ResizeObserver(([entry]) => {
      fit(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(el);
    fit(el.clientWidth, el.clientHeight);
    return () => observer.disconnect();
  }, [posterInset, stageHeight]);

  const untie = useCallback(() => {
    if (started.current || staticPreview) return;
    started.current = true;
    onBegin?.();
    triggerHapticLight();
    if (enableSounds && !reduceMotion) playSilkSlipSound();
    setPhase("untying");
    const untieMs = reduceMotion ? REDUCED_UNTIE_MS : UNTIE_MS;
    const openMs = reduceMotion ? REDUCED_OPEN_MS : OPEN_MS;
    timers.current.push(window.setTimeout(() => setPhase("opened"), untieMs));
    timers.current.push(window.setTimeout(onComplete, untieMs + openMs));
  }, [enableSounds, onBegin, onComplete, reduceMotion, staticPreview]);

  useEffect(() => {
    if (!autoOpen || staticPreview) return;
    const id = window.setTimeout(untie, 320);
    timers.current.push(id);
  }, [autoOpen, staticPreview, untie]);

  const shellClass = staticPreview
    ? "absolute inset-0 overflow-hidden pointer-events-none"
    : embedded
      ? "absolute inset-0 z-[100] overflow-hidden"
      : "fixed inset-0 z-[100] invite-viewport-live safe-area-pt safe-area-pb overflow-hidden";

  const ease = [0.22, 1, 0.36, 1] as const;
  const untieDuration = reduceMotion ? REDUCED_UNTIE_MS / 1000 : UNTIE_MS / 1000;

  return (
    <div
      ref={rootRef}
      className={shellClass}
      style={{
        background: STAGE_BG,
        minHeight: staticPreview || embedded ? "100%" : undefined,
        height: staticPreview || embedded ? "100%" : undefined,
        width: staticPreview || embedded ? "100%" : undefined,
      }}
      role={staticPreview ? "img" : "dialog"}
      aria-modal={staticPreview ? undefined : true}
      aria-label={
        staticPreview
          ? `${eventTitle} — ivory card tied with a satin bow`
          : `${eventTitle} — untie the satin bow to open the invitation`
      }
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 42%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%), radial-gradient(120% 100% at 50% 100%, rgba(139,105,70,0.20) 0%, rgba(139,105,70,0) 55%)",
        }}
        aria-hidden
      />

      {!staticPreview && !untied && (
        <button
          type="button"
          onClick={untie}
          className="absolute inset-0 z-20 h-full w-full cursor-pointer touch-manipulation border-0 bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-8px] focus-visible:outline-[#C0982F]"
          aria-label="Untie the satin bow to open the invitation"
        />
      )}

      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingBottom: posterInset }}
      >
        <div
          className="relative shrink-0"
          style={{ width: STAGE_W, height: stageHeight, transform: `scale(${scale})` }}
        >
          <motion.div
            className="absolute rounded-[11px]"
            style={{
              left: CARD_X,
              top: CARD_TOP,
              width: CARD_W,
              height: CARD_H,
              background: CARD_BG,
              border: `1px solid ${IVORY_EDGE}`,
              boxShadow:
                "0 20px 42px -20px rgba(94,66,40,0.5), 0 3px 8px rgba(94,66,40,0.14)",
            }}
            animate={
              reduceMotion
                ? { opacity: phase === "opened" ? 0 : 1 }
                : {
                    y: untied ? -10 : 0,
                    scale: phase === "opened" ? 1.12 : untied ? 1.03 : 1,
                    opacity: phase === "opened" ? 0 : 1,
                  }
            }
            transition={{ duration: phase === "opened" ? OPEN_MS / 1000 : 0.7, ease }}
          >
            <div
              className="absolute inset-[9px] rounded-[6px] pointer-events-none"
              style={{ border: "1px solid rgba(192,152,47,0.42)" }}
              aria-hidden
            />

            <div className="absolute inset-x-0 top-[26px] flex flex-col items-center px-6 text-center">
              {hostName ? (
                <p
                  className="text-[8px] uppercase leading-none"
                  style={{ color: GOLD_FOIL, letterSpacing: "0.34em" }}
                >
                  {hostName}
                </p>
              ) : null}
              <span
                className="mt-3 block h-px w-12"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(192,152,47,0) 0%, #C0982F 50%, rgba(192,152,47,0) 100%)",
                }}
                aria-hidden
              />
              <p
                className="font-display mt-4 text-[17px] font-semibold leading-tight"
                style={{ color: "#4A3524" }}
              >
                {eventTitle}
              </p>
              {guestName ? (
                <p className="mt-3 text-[10px] italic" style={{ color: "#8A7358" }}>
                  For {guestName}
                </p>
              ) : null}
            </div>

            {/* Foil sweep as the card lifts free of the ribbon. */}
            {!reduceMotion && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(105deg, rgba(255,255,255,0) 38%, rgba(255,246,214,0.85) 50%, rgba(255,255,255,0) 62%)",
                }}
                initial={{ x: "-120%", opacity: 0 }}
                animate={untied ? { x: "120%", opacity: 1 } : { x: "-120%", opacity: 0 }}
                transition={{ duration: 0.9, delay: 0.24, ease: "easeInOut" }}
                aria-hidden
              />
            )}
          </motion.div>

          {/* Thin accent ribbon above the main band. */}
          <motion.div
            className="absolute overflow-hidden"
            style={{
              left: CARD_X - 9,
              top: BAND_Y - 12,
              width: CARD_W + 18,
              height: 5,
              background: SATIN_BAND,
              boxShadow: "0 1px 3px rgba(120,74,80,0.35)",
            }}
            animate={untied ? { x: 250, opacity: 0 } : { x: 0, opacity: 1 }}
            transition={{ duration: untieDuration, delay: reduceMotion ? 0 : 0.18, ease }}
            aria-hidden
          />

          {/* Main satin belly-band. */}
          <motion.div
            className="absolute overflow-hidden"
            style={{
              left: CARD_X - 9,
              top: BAND_Y,
              width: CARD_W + 18,
              height: BAND_H,
              background: SATIN_BAND,
              boxShadow:
                "0 4px 10px rgba(120,74,80,0.32), inset 0 0 0 1px rgba(255,255,255,0.18)",
            }}
            animate={untied ? { x: -260, opacity: 0 } : { x: 0, opacity: 1 }}
            transition={{ duration: untieDuration, delay: reduceMotion ? 0 : 0.12, ease }}
            aria-hidden
          >
            {idle && (
              <motion.div
                className="absolute inset-y-0 w-16"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)",
                }}
                animate={{ x: [-70, CARD_W + 30] }}
                transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
              />
            )}
          </motion.div>

          {/* Bow — loops, tails, knot. */}
          <motion.div
            className="absolute"
            style={{
              left: STAGE_W / 2,
              top: BAND_Y + BAND_H / 2,
              width: 0,
              height: 0,
            }}
            animate={idle ? { rotate: [-1.4, 1.4, -1.4] } : { rotate: 0 }}
            transition={idle ? { duration: 5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
            aria-hidden
          >
            <motion.div
              className="absolute rounded-[3px]"
              style={{
                left: -8,
                top: 4,
                width: 15,
                height: 74,
                background: SATIN_TAIL,
                transformOrigin: "top center",
                clipPath: "polygon(0 0, 100% 0, 100% 82%, 50% 100%, 0 82%)",
              }}
              animate={untied ? { rotate: -34, y: 82, x: -30, opacity: 0 } : { rotate: -13, y: 0, x: 0, opacity: 1 }}
              transition={{ duration: untieDuration, delay: reduceMotion ? 0 : 0.06, ease }}
            />
            <motion.div
              className="absolute rounded-[3px]"
              style={{
                left: -7,
                top: 4,
                width: 15,
                height: 74,
                background: SATIN_TAIL,
                transformOrigin: "top center",
                clipPath: "polygon(0 0, 100% 0, 100% 82%, 50% 100%, 0 82%)",
              }}
              animate={untied ? { rotate: 36, y: 86, x: 32, opacity: 0 } : { rotate: 14, y: 0, x: 0, opacity: 1 }}
              transition={{ duration: untieDuration, delay: reduceMotion ? 0 : 0.1, ease }}
            />

            <motion.div
              className="absolute"
              style={{
                left: -60,
                top: -22,
                width: 54,
                height: 42,
                background: SATIN_LOOP,
                borderRadius: "70% 30% 42% 58% / 62% 58% 42% 38%",
                transformOrigin: "right center",
                boxShadow: "inset -6px -3px 10px rgba(139,86,94,0.4), 0 3px 8px rgba(120,74,80,0.28)",
              }}
              animate={
                untied
                  ? { rotate: -30, x: -46, y: 26, scale: 0.82, opacity: 0 }
                  : { rotate: -6, x: 0, y: 0, scale: 1, opacity: 1 }
              }
              transition={{ duration: untieDuration, ease }}
            >
              <div
                className="absolute inset-[7px]"
                style={{
                  borderRadius: "inherit",
                  background:
                    "linear-gradient(120deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 55%)",
                }}
              />
            </motion.div>

            <motion.div
              className="absolute"
              style={{
                left: 6,
                top: -22,
                width: 54,
                height: 42,
                background: SATIN_LOOP,
                borderRadius: "30% 70% 58% 42% / 58% 62% 38% 42%",
                transformOrigin: "left center",
                boxShadow: "inset 6px -3px 10px rgba(139,86,94,0.4), 0 3px 8px rgba(120,74,80,0.28)",
              }}
              animate={
                untied
                  ? { rotate: 32, x: 48, y: 24, scale: 0.82, opacity: 0 }
                  : { rotate: 6, x: 0, y: 0, scale: 1, opacity: 1 }
              }
              transition={{ duration: untieDuration, ease }}
            >
              <div
                className="absolute inset-[7px]"
                style={{
                  borderRadius: "inherit",
                  background:
                    "linear-gradient(240deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 55%)",
                }}
              />
            </motion.div>

            <motion.div
              className="absolute rounded-[8px]"
              style={{
                left: -14,
                top: -13,
                width: 28,
                height: 26,
                background: SATIN_LOOP,
                boxShadow:
                  "inset 0 -2px 6px rgba(139,86,94,0.5), inset 0 2px 5px rgba(255,255,255,0.5), 0 2px 6px rgba(120,74,80,0.3)",
              }}
              animate={untied ? { y: 78, rotate: 24, scale: 0.7, opacity: 0 } : { y: 0, rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: untieDuration, delay: reduceMotion ? 0 : 0.04, ease }}
            />

            {/* Pearl at the knot — where the eye lands before the tap. */}
            <motion.div
              className="absolute rounded-full"
              style={{
                left: -5,
                top: -5,
                width: 10,
                height: 10,
                background:
                  "radial-gradient(circle at 32% 28%, #FFFDF6 0%, #F3E3BC 45%, #C0982F 100%)",
                boxShadow: "0 1px 3px rgba(120,90,30,0.45)",
              }}
              animate={untied ? { opacity: 0, scale: 0.6, y: 70 } : { opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: untieDuration, ease }}
            />
          </motion.div>

          {/* Rose petals ride the untie, matching the template's petal outro. */}
          {untied && !reduceMotion && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
              {PETALS.map((petal) => (
                <motion.span
                  key={petal.id}
                  className="absolute rounded-[60%_40%_55%_45%/55%_45%_60%_40%]"
                  style={{
                    left: petal.x,
                    top: BAND_Y - 20,
                    width: petal.size,
                    height: petal.size * 0.72,
                    background: "linear-gradient(135deg, #F8DDE0 0%, #E3A5AD 60%, #C98A93 100%)",
                  }}
                  initial={{ y: 0, opacity: 0, rotate: 0 }}
                  animate={{
                    y: STAGE_H - BAND_Y + 40,
                    x: petal.drift,
                    opacity: [0, 0.95, 0],
                    rotate: petal.spin,
                  }}
                  transition={{ duration: 1.5, delay: petal.delay, ease: "easeIn" }}
                />
              ))}
            </div>
          )}

          {!staticPreview && !untied && (
            <motion.p
              className="absolute inset-x-0 text-center text-[11px] tracking-[0.16em] uppercase"
              style={{ top: CARD_TOP + CARD_H + 22, color: "#9A7C52" }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: [0.55, 1, 0.55] }}
              transition={reduceMotion ? undefined : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              Tap to untie the bow
            </motion.p>
          )}
        </div>
      </div>

      {/* Warm bloom as the card hands over to the invitation. */}
      <motion.div
        className={cn("absolute inset-0 pointer-events-none")}
        style={{
          background:
            "radial-gradient(60% 45% at 50% 46%, rgba(255,250,236,0.95) 0%, rgba(255,248,232,0.5) 45%, rgba(255,248,232,0) 75%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "opened" ? 1 : 0 }}
        transition={{ duration: (reduceMotion ? REDUCED_OPEN_MS : OPEN_MS) / 1000, ease: "easeOut" }}
        aria-hidden
      />
    </div>
  );
}
