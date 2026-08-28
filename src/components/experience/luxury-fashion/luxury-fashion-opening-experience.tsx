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
  fashionTokenStyleForSilk,
  resolveFashionFilm,
  type FashionOpeningPhase,
  type LuxuryFashionHouseConfig,
} from "@/lib/experience/luxury-fashion";
import { useGestureArming } from "@/lib/experience/luxury-fashion/gesture-arming";
import { trackFashionAction } from "@/lib/experience/luxury-fashion/analytics";
import { LUXURY_FASHION_LAYOUT_SLUG } from "@/lib/experience/luxury-fashion/femmora-preset";
import { forceUnlockRevealScroll } from "@/lib/experience-engine/reveal-runtime";
import { FashionFilmScene } from "@/components/invitation/templates/luxury-fashion/fashion-film-scene";
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
  const [phase, setPhase] = useState<FashionOpeningPhase>("arming-silk");
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [silkDraw, setSilkDraw] = useState(0);
  const started = useRef(false);
  const completed = useRef(false);
  const timers = useRef<number[]>([]);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const film = resolveFashionFilm({ house });
  const filmEnabled = house.chapters?.film !== false && Boolean(film.src);

  const silkArmed = useGestureArming(phase === "arming-silk" || phase === "silk");
  const silkInteractive = (phase === "silk" || phase === "arming-silk") && silkArmed;
  const sealed = phase === "arming-silk" || phase === "silk";
  const filming = phase === "film";
  const ceremony =
    phase === "silk-opening" || phase === "doors-opening" || phase === "complete";

  useEffect(() => {
    trackFashionAction("whisper_seen", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    trackFashionAction("intro_viewed", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
  }, []);

  useEffect(() => {
    if (phase === "arming-silk" && silkArmed) setPhase("silk");
  }, [phase, silkArmed]);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
      forceUnlockRevealScroll();
    },
    []
  );

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    trackFashionAction("unveil_completed", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    forceUnlockRevealScroll();
    setPhase("complete");
    timers.current.push(
      window.setTimeout(() => {
        forceUnlockRevealScroll();
        onComplete();
        window.setTimeout(forceUnlockRevealScroll, 50);
      }, reduceMotion ? 40 : FASHION_EXIT_POINTER_MS)
    );
  }, [onComplete, reduceMotion]);

  const enterFilmOrFinish = useCallback(() => {
    if (filmEnabled) {
      setPhase("film");
      return;
    }
    finish();
  }, [filmEnabled, finish]);

  const openSilk = useCallback(() => {
    if (!silkInteractive || started.current) return;
    started.current = true;
    dragOrigin.current = null;
    setSilkDraw(1);
    onBegin?.();
    trackFashionAction("unveil_started", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    trackFashionAction("silk_opened", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    setPhase("silk-opening");
    const silkMs = reduceMotion ? FASHION_REDUCED_OPEN_MS : FASHION_SILK_OPEN_MS;
    const doorMs = reduceMotion ? FASHION_REDUCED_OPEN_MS : FASHION_DOORS_OPEN_MS;
    timers.current.push(
      window.setTimeout(() => {
        setPhase("doors-opening");
        trackFashionAction("doors_opened", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
      }, silkMs)
    );
    timers.current.push(window.setTimeout(() => enterFilmOrFinish(), silkMs + doorMs));
  }, [enterFilmOrFinish, onBegin, reduceMotion, silkInteractive]);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (reduceMotion || ceremony || filming) return;
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
    [ceremony, filming, openSilk, reduceMotion, silkInteractive]
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
    if (sealed) setSilkDraw(0);
  }, [sealed]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (filming) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (silkInteractive) openSilk();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filming, openSilk, silkInteractive]);

  const silkOpen = ceremony || filming;
  const doorsOpen = phase === "doors-opening" || phase === "film" || phase === "complete";
  const label = `Draw the silk to unveil ${house.houseName}`;

  return (
    <div
      ref={rootRef}
      className={`${styles.stage} ${embedded ? styles.stageEmbedded : ""} ${
        phase === "complete" ? styles.stageExiting : ""
      }`}
      style={
        {
          ...fashionTokenStyleForSilk(house.silkStyle),
          ["--pointer-x" as string]: String(pointer.x),
          ["--pointer-y" as string]: String(pointer.y),
          ["--silk-draw" as string]: String(silkDraw),
        } as CSSProperties
      }
      data-testid="luxury-fashion-opening"
      data-fashion-phase={phase}
      data-fashion-armed={String(silkInteractive)}
      data-silk-style={house.silkStyle}
      onPointerMove={onPointerMove}
    >
      <div className={`${styles.light} ${silkOpen ? styles.lightCeremony : ""}`} aria-hidden />
      <div className={styles.grain} aria-hidden />

      {silkOpen ? (
        <div className={styles.doors} data-testid="fashion-boutique-portal" aria-hidden>
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
              : !reduceMotion
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
              : !reduceMotion
                ? styles.breatheRight
                : ""
          }`}
        >
          <span className={styles.silkFold} />
        </div>
      </div>

      {!filming ? (
        <div className={styles.mark}>
          <div className={styles.monogram} aria-hidden>
            {house.monogram}
          </div>
          <p className={styles.house}>{house.houseName}</p>
          <p className={styles.whisper}>{silkOpen ? house.portalWelcome : house.whisperLine}</p>
          <p className={styles.hint}>
            {silkOpen ? house.portalPrompt : reduceMotion ? "Reveal" : "Draw the silk"}
          </p>
          {guestName ? (
            <p className={styles.whisper} style={{ marginTop: "0.4rem" }}>
              For {guestName}
            </p>
          ) : null}
          <span className="sr-only">{eventTitle}</span>
        </div>
      ) : null}

      <button
        type="button"
        className={styles.hit}
        data-testid="fashion-silk-stage"
        aria-label={label}
        disabled={!silkInteractive}
        onPointerDown={onSilkPointerDown}
        onPointerUp={onSilkPointerUp}
        onPointerCancel={onSilkPointerUp}
        onClick={openSilk}
      />

      {filming ? (
        <div className={styles.filmLayer} data-testid="fashion-opening-film">
          <FashionFilmScene
            src={film.src}
            poster={film.poster}
            cta={house.filmCta}
            skipLabel={house.filmSkipLabel}
            onStarted={() =>
              trackFashionAction("film_started", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG })
            }
            onCompleted={() =>
              trackFashionAction("film_completed", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG })
            }
            onMuteToggle={() =>
              trackFashionAction("film_muted", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG })
            }
            onFullscreen={() =>
              trackFashionAction("film_fullscreen", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG })
            }
            onContinue={finish}
          />
        </div>
      ) : null}

      {allowSkip ? (
        <button type="button" className={styles.skip} onClick={finish}>
          Skip ceremony
        </button>
      ) : null}
    </div>
  );
}
