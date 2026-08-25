"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * White doves that gather at the wax seal, then fly it clear of the envelope —
 * a memorial unseal beat for funeral invitation openings.
 */

type DoveSpec = {
  id: string;
  fromX: string;
  fromY: string;
  midX: string;
  midY: string;
  exitX: string;
  exitY: string;
  delay: number;
  scale: number;
  flip?: boolean;
};

const DOVES: DoveSpec[] = [
  {
    id: "d1",
    fromX: "-42vw",
    fromY: "18%",
    midX: "-6%",
    midY: "-4%",
    exitX: "58vw",
    exitY: "-42%",
    delay: 0,
    scale: 1,
  },
  {
    id: "d2",
    fromX: "46vw",
    fromY: "12%",
    midX: "8%",
    midY: "-2%",
    exitX: "-52vw",
    exitY: "-38%",
    delay: 0.12,
    scale: 0.92,
    flip: true,
  },
  {
    id: "d3",
    fromX: "-28vw",
    fromY: "42%",
    midX: "-10%",
    midY: "10%",
    exitX: "62vw",
    exitY: "-28%",
    delay: 0.22,
    scale: 0.86,
  },
  {
    id: "d4",
    fromX: "34vw",
    fromY: "48%",
    midX: "12%",
    midY: "8%",
    exitX: "-48vw",
    exitY: "-34%",
    delay: 0.18,
    scale: 0.88,
    flip: true,
  },
  {
    id: "d5",
    fromX: "0vw",
    fromY: "-28%",
    midX: "0%",
    midY: "-14%",
    exitX: "18vw",
    exitY: "-55%",
    delay: 0.3,
    scale: 0.78,
  },
];

function DoveSilhouette({ flip }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 72 44"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      aria-hidden
    >
      {/* Body */}
      <ellipse cx="34" cy="24" rx="14" ry="7.5" fill="rgba(255,255,255,0.96)" />
      {/* Head + beak */}
      <circle cx="48" cy="20" r="5.2" fill="rgba(255,255,255,0.98)" />
      <path d="M52.5 20.5 L58 21.2 L52.2 23" fill="rgba(232,210,160,0.85)" />
      <circle cx="49.2" cy="19.2" r="0.9" fill="rgba(40,30,20,0.5)" />
      {/* Upper wing — flaps via CSS transform origin */}
      <g className="inv-dove-wing-up" style={{ transformOrigin: "30px 22px" }}>
        <path
          d="M28 22 C18 10 8 8 4 12 C12 14 18 18 24 24 C26 25 28 24 28 22Z"
          fill="rgba(255,255,255,0.92)"
        />
        <path
          d="M26 20 C18 12 10 10 6 12"
          stroke="rgba(235,220,190,0.55)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
      {/* Lower wing */}
      <g className="inv-dove-wing-down" style={{ transformOrigin: "28px 26px" }}>
        <path
          d="M26 26 C16 30 10 36 8 40 C14 36 20 30 28 28 C28 27 27 26 26 26Z"
          fill="rgba(248,248,252,0.88)"
        />
      </g>
      {/* Tail */}
      <path
        d="M20 24 C14 20 10 22 8 26 C12 26 16 27 20 26"
        fill="rgba(255,255,255,0.9)"
      />
    </svg>
  );
}

export function MemorialDoveUnseal({
  active,
  durationSec = 2.4,
}: {
  active: boolean;
  durationSec?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  const gatherAt = Math.min(0.38, durationSec * 0.32);
  const departAt = Math.min(0.72, durationSec * 0.55);

  return (
    <AnimatePresence>
      {active ? (
        <div
          className="pointer-events-none absolute inset-0 z-[25] overflow-hidden"
          aria-hidden
        >
          {/* Soft heavenly wash as doves arrive */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0.25, 0] }}
            transition={{ duration: durationSec, times: [0, 0.25, 0.55, 1], ease: "easeInOut" }}
            style={{
              background:
                "radial-gradient(ellipse 55% 40% at 50% 42%, rgba(255,252,245,0.55) 0%, rgba(224,184,74,0.12) 42%, transparent 70%)",
            }}
          />

          {DOVES.map((dove) => (
            <motion.div
              key={dove.id}
              className="absolute left-1/2 top-[48%]"
              style={{
                width: `calc(${3.1 * dove.scale}rem)`,
                height: `calc(${1.9 * dove.scale}rem)`,
                marginLeft: `calc(${-1.55 * dove.scale}rem)`,
                marginTop: `calc(${-0.95 * dove.scale}rem)`,
                filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.28))",
              }}
              initial={{
                x: dove.fromX,
                y: dove.fromY,
                opacity: 0,
                scale: 0.65,
                rotate: dove.flip ? 12 : -12,
              }}
              animate={{
                x: [dove.fromX, dove.midX, dove.midX, dove.exitX],
                y: [dove.fromY, dove.midY, dove.midY, dove.exitY],
                opacity: [0, 1, 1, 0],
                scale: [0.65, 1, 1.05, 0.9],
                rotate: [dove.flip ? 12 : -12, 0, dove.flip ? -8 : 8, dove.flip ? -18 : 18],
              }}
              transition={{
                duration: durationSec,
                delay: dove.delay,
                times: [0, gatherAt / durationSec, departAt / durationSec, 1],
                ease: ["easeOut", "easeInOut", "easeIn"],
              }}
            >
              <motion.div
                animate={{ y: [0, -3, 0, -2, 0] }}
                transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
              >
                <DoveSilhouette flip={dove.flip} />
              </motion.div>
            </motion.div>
          ))}
        </div>
      ) : null}
    </AnimatePresence>
  );
}
