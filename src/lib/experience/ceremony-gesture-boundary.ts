/**
 * Ceremony gesture arming — prevents Tap-to-Begin from opening the envelope
 * on the same pointer sequence.
 *
 * Mount DISARMED → wait until the current pointer sequence ends → ARMED →
 * only a NEW pointerdown on the seal may establish ownership → matching click opens.
 *
 * No visible delay. No auto-open timer. Keyboard Enter/Space on the focused
 * seal remains intentional once armed.
 */

export type CeremonyGestureArmState = "disarmed" | "arming" | "armed";

const LIVE_REVEAL_DIAG_ENABLED =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_CELEVENTIC_LIVE_REVEAL_DIAG === "1");

function logGesture(payload: Record<string, unknown>): void {
  if (!LIVE_REVEAL_DIAG_ENABLED) return;
  console.info("[envelope-gesture]", payload);
}

export interface CeremonyGestureBoundary {
  getState(): CeremonyGestureArmState;
  /** Call when the sealed reveal mounts. */
  mountDisarmed(): () => void;
  /** pointerdown on the seal — returns ownership token, or null if disarmed. */
  noteSealPointerDown(): number | null;
  /** click on the seal — true only for an owned, armed gesture. */
  mayOpenFromSealClick(token: number | null): boolean;
  /** Keyboard activation on the focused seal once armed. */
  mayOpenFromKeyboard(): boolean;
  /** Test seam — force armed without waiting for pointer idle. */
  forceArmForTests(): void;
}

export interface CeremonyGestureBoundaryOptions {
  onArmed?: () => void;
}

export function createCeremonyGestureBoundary(
  options: CeremonyGestureBoundaryOptions = {}
): CeremonyGestureBoundary {
  let state: CeremonyGestureArmState = "disarmed";
  let nextToken = 1;
  let ownedToken: number | null = null;
  let armedGeneration = 0;

  const setArmed = (reason: string) => {
    if (state === "armed") return;
    state = "armed";
    armedGeneration += 1;
    logGesture({ armed: true, reason, generation: armedGeneration });
    options.onArmed?.();
  };

  return {
    getState() {
      return state;
    },

    mountDisarmed() {
      state = "disarmed";
      ownedToken = null;
      logGesture({ armed: false, reason: "mount-disarmed" });

      if (typeof window === "undefined") {
        setArmed("ssr-noop");
        return () => undefined;
      }

      state = "arming";
      let cleaned = false;

      const armFromIdle = () => {
        if (cleaned) return;
        setArmed("pointer-idle");
        cleanup();
      };

      const onPointerQuiet = () => {
        // End of the prior gesture (Tap to Begin). Arm on the next frame so
        // the same event cascade cannot synchronously open the seal.
        requestAnimationFrame(() => {
          if (cleaned) return;
          setArmed("pointerup-boundary");
          cleanup();
        });
      };

      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        window.removeEventListener("pointerup", onPointerQuiet, true);
        window.removeEventListener("pointercancel", onPointerQuiet, true);
        window.removeEventListener("mouseup", onPointerQuiet, true);
        window.removeEventListener("touchend", onPointerQuiet, true);
      };

      window.addEventListener("pointerup", onPointerQuiet, true);
      window.addEventListener("pointercancel", onPointerQuiet, true);
      window.addEventListener("mouseup", onPointerQuiet, true);
      window.addEventListener("touchend", onPointerQuiet, true);

      // Common path: Tap to Begin already finished its click ~480ms earlier.
      // Double-rAF arms only if no quiet listener fired yet — not a delay gate,
      // just end-of-paint idle when no buttons are held.
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (cleaned) return;
          armFromIdle();
        });
      });

      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        cleanup();
      };
    },

    noteSealPointerDown() {
      if (state !== "armed") {
        logGesture({ armed: false, reason: "pointerdown-rejected", state });
        return null;
      }
      ownedToken = nextToken++;
      logGesture({ armed: true, reason: "seal-pointerdown", gestureId: ownedToken });
      return ownedToken;
    },

    mayOpenFromSealClick(token: number | null) {
      if (state !== "armed" || token == null || token !== ownedToken) {
        logGesture({
          armed: state === "armed",
          reason: "click-rejected",
          gestureId: token,
          ownedToken,
        });
        return false;
      }
      ownedToken = null;
      logGesture({ armed: true, reason: "click-accepted", gestureId: token });
      return true;
    },

    mayOpenFromKeyboard() {
      if (state !== "armed") {
        logGesture({ armed: false, reason: "keyboard-rejected", state });
        return false;
      }
      logGesture({ armed: true, reason: "keyboard-accepted" });
      return true;
    },

    forceArmForTests() {
      setArmed("test-force");
    },
  };
}
