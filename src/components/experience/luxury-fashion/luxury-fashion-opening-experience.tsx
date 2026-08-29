"use client";

import { Component, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import {
  FASHION_CARD_MORPH_MS,
  FASHION_DOORS_OPEN_MS,
  FASHION_ENVELOPE_OPEN_MS,
  FASHION_EXIT_POINTER_MS,
  FASHION_REDUCED_OPEN_MS,
  FASHION_SILK_DRAG_PX,
  FASHION_SILK_OPEN_MS,
  fashionTokenStyleForSilk,
  resolveFashionOpeningStyle,
  type FashionOpeningPhase,
  type LuxuryFashionHouseConfig,
} from "@/lib/experience/luxury-fashion";
import { useGestureArming } from "@/lib/experience/luxury-fashion/gesture-arming";
import { trackFashionAction } from "@/lib/experience/luxury-fashion/analytics";
import { LUXURY_FASHION_LAYOUT_SLUG } from "@/lib/experience/luxury-fashion/femmora-preset";
import { forceUnlockRevealScroll } from "@/lib/experience-engine/reveal-runtime";
import { FashionEnvelopeScene } from "./fashion-folio-scene";
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
    <FashionOpeningFallback key="envelope-card-v1" onContinue={props.onComplete}>
      <LuxuryFashionOpeningStage {...props} />
    </FashionOpeningFallback>
  );
}

function initialPhase(style: ReturnType<typeof resolveFashionOpeningStyle>): FashionOpeningPhase {
  if (style === "portal-only") return "doors-opening";
  if (style === "silk-only") return "arming-silk";
  return "envelope";
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
  const reduceMotion = Boolean(useReducedMotion());
  const openingStyle = resolveFashionOpeningStyle(house);
  const isCardEnvelope = openingStyle === "card-envelope";
  const [phase, setPhase] = useState<FashionOpeningPhase>(() => initialPhase(openingStyle));
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [silkDraw, setSilkDraw] = useState(0);
  const started = useRef(false);
  const completed = useRef(false);
  const timers = useRef<number[]>([]);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);

  const cardPresented = phase === "card-presented";
  const cardArmed = useGestureArming(cardPresented);
  const silkArmed = useGestureArming(phase === "arming-silk" || phase === "silk");
  const silkInteractive =
    openingStyle === "silk-only" && (phase === "silk" || phase === "arming-silk") && silkArmed;
  const sealedSilk = phase === "arming-silk" || phase === "silk";
  const silkOpen =
    phase === "silk-opening" ||
    phase === "doors-opening" ||
    phase === "complete" ||
    openingStyle === "portal-only";
  const doorsOpen = phase === "doors-opening" || phase === "complete";
  const ceremony = silkOpen || phase === "envelope-opening" || phase === "card-morphing";

  useEffect(() => {
    trackFashionAction("whisper_seen", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    trackFashionAction("intro_viewed", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    trackFashionAction("opening_started", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    if (isCardEnvelope) {
      trackFashionAction("envelope_viewed", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
      trackFashionAction("folio_viewed", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    }
  }, [isCardEnvelope]);

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

  useEffect(() => {
    if (!isCardEnvelope) return;
    onBegin?.();
    const settle = reduceMotion ? 40 : 240;
    const openMs = reduceMotion ? FASHION_REDUCED_OPEN_MS : FASHION_ENVELOPE_OPEN_MS;
    const openId = window.setTimeout(() => {
      setPhase("envelope-opening");
      trackFashionAction("envelope_opened", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
      trackFashionAction("folio_opened", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    }, settle);
    const presentId = window.setTimeout(() => {
      setPhase("card-presented");
      trackFashionAction("card_presented", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    }, settle + openMs);
    return () => {
      window.clearTimeout(openId);
      window.clearTimeout(presentId);
    };
  }, [isCardEnvelope, onBegin, reduceMotion]);

  const continueCeremony = useCallback(
    (from: "silk" | "doors") => {
      const silkMs = reduceMotion ? FASHION_REDUCED_OPEN_MS : FASHION_SILK_OPEN_MS;
      const doorMs = reduceMotion ? FASHION_REDUCED_OPEN_MS : FASHION_DOORS_OPEN_MS;
      if (from === "silk") {
        setPhase("silk-opening");
        timers.current.push(
          window.setTimeout(() => {
            setPhase("doors-opening");
            trackFashionAction("doors_opened", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
            trackFashionAction("portal_opened", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
          }, silkMs)
        );
        timers.current.push(window.setTimeout(() => finish(), silkMs + doorMs));
        return;
      }
      setPhase("doors-opening");
      trackFashionAction("doors_opened", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
      trackFashionAction("portal_opened", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
      timers.current.push(window.setTimeout(() => finish(), doorMs));
    },
    [finish, reduceMotion]
  );

  const openSilk = useCallback(() => {
    if (started.current) return;
    if (openingStyle === "silk-only" && !silkInteractive) return;
    started.current = true;
    dragOrigin.current = null;
    setSilkDraw(1);
    onBegin?.();
    trackFashionAction("unveil_started", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    trackFashionAction("silk_opened", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    trackFashionAction("silk_reveal_opened", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    continueCeremony("silk");
  }, [continueCeremony, onBegin, openingStyle, silkInteractive]);

  const openCard = useCallback(() => {
    if (!cardArmed || !cardPresented || completed.current) return;
    trackFashionAction("card_opened", { templateSlug: LUXURY_FASHION_LAYOUT_SLUG });
    setPhase("card-morphing");
    const morphMs = reduceMotion ? FASHION_REDUCED_OPEN_MS : FASHION_CARD_MORPH_MS;
    timers.current.push(window.setTimeout(() => finish(), morphMs));
  }, [cardArmed, cardPresented, finish, reduceMotion]);

  const swipeOrigin = useRef<number | null>(null);
  useEffect(() => {
    if (!isCardEnvelope || !cardPresented || !cardArmed) return;
    function onWheel(event: WheelEvent) {
      if (Math.abs(event.deltaY) < 10 && Math.abs(event.deltaX) < 10) return;
      event.preventDefault();
      openCard();
    }
    function onTouchStart(event: TouchEvent) {
      swipeOrigin.current = event.touches[0]?.clientY ?? null;
    }
    function onTouchMove(event: TouchEvent) {
      const start = swipeOrigin.current;
      const now = event.touches[0]?.clientY;
      if (start == null || now == null) return;
      if (Math.abs(now - start) >= 28) openCard();
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      swipeOrigin.current = null;
    };
  }, [cardArmed, cardPresented, isCardEnvelope, openCard]);

  const portalOnce = useRef(false);
  useEffect(() => {
    if (openingStyle !== "portal-only" || portalOnce.current) return;
    portalOnce.current = true;
    onBegin?.();
    continueCeremony("doors");
  }, [continueCeremony, onBegin, openingStyle]);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
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
    [openSilk, reduceMotion, silkInteractive]
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
    if (sealedSilk) setSilkDraw(0);
  }, [sealedSilk]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (cardPresented) openCard();
      else if (silkInteractive) openSilk();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cardPresented, openCard, openSilk, silkInteractive]);

  const showEnvelope = isCardEnvelope && phase !== "complete";
  const showCardHit = isCardEnvelope && cardPresented;
  const showSilkHit = openingStyle === "silk-only" && phase !== "complete";
  const label = `Draw the silk to unveil ${house.houseName}`;
  const envelopePhase =
    phase === "envelope" ||
    phase === "envelope-opening" ||
    phase === "card-presented" ||
    phase === "card-morphing"
      ? phase
      : "envelope";

  return (
    <div
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
      data-fashion-armed={String(cardPresented ? cardArmed : silkInteractive)}
      data-opening-style={openingStyle}
      data-silk-style={house.silkStyle}
      onPointerMove={onPointerMove}
    >
      <div className={styles.salon} aria-hidden>
        <span className={styles.salonSilk} />
        <span className={styles.salonSilkAlt} />
        <span className={styles.salonDrapeLeft} />
        <span className={styles.salonDrapeRight} />
        <span className={styles.salonGlow} />
        <span className={styles.salonFoil} />
        <span className={styles.salonFloor} />
        <span className={styles.salonVignette} />
        <span className={styles.salonFrame} />
      </div>
      <div className={`${styles.light} ${silkOpen || ceremony ? styles.lightCeremony : ""}`} aria-hidden />
      <div className={styles.grain} aria-hidden />

      {!isCardEnvelope && (silkOpen || openingStyle !== "silk-only") ? (
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

      {openingStyle === "silk-only" ? (
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
      ) : null}

      {showEnvelope ? (
        <FashionEnvelopeScene
          house={house}
          phase={envelopePhase}
          armed={cardArmed}
          reduceMotion={reduceMotion}
          onOpenCard={openCard}
        />
      ) : null}

      {!isCardEnvelope ? (
        <div className={styles.mark}>
          <div className={styles.monogram} aria-hidden>
            {house.monogram}
          </div>
          <p className={styles.house}>{house.houseName}</p>
          <p className={styles.whisper}>{silkOpen ? house.portalWelcome : house.whisperLine}</p>
          <p className={styles.hint}>
            {silkOpen
              ? house.portalPrompt
              : reduceMotion
                ? "Reveal"
                : openingStyle === "silk-only"
                  ? "Draw the silk"
                  : house.portalPrompt}
          </p>
          {guestName ? (
            <p className={styles.whisper} style={{ marginTop: "0.4rem" }}>
              For {guestName}
            </p>
          ) : null}
          <span className="sr-only">{eventTitle}</span>
        </div>
      ) : null}

      {showCardHit ? (
        <button
          type="button"
          className={`${styles.hit} ${styles.cardHit}`}
          data-testid="fashion-card-stage"
          aria-label={`Open the ${house.houseName} invitation`}
          disabled={!cardArmed}
          onClick={openCard}
        />
      ) : null}

      {showSilkHit ? (
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
      ) : null}

      {allowSkip ? (
        <button type="button" className={styles.skip} onClick={finish}>
          Skip ceremony
        </button>
      ) : null}
    </div>
  );
}
