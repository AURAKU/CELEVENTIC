/** Official Celeventic brand palette for immersive experiences */
export const CELEVENTIC_PALETTE = {
  teal: "#0B8A83",
  gold: "#D4A63A",
  coral: "#FF6B57",
  ivory: "#FAF8F4",
  navy: "#0F172A",
} as const;

export const CELEVENTIC_LOGO_FULL = "/brand/logo-full.png";
export const CELEVENTIC_LOGO_MARK = "/brand/logo-mark.png";

export const INTRO_DURATION_OPTIONS = [1.5, 2, 3, 5] as const;
export type IntroDurationSec = typeof INTRO_DURATION_OPTIONS[number];

export const DEFAULT_INTRO_DURATION_SEC: IntroDurationSec = 3;
export const INTRO_SKIP_AVAILABLE_MS = 1500;
