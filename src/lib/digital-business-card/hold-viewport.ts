import { flushSync } from "react-dom";

/** ISO/IEC 7810 ID-1. The held plate keeps this ratio and covers the screen. */
export const CELECARD_ID1_RATIO = 85.6 / 54;

export function celecardHoldCoverSize(viewportWidth: number, viewportHeight: number): {
  width: number;
  height: number;
} {
  if (viewportWidth <= 0 || viewportHeight <= 0) return { width: 0, height: 0 };
  const byHeight = { width: viewportHeight * CELECARD_ID1_RATIO, height: viewportHeight };
  if (byHeight.width >= viewportWidth) return byHeight;
  return { width: viewportWidth, height: viewportWidth / CELECARD_ID1_RATIO };
}

const HOLD_CSS_VARS = [
  "--celecard-hold-vw",
  "--celecard-hold-vh",
  "--celecard-hold-top",
  "--celecard-hold-left",
  "--celecard-hold-cover-w",
  "--celecard-hold-cover-h",
] as const;

export function writeCelecardHoldViewportCss(target?: HTMLElement | null) {
  if (typeof window === "undefined") return;
  const root = target ?? document.documentElement;
  const vv = window.visualViewport;
  const width = vv?.width ?? window.innerWidth;
  const height = vv?.height ?? window.innerHeight;
  const cover = celecardHoldCoverSize(width, height);
  root.style.setProperty("--celecard-hold-vw", `${width}px`);
  root.style.setProperty("--celecard-hold-vh", `${height}px`);
  root.style.setProperty("--celecard-hold-top", `${vv?.offsetTop ?? 0}px`);
  root.style.setProperty("--celecard-hold-left", `${vv?.offsetLeft ?? 0}px`);
  root.style.setProperty("--celecard-hold-cover-w", `${cover.width}px`);
  root.style.setProperty("--celecard-hold-cover-h", `${cover.height}px`);
}

export function clearCelecardHoldViewportCss(target?: HTMLElement | null) {
  if (typeof document === "undefined") return;
  const root = target ?? document.documentElement;
  for (const name of HOLD_CSS_VARS) root.style.removeProperty(name);
}

/** ID-1 card fills the screen, as if you are holding it. */
export function celecardShouldHoldViewport(
  width: number,
  height: number,
  coarse: boolean,
  screenWidth = width,
  screenHeight = height
): boolean {
  if (width <= 0 || height <= 0) return false;
  if (width <= height) return false;
  const ratio = width / height;
  if (coarse) return ratio >= 1.12;
  const screenLooksPhone = Math.min(screenWidth, screenHeight) <= 500;
  const shortPreview = height <= 740 && ratio >= 1.35 && width <= 1200;
  return screenLooksPhone || shortPreview;
}

export function readCelecardHoldViewport(): boolean {
  if (typeof window === "undefined") return false;
  const width = window.visualViewport?.width ?? window.innerWidth;
  const height = window.visualViewport?.height ?? window.innerHeight;
  const coarse =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches ||
    (navigator.maxTouchPoints ?? 0) > 0;
  return celecardShouldHoldViewport(
    width,
    height,
    coarse,
    window.screen?.width ?? width,
    window.screen?.height ?? height
  );
}

export type CeleCardHoldAxis = "portrait" | "landscape";
export type CeleCardHoldIntent = "auto" | "open" | "closed";

export function celecardHoldAxis(width: number, height: number): CeleCardHoldAxis {
  return width >= height ? "landscape" : "portrait";
}

export function readCelecardHoldAxis(): CeleCardHoldAxis {
  if (typeof window === "undefined") return "portrait";
  const width = window.visualViewport?.width ?? window.innerWidth;
  const height = window.visualViewport?.height ?? window.innerHeight;
  return celecardHoldAxis(width, height);
}

export function celecardHoldIsActive(intent: CeleCardHoldIntent, autoHold: boolean): boolean {
  if (intent === "open") return true;
  if (intent === "closed") return false;
  return autoHold;
}

/** Leaving a physical landscape resets a tap lock so auto-hold can run next time. */
export function celecardHoldIntentAfterAutoChange(
  intent: CeleCardHoldIntent,
  autoHold: boolean,
  previousAutoHold: boolean
): CeleCardHoldIntent {
  if (previousAutoHold && !autoHold && intent !== "auto") return "auto";
  return intent;
}

export function celecardToggleHoldIntent(currentlyHeld: boolean): CeleCardHoldIntent {
  return currentlyHeld ? "closed" : "open";
}

/** Taps on the plate background toggle hold. QR and other controls keep their own job. */
export function celecardEventIsPlateBackground(target: EventTarget | null): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return true;
  return !target.closest("a[href], button, input, textarea, select, [data-celecard-qr]");
}

export function celecardPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function celecardRunHoldMotion(apply: () => void) {
  const commit = () => {
    flushSync(apply);
  };
  if (typeof document === "undefined" || celecardPrefersReducedMotion()) {
    commit();
    return;
  }
  const start = document.startViewTransition?.bind(document);
  if (!start) {
    commit();
    return;
  }
  try {
    start(commit);
  } catch {
    commit();
  }
}
