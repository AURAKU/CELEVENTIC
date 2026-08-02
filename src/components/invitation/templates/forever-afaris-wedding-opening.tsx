"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  resolveSealWax,
  resolveWeddingPalette,
  type FaPalette,
  type WeddingPaletteOverrides,
} from "./forever-afaris-wedding-palette";
import type {
  WeddingEnvelopeStyle,
  WeddingGateStyle,
  WeddingSealColor,
  WeddingSealMotif,
} from "@/lib/invitation/wedding-board";

/**
 * Forever Afaris, cinematic opening state machine.
 *
 * preload → sealed envelope (tap or swipe the champagne wax seal) → the seal
 * lifts slowly from the paper → the flaps unfold in depth → the inner card
 * rises → an ornate golden gate is rebuilt layer by layer → the gate parts
 * from the centre through light rays, petals and drifting motes → the invitation.
 *
 * Everything is CSS/SVG, so the ceremony is complete with zero uploads and the
 * host's palette, envelope paper, gate architecture and wax colour all flow in
 * from Studio. Reduced motion collapses the journey to a single dignified open
 * gesture, which still supplies the interaction browsers require to start audio.
 */
type Stage =
  | "sealed"
  | "unsealing"
  | "envelopeOpening"
  | "gate"
  | "done";

export interface WeddingOpeningProps {
  monogram: string;
  instruction: string;
  gateWord: string;
  coupleLine: string;
  /** Line addressed on the envelope face above the seal */
  addressLine?: string;
  envelopeStyle?: WeddingEnvelopeStyle;
  gateStyle?: WeddingGateStyle;
  sealColor?: WeddingSealColor;
  sealMotif?: WeddingSealMotif;
  palette?: WeddingPaletteOverrides;
  /** Soft haptic on the seal lift where the device supports it */
  haptics?: boolean;
  /**
   * Offer a visible "Skip intro" control. Reserved for guests who have already
   * completed the ceremony once, a first-time guest is never shown a way to
   * miss the envelope, and the ceremony is never skipped silently.
   */
  allowSkip?: boolean;
  onComplete: () => void;
  /** Fires on the first open gesture, the audio-unlock hook for the pipeline. */
  onBegin?: () => void;
}

const PETAL_COUNT = 16;
const MOTE_COUNT = 18;
/** Deliberate luxury pacing: seal lift → envelope unfold → final gate tableau. */
const UNSEAL_HOLD_MS = 2400;
const GATE_REVEAL_AT_MS = 4600;
/** Hold the completed word-and-couple tableau before entering the invitation. */
const CEREMONY_COMPLETE_MS = 12000;

/** Cinematic easing shared across the ceremony. */
const EASE_SILK = [0.22, 1, 0.36, 1] as const;
const EASE_GATE = [0.76, 0, 0.24, 1] as const;

function vibrate(pattern: number | number[], enabled?: boolean) {
  if (!enabled || typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported or blocked by the user agent, the ceremony is unaffected */
  }
}

/**
 * Pointer / device-tilt parallax. Returns a normalised -1…1 pair that the
 * envelope and gate layers read at different depths.
 */
function useParallax(active: boolean, disabled?: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (!active || disabled || typeof window === "undefined") return;

    const onPointer = (e: PointerEvent) => {
      rawX.set((e.clientX / window.innerWidth) * 2 - 1);
      rawY.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      rawX.set(Math.max(-1, Math.min(1, e.gamma / 35)));
      rawY.set(Math.max(-1, Math.min(1, (e.beta - 45) / 45)));
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, [active, disabled, rawX, rawY]);

  return { x, y };
}

export function ForeverAfarisWeddingOpening({
  monogram,
  instruction,
  gateWord,
  coupleLine,
  addressLine,
  envelopeStyle = "blush-floral",
  gateStyle = "golden-baroque",
  sealColor = "champagne",
  sealMotif = "monogram",
  palette,
  haptics = true,
  allowSkip = false,
  onComplete,
  onBegin,
}: WeddingOpeningProps) {
  const prefersReduced = useReducedMotion();
  const C = useMemo(() => resolveWeddingPalette(palette), [palette]);
  const wax = useMemo(() => resolveSealWax(sealColor), [sealColor]);
  // Start on the envelope. The former monogram + couple-name preload repeated
  // the same identity shown after the envelope at the golden gate.
  const [stage, setStage] = useState<Stage>("sealed");
  const [visible, setVisible] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const after = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const parallax = useParallax(
    stage === "sealed" || stage === "unsealing" || stage === "gate",
    Boolean(prefersReduced)
  );

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimers();
    setVisible(false);
    // let the exit animation play before unmounting for the parent
    after(prefersReduced ? 60 : 700, onComplete);
  }, [after, clearTimers, onComplete, prefersReduced]);

  const openEnvelope = useCallback(() => {
    if (stage !== "sealed") return;
    onBegin?.();
    // Soft release pulse, not a crack.
    vibrate([8, 28, 14], haptics);
    if (prefersReduced) {
      finish();
      return;
    }
    setStage("unsealing");
    // Let each tactile beat breathe; the final couple-name tableau is now the
    // only identity reveal and remains visible long enough to be read.
    after(UNSEAL_HOLD_MS, () => setStage("envelopeOpening"));
    after(GATE_REVEAL_AT_MS, () => {
      setStage("gate");
      vibrate(10, haptics);
    });
    // Safety net only — guests normally enter by tapping the golden gate.
    after(Math.max(CEREMONY_COMPLETE_MS, 22_000), finish);
  }, [after, finish, haptics, onBegin, prefersReduced, stage]);

  const enterThroughGate = useCallback(() => {
    if (stage !== "gate") return;
    onBegin?.();
    finish();
  }, [finish, onBegin, stage]);

  const skip = useCallback(() => {
    onBegin?.();
    finish();
  }, [finish, onBegin]);

  // Keyboard access, Enter/Space activates the current step.
  const onKeyActivate = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (stage === "gate") enterThroughGate();
        else openEnvelope();
      }
    },
    [enterThroughGate, openEnvelope, stage]
  );

  if (!visible && doneRef.current && stage === "done") return null;

  const sealed = stage === "sealed";
  const opening = stage === "unsealing" || stage === "envelopeOpening";

  return (
    <AnimatePresence onExitComplete={() => setStage("done")}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.15 : 0.65, ease: "easeInOut" }}
          style={{
            background: `radial-gradient(120% 90% at 50% 18%, ${C.linen} 0%, ${C.blush} 55%, ${C.blushDeep} 100%)`,
          }}
          role="dialog"
          aria-label="Wedding invitation opening ceremony"
        >
          {/* Depth wash, drifts opposite the envelope for a sense of room */}
          <ParallaxLayer x={parallax.x} y={parallax.y} depth={-8} className="pointer-events-none absolute inset-0">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: `radial-gradient(65% 45% at 50% 40%, ${C.linen}dd 0%, transparent 72%)`,
              }}
            />
            <VignetteFlora palette={C} />
          </ParallaxLayer>

          {/* Ambient motes, present from the first frame so the room feels alive */}
          {!prefersReduced && <Motes palette={C} />}

          {allowSkip && stage !== "gate" && (
            <button
              type="button"
              onClick={skip}
              aria-label="Skip the wedding opening ceremony"
              className="absolute left-4 top-4 z-[70] rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] backdrop-blur-sm transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                color: C.cocoa,
                background: `${C.linen}aa`,
                border: `1px solid ${C.border}`,
                opacity: 0.78,
              }}
            >
              Skip intro
            </button>
          )}

          {/* ENVELOPE, SEAL, FLAPS, INNER CARD */}
          {(sealed || opening) && (
            <ParallaxLayer
              x={parallax.x}
              y={parallax.y}
              depth={14}
              className="relative flex flex-col items-center"
              style={{ perspective: 1600 }}
            >
              <Envelope
                palette={C}
                wax={wax}
                monogram={monogram}
                motif={sealMotif}
                paper={envelopeStyle}
                addressLine={addressLine}
                unsealing={stage === "unsealing"}
                opening={stage === "envelopeOpening"}
                onOpen={openEnvelope}
                onKeyActivate={onKeyActivate}
              />
              <AnimatePresence>
                {sealed && (
                  <motion.p
                    key="hint"
                    className="mt-9 text-center text-[12px] uppercase tracking-[0.32em]"
                    style={{ color: C.cocoa }}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: [0.45, 1, 0.45] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {instruction}
                  </motion.p>
                )}
              </AnimatePresence>
            </ParallaxLayer>
          )}

          {/* 7–9, GOLDEN GATE */}
          {stage === "gate" && (
            <Gate
              palette={C}
              word={gateWord}
              coupleLine={coupleLine}
              style={gateStyle}
              parallax={parallax}
              onEnter={enterThroughGate}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Parallax                                                            */
/* ------------------------------------------------------------------ */

function ParallaxLayer({
  x,
  y,
  depth,
  className,
  style,
  children,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  depth: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const tx = useTransform(x, (v) => v * depth);
  const ty = useTransform(y, (v) => v * depth * 0.7);
  const rotateY = useTransform(x, (v) => v * (depth > 0 ? 4 : 0));
  const rotateX = useTransform(y, (v) => -v * (depth > 0 ? 3 : 0));
  return (
    <motion.div className={className} style={{ ...style, x: tx, y: ty, rotateX, rotateY }}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Envelope                                                            */
/* ------------------------------------------------------------------ */

interface PaperTheme {
  face: string;
  flap: string;
  pocket: string;
  emboss: string;
  motif: "peony" | "lace" | "botanical" | "watercolour";
}

function paperTheme(style: WeddingEnvelopeStyle, C: FaPalette): PaperTheme {
  switch (style) {
    case "ivory-lace":
      return {
        face: `linear-gradient(160deg, ${C.linen} 0%, ${C.cream} 100%)`,
        flap: `linear-gradient(180deg, ${C.linen} 0%, ${C.cream} 100%)`,
        pocket: `linear-gradient(180deg, ${C.cream} 0%, ${C.linen} 100%)`,
        emboss: C.goldSoft,
        motif: "lace",
      };
    case "champagne-botanical":
      return {
        face: `linear-gradient(160deg, ${C.cream} 0%, ${C.goldSoft} 130%)`,
        flap: `linear-gradient(180deg, ${C.cream} 0%, ${C.goldSoft} 150%)`,
        pocket: `linear-gradient(180deg, ${C.goldSoft} 0%, ${C.cream} 100%)`,
        emboss: C.sage,
        motif: "botanical",
      };
    case "rose-watercolour":
      return {
        face: `radial-gradient(120% 90% at 20% 10%, ${C.linen} 0%, ${C.blush} 45%, ${C.rose} 130%)`,
        flap: `radial-gradient(120% 140% at 50% 0%, ${C.blush} 0%, ${C.rose} 140%)`,
        pocket: `linear-gradient(180deg, ${C.rose} -20%, ${C.blush} 60%, ${C.linen} 100%)`,
        emboss: C.linen,
        motif: "watercolour",
      };
    case "blush-floral":
    default:
      return {
        face: `linear-gradient(160deg, ${C.blush} 0%, ${C.blushDeep} 100%)`,
        flap: `linear-gradient(180deg, ${C.blush} 0%, ${C.blushDeep} 100%)`,
        pocket: `linear-gradient(180deg, ${C.blushDeep} 0%, ${C.blush} 100%)`,
        emboss: C.linen,
        motif: "peony",
      };
  }
}

function Envelope({
  palette: C,
  wax,
  monogram,
  motif,
  paper,
  addressLine,
  unsealing,
  opening,
  onOpen,
  onKeyActivate,
}: {
  palette: FaPalette;
  wax: ReturnType<typeof resolveSealWax>;
  monogram: string;
  motif: WeddingSealMotif;
  paper: WeddingEnvelopeStyle;
  addressLine?: string;
  unsealing: boolean;
  opening: boolean;
  onOpen: () => void;
  onKeyActivate: (e: React.KeyboardEvent) => void;
}) {
  const theme = paperTheme(paper, C);
  const lifting = unsealing || opening;
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  /** Swipe up (or any decisive drag) across the envelope also lifts the seal. */
  const onPointerDown = (e: React.PointerEvent) => {
    if (lifting) return;
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (lifting || !start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > 28) onOpen();
  };

  return (
    <motion.div
      className="relative"
      style={{
        width: "min(88vw, 400px)",
        aspectRatio: "4 / 3",
        transformStyle: "preserve-3d",
      }}
      initial={{ scale: 0.9, opacity: 0, y: 24 }}
      animate={
        opening
          ? { scale: 1.16, opacity: 1, y: -10 }
          : unsealing
            ? { scale: 1.04, opacity: 1, y: 0 }
            : { scale: 1, opacity: 1, y: 0 }
      }
      transition={{ duration: 1, ease: EASE_SILK }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {/* Cast shadow grounding the envelope in the room */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 rounded-[50%]"
        style={{
          bottom: "-11%",
          width: "72%",
          height: "9%",
          x: "-50%",
          background: `radial-gradient(ellipse, ${C.rose}88 0%, transparent 70%)`,
          filter: "blur(6px)",
        }}
        animate={{ opacity: opening ? 0.35 : 0.7, scaleX: opening ? 1.15 : 1 }}
        transition={{ duration: 1.1, ease: EASE_SILK }}
      />

      {/* Envelope body */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[12px]"
        style={{
          background: theme.face,
          boxShadow: `0 36px 70px -26px ${C.rose}, inset 0 0 70px ${C.linen}55`,
          border: `1px solid ${C.border}`,
        }}
      >
        <PaperEmboss theme={theme} palette={C} />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(115deg, transparent 49.6%, ${C.rose}44 49.8%, transparent 50.2%),
                         linear-gradient(65deg, transparent 49.6%, ${C.rose}44 49.8%, transparent 50.2%)`,
          }}
        />
      </div>

      {/* Addressed line on the envelope face */}
      {addressLine && (
        <motion.p
          className="absolute inset-x-0 top-[13%] z-[6] text-center font-[family-name:var(--font-cormorant)] text-[11px] uppercase tracking-[0.3em]"
          style={{ color: C.cocoa }}
          animate={{ opacity: lifting ? 0 : 0.85 }}
          transition={{ duration: 0.5 }}
        >
          {addressLine}
        </motion.p>
      )}

      {/* Inner card lifting out */}
      <motion.div
        className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-[8px]"
        style={{
          width: "86%",
          height: "80%",
          x: "-50%",
          background: `linear-gradient(180deg, ${C.linen}, ${C.ivory})`,
          border: `1px solid ${C.goldSoft}`,
          boxShadow: `0 22px 46px -18px ${C.goldDeep}`,
        }}
        initial={{ y: "-50%", opacity: 0 }}
        animate={opening ? { y: "-124%", opacity: 1 } : { y: "-50%", opacity: 0 }}
        transition={{ duration: 1.2, ease: EASE_SILK, delay: opening ? 0.4 : 0 }}
      >
        <div className="text-center">
          <div className="mx-auto mb-1.5 h-px w-12" style={{ background: C.gold }} />
          <p
            className="font-[family-name:var(--font-great-vibes)] text-2xl"
            style={{ color: C.goldDeep }}
          >
            You&apos;re Invited
          </p>
          <div className="mx-auto mt-1.5 h-px w-12" style={{ background: C.gold }} />
        </div>
      </motion.div>

      {/* Side flaps, fold outward for depth as the envelope opens */}
      {(["left", "right"] as const).map((side) => (
        <motion.div
          key={side}
          aria-hidden
          className="absolute inset-y-0"
          style={{
            width: "52%",
            [side]: 0,
            transformOrigin: `${side} center`,
            transformStyle: "preserve-3d",
            background: theme.pocket,
            clipPath:
              side === "left"
                ? "polygon(0 0, 100% 50%, 0 100%)"
                : "polygon(100% 0, 0 50%, 100% 100%)",
            zIndex: 3,
            filter: "brightness(0.98)",
          }}
          initial={{ rotateY: 0 }}
          animate={{ rotateY: opening ? (side === "left" ? 34 : -34) : 0 }}
          transition={{ duration: 0.9, ease: EASE_GATE, delay: opening ? 0.1 : 0 }}
        />
      ))}

      {/* Lower front pocket, keeps the card hidden until it clears the paper */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 rounded-b-[12px]"
        style={{
          height: "58%",
          background: theme.pocket,
          clipPath: "polygon(0 34%, 50% 0, 100% 34%, 100% 100%, 0 100%)",
          borderBottom: `1px solid ${C.border}`,
          boxShadow: `inset 0 8px 18px -10px ${C.rose}`,
          zIndex: 4,
        }}
      />

      {/* Top flap, begins a soft peel as the seal lifts, then unfolds fully */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 origin-top"
        style={{
          height: "58%",
          background: theme.flap,
          clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          transformStyle: "preserve-3d",
          zIndex: opening ? 1 : 5,
          filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.07))",
        }}
        initial={{ rotateX: 0 }}
        animate={{ rotateX: opening ? -179 : unsealing ? -22 : 0 }}
        transition={{
          duration: opening ? 1.35 : 1.8,
          ease: EASE_GATE,
          delay: opening ? 0.05 : 0.35,
        }}
      />

      {/* Wax seal, lifts slowly off the paper, never breaks */}
      <motion.button
        type="button"
        onClick={onOpen}
        onKeyDown={onKeyActivate}
        data-blush-gate-seal="true"
        aria-label="Lift the wax seal to open the invitation"
        className="absolute left-1/2 top-[46%] z-20 flex items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{
          width: 82,
          height: 82,
          x: "-50%",
          cursor: lifting ? "default" : "pointer",
          transformStyle: "preserve-3d",
          perspective: 600,
        }}
        initial={{ scale: 1, opacity: 1, y: "-50%", rotateX: 0, rotateZ: 0 }}
        animate={
          opening
            ? {
                scale: 0.78,
                opacity: 0,
                y: "-320%",
                rotateX: -48,
                rotateZ: -8,
                filter: "drop-shadow(0 28px 24px rgba(74, 48, 28, 0.18))",
              }
            : unsealing
              ? {
                  scale: 1.06,
                  opacity: 1,
                  y: "-165%",
                  rotateX: -28,
                  rotateZ: -3,
                  filter: "drop-shadow(0 22px 18px rgba(74, 48, 28, 0.28))",
                }
              : {
                  scale: [1, 1.05, 1],
                  opacity: 1,
                  y: "-50%",
                  rotateX: 0,
                  rotateZ: 0,
                  filter: "drop-shadow(0 8px 10px rgba(74, 48, 28, 0.22))",
                }
        }
        transition={
          lifting
            ? {
                duration: opening ? 1.15 : 1.85,
                ease: EASE_SILK,
              }
            : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
        }
        whileHover={lifting ? undefined : { scale: 1.08 }}
        whileTap={lifting ? undefined : { scale: 0.96 }}
        disabled={lifting}
      >
        <WaxSeal monogram={monogram} motif={motif} wax={wax} lifting={unsealing} />
      </motion.button>

      {/* Soft paper contact ring left behind as the seal lifts clear */}
      <AnimatePresence>
        {unsealing && !opening && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[46%] z-[9] rounded-full"
            style={{
              width: 78,
              height: 78,
              x: "-50%",
              y: "-50%",
              border: `1px solid ${wax.deep}33`,
              boxShadow: `inset 0 0 14px ${wax.deep}22`,
              background: `radial-gradient(circle, ${C.linen}88 0%, transparent 70%)`,
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 0.7, 0.25], scale: [0.85, 1.02, 1.08] }}
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{ duration: 1.85, ease: EASE_SILK }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function WaxSeal({
  monogram,
  motif,
  wax,
  lifting,
}: {
  monogram: string;
  motif: WeddingSealMotif;
  wax: ReturnType<typeof resolveSealWax>;
  lifting: boolean;
}) {
  return (
    <span
      className="relative flex h-full w-full items-center justify-center rounded-full"
      style={{
        background: `radial-gradient(circle at 34% 28%, ${wax.light} 0%, ${wax.base} 46%, ${wax.deep} 100%)`,
        boxShadow: lifting
          ? `0 18px 28px -8px ${wax.deep}, inset 0 3px 10px ${wax.light}cc, inset 0 -6px 14px ${wax.deep}`
          : `0 10px 22px -6px ${wax.deep}, inset 0 2px 7px ${wax.light}aa, inset 0 -5px 12px ${wax.deep}`,
        border: `2px solid ${wax.light}`,
        transition: "box-shadow 1.2s ease",
      }}
    >
      {/* scalloped wax edge */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: `repeating-conic-gradient(${wax.deep} 0deg 8deg, transparent 8deg 16deg)`,
          opacity: 0.28,
          maskImage: "radial-gradient(circle, transparent 62%, #000 63%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 62%, #000 63%)",
        }}
      />
      {/* Specular highlight that brightens as the seal catches the light mid-lift */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-[12%] rounded-full"
        style={{
          background: `linear-gradient(125deg, ${wax.light}cc 0%, transparent 42%, transparent 58%, ${wax.deep}33 100%)`,
          mixBlendMode: "soft-light",
        }}
        animate={{ opacity: lifting ? [0.35, 0.85, 0.55] : 0.45 }}
        transition={{ duration: lifting ? 1.85 : 2.8, ease: EASE_SILK }}
      />
      <SealRelief motif={motif} monogram={monogram} wax={wax} />
    </span>
  );
}

function SealRelief({
  motif,
  monogram,
  wax,
}: {
  motif: WeddingSealMotif;
  monogram: string;
  wax: ReturnType<typeof resolveSealWax>;
}) {
  if (motif === "monogram") {
    return (
      <span
        className="font-[family-name:var(--font-cinzel)] text-sm font-bold tracking-tight"
        style={{ color: wax.text, textShadow: `0 1px 0 ${wax.light}` }}
      >
        {monogram}
      </span>
    );
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 60"
      className="relative h-[58%] w-[58%]"
      style={{ filter: `drop-shadow(0 1px 0 ${wax.light})` }}
    >
      <g fill="none" stroke={wax.text} strokeWidth="2" strokeLinecap="round" opacity="0.85">
        {motif === "swan" && (
          <>
            <path d="M20 44 Q16 30 26 24 Q34 19 36 12 Q40 18 36 25 Q48 30 42 44 Z" />
            <path d="M36 12 Q40 9 43 11" />
            <circle cx="37.5" cy="14" r="1" fill={wax.text} />
            <path d="M24 38 Q30 32 38 36" />
          </>
        )}
        {motif === "rose" && (
          <>
            <circle cx="30" cy="27" r="4" />
            <path d="M30 17 A10 10 0 0 1 40 27 A10 10 0 0 1 30 37 A10 10 0 0 1 20 27 A10 10 0 0 1 30 17" />
            <path d="M30 12 A15 15 0 0 1 45 27" />
            <path d="M22 44 Q30 38 38 44" />
          </>
        )}
        {motif === "laurel" && (
          <>
            <path d="M30 12 V46" />
            <path d="M30 20 Q20 18 18 26 Q27 28 30 22" />
            <path d="M30 20 Q40 18 42 26 Q33 28 30 22" />
            <path d="M30 30 Q21 29 19 36 Q28 38 30 32" />
            <path d="M30 30 Q39 29 41 36 Q32 38 30 32" />
          </>
        )}
      </g>
    </svg>
  );
}

function PaperEmboss({ theme, palette: C }: { theme: PaperTheme; palette: FaPalette }) {
  const corners = [
    [24, 28],
    [176, 28],
    [24, 122],
    [176, 122],
  ];
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 150"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      style={{ opacity: 0.55 }}
    >
      <defs>
        <linearGradient id="fa-emboss" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.emboss} stopOpacity="0.95" />
          <stop offset="1" stopColor={C.rose} stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {theme.motif === "lace" && (
        <g stroke="url(#fa-emboss)" fill="none" strokeWidth="0.8">
          {Array.from({ length: 7 }).map((_, r) =>
            Array.from({ length: 10 }).map((__, c) => (
              <circle key={`${r}-${c}`} cx={10 + c * 20} cy={12 + r * 21} r="6.5" opacity="0.6" />
            ))
          )}
        </g>
      )}

      {theme.motif === "watercolour" && (
        <g fill="url(#fa-emboss)" stroke="none">
          <ellipse cx="42" cy="40" rx="34" ry="26" opacity="0.35" />
          <ellipse cx="158" cy="112" rx="40" ry="28" opacity="0.3" />
          <ellipse cx="150" cy="34" rx="24" ry="18" opacity="0.22" />
        </g>
      )}

      {(theme.motif === "peony" || theme.motif === "botanical") &&
        corners.map(([x, y], i) => (
          <g
            key={i}
            transform={`translate(${x} ${y})`}
            stroke="url(#fa-emboss)"
            fill="none"
            strokeWidth="1.3"
          >
            <path d="M0 0 C 11 -9 20 -2 15 9 C 26 4 33 13 24 22" />
            <path d="M0 0 C -11 -9 -20 -2 -15 9 C -26 4 -33 13 -24 22" />
            <path d="M0 -2 C 4 -14 14 -16 18 -10" opacity="0.7" />
            {theme.motif === "peony" ? (
              <>
                <circle cx="0" cy="2" r="3.4" fill={C.rose} fillOpacity="0.3" stroke="none" />
                <circle cx="0" cy="2" r="6.5" opacity="0.55" />
              </>
            ) : (
              <path d="M-8 14 Q0 4 8 14" opacity="0.7" />
            )}
          </g>
        ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Gate                                                                */
/* ------------------------------------------------------------------ */

function Gate({
  palette: C,
  word,
  coupleLine,
  style,
  parallax,
  onEnter,
}: {
  palette: FaPalette;
  word: string;
  coupleLine: string;
  style: WeddingGateStyle;
  parallax: { x: MotionValue<number>; y: MotionValue<number> };
  onEnter: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: 1800 }}>
      {/* The garden beyond the gate */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2.8, ease: "easeOut", delay: 0.7 }}
        style={{
          background: `radial-gradient(72% 62% at 50% 44%, ${C.linen} 0%, ${C.blush} 58%, ${C.blushDeep} 100%)`,
        }}
      >
        <ParallaxLayer x={parallax.x} y={parallax.y} depth={-16} className="absolute inset-0">
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[160%] w-[160%] -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, rotate: -4 }}
            animate={{ opacity: 0.55, rotate: 6 }}
            transition={{ duration: 2.6, ease: "easeOut", delay: 0.7 }}
            style={{
              background: `conic-gradient(from 0deg at 50% 40%, transparent 0deg, ${C.linen}77 10deg, transparent 22deg, ${C.goldSoft}55 34deg, transparent 46deg, ${C.linen}66 60deg, transparent 74deg)`,
              maskImage: "radial-gradient(circle at 50% 40%, #000 0%, transparent 62%)",
              WebkitMaskImage: "radial-gradient(circle at 50% 40%, #000 0%, transparent 62%)",
            }}
          />
        </ParallaxLayer>

        {/* Bloom of light exactly where the gate parts */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[52vh] w-[52vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: `radial-gradient(circle, ${C.linen} 0%, ${C.goldSoft}55 40%, transparent 70%)`,
          }}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: [0, 0.95, 0.35], scale: [0.3, 1.25, 1] }}
          transition={{ duration: 2.4, ease: "easeOut", delay: 0.4 }}
        />

        <ParallaxLayer
          x={parallax.x}
          y={parallax.y}
          depth={-6}
          className="relative z-10 flex flex-col items-center"
        >
          <motion.p
            className="font-[family-name:var(--font-great-vibes)] text-6xl sm:text-7xl"
            style={{ color: C.goldDeep, textShadow: `0 2px 18px ${C.linen}` }}
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 2.2, ease: EASE_SILK, delay: 2 }}
          >
            {word}
          </motion.p>
          <motion.p
            className="mt-2 text-[11px] uppercase tracking-[0.34em]"
            style={{ color: C.cocoa }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.8, ease: EASE_SILK, delay: 3.2 }}
          >
            {coupleLine}
          </motion.p>
          <motion.button
            type="button"
            onClick={onEnter}
            aria-label="Enter through the golden gate"
            className="mt-8 rounded-full px-6 py-3 text-[11px] uppercase tracking-[0.28em] touch-manipulation"
            style={{
              color: C.cocoa,
              background: `${C.linen}ee`,
              border: `1px solid ${C.border}`,
              boxShadow: `0 12px 36px ${C.blushDeep}55`,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: EASE_SILK, delay: 3.6 }}
          >
            Enter
          </motion.button>
        </ParallaxLayer>

        {Array.from({ length: PETAL_COUNT }).map((_, i) => (
          <Petal key={i} index={i} palette={C} />
        ))}
      </motion.div>

      <GatePanel side="left" palette={C} style={style} />
      <GatePanel side="right" palette={C} style={style} />
    </div>
  );
}

function GatePanel({
  side,
  palette: C,
  style,
}: {
  side: "left" | "right";
  palette: FaPalette;
  style: WeddingGateStyle;
}) {
  const isLeft = side === "left";
  return (
    <motion.div
      className="absolute top-0 h-full overflow-hidden"
      style={{
        width: "50.5%",
        [isLeft ? "left" : "right"]: 0,
        transformOrigin: isLeft ? "left center" : "right center",
        transformStyle: "preserve-3d",
        background: `linear-gradient(${isLeft ? "90deg" : "270deg"}, ${C.cream} 0%, ${C.ivory} 55%, ${C.linen} 100%)`,
        borderRight: isLeft ? `2px solid ${C.gold}` : undefined,
        borderLeft: !isLeft ? `2px solid ${C.gold}` : undefined,
        boxShadow: `inset ${isLeft ? "-" : ""}22px 0 50px -22px ${C.goldDeep}`,
      }}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: isLeft ? -112 : 112 }}
      transition={{ duration: 3.7, ease: EASE_GATE, delay: 0.75 }}
    >
      <GateOrnament flip={!isLeft} palette={C} style={style} />
    </motion.div>
  );
}

/**
 * Ornamental ironwork drawn in layers, pier, bars, scrollwork, arch crest and
 * finials each fade in on their own beat so the gate is built in front of the
 * guest rather than dropped in as one flat picture.
 */
function GateOrnament({
  flip,
  palette: C,
  style,
}: {
  flip: boolean;
  palette: FaPalette;
  style: WeddingGateStyle;
}) {
  const isTrellis = style === "botanical-trellis";
  const isIvory = style === "ivory-arch";
  const metal = isIvory ? C.linen : C.gold;
  const metalDeep = isIvory ? C.goldSoft : C.goldDeep;
  const bars = isTrellis ? [16, 34, 52, 70, 88] : [18, 40, 62, 84];

  const layer = (delay: number) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5, delay, ease: "easeOut" as const },
  });

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 400"
      preserveAspectRatio="none"
      className="h-full w-full"
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      <defs>
        <linearGradient id={`fa-gate-${flip ? "r" : "l"}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={metalDeep} />
          <stop offset="0.45" stopColor={metal} />
          <stop offset="1" stopColor={metalDeep} />
        </linearGradient>
      </defs>

      {/* 1, masonry pier */}
      <motion.g {...layer(0)}>
        <rect x="0" y="14" width="9" height="372" fill={C.cream} opacity="0.9" />
        <rect x="0" y="14" width="9" height="372" fill="none" stroke={metalDeep} strokeWidth="0.8" opacity="0.5" />
      </motion.g>

      {/* 2, vertical bars */}
      <motion.g
        {...layer(0.1)}
        stroke={`url(#fa-gate-${flip ? "r" : "l"})`}
        strokeWidth="2.4"
        fill="none"
      >
        {bars.map((x) => (
          <line key={x} x1={x} y1="26" x2={x} y2="380" />
        ))}
        <line x1="4" y1="380" x2="98" y2="380" strokeWidth="3.4" />
        <line x1="4" y1="196" x2="98" y2="196" strokeWidth="2" opacity="0.8" />
      </motion.g>

      {/* 3, arched crest */}
      <motion.g {...layer(0.24)} stroke={metal} strokeWidth="2.6" fill="none">
        <path d="M4 66 Q50 4 98 66" />
        <path d="M4 84 Q50 26 98 84" opacity="0.75" />
        {bars.map((x) => (
          <line key={`c-${x}`} x1={x} y1="26" x2={x} y2="14" opacity="0.6" />
        ))}
      </motion.g>

      {/* 4, scrollwork */}
      <motion.g {...layer(0.36)} stroke={metal} strokeWidth="1.9" fill="none" opacity="0.85">
        {(isTrellis ? [116, 168, 220, 272, 324] : [124, 214, 304]).map((y) => (
          <g key={y}>
            <path d={`M14 ${y} Q50 ${y - 28} 90 ${y} Q50 ${y + 28} 14 ${y}`} />
            {isTrellis && <path d={`M30 ${y - 12} Q50 ${y} 30 ${y + 12}`} opacity="0.6" />}
          </g>
        ))}
      </motion.g>

      {/* 5, botanical growth on the trellis */}
      {isTrellis && (
        <motion.g {...layer(0.48)} stroke={C.sage} strokeWidth="1.6" fill="none" opacity="0.75">
          <path d="M12 380 Q30 300 20 220 Q12 150 34 80" />
          {[340, 280, 220, 160, 110].map((y) => (
            <path key={y} d={`M20 ${y} q14 -10 24 -2 q-12 10 -24 2`} fill={C.sage} fillOpacity="0.25" />
          ))}
        </motion.g>
      )}

      {/* 6, finials + medallion */}
      <motion.g {...layer(0.52)}>
        {bars.map((x) => (
          <circle key={`f-${x}`} cx={x} cy="12" r="3.2" fill={metal} opacity="0.9" />
        ))}
        <circle cx="50" cy="124" r="9" fill="none" stroke={metal} strokeWidth="2" />
        <circle cx="50" cy="124" r="4" fill={metal} opacity="0.7" />
      </motion.g>

      {/* 7, specular sheen sweeping the metal as the gate parts */}
      <motion.rect
        x="0"
        y="0"
        width="100"
        height="400"
        fill={`${C.linen}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.35, 0] }}
        transition={{ duration: 1.4, delay: 0.6, ease: "easeInOut" }}
        style={{ mixBlendMode: "soft-light" }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Atmosphere                                                          */
/* ------------------------------------------------------------------ */

function Petal({ index, palette: C }: { index: number; palette: FaPalette }) {
  const left = (index * 37) % 100;
  const delay = 0.7 + (index % 7) * 0.24;
  const size = 8 + (index % 4) * 3;
  const drift = index % 2 === 0 ? 26 : -26;
  return (
    <motion.span
      aria-hidden
      className="absolute rounded-[50%_50%_50%_0]"
      style={{
        left: `${left}%`,
        top: "-8%",
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${C.blush}, ${C.rose})`,
        boxShadow: `0 2px 6px -2px ${C.rose}`,
      }}
      initial={{ y: "-10%", x: 0, rotate: 0, opacity: 0 }}
      animate={{ y: "125%", x: [0, drift, 0], rotate: 260, opacity: [0, 0.9, 0] }}
      transition={{ duration: 4.5 + (index % 3), ease: "easeIn", delay, repeat: Infinity }}
    />
  );
}

/** Slow champagne motes that give the room air before the envelope appears. */
function Motes({ palette: C }: { palette: FaPalette }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: MOTE_COUNT }).map((_, i) => {
        const size = 2 + (i % 3);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${(i * 29) % 100}%`,
              width: size,
              height: size,
              background: C.goldSoft,
            }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.7, 0],
              y: [0, -30 - (i % 5) * 12],
              x: [0, i % 2 === 0 ? 14 : -14],
            }}
            transition={{
              duration: 6 + (i % 5),
              delay: (i % 7) * 0.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}

/** Corner botanicals framing the whole ceremony. */
function VignetteFlora({ palette: C }: { palette: FaPalette }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      style={{ opacity: 0.3 }}
    >
      {[
        { t: "translate(0 0)", s: 1 },
        { t: "translate(400 0) scale(-1 1)", s: 1 },
        { t: "translate(0 400) scale(1 -1)", s: 1 },
        { t: "translate(400 400) scale(-1 -1)", s: 1 },
      ].map((c, i) => (
        <g key={i} transform={c.t} stroke={C.sage} fill="none" strokeWidth="1.4" opacity="0.8">
          <path d="M-10 90 Q40 70 62 30 Q78 2 110 -8" />
          <path d="M20 76 q16 -14 30 -6 q-14 14 -30 6" fill={C.sage} fillOpacity="0.18" />
          <path d="M48 48 q18 -12 32 -2 q-16 12 -32 2" fill={C.rose} fillOpacity="0.16" />
          <circle cx="76" cy="22" r="5" fill={C.blush} fillOpacity="0.5" stroke="none" />
        </g>
      ))}
    </svg>
  );
}
