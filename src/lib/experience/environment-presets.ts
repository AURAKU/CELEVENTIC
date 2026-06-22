import type { EnvironmentPresetId } from "@/lib/experience/experience-types";
import type { EnvironmentIntensity } from "@/lib/experience/experience-types";

export type ParticleKind =
  | "petals"
  | "sparkles"
  | "snow"
  | "fireflies"
  | "stars"
  | "lanterns"
  | "leaves"
  | "symbols"
  | "hearts"
  | "butterflies"
  | "confetti";

export interface EnvironmentPreset {
  id: EnvironmentPresetId;
  label: string;
  particles: ParticleKind;
  colors: string[];
  density: number;
  speed: number;
}

export const INTENSITY_MULTIPLIER: Record<EnvironmentIntensity, number> = {
  none: 0,
  light: 0.45,
  medium: 1,
  heavy: 1.65,
};

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  { id: "none", label: "None", particles: "sparkles", colors: [], density: 0, speed: 0 },
  { id: "spring-garden", label: "Spring garden", particles: "petals", colors: ["#fda4af", "#fbcfe8", "#86efac", "#fef3c7"], density: 28, speed: 0.6 },
  { id: "royal-wedding", label: "Royal wedding", particles: "sparkles", colors: ["#D4A63A", "#F5E6B8", "#ffffff"], density: 35, speed: 0.4 },
  { id: "sunset-beach", label: "Sunset beach", particles: "sparkles", colors: ["#fb923c", "#fbbf24", "#fef3c7"], density: 20, speed: 0.5 },
  { id: "floating-petals", label: "Floating petals", particles: "petals", colors: ["#f472b6", "#fda4af", "#fce7f3"], density: 40, speed: 0.7 },
  { id: "fireflies", label: "Fireflies", particles: "fireflies", colors: ["#a3e635", "#fef08a"], density: 18, speed: 0.3 },
  { id: "snow", label: "Snow", particles: "snow", colors: ["#ffffff", "#e2e8f0"], density: 45, speed: 0.5 },
  { id: "stars", label: "Stars", particles: "stars", colors: ["#ffffff", "#D4A63A"], density: 30, speed: 0.2 },
  { id: "kente-gold", label: "Kente gold", particles: "symbols", colors: ["#D4A63A", "#0B8A83", "#c0392b", "#1a472a"], density: 22, speed: 0.45 },
  { id: "islamic-gold", label: "Islamic gold", particles: "symbols", colors: ["#D4A63A", "#0d3b2e", "#F5E6B8"], density: 24, speed: 0.4 },
  { id: "lanterns", label: "Floating lanterns", particles: "lanterns", colors: ["#fbbf24", "#f59e0b"], density: 12, speed: 0.35 },
  { id: "hearts", label: "Floating hearts", particles: "hearts", colors: ["#f472b6", "#fda4af", "#FF6B57"], density: 26, speed: 0.5 },
  { id: "butterflies", label: "Butterflies", particles: "butterflies", colors: ["#fda4af", "#86efac", "#fbbf24", "#a78bfa"], density: 14, speed: 0.55 },
  { id: "confetti", label: "Confetti", particles: "confetti", colors: ["#D4A63A", "#0B8A83", "#FF6B57", "#f472b6", "#fef3c7"], density: 38, speed: 0.65 },
];

export function getEnvironmentPreset(id: EnvironmentPresetId) {
  return ENVIRONMENT_PRESETS.find((p) => p.id === id) ?? ENVIRONMENT_PRESETS[0];
}

export function resolveEnvironmentDensity(baseDensity: number, intensity: EnvironmentIntensity = "medium") {
  return Math.round(baseDensity * INTENSITY_MULTIPLIER[intensity]);
}
