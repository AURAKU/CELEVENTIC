"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

export type CurtainTheme = "wedding" | "concert" | "award" | "birthday" | "corporate";

interface CurtainRevealProps {
  eventTitle: string;
  guestName?: string;
  theme?: CurtainTheme;
  onComplete: () => void;
  /** Fires synchronously on the user gesture that starts the open (audio unlock). */
  onBegin?: () => void;
  children?: ReactNode;
  /** Catalogue glimpse: closed curtains only — absolute fill, no open gesture. */
  staticPreview?: boolean;
}

const CURTAIN_THEMES: Record<
  CurtainTheme,
  {
    velvet: string;
    velvetDeep: string;
    fold: string;
    trim: string;
    hem: string;
    stage: string;
    label: string;
  }
> = {
  wedding: {
    // Theatrical crimson velvet (Kente flagship) — gold trim carries heritage.
    velvet: "#B01022",
    velvetDeep: "#6A0814",
    fold: "rgba(255, 230, 220, 0.18)",
    trim: "#D4A63A",
    hem: "rgba(228, 234, 242, 0.95)",
    stage: "#140408",
    label: "Reveal invitation",
  },
  concert: {
    velvet: "#1a1a2e",
    velvetDeep: "#0a0a14",
    fold: "rgba(125, 211, 252, 0.12)",
    trim: "#7dd3fc",
    hem: "rgba(180, 220, 255, 0.35)",
    stage: "#050508",
    label: "Reveal invitation",
  },
  award: {
    velvet: "#2d1f0f",
    velvetDeep: "#120c06",
    fold: "rgba(212, 166, 58, 0.14)",
    trim: "#D4A63A",
    hem: "rgba(245, 230, 184, 0.4)",
    stage: "#0a0806",
    label: "Reveal invitation",
  },
  birthday: {
    velvet: "#6d28d9",
    velvetDeep: "#3b0764",
    fold: "rgba(251, 191, 36, 0.12)",
    trim: "#fbbf24",
    hem: "rgba(253, 230, 138, 0.35)",
    stage: "#1a0a2e",
    label: "Reveal invitation",
  },
  corporate: {
    velvet: "#1e3a5f",
    velvetDeep: "#0c1a2e",
    fold: "rgba(56, 189, 248, 0.1)",
    trim: "#38bdf8",
    hem: "rgba(186, 230, 253, 0.35)",
    stage: "#0a1628",
    label: "Reveal invitation",
  },
};

/** Heavy velvet ease — slow start, decisive finish (~2.5–3.5s theatrical part). */
const OPEN_EASE = "cubic-bezier(0.22, 0.61, 0.18, 1)";
export const CURTAIN_OPEN_MS = 3000;
export const CURTAIN_OPEN_REDUCED_MS = 700;
const OPEN_MS = CURTAIN_OPEN_MS;
const OPEN_REDUCED_MS = CURTAIN_OPEN_REDUCED_MS;

const FOLD_POSITIONS = [
  4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59, 64, 69, 74, 79, 84, 89, 94,
];

type Phase = "closed" | "opening" | "done";

function CurtainPanel({
  side,
  colors,
  opened,
  durationMs,
  reducedMotion,
  weddingTrim,
}: {
  side: "left" | "right";
  colors: (typeof CURTAIN_THEMES)[CurtainTheme];
  opened: boolean;
  durationMs: number;
  reducedMotion: boolean;
  weddingTrim: boolean;
}) {
  const isLeft = side === "left";
  const translate = opened ? (isLeft ? "translateX(-102%)" : "translateX(102%)") : "translateX(0)";
  // Soft gather toward the outer edge as curtains part (theatrical hourglass).
  const skew =
    opened && !reducedMotion ? (isLeft ? "skewY(-1.5deg)" : "skewY(1.5deg)") : "skewY(0deg)";
  const scaleX = opened && !reducedMotion ? 0.92 : 1;

  return (
    <div
      className="absolute top-0 bottom-0 z-20 overflow-hidden"
      style={{
        left: isLeft ? 0 : "50%",
        width: "50.5%",
        transform: `${translate} ${skew} scaleX(${scaleX})`,
        transformOrigin: isLeft ? "left center" : "right center",
        transition: reducedMotion
          ? `opacity ${durationMs}ms ease, transform ${durationMs}ms ease`
          : `transform ${durationMs}ms ${OPEN_EASE}`,
        opacity: opened && reducedMotion ? 0 : 1,
        willChange: "transform, opacity",
      }}
      aria-hidden
    >
      {/* Velvet body */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${isLeft ? "90deg" : "270deg"}, ${colors.velvetDeep} 0%, ${colors.velvet} 42%, ${colors.velvetDeep} 100%)`,
          boxShadow: isLeft
            ? "inset -18px 0 40px rgba(0,0,0,0.45), 8px 0 28px rgba(0,0,0,0.35)"
            : "inset 18px 0 40px rgba(0,0,0,0.45), -8px 0 28px rgba(0,0,0,0.35)",
        }}
      />

      {/* Vertical fold filaments */}
      <div className="absolute inset-0 pointer-events-none">
        {FOLD_POSITIONS.map((pct, i) => (
          <span
            key={`${side}-${pct}`}
            className="absolute top-0 bottom-0"
            style={{
              left: `${pct}%`,
              width: i % 3 === 0 ? 2 : 1,
              background: `linear-gradient(180deg, transparent 0%, ${colors.fold} 12%, ${colors.fold} 88%, transparent 100%)`,
              opacity: 0.55 + (i % 4) * 0.08,
              transform: `translateX(${Math.sin(i) * 1.2}px)`,
            }}
          />
        ))}
      </div>

      {/* Inner edge gold / kente trim (wedding) */}
      {weddingTrim ? (
        <div
          className="absolute top-0 bottom-0 w-[6px] sm:w-[7px]"
          style={{
            [isLeft ? "right" : "left"]: 0,
            background: `repeating-linear-gradient(
              180deg,
              ${colors.trim} 0px,
              ${colors.trim} 10px,
              #8B6914 10px,
              #8B6914 14px,
              #F5E6B8 14px,
              #F5E6B8 18px,
              #A16207 18px,
              #A16207 22px
            )`,
            boxShadow: `0 0 14px ${colors.trim}55`,
          }}
        />
      ) : (
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            [isLeft ? "right" : "left"]: 0,
            background: `${colors.trim}66`,
          }}
        />
      )}

      {/* Soft top valence shadow */}
      <div
        className="absolute inset-x-0 top-0 h-16 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)",
        }}
      />

      {/* Scalloped hem */}
      <div
        className="absolute inset-x-0 bottom-0 h-7 sm:h-8 pointer-events-none"
        style={{
          background: colors.hem,
          clipPath:
            "polygon(0% 35%, 3% 100%, 6% 35%, 9% 100%, 12% 35%, 15% 100%, 18% 35%, 21% 100%, 24% 35%, 27% 100%, 30% 35%, 33% 100%, 36% 35%, 39% 100%, 42% 35%, 45% 100%, 48% 35%, 51% 100%, 54% 35%, 57% 100%, 60% 35%, 63% 100%, 66% 35%, 69% 100%, 72% 35%, 75% 100%, 78% 35%, 81% 100%, 84% 35%, 87% 100%, 90% 35%, 93% 100%, 96% 35%, 100% 100%, 100% 100%, 0% 100%)",
          opacity: 0.95,
        }}
      />
    </div>
  );
}

/**
 * Theatrical stage curtains — closed until tap / Enter / Space, then part
 * left+right to reveal the invitation. Wedding theme uses deep velvet with
 * optional kente gold trim.
 */
export function CurtainReveal({
  eventTitle,
  guestName,
  theme = "wedding",
  onComplete,
  onBegin,
  children,
  staticPreview = false,
}: CurtainRevealProps) {
  const colors = CURTAIN_THEMES[theme];
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("closed");
  const started = useRef(false);
  const completeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const durationMs = reduceMotion ? OPEN_REDUCED_MS : OPEN_MS;
  const weddingTrim = theme === "wedding";

  const finish = useCallback(() => {
    setPhase("done");
    onComplete();
  }, [onComplete]);

  const beginOpen = useCallback(() => {
    if (staticPreview || started.current) return;
    started.current = true;
    onBegin?.();
    setPhase("opening");
    completeTimer.current = setTimeout(finish, durationMs + 80);
  }, [durationMs, finish, onBegin, staticPreview]);

  useEffect(() => {
    return () => {
      if (completeTimer.current) clearTimeout(completeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (staticPreview || phase !== "closed") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        beginOpen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beginOpen, phase, staticPreview]);

  if (phase === "done") return null;

  const opened = phase === "opening";

  return (
    <div
      className={
        staticPreview
          ? "absolute inset-0 overflow-hidden pointer-events-none"
          : "fixed inset-0 z-[100] invite-viewport-live safe-area-pt safe-area-pb overflow-hidden"
      }
      style={{ background: colors.stage }}
      role={staticPreview ? "img" : "dialog"}
      aria-modal={staticPreview ? undefined : true}
      aria-label={
        phase === "closed"
          ? `Stage curtains closed. ${colors.label} for ${eventTitle}.`
          : `Curtains opening for ${eventTitle}.`
      }
    >
      {/* Invitation peeks behind as curtains part */}
      <div
        className="absolute inset-0 z-0"
        style={{
          opacity: opened ? 1 : 0,
          transition: `opacity ${Math.min(durationMs, 900)}ms ease`,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        {children}
      </div>

      {/* Soft stage glow behind the seam */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none"
        style={{
          background:
            theme === "wedding"
              ? "radial-gradient(ellipse 55% 40% at 50% 45%, rgba(212,166,58,0.12), transparent 70%)"
              : "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(255,255,255,0.06), transparent 70%)",
          opacity: opened ? 0 : 1,
          transition: `opacity ${durationMs}ms ease`,
        }}
      />

      <CurtainPanel
        side="left"
        colors={colors}
        opened={opened}
        durationMs={durationMs}
        reducedMotion={Boolean(reduceMotion)}
        weddingTrim={weddingTrim}
      />
      <CurtainPanel
        side="right"
        colors={colors}
        opened={opened}
        durationMs={durationMs}
        reducedMotion={Boolean(reduceMotion)}
        weddingTrim={weddingTrim}
      />

      {/* Center seam catch while closed */}
      {phase === "closed" && (
        <div
          className="absolute inset-y-0 left-1/2 z-30 w-px -translate-x-1/2 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, transparent, ${colors.trim}55, transparent)`,
          }}
          aria-hidden
        />
      )}

      {/* Tap affordance — full-stage hit target while closed */}
      {!staticPreview && phase === "closed" && (
        <button
          type="button"
          onClick={beginOpen}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 px-6 touch-manipulation bg-transparent border-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-8px] focus-visible:outline-white/80"
          aria-label={`${colors.label}. ${eventTitle}`}
        >
          <div className="pointer-events-none text-center max-w-sm">
            {guestName ? (
              <p
                className="text-[11px] uppercase tracking-[0.35em] mb-3"
                style={{ color: `${colors.trim}cc` }}
              >
                Dear {guestName}
              </p>
            ) : null}
            <p
              className="font-display text-lg sm:text-xl font-semibold leading-snug px-2"
              style={{ color: "#F8F0E3", textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}
            >
              {eventTitle}
            </p>
            <span
              className="mt-8 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs font-semibold tracking-[0.18em] uppercase"
              style={{
                color: colors.velvetDeep,
                background: `linear-gradient(180deg, ${colors.trim}, #B8860B)`,
                boxShadow: `0 4px 24px ${colors.trim}44`,
              }}
            >
              Touch to begin
            </span>
            <p className="mt-3 text-[11px] tracking-wide" style={{ color: "rgba(255,245,235,0.55)" }}>
              {reduceMotion ? "Opens with a gentle fade" : "Curtains part to reveal your invitation"}
            </p>
          </div>
        </button>
      )}

      {!staticPreview && (
        <p className="sr-only" aria-live="polite">
          {phase === "closed"
            ? "Curtains are closed. Touch to begin or press Enter to reveal the invitation."
            : "Curtains are opening."}
        </p>
      )}
    </div>
  );
}
