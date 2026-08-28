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
    const id = window.setTimeout(() => setArmed(true), armMs);
    return () => window.clearTimeout(id);
  }, [armMs, enabled]);

  return armed;
}

export function isPointerArmSafe(armed: boolean): boolean {
  return armed;
}
