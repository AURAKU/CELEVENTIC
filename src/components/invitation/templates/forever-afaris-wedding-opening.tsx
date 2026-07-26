"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FA_PALETTE as C } from "./forever-afaris-wedding-palette";

/**
 * Forever Afaris — cinematic opening state machine.
 *
 * PRELOADING → SEALED (blush floral envelope + champagne wax seal) →
 * ENVELOPE_OPENING (flap unfolds, inner card rises) → GATE (ornamental gate
 * swings open from the centre with light + petals) → done.
 *
 * Fully self-contained: envelope, seal and gate are CSS/SVG so no upload is
 * required. Reduced-motion collapses the journey to a single tasteful "enter"
 * gesture (which still provides the user interaction audio autoplay needs).
 */
type Stage =
  | "preloading"
  | "sealed"
  | "envelopeOpening"
  | "gate"
  | "done";

export interface WeddingOpeningProps {
  monogram: string;
  instruction: string;
  gateWord: string;
  coupleLine: string;
  onComplete: () => void;
  /** Fires on the first open gesture — the audio-unlock hook for the pipeline. */
  onBegin?: () => void;
}

const PETALS = Array.from({ length: 14 });

export function ForeverAfarisWeddingOpening({
  monogram,
  instruction,
  gateWord,
  coupleLine,
  onComplete,
  onBegin,
}: WeddingOpeningProps) {
  const prefersReduced = useReducedMotion();
  const [stage, setStage] = useState<Stage>("preloading");
  const [visible, setVisible] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const after = useCallback(
    (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      timers.current.push(id);
    },
    []
  );

  // Preload → sealed (or straight to a reduced-motion enter card).
  useEffect(() => {
    after(prefersReduced ? 350 : 1100, () => setStage("sealed"));
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimers();
    setVisible(false);
    // let the exit animation play before unmounting for the parent
    after(prefersReduced ? 60 : 640, onComplete);
  }, [after, clearTimers, onComplete, prefersReduced]);

  const openEnvelope = useCallback(() => {
    if (stage !== "sealed") return;
    onBegin?.();
    if (prefersReduced) {
      finish();
      return;
    }
    setStage("envelopeOpening");
    after(1500, () => setStage("gate"));
    after(4100, finish);
  }, [after, finish, onBegin, prefersReduced, stage]);

  const skip = useCallback(() => {
    onBegin?.();
    finish();
  }, [finish, onBegin]);

  // Keyboard access — Enter/Space activates the current step.
  const onKeyActivate = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openEnvelope();
      }
    },
    [openEnvelope]
  );

  if (!visible && doneRef.current && stage === "done") return null;

  return (
    <AnimatePresence onExitComplete={() => setStage("done")}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.15 : 0.6, ease: "easeInOut" }}
          style={{
            background: `radial-gradient(120% 90% at 50% 20%, ${C.linen} 0%, ${C.blush} 55%, ${C.blushDeep} 100%)`,
          }}
          aria-label="Wedding invitation opening"
        >
          {/* Soft light bloom */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(60% 40% at 50% 42%, ${C.linen}cc 0%, transparent 70%)`,
            }}
          />

          {/* Skip — always available (audio-safe, non-trapping) */}
          <button
            type="button"
            onClick={skip}
            className="absolute right-4 top-4 z-[70] rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] backdrop-blur-sm transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              color: C.cocoa,
              background: `${C.linen}aa`,
              border: `1px solid ${C.border}`,
              opacity: 0.8,
            }}
          >
            Skip intro
          </button>

          {/* PRELOAD */}
          {stage === "preloading" && (
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <Monogram text={monogram} />
              <motion.p
                className="font-[family-name:var(--font-great-vibes)] text-2xl"
                style={{ color: C.goldDeep }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.55, 1] }}
                transition={{ duration: 1.6, ease: "easeInOut" }}
              >
                {coupleLine}
              </motion.p>
            </motion.div>
          )}

          {/* ENVELOPE + SEAL / OPENING */}
          {(stage === "sealed" || stage === "envelopeOpening") && (
            <div className="relative flex flex-col items-center" style={{ perspective: 1400 }}>
              <Envelope
                monogram={monogram}
                opening={stage === "envelopeOpening"}
                onOpen={openEnvelope}
                onKeyActivate={onKeyActivate}
              />
              <AnimatePresence>
                {stage === "sealed" && (
                  <motion.p
                    key="hint"
                    className="mt-8 text-[12px] uppercase tracking-[0.32em]"
                    style={{ color: C.cocoa }}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {instruction}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* GATE REVEAL */}
          {stage === "gate" && (
            <Gate word={gateWord} coupleLine={coupleLine} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */

function Monogram({ text }: { text: string }) {
  return (
    <div
      className="flex h-20 w-20 items-center justify-center rounded-full"
      style={{
        border: `1.5px solid ${C.gold}`,
        boxShadow: `0 0 0 4px ${C.linen}, 0 10px 30px -12px ${C.goldDeep}`,
        background: `radial-gradient(circle at 35% 30%, ${C.goldSoft}, ${C.gold} 70%, ${C.goldDeep})`,
      }}
    >
      <span
        className="font-[family-name:var(--font-cinzel)] text-2xl font-semibold"
        style={{ color: C.ink }}
      >
        {text}
      </span>
    </div>
  );
}

function Envelope({
  monogram,
  opening,
  onOpen,
  onKeyActivate,
}: {
  monogram: string;
  opening: boolean;
  onOpen: () => void;
  onKeyActivate: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div
      className="relative"
      style={{ width: "min(78vw, 320px)", aspectRatio: "4 / 3" }}
    >
      {/* Envelope body */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[10px]"
        style={{
          background: `linear-gradient(160deg, ${C.blush} 0%, ${C.blushDeep} 100%)`,
          boxShadow: `0 30px 60px -24px ${C.rose}, inset 0 0 60px ${C.linen}55`,
          border: `1px solid ${C.border}`,
        }}
      >
        <FloralEmboss />
        {/* Side diagonal seams */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(115deg, transparent 49.6%, ${C.rose}55 49.8%, transparent 50.2%),
                         linear-gradient(65deg, transparent 49.6%, ${C.rose}55 49.8%, transparent 50.2%)`,
          }}
        />
      </div>

      {/* Inner card lifting out */}
      <motion.div
        className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-[6px]"
        style={{
          width: "84%",
          height: "78%",
          x: "-50%",
          background: `linear-gradient(180deg, ${C.linen}, ${C.ivory})`,
          border: `1px solid ${C.goldSoft}`,
          boxShadow: `0 18px 40px -18px ${C.goldDeep}`,
        }}
        initial={{ y: "-50%", opacity: 0 }}
        animate={
          opening
            ? { y: "-118%", opacity: 1 }
            : { y: "-50%", opacity: 0 }
        }
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: opening ? 0.35 : 0 }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-1 h-px w-10"
            style={{ background: C.gold }}
          />
          <p
            className="font-[family-name:var(--font-great-vibes)] text-xl"
            style={{ color: C.goldDeep }}
          >
            You&apos;re Invited
          </p>
          <div
            className="mx-auto mt-1 h-px w-10"
            style={{ background: C.gold }}
          />
        </div>
      </motion.div>

      {/* Lower front pocket (covers card until it clears) */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 rounded-b-[10px]"
        style={{
          height: "58%",
          background: `linear-gradient(180deg, ${C.blushDeep} 0%, ${C.blush} 100%)`,
          clipPath: "polygon(0 34%, 50% 0, 100% 34%, 100% 100%, 0 100%)",
          borderBottom: `1px solid ${C.border}`,
          boxShadow: `inset 0 8px 18px -10px ${C.rose}`,
        }}
      />

      {/* Top flap — unfolds open */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 origin-top"
        style={{
          height: "58%",
          background: `linear-gradient(180deg, ${C.blush} 0%, ${C.blushDeep} 100%)`,
          clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          transformStyle: "preserve-3d",
          zIndex: opening ? 1 : 5,
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.06))",
        }}
        initial={{ rotateX: 0 }}
        animate={{ rotateX: opening ? -178 : 0 }}
        transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
      />

      {/* Wax seal — the interactive control */}
      <motion.button
        type="button"
        onClick={onOpen}
        onKeyDown={onKeyActivate}
        data-blush-gate-seal="true"
        aria-label="Break the wax seal to open the invitation"
        className="absolute left-1/2 top-[46%] z-10 flex items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{
          width: 74,
          height: 74,
          x: "-50%",
          y: "-50%",
          cursor: opening ? "default" : "pointer",
        }}
        initial={{ scale: 1, opacity: 1 }}
        animate={
          opening
            ? { scale: 0.6, opacity: 0, rotate: -18, y: "20%" }
            : { scale: [1, 1.05, 1], opacity: 1 }
        }
        transition={
          opening
            ? { duration: 0.5, ease: "easeIn" }
            : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
        }
        whileHover={opening ? undefined : { scale: 1.08 }}
        whileTap={opening ? undefined : { scale: 0.94 }}
      >
        <WaxSeal monogram={monogram} />
      </motion.button>
    </div>
  );
}

function WaxSeal({ monogram }: { monogram: string }) {
  return (
    <span
      className="relative flex h-full w-full items-center justify-center rounded-full"
      style={{
        background: `radial-gradient(circle at 34% 30%, ${C.goldSoft} 0%, ${C.gold} 45%, ${C.goldDeep} 100%)`,
        boxShadow: `0 8px 18px -6px ${C.goldDeep}, inset 0 2px 6px ${C.linen}88, inset 0 -4px 10px ${C.goldDeep}`,
        border: `2px solid ${C.goldSoft}`,
      }}
    >
      {/* scalloped edge */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: `repeating-conic-gradient(${C.goldDeep} 0deg 8deg, transparent 8deg 16deg)`,
          opacity: 0.25,
          maskImage: "radial-gradient(circle, transparent 62%, #000 63%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 62%, #000 63%)",
        }}
      />
      <span
        className="font-[family-name:var(--font-cinzel)] text-sm font-bold tracking-tight"
        style={{ color: C.ink, textShadow: `0 1px 0 ${C.goldSoft}` }}
      >
        {monogram}
      </span>
    </span>
  );
}

function FloralEmboss() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 150"
      className="absolute inset-0 h-full w-full"
      style={{ opacity: 0.5 }}
    >
      <defs>
        <linearGradient id="fa-emboss" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.linen} stopOpacity="0.9" />
          <stop offset="1" stopColor={C.rose} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {[
        [22, 26],
        [178, 26],
        [22, 124],
        [178, 124],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} stroke="url(#fa-emboss)" fill="none" strokeWidth="1.4">
          <path d="M0 0 C 10 -8 18 -2 14 8 C 24 4 30 12 22 20" />
          <path d="M0 0 C -10 -8 -18 -2 -14 8 C -24 4 -30 12 -22 20" />
          <circle cx="0" cy="2" r="3" fill={C.rose} fillOpacity="0.3" stroke="none" />
        </g>
      ))}
    </svg>
  );
}

function Gate({ word, coupleLine }: { word: string; coupleLine: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ perspective: 1600 }}
    >
      {/* World behind the gate */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ scale: 1.14, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: "easeOut", delay: 0.5 }}
        style={{
          background: `radial-gradient(70% 60% at 50% 45%, ${C.linen} 0%, ${C.blush} 60%, ${C.blushDeep} 100%)`,
        }}
      >
        {/* light rays */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5, rotate: 6 }}
          transition={{ duration: 2, ease: "easeOut", delay: 0.6 }}
          style={{
            background: `conic-gradient(from 0deg at 50% 40%, transparent 0deg, ${C.linen}66 12deg, transparent 24deg, ${C.goldSoft}44 36deg, transparent 48deg)`,
            maskImage: "radial-gradient(circle at 50% 40%, #000 0%, transparent 60%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 40%, #000 0%, transparent 60%)",
          }}
        />
        <motion.p
          className="relative font-[family-name:var(--font-great-vibes)] text-6xl"
          style={{ color: C.goldDeep }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 1 }}
        >
          {word}
        </motion.p>
        <motion.p
          className="relative mt-1 text-[11px] uppercase tracking-[0.34em]"
          style={{ color: C.cocoa }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
        >
          {coupleLine}
        </motion.p>
        {/* petals */}
        {PETALS.map((_, i) => (
          <Petal key={i} index={i} />
        ))}
      </motion.div>

      {/* Left gate panel */}
      <GatePanel side="left" />
      {/* Right gate panel */}
      <GatePanel side="right" />
    </div>
  );
}

function GatePanel({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <motion.div
      className="absolute top-0 h-full"
      style={{
        width: "50%",
        [isLeft ? "left" : "right"]: 0,
        transformOrigin: isLeft ? "left center" : "right center",
        transformStyle: "preserve-3d",
        background: `linear-gradient(${isLeft ? "90deg" : "270deg"}, ${C.cream} 0%, ${C.ivory} 60%, ${C.linen} 100%)`,
        borderRight: isLeft ? `2px solid ${C.gold}` : undefined,
        borderLeft: !isLeft ? `2px solid ${C.gold}` : undefined,
        boxShadow: `inset ${isLeft ? "-" : ""}18px 0 40px -20px ${C.goldDeep}`,
      }}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: isLeft ? -105 : 105 }}
      transition={{ duration: 1.7, ease: [0.76, 0, 0.24, 1], delay: 0.35 }}
    >
      <GateOrnament flip={!isLeft} />
    </motion.div>
  );
}

function GateOrnament({ flip }: { flip: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 400"
      preserveAspectRatio="none"
      className="h-full w-full"
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      <g stroke={C.gold} strokeWidth="2" fill="none" opacity="0.85">
        {/* vertical bars */}
        {[20, 42, 64, 86].map((x) => (
          <line key={x} x1={x} y1="20" x2={x} y2="380" />
        ))}
        {/* arched top */}
        <path d="M8 60 Q50 6 96 60" />
        <path d="M8 78 Q50 30 96 78" />
        {/* scroll flourishes */}
        {[120, 210, 300].map((y) => (
          <path key={y} d={`M20 ${y} Q50 ${y - 26} 86 ${y} Q50 ${y + 26} 20 ${y}`} opacity="0.7" />
        ))}
        <circle cx="53" cy="120" r="6" fill={C.gold} stroke="none" opacity="0.6" />
      </g>
    </svg>
  );
}

function Petal({ index }: { index: number }) {
  const left = (index * 37) % 100;
  const delay = 0.8 + (index % 7) * 0.22;
  const size = 8 + (index % 4) * 3;
  return (
    <motion.span
      aria-hidden
      className="absolute rounded-[50%_50%_50%_0]"
      style={{
        left: `${left}%`,
        top: "-6%",
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${C.blush}, ${C.rose})`,
        opacity: 0.8,
      }}
      initial={{ y: "-10%", rotate: 0, opacity: 0 }}
      animate={{ y: "120%", rotate: 220, opacity: [0, 0.85, 0] }}
      transition={{ duration: 4 + (index % 3), ease: "easeIn", delay, repeat: Infinity }}
    />
  );
}
