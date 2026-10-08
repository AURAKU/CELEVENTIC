"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { CountdownParts } from "@/hooks/use-countdown";
import { hourglassSandLevel, SERAPHINE_HOURGLASS_MS } from "@/lib/invitation/hourglass-sand";
import styles from "./seraphine-hourglass.module.css";

export { SERAPHINE_HOURGLASS_MS };

const CX = 120;
const UPPER_TOP = 64;
const UPPER_NECK = 174;
const LOWER_NECK = 178;
const LOWER_FLOOR = 288;
/** One full turn. Slow enough to read, fast enough to see within a glance. */
const IDLE_TURN_MS = 16_000;
const REST_TILT = 8;
const HEART = "♥";
const HEART_INKS = ["#d4c6a0", "#c5b48a", "#b09a6e"] as const;
const STREAM = [
  { drift: -3, delay: 0, dur: 1.12, size: 0.42 },
  { drift: 2, delay: 0.08, dur: 1.26, size: 0.36 },
  { drift: 4, delay: 0.16, dur: 1.04, size: 0.34 },
  { drift: -1, delay: 0.24, dur: 1.2, size: 0.46 },
  { drift: 1, delay: 0.32, dur: 1.14, size: 0.38 },
  { drift: -4, delay: 0.4, dur: 1.32, size: 0.33 },
  { drift: 3, delay: 0.48, dur: 1.08, size: 0.4 },
  { drift: -2, delay: 0.56, dur: 1.22, size: 0.36 },
  { drift: 5, delay: 0.64, dur: 1.16, size: 0.34 },
  { drift: 0, delay: 0.72, dur: 1.28, size: 0.44 },
  { drift: -5, delay: 0.8, dur: 1.1, size: 0.35 },
  { drift: 2, delay: 0.88, dur: 1.18, size: 0.37 },
] as const;

const UPPER_GLASS =
  "M48 66 Q48 56 62 56 L178 56 Q192 56 192 66 Q186 118 128 172 Q122 176 120 176 Q118 176 112 172 Q54 118 48 66 Z";
const LOWER_GLASS =
  "M48 286 Q48 296 62 296 L178 296 Q192 296 192 286 Q186 234 128 180 Q122 176 120 176 Q118 176 112 180 Q54 234 48 286 Z";

type PackedHeart = { x: number; y: number; ink: string; size: number; rot: number };

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function jitter(n: number, span: number) {
  return (((n * 9301 + 49297) % 233280) / 233280 - 0.5) * span;
}

function upperHalf(y: number) {
  const t = clamp01((y - 56) / 120);
  return 8 + 64 * (1 - t) * (1 - t * 0.12);
}

function lowerHalf(y: number) {
  const t = clamp01((y - 176) / 120);
  return 8 + 64 * t * (0.88 + t * 0.12);
}

function packHearts(yStart: number, yEnd: number, halfAt: (y: number) => number, seed: number): PackedHeart[] {
  const hearts: PackedHeart[] = [];
  const top = Math.min(yStart, yEnd);
  const bottom = Math.max(yStart, yEnd);
  if (bottom - top < 6) return hearts;
  let n = seed;
  for (let y = top + 5; y <= bottom - 3; y += 8.2) {
    const half = halfAt(y) * 0.9;
    if (half < 5.5) continue;
    const cols = Math.max(1, Math.round((half * 2) / 10.2));
    for (let i = 0; i < cols; i += 1) {
      const x = CX - half + ((i + 0.5) / cols) * half * 2;
      hearts.push({
        x: x + jitter(n, 2.2),
        y: y + jitter(n + 5, 1.6),
        ink: HEART_INKS[n % HEART_INKS.length],
        size: 10.4 + (n % 4) * 0.65,
        rot: jitter(n + 11, 26),
      });
      n += 1;
    }
  }
  return hearts;
}

function GoldDefs({ uid }: { uid: string }) {
  return (
    <defs>
      <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e8dcc0" />
        <stop offset="40%" stopColor="#c5b48a" />
        <stop offset="100%" stopColor="#8a7344" />
      </linearGradient>
      <linearGradient id={`${uid}-goldH`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#8a7344" />
        <stop offset="50%" stopColor="#e8dcc0" />
        <stop offset="100%" stopColor="#6e5c38" />
      </linearGradient>
      <radialGradient id={`${uid}-glass`} cx="38%" cy="28%" r="78%">
        <stop offset="0%" stopColor="rgba(232,220,192,0.18)" />
        <stop offset="55%" stopColor="rgba(197,180,138,0.04)" />
        <stop offset="100%" stopColor="rgba(197,180,138,0.16)" />
      </radialGradient>
      <radialGradient id={`${uid}-plate`} cx="50%" cy="38%" r="72%">
        <stop offset="0%" stopColor="#e8dcc0" />
        <stop offset="55%" stopColor="#c5b48a" />
        <stop offset="100%" stopColor="#8a7344" />
      </radialGradient>
      <linearGradient id={`${uid}-sand`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f3ead4" />
        <stop offset="45%" stopColor="#d4c6a0" />
        <stop offset="100%" stopColor="#a88b55" />
      </linearGradient>
      <filter id={`${uid}-soft`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="1.2" />
      </filter>
    </defs>
  );
}

function FallenSand({
  uid,
  clipTop,
  clipBot,
  upperHearts,
  lowerHearts,
  pileTop,
}: {
  uid: string;
  clipTop: string;
  clipBot: string;
  upperHearts: PackedHeart[];
  lowerHearts: PackedHeart[];
  pileTop: number;
}) {
  const pileHeight = Math.max(0, LOWER_FLOOR + 10 - pileTop);
  return (
    <>
      <g clipPath={`url(#${clipTop})`}>
        {upperHearts.map((heart, index) => (
          <text
            key={`up-${index}`}
            x={heart.x.toFixed(1)}
            y={heart.y.toFixed(1)}
            fontSize={heart.size}
            fill={heart.ink}
            fontFamily="Georgia, 'Times New Roman', serif"
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(${heart.rot.toFixed(1)} ${heart.x.toFixed(1)} ${heart.y.toFixed(1)})`}
          >
            {HEART}
          </text>
        ))}
      </g>
      <g clipPath={`url(#${clipBot})`}>
        {pileHeight > 2 ? (
          <rect x="28" y={pileTop} width="184" height={pileHeight} fill={`url(#${uid}-sand)`} />
        ) : null}
        {lowerHearts.map((heart, index) => (
          <text
            key={`lo-${index}`}
            x={heart.x.toFixed(1)}
            y={heart.y.toFixed(1)}
            fontSize={heart.size}
            fill={heart.ink}
            fontFamily="Georgia, 'Times New Roman', serif"
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(${heart.rot.toFixed(1)} ${heart.x.toFixed(1)} ${heart.y.toFixed(1)})`}
          >
            {HEART}
          </text>
        ))}
      </g>
    </>
  );
}

function CapsAndGlass({ uid, breathe }: { uid: string; breathe?: boolean }) {
  return (
    <g className={breathe ? styles.breathe : undefined}>
      <path d="M44 48 L196 48 Q204 48 204 56 L204 64 L36 64 L36 56 Q36 48 44 48 Z" fill={`url(#${uid}-gold)`} />
      <rect x="40" y="58" width="160" height="5" rx="1" fill={`url(#${uid}-goldH)`} />
      <circle cx={CX} cy="40" r="3.5" fill="none" stroke="#e8dcc0" strokeWidth="1.35" />
      <circle cx={CX} cy="40" r="1.2" fill="#c5b48a" />
      <path d={UPPER_GLASS} fill={`url(#${uid}-glass)`} stroke="#c5b48a" strokeWidth="1.4" />
      <path d={LOWER_GLASS} fill={`url(#${uid}-glass)`} stroke="#c5b48a" strokeWidth="1.4" />
      <path d="M72 60 Q120 50 168 60" fill="none" stroke="rgba(232,220,192,0.5)" strokeWidth="1.7" strokeLinecap="round" />
      <ellipse cx={CX} cy="176" rx="14" ry="5" fill={`url(#${uid}-gold)`} />
      <ellipse cx={CX} cy="176" rx="6" ry="2.1" fill={`url(#${uid}-goldH)`} opacity="0.75" />
      <path d="M44 304 L196 304 Q204 304 204 296 L204 288 L36 288 L36 296 Q36 304 44 304 Z" fill={`url(#${uid}-gold)`} />
      <rect x="40" y="289" width="160" height="5" rx="1" fill={`url(#${uid}-goldH)`} />
    </g>
  );
}

export function SeraphineHourglass({
  count,
  monogram,
  coupleLine,
  dateLine,
  dial = "dark",
  ink,
  labelInk,
  rule,
}: {
  count: CountdownParts;
  monogram?: string | null;
  coupleLine?: string | null;
  dateLine?: string | null;
  /** Pale gold figures are for a dark countdown field. Ivory pages need ink. */
  dial?: "dark" | "light";
  ink?: string;
  labelInk?: string;
  rule?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const frontId = `${uid}f`;
  const backId = `${uid}b`;
  const { remain, spent } = hourglassSandLevel(count.remainingMs, count.begun);
  const flowing = remain > 0.004 && !count.begun;
  const clipTop = `hour-top-${uid}`;
  const clipBot = `hour-bot-${uid}`;
  const sandTop = UPPER_NECK - (UPPER_NECK - UPPER_TOP) * remain;
  const pileTop = LOWER_FLOOR - (LOWER_FLOOR - LOWER_NECK) * spent;
  const fromPct = ((sandTop - 8) / 340) * 100;
  const landPct = ((pileTop - 8) / 340) * 100;
  const upperHearts = useMemo(() => packHearts(sandTop, UPPER_NECK - 2, upperHalf, 3), [sandTop]);
  const lowerHearts = useMemo(() => packHearts(pileTop, LOWER_FLOOR - 6, lowerHalf, 41), [pileTop]);
  const tickHearts = useMemo(
    () =>
      STREAM.slice(0, 5).map((heart, index) => ({
        ...heart,
        id: `tick-${count.s}-${index}`,
        delay: index * 0.06,
      })),
    [count.s]
  );

  const turnRef = useRef<HTMLDivElement>(null);
  const spin = useRef({ x: REST_TILT, y: 0 });
  const velocity = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; t: number } | null>(null);
  /** True while this component, not the CSS turn, owns the transform. */
  const ownsTurn = useRef(false);
  const [held, setHeld] = useState(false);

  const paint = () => {
    const node = turnRef.current;
    if (!node) return;
    const { x, y } = spin.current;
    node.style.transform = `rotateX(${x.toFixed(2)}deg) rotateY(${y.toFixed(2)}deg)`;
  };

  const readYaw = () => {
    const node = turnRef.current;
    if (!node) return spin.current.y;
    const running = node.getAnimations().find((item) => item.playState !== "finished");
    const timing = running?.effect && "getComputedTiming" in running.effect ? running.effect.getComputedTiming() : null;
    const duration = Number(timing?.duration);
    const time = Number(running?.currentTime);
    if (duration > 0 && Number.isFinite(time)) {
      return ((time % duration) / duration) * 360;
    }
    return spin.current.y;
  };

  const takeOver = () => {
    const node = turnRef.current;
    if (!node) return;
    spin.current.y = readYaw();
    node.style.animation = "none";
    ownsTurn.current = true;
    paint();
  };

  useEffect(() => {
    const node = turnRef.current;
    const animated = node ? getComputedStyle(node).animationName : "none";
    if (!animated || animated === "none") {
      ownsTurn.current = true;
      paint();
    }

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(34, now - last);
      last = now;
      if (ownsTurn.current && !drag.current) {
        if (Math.abs(velocity.current) > 0.12) {
          spin.current.y += velocity.current * (dt / 16.67);
          velocity.current *= 0.94;
        } else {
          velocity.current = 0;
          spin.current.y += (360 / IDLE_TURN_MS) * dt;
        }
        spin.current.x += (REST_TILT - spin.current.x) * 0.08;
        paint();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    takeOver();
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now() };
    velocity.current = 0;
    setHeld(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const now = performance.now();
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const dt = Math.max(10, now - start.t);
    spin.current.y += dx * 0.62;
    spin.current.x = Math.max(-22, Math.min(24, spin.current.x - dy * 0.16));
    velocity.current = (dx / dt) * 14;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, t: now };
    paint();
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    drag.current = null;
    setHeld(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    spin.current.y += event.key === "ArrowRight" ? 24 : -24;
    velocity.current = 0;
    paint();
  }

  return (
    <div
      className={styles.stage}
      data-surface={dial}
      style={
        {
          "--hour-num": ink,
          "--hour-label": labelInk,
          "--hour-rule": rule,
        } as CSSProperties
      }
    >
      <div className={styles.scene}>
        <div
          className={styles.glassWrap}
          data-complete={count.begun ? "true" : "false"}
          data-held={held ? "true" : "false"}
          role="group"
          tabIndex={0}
          aria-label="Hourglass of champagne-gold hearts, slowly turning. Drag or use arrow keys to spin and see the back."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
        >
          <div ref={turnRef} className={styles.turntable}>
            <div className={`${styles.face} ${styles.faceFront}`}>
              <svg className={styles.svg} viewBox="0 8 240 340" role="img" aria-hidden>
                <GoldDefs uid={frontId} />
                <defs>
                  <clipPath id={clipTop}>
                    <path d={UPPER_GLASS} />
                  </clipPath>
                  <clipPath id={clipBot}>
                    <path d={LOWER_GLASS} />
                  </clipPath>
                </defs>
                <ellipse cx={CX} cy="318" rx="62" ry="7" fill="rgba(197,180,138,0.3)" filter={`url(#${frontId}-soft)`} />
                <CapsAndGlass uid={frontId} breathe={!held} />
                <FallenSand
                  uid={frontId}
                  clipTop={clipTop}
                  clipBot={clipBot}
                  upperHearts={upperHearts}
                  lowerHearts={lowerHearts}
                  pileTop={pileTop}
                />
              </svg>
              {flowing ? (
                <div
                  className={styles.pourField}
                  aria-hidden
                  style={
                    {
                      "--heart-from": `${fromPct.toFixed(2)}%`,
                      "--heart-land": `${landPct.toFixed(2)}%`,
                    } as CSSProperties
                  }
                >
                  {STREAM.map((heart, index) => (
                    <span
                      key={`stream-${index}`}
                      className={styles.heart}
                      style={
                        {
                          "--drift": `${heart.drift}px`,
                          "--heart-delay": `${heart.delay}s`,
                          "--heart-dur": `${heart.dur}s`,
                          "--heart-size": `${heart.size}rem`,
                        } as CSSProperties
                      }
                    >
                      {HEART}
                    </span>
                  ))}
                  {tickHearts.map((heart) => (
                    <span
                      key={heart.id}
                      className={`${styles.heart} ${styles.heartTick}`}
                      style={
                        {
                          "--drift": `${heart.drift}px`,
                          "--heart-delay": `${heart.delay}s`,
                          "--heart-dur": `${heart.dur * 0.9}s`,
                          "--heart-size": `${heart.size}rem`,
                        } as CSSProperties
                      }
                    >
                      {HEART}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className={`${styles.face} ${styles.faceBack}`} aria-hidden>
              <svg className={styles.svg} viewBox="0 8 240 340">
                <GoldDefs uid={backId} />
                <defs>
                  <clipPath id={`${clipTop}-back`}>
                    <path d={UPPER_GLASS} />
                  </clipPath>
                  <clipPath id={`${clipBot}-back`}>
                    <path d={LOWER_GLASS} />
                  </clipPath>
                </defs>
                <ellipse cx={CX} cy="318" rx="62" ry="7" fill="rgba(197,180,138,0.28)" filter={`url(#${backId}-soft)`} />
                <CapsAndGlass uid={backId} />
                <FallenSand
                  uid={backId}
                  clipTop={`${clipTop}-back`}
                  clipBot={`${clipBot}-back`}
                  upperHearts={upperHearts}
                  lowerHearts={lowerHearts}
                  pileTop={pileTop}
                />
                <ellipse cx={CX} cy="168" rx="54" ry="62" fill={`url(#${backId}-plate)`} stroke="#c5b48a" strokeWidth="1.2" />
                <ellipse cx={CX} cy="168" rx="46" ry="54" fill="none" stroke="rgba(232,220,192,0.35)" strokeWidth="0.7" />
                {monogram?.trim() ? (
                  <text
                    x={CX}
                    y="148"
                    textAnchor="middle"
                    fill="#5c4a28"
                    fontSize="11"
                    letterSpacing="2.4"
                    fontFamily="var(--aurelia-display)"
                  >
                    {monogram.trim()}
                  </text>
                ) : null}
                {coupleLine?.trim() ? (
                  <text
                    x={CX}
                    y="176"
                    textAnchor="middle"
                    fill="#3f331c"
                    fontSize={coupleLine.trim().length > 18 ? 13 : 17}
                    fontFamily="var(--aurelia-script)"
                  >
                    {coupleLine.trim()}
                  </text>
                ) : null}
                {dateLine?.trim() ? (
                  <text
                    x={CX}
                    y="196"
                    textAnchor="middle"
                    fill="#6a5730"
                    fontSize={dateLine.trim().length > 22 ? 6.5 : 8}
                    letterSpacing="1.2"
                    fontFamily="var(--aurelia-display)"
                  >
                    {dateLine.trim()}
                  </text>
                ) : null}
                <text x={CX} y="214" textAnchor="middle" fontSize="11" fill="#c5b48a">
                  {HEART}
                </text>
              </svg>
            </div>
            <span className={`${styles.slab} ${styles.slabTop}`} aria-hidden />
            <span className={`${styles.slab} ${styles.slabFoot}`} aria-hidden />
          </div>
        </div>
      </div>
      <div className={styles.dial}>
        {(
          [
            ["days", count.d],
            ["hours", count.h],
            ["minutes", count.m],
            ["seconds", count.s],
          ] as const
        ).map(([label, value], index) => (
          <div className={styles.cell} key={label} data-unit={label}>
            {index > 0 ? <span className={styles.sep} aria-hidden /> : null}
            <span className={styles.num} key={`${label}-${value}`}>
              {pad(value)}
            </span>
            <span className={styles.label}>{label}</span>
          </div>
        ))}
      </div>
      {count.begun ? (
        <p className={styles.finale}>The hour has come</p>
      ) : (
        <p className={styles.kicker}>The glass keeps our promise</p>
      )}
    </div>
  );
}
