"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  celecardEventIsPlateBackground,
  celecardHoldIntentAfterAutoChange,
  celecardHoldIsActive,
  celecardRunHoldMotion,
  celecardToggleHoldIntent,
  clearCelecardHoldViewportCss,
  readCelecardHoldAxis,
  readCelecardHoldViewport,
  writeCelecardHoldViewportCss,
  type CeleCardHoldAxis,
  type CeleCardHoldIntent,
} from "@/lib/digital-business-card/hold-viewport";

type WakeLockSentinelLike = { release: () => Promise<void> };

/**
 * Landscape hold lives on the plate. Rotation turns the device into the card
 * with no extra graphic. Proximity or share can keep running behind it.
 */
export function useCelecardSilentHold() {
  const [holdIntent, setHoldIntent] = useState<CeleCardHoldIntent>("auto");
  const [autoHold, setAutoHold] = useState(false);
  const [holdAxis, setHoldAxis] = useState<CeleCardHoldAxis>("portrait");
  const [holdReady, setHoldReady] = useState(false);
  const holdIntentRef = useRef(holdIntent);
  holdIntentRef.current = holdIntent;
  const autoHoldRef = useRef(autoHold);
  autoHoldRef.current = autoHold;
  const hold = celecardHoldIsActive(holdIntent, autoHold);

  useEffect(() => {
    const apply = () => {
      writeCelecardHoldViewportCss();
      const nextAuto = readCelecardHoldViewport();
      const nextIntent = celecardHoldIntentAfterAutoChange(
        holdIntentRef.current,
        nextAuto,
        autoHoldRef.current
      );
      if (nextIntent !== holdIntentRef.current) setHoldIntent(nextIntent);
      setAutoHold(nextAuto);
      setHoldAxis(readCelecardHoldAxis());
      setHoldReady(true);
    };
    apply();
    const landscape = window.matchMedia("(orientation: landscape)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const hoverNone = window.matchMedia("(hover: none)");
    landscape.addEventListener("change", apply);
    coarse.addEventListener("change", apply);
    hoverNone.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    const retry = window.setTimeout(apply, 280);
    return () => {
      landscape.removeEventListener("change", apply);
      coarse.removeEventListener("change", apply);
      hoverNone.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      window.clearTimeout(retry);
      clearCelecardHoldViewportCss();
    };
  }, []);

  useEffect(() => {
    if (!hold) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [hold]);

  useEffect(() => {
    if (!hold || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        const next = await (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } }).wakeLock?.request(
          "screen"
        );
        if (cancelled) {
          void next?.release();
          return;
        }
        lock = next ?? null;
      } catch {
        /* browsers may refuse wake lock outside a gesture */
      }
    };
    void request();
    const onVis = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, [hold]);

  const toggleHold = useCallback(() => {
    const next = celecardToggleHoldIntent(celecardHoldIsActive(holdIntentRef.current, autoHoldRef.current));
    celecardRunHoldMotion(() => setHoldIntent(next));
  }, []);

  const onPlateActivate = useCallback(
    (event: { target: EventTarget | null; preventDefault?: () => void }) => {
      if (!celecardEventIsPlateBackground(event.target)) return;
      event.preventDefault?.();
      toggleHold();
    },
    [toggleHold]
  );

  return {
    hold,
    holdAxis,
    holdReady,
    holdIntent,
    setHoldIntent,
    toggleHold,
    onPlateActivate,
  };
}
