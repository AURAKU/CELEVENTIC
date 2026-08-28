"use client";

import { useEffect, useState } from "react";
import { FASHION_GESTURE_ARM_MS } from "./tokens";

/**
 * Explicit gesture arming — Gesture #1 (Tap to Begin) must not fire the
 * newly-mounted silk/door ceremony. Re-arm after each scene transition so a
 * completing click cannot tap-through.
 */
export function useGestureArming(enabled = true, armMs = FASHION_GESTURE_ARM_MS): boolean {
  const [armed, setArmed] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setArmed(true);
      return;
    }
    setArmed(false);
    let timeoutId = 0;

    const arm = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setArmed(true), armMs);
    };

    const onPointerSettled = () => arm();
    window.addEventListener("pointerup", onPointerSettled, true);
    window.addEventListener("pointercancel", onPointerSettled, true);
    arm();

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("pointerup", onPointerSettled, true);
      window.removeEventListener("pointercancel", onPointerSettled, true);
    };
  }, [armMs, enabled]);

  return armed;
}

export function isPointerArmSafe(armed: boolean): boolean {
  return armed;
}
