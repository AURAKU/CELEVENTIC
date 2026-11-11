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
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return celecardShouldHoldViewport(
    width,
    height,
    coarse,
    window.screen?.width ?? width,
    window.screen?.height ?? height
  );
}
