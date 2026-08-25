"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Photoreal white doves (transparent WebP only — no scenic backdrop).
 * Cinematic slow-motion: drift in → rest at the seal → lift with it → soar clear.
 */

type DoveSpec = {
  id: string;
  src: string;
  fromX: string;
  fromY: string;
  gripX: string;
  gripY: string;
  liftX: string;
  liftY: string;
  exitX: string;
  exitY: string;
  delay: number;
  scale: number;
  rotFrom: number;
  rotGrip: number;
  rotLift: number;
  rotExit: number;
  z: number;
};

const DOVES: DoveSpec[] = [
  {
    id: "dove-left",
    src: "/experience/memorial/dove-left.webp",
    fromX: "-48vw",
    fromY: "16%",
    gripX: "-10%",
    gripY: "-5%",
    liftX: "-6%",
    liftY: "-38%",
    exitX: "52vw",
    exitY: "-72%",
    delay: 0,
    scale: 1.22,
    rotFrom: -12,
    rotGrip: -2,
    rotLift: 5,
    rotExit: 16,
    z: 34,
  },
  {
    id: "dove-right",
    src: "/experience/memorial/dove-right.webp",
    fromX: "50vw",
    fromY: "12%",
    gripX: "11%",
    gripY: "-3%",
    liftX: "7%",
    liftY: "-36%",
    exitX: "-54vw",
    exitY: "-70%",
    delay: 0.32,
    scale: 1.12,
    rotFrom: 11,
    rotGrip: 2,
    rotLift: -4,
    rotExit: -14,
    z: 32,
  },
];

/** Slow ease-in-out — funeral ceremony pacing, never snappy. */
const EASE_DRIFT = [0.33, 0.12, 0.2, 1] as const;
const EASE_HOLD = [0.4, 0, 0.2, 1] as const;
const EASE_RISE = [0.22, 0.61, 0.18, 1] as const;
const EASE_SOAR = [0.16, 0.84, 0.28, 1] as const;

export function MemorialDoveUnseal({
  active,
  durationSec = 7.8,
}: {
  active: boolean;
  durationSec?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  // Slow-motion beats as fractions of the full dove lifespan
  const arriveAt = durationSec * 0.3;
  const gripAt = durationSec * 0.44;
  const liftAt = durationSec * 0.7;

  return (
    <AnimatePresence>
      {active ? (
        <div
          className="pointer-events-none absolute inset-0 z-[32] overflow-hidden"
          aria-hidden
        >
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.32, 0.24, 0.12, 0] }}
            transition={{
              duration: durationSec,
              times: [0, 0.22, 0.48, 0.78, 1],
              ease: EASE_DRIFT,
            }}
            style={{
              background:
                "radial-gradient(ellipse 42% 30% at 50% 46%, rgba(255,250,236,0.34) 0%, rgba(224,184,74,0.08) 44%, transparent 74%)",
            }}
          />

          {DOVES.map((dove) => (
            <motion.div
              key={dove.id}
              className="absolute left-1/2 top-[47%]"
              style={{
                zIndex: dove.z,
                width: `calc(${8.8 * dove.scale}rem)`,
                height: `calc(${6.5 * dove.scale}rem)`,
                marginLeft: `calc(${-4.4 * dove.scale}rem)`,
                marginTop: `calc(${-3.25 * dove.scale}rem)`,
                filter:
                  "drop-shadow(0 18px 26px rgba(0,0,0,0.48)) drop-shadow(0 0 18px rgba(255,246,220,0.22))",
                willChange: "transform, opacity",
              }}
              initial={{
                x: dove.fromX,
                y: dove.fromY,
                opacity: 0,
                scale: 0.58,
                rotate: dove.rotFrom,
              }}
              animate={{
                x: [dove.fromX, dove.gripX, dove.gripX, dove.liftX, dove.exitX],
                y: [dove.fromY, dove.gripY, dove.gripY, dove.liftY, dove.exitY],
                opacity: [0, 1, 1, 1, 0],
                scale: [0.58, 1, 1.03, 1.1, 0.88],
                rotate: [
                  dove.rotFrom,
                  dove.rotGrip,
                  dove.rotGrip,
                  dove.rotLift,
                  dove.rotExit,
                ],
              }}
              transition={{
                duration: durationSec,
                delay: dove.delay,
                times: [
                  0,
                  arriveAt / durationSec,
                  gripAt / durationSec,
                  liftAt / durationSec,
                  1,
                ],
                ease: [EASE_DRIFT, EASE_HOLD, EASE_RISE, EASE_SOAR],
              }}
            >
              <motion.div
                className="relative h-full w-full"
                animate={{
                  y: [0, -5, -1, -6, 0],
                  rotate: [0, -1.1, 0.3, 0.9, 0],
                  scaleY: [1, 0.985, 1.015, 0.99, 1],
                }}
                transition={{
                  duration: 1.35,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Image
                  src={dove.src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 75vw, 36rem"
                  className="object-contain select-none"
                  priority
                  draggable={false}
                />
              </motion.div>
            </motion.div>
          ))}
        </div>
      ) : null}
    </AnimatePresence>
  );
}
