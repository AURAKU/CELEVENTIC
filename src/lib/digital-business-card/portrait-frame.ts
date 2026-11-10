import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";

export const CELECARD_PORTRAIT_FRAMES = ["circle", "square", "rounded"] as const;
export type CeleCardPortraitFrame = (typeof CELECARD_PORTRAIT_FRAMES)[number];

export function parseCeleCardPortraitFrame(raw: unknown): CeleCardPortraitFrame | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "circle" || value === "square" || value === "rounded") return value;
  return null;
}

/** Theme default. Luxury ID plates use a square photo. Pulse templates keep a circle. */
export function celecardPortraitFrame(
  theme: Pick<DigitalCardTheme, "category" | "composition">
): CeleCardPortraitFrame {
  if (theme.composition === "portrait-led") return "square";
  if (theme.category === "luxury" || theme.category === "atelier" || theme.category === "executive") {
    return "square";
  }
  if (theme.category === "cinematic" || theme.category === "landmark") return "rounded";
  return "circle";
}

export function resolveCeleCardPortraitFrame(
  theme: Pick<DigitalCardTheme, "category" | "composition">,
  override?: unknown
): CeleCardPortraitFrame {
  return parseCeleCardPortraitFrame(override) ?? celecardPortraitFrame(theme);
}

export function celecardPortraitFrameClass(frame: CeleCardPortraitFrame): string {
  if (frame === "square") return "rounded-[3px]";
  if (frame === "rounded") return "rounded-[0.85rem]";
  return "rounded-full";
}

export function celecardPortraitFrameRadius(frame: CeleCardPortraitFrame, size: number): number {
  if (frame === "circle") return Math.round(size / 2);
  if (frame === "rounded") return Math.round(size * 0.18);
  return Math.max(3, Math.round(size * 0.04));
}

export function celecardPortraitCropAspect(
  frame: CeleCardPortraitFrame
): "circle" | "1:1" | "rounded-square" {
  if (frame === "square") return "1:1";
  if (frame === "rounded") return "rounded-square";
  return "circle";
}
