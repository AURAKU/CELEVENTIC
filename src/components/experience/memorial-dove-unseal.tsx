"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Photoreal white doves (transparent WebP only — no scenic backdrop).
 * They gather at the wax seal, lift with it, then soar clear of the envelope.
 */

type DoveSpec = {
  id: string;
  src: string;
  /** Enter from off-stage */
  fromX: string;
  fromY: string;
  /** Beak near seal center */
  gripX: string;
  gripY: string;
  /** Climb while gripping */
  liftX: string;
  liftY: string;
  /** Exit clear of frame */
  exitX: string;
  exitY: string;
  delay: number;
  scale: number;
  rotFrom: number;
  rotGrip: number;
  rotLift: number;
  rotExit: number;
  /** Slight depth: front dove sits above the seal. */
  z: number;
};

const DOVES: DoveSpec[] = [
  {
    id: "dove-left",
    src: "/experience/memorial/dove-left.webp",
    fromX: "-52vw",
    fromY: "18%",
    gripX: "-11%",
    gripY: "-6%",
    liftX: "-4%",
    liftY: "-42%",
    exitX: "56vw",
    exitY: "-78%",
    delay: 0,
    scale: 1.18,
    rotFrom: -14,
    rotGrip: -2,
    rotLift: 6,
    rotExit: 18,
    z: 34,
  },
  {
    id: "dove-right",
    src: "/experience/memorial/dove-right.webp",
    fromX: "54vw",
    fromY: "14%",
    gripX: "12%",
    gripY: "-4%",
    liftX: "8%",
    liftY: "-40%",
    exitX: "-58vw",
    exitY: "-74%",
    delay: 0.18,
    scale: 1.08,
    rotFrom: 12,
    rotGrip: 3,
    rotLift: -5,
    rotExit: -16,
    z: 32,
  },
];

const EASE_ARRIVE = [0.22, 0.82, 0.2, 1] as const;
const EASE_LIFT = [0.33, 0.05, 0.2, 1] as const;
const EASE_SOAR = [0.16, 0.9, 0.24, 1] as const;

export function MemorialDoveUnseal({
  active,
  durationSec = 4.4,
}: {
  active: boolean;
  durationSec?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  const arriveAt = Math.min(1.05, durationSec * 0.24);
  const gripAt = Math.min(1.55, durationSec * 0.35);
  const liftAt = Math.min(2.55, durationSec * 0.58);

  return (
    <AnimatePresence>
      {active ? (
        <div
          className="pointer-events-none absolute inset-0 z-[32] overflow-hidden"
          aria-hidden
        >
          {/* Soft memorial wash only — never a photo backdrop */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.28, 0.2, 0.1, 0] }}
            transition={{
              duration: durationSec,
              times: [0, 0.2, 0.45, 0.72, 1],
              ease: EASE_ARRIVE,
            }}
            style={{
              background:
                "radial-gradient(ellipse 38% 28% at 50% 46%, rgba(255,250,236,0.32) 0%, rgba(224,184,74,0.07) 42%, transparent 72%)",
            }}
          />

          {DOVES.map((dove) => (
            <motion.div
              key={dove.id}
              className="absolute left-1/2 top-[47%]"
              style={{
                zIndex: dove.z,
                width: `calc(${8.4 * dove.scale}rem)`,
                height: `calc(${6.2 * dove.scale}rem)`,
                marginLeft: `calc(${-4.2 * dove.scale}rem)`,
                marginTop: `calc(${-3.1 * dove.scale}rem)`,
                filter:
                  "drop-shadow(0 18px 26px rgba(0,0,0,0.48)) drop-shadow(0 0 18px rgba(255,246,220,0.22))",
                willChange: "transform, opacity",
              }}
              initial={{
                x: dove.fromX,
                y: dove.fromY,
                opacity: 0,
                scale: 0.62,
                rotate: dove.rotFrom,
              }}
              animate={{
                x: [
                  dove.fromX,
                  dove.gripX,
                  dove.gripX,
                  dove.liftX,
                  dove.exitX,
                ],
                y: [
                  dove.fromY,
                  dove.gripY,
                  dove.gripY,
                  dove.liftY,
                  dove.exitY,
                ],
                opacity: [0, 1, 1, 1, 0],
                scale: [0.62, 1, 1.02, 1.08, 0.86],
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
                // One ease per segment between the five keyframes
                ease: [EASE_ARRIVE, "easeInOut", EASE_LIFT, EASE_SOAR],
              }}
            >
              {/* Wing-breath — photoreal plate already mid-flap; subtle bob sells flight */}
              <motion.div
                className="relative h-full w-full"
                animate={{
                  y: [0, -7, -1, -8, 0],
                  rotate: [0, -1.6, 0.4, 1.2, 0],
                  scaleY: [1, 0.97, 1.02, 0.98, 1],
                }}
                transition={{
                  duration: 0.92,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Image
                  src={dove.src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 70vw, 32rem"
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
