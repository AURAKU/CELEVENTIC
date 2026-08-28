"use client";

import { Component, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import {
  FASHION_DOORS_OPEN_MS,
  FASHION_EXIT_POINTER_MS,
  FASHION_REDUCED_OPEN_MS,
  FASHION_SILK_DRAG_PX,
  FASHION_SILK_OPEN_MS,
  FASHION_WHISPER_MS,
  fashionTokenStyle,
  useGestureArming,
  type FashionOpeningPhase,
  type LuxuryFashionHouseConfig,
} from "@/lib/experience/luxury-fashion";
import { trackFashionAction } from "@/lib/experience/luxury-fashion/analytics";
import { FEMMORA_CATALOG_SLUG } from "@/lib/experience/luxury-fashion/femmora-preset";
import { forceUnlockRevealScroll } from "@/lib/experience-engine/reveal-runtime";
import styles from "./luxury-fashion-opening.module.css";

export interface LuxuryFashionOpeningExperienceProps {
  house: LuxuryFashionHouseConfig;
  eventTitle: string;
  guestName?: string;
  onBegin?: () => void;
  onComplete: () => void;
  embedded?: boolean;
  allowSkip?: boolean;
}

class FashionOpeningFallback extends Component<
  { onContinue: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className={styles.fallback} data-testid="fashion-opening-fallback">
          <p>The unveiling could not complete.</p>
          <button type="button" onClick={this.props.onContinue}>
            Continue to the invitation
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function LuxuryFashionOpeningExperience(props: LuxuryFashionOpeningExperienceProps) {
  return (
    <FashionOpeningFallback onContinue={props.onComplete}>
      <LuxuryFashionOpeningStage {...props} />
    </FashionOpeningFallback>
  );
}

function LuxuryFashionOpeningStage({
  house,
  eventTitle,
  guestName,
  onBegin,
  onComplete,
  embedded = false,
  allowSkip = false,
}: LuxuryFashionOpeningExperienceProps) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<FashionOpeningPhase>("whisper");
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [silkDraw, setSilkDraw] = useState(0);
  const started = useRef(false);
  const completed = useRef(false);
  const timers = useRef<number[]>([]);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const silkArmed = useGestureArming(phase === "arming-silk" || phase === "silk");
  const doorsArmed = useGestureArming(phase === "arming-doors" || phase === "doors");

  const silkInteractive = (phase === "silk" || phase === "arming-silk") && silkArmed;
  const doorsInteractive = (phase === "doors" || phase === "arming-doors") && doorsArmed;
  const whispering = phase === "whisper";
  const exiting =
    phase === "silk-opening" || phase === "doors-opening" || phase === "complete";

  useEffect(() => {
    trackFashionAction("intro_viewed", { templateSlug: FEMMORA_CATALOG_SLUG });
  }, []);

  useEffect(() => {
    if (phase !== "whisper") return;
    const ms = reduceMotion ? FASHION_REDUCED_OPEN_MS : FASHION_WHISPER_MS;
    const id = window.setTimeout(() => setPhase("arming-silk"), ms);
    timers.current.push(id);
    return () => window.clearTimeout(id);
  }, [phase, reduceMotion]);

  useEffect(() => {
    if (phase === "arming-silk" && silkArmed) setPhase("silk");
  }, [phase, silkArmed]);

  useEffect(() => {
    if (phase === "arming-doors" && doorsArmed) setPhase("doors");
  }, [phase, doorsArmed]);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    },
    []
  );

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    trackFashionAction("unveil_completed", { templateSlug: FEMMORA_CATALOG_SLUG });
    forceUnlockRevealScroll();
    timers.current.push(
      window.setTimeout(() => {
        forceUnlockRevealScroll();
        onComplete();
        window.setTimeout(forceUnlockRevealScroll, 50);
      }, reduceMotion ? 40 : FASHION_EXIT_POINTER_MS)
    );
  }, [onComplete, reduceMotion]);

  const openDoors = useCallback(() => {
    if (!doorsInteractive || started.current) return;
    started.current = true;
    setPhase("doors-opening");
    const ms = reduceMotion ? FASHION_REDUCED_OPEN_MS : FASHION_DOORS_OPEN_MS;
    timers.current.push(
      window.setTimeout(() => {
        setPhase("complete");
        finish();
      }, ms)
    );
  }, [doorsInteractive, finish, reduceMotion]);

  const openSilk = useCallback(() => {
    if (!silkInteractive || started.current) return;
    started.current = true;
    dragOrigin.current = null;
    setSilkDraw(1);
    onBegin?.();
    trackFashionAction("unveil_started", { templateSlug: FEMMORA_CATALOG_SLUG });
    setPhase("silk-opening");
    const ms = reduceMotion ? FASHION_REDUCED_OPEN_MS : FASHION_SILK_OPEN_MS;
    timers.current.push(
      window.setTimeout(() => {
        started.current = false;
        setPhase("arming-doors");
      }, ms)
    );
  }, [onBegin, reduceMotion, silkInteractive]);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (reduceMotion || exiting) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setPointer({
        x: (event.clientX - rect.left) / rect.width - 0.5,
        y: (event.clientY - rect.top) / rect.height - 0.5,
      });
      if (!dragOrigin.current || !silkInteractive) return;
      const dx = event.clientX - dragOrigin.current.x;
      const dy = event.clientY - dragOrigin.current.y;
      const dist = Math.hypot(dx, dy);
      setSilkDraw(Math.min(1, dist / 160));
      if (dist >= FASHION_SILK_DRAG_PX) openSilk();
    },
    [exiting, openSilk, reduceMotion, silkInteractive]
  );

  const onSilkPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!silkInteractive) return;
      dragOrigin.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [silkInteractive]
  );

  const onSilkPointerUp = useCallback(() => {
    dragOrigin.current = null;
    if (phase === "silk" || phase === "arming-silk") setSilkDraw(0);
  }, [phase]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (silkInteractive) openSilk();
        else if (doorsInteractive) openDoors();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doorsInteractive, openDoors, openSilk, silkInteractive]);

  const silkOpen =
    phase === "silk-opening" ||
    phase === "arming-doors" ||
    phase === "doors" ||
    phase === "doors-opening" ||
    phase === "complete";
  const doorsOpen = phase === "doors-opening" || phase === "complete";
  const showDoors = silkOpen;
  const label = showDoors
    ? `Open the ${house.houseName} entrance`
    : whispering
      ? house.whisperLine
      : `Draw the silk to unveil ${house.houseName}`;

  return (
    <div
      ref={rootRef}
      className={`${styles.stage} ${embedded ? styles.stageEmbedded : ""} ${exiting ? styles.stageExiting : ""} ${whispering ? styles.stageWhisper : ""}`}
      style={{
        ...fashionTokenStyle(),
        ["--pointer-x" as string]: String(pointer.x),
        ["--pointer-y" as string]: String(pointer.y),
        ["--silk-draw" as string]: String(silkDraw),
      } as CSSProperties}
      data-testid="luxury-fashion-opening"
      data-fashion-phase={phase}
      data-fashion-armed={String(silkInteractive || doorsInteractive)}
      data-silk-style={house.silkStyle}
      onPointerMove={onPointerMove}
    >
      <div className={styles.light} aria-hidden />
      <div className={styles.grain} aria-hidden />

      {showDoors ? (
        <div className={styles.doors} aria-hidden={phase === "doors" ? undefined : true}>
          <div
            className={`${styles.panel} ${styles.panelLeft} ${
              doorsOpen ? (reduceMotion ? styles.reducedDoorLeft : styles.panelOpenLeft) : ""
            }`}
          >
            <span className={`${styles.edge} ${styles.edgeLeft}`} />
            <span className={styles.sheen} />
          </div>
          <div
            className={`${styles.panel} ${styles.panelRight} ${
              doorsOpen ? (reduceMotion ? styles.reducedDoorRight : styles.panelOpenRight) : ""
            }`}
          >
            <span className={`${styles.edge} ${styles.edgeRight}`} />
            <span className={styles.sheen} />
          </div>
        </div>
      ) : null}

      <div className={styles.silk} aria-hidden>
        <div
          className={`${styles.silkLeft} ${
            silkOpen
              ? reduceMotion
                ? styles.reducedOpenLeft
                : styles.openLeft
              : whispering && !reduceMotion
                ? styles.breatheLeft
                : ""
          }`}
        >
          <span className={styles.silkFold} />
        </div>
        <div
          className={`${styles.silkRight} ${
            silkOpen
              ? reduceMotion
                ? styles.reducedOpenRight
                : styles.openRight
              : whispering && !reduceMotion
                ? styles.breatheRight
                : ""
          }`}
        >
          <span className={styles.silkFold} />
        </div>
      </div>

      <div className={styles.mark}>
        <div className={styles.monogram} aria-hidden>
          {house.monogram}
        </div>
        {whispering ? (
          <p className={styles.whisperLine}>{house.whisperLine}</p>
        ) : showDoors ? (
          <>
            <p className={styles.house}>{house.houseName}</p>
            <p className={styles.whisper}>{house.portalWelcome}</p>
            <p className={styles.hint}>{house.portalPrompt}</p>
          </>
        ) : (
          <>
            <p className={styles.house}>{house.houseName}</p>
            <p className={styles.whisper}>{house.unveilingLabel}</p>
            <p className={styles.hint}>{reduceMotion ? "Reveal" : "Draw the silk"}</p>
          </>
        )}
        {guestName && !whispering ? (
          <p className={styles.whisper} style={{ marginTop: "0.4rem", letterSpacing: "0.16em" }}>
            For {guestName}
          </p>
        ) : null}
        <span className="sr-only">{eventTitle}</span>
      </div>

      <button
        type="button"
        className={styles.hit}
        data-testid={showDoors ? "fashion-boutique-portal" : "fashion-silk-stage"}
        aria-label={label}
        disabled={exiting || whispering || !(silkInteractive || doorsInteractive)}
        onPointerDown={showDoors ? undefined : onSilkPointerDown}
        onPointerUp={showDoors ? undefined : onSilkPointerUp}
        onPointerCancel={showDoors ? undefined : onSilkPointerUp}
        onClick={showDoors ? openDoors : openSilk}
      />

      {allowSkip ? (
        <button type="button" className={styles.skip} onClick={finish}>
          Skip ceremony
        </button>
      ) : null}
    </div>
  );
}
