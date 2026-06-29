/** Ensures invitation copy stays legible on any background */
import type { CSSProperties } from "react";

export type ReadabilitySurface = "dark" | "light" | "photo" | "glass";

export function readabilityClass(surface: ReadabilitySurface): string {
  switch (surface) {
    case "dark":
      return "inv-text-on-dark";
    case "light":
      return "inv-text-on-light";
    case "photo":
      return "inv-text-on-photo";
    case "glass":
      return "inv-text-on-glass";
    default:
      return "inv-text-on-dark";
  }
}

export function phraseClass(surface: ReadabilitySurface = "dark"): string {
  return `${readabilityClass(surface)} inv-phrase-emphasis`;
}

export function headingReadableStyle(color: string, surface: ReadabilitySurface = "dark"): CSSProperties {
  const shadow =
    surface === "light"
      ? "0 1px 2px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)"
      : "0 2px 12px rgba(0,0,0,0.55), 0 0 40px rgba(0,0,0,0.25)";
  return { color, textShadow: shadow };
}

export function bodyReadableStyle(color: string, surface: ReadabilitySurface = "dark"): CSSProperties {
  const shadow =
    surface === "light"
      ? "0 1px 3px rgba(0,0,0,0.12)"
      : "0 1px 8px rgba(0,0,0,0.45)";
  return { color, textShadow: shadow };
}
