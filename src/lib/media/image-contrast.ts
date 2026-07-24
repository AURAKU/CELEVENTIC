"use client";

/** Perceived brightness classification for a guest-uploaded background photo. */
export type ImageContrastMode = "light" | "dark";

/**
 * Samples a downscaled copy of an image (weighted toward the lower-middle band,
 * where headline copy usually sits) to estimate perceived luminance, so overlay
 * text can flip to whichever scheme (light-on-dark or dark-on-light) stays
 * legible against that specific photo.
 *
 * Resolves `null` on load/CORS/canvas failures so callers keep their safe
 * default styling instead of guessing.
 */
export function sampleImageContrastMode(url: string): Promise<ImageContrastMode | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let total = 0;
        let weight = 0;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const alpha = data[i + 3] / 255;
            if (alpha <= 0) continue;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            // Headline / names / BEGIN sit in the lower-middle band — weight it higher.
            const rowWeight = y > size * 0.35 ? 1.6 : 1;
            total += luma * rowWeight * alpha;
            weight += rowWeight * alpha;
          }
        }
        if (weight <= 0) {
          resolve(null);
          return;
        }
        resolve(total / weight >= 150 ? "light" : "dark");
      } catch {
        // Tainted canvas (no CORS on the remote host) or unsupported context.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Perceived luminance (0–255) of a hex color; null if unparseable. */
function hexLuminance(hex?: string | null): number | null {
  if (!hex) return null;
  const clean = hex.trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Pick a brand color for an overlay accent only when it stays legible for the
 * given photo mode — otherwise fall back to a known-safe color. This guards
 * against brand palettes (e.g. a deep bronze `primaryColor`) that read fine on
 * paper/light photos but disappear (dark-on-dark) once used as accent text over
 * a dark uploaded photo, and the mirror case on light photos.
 */
export function pickLegibleAccent(
  candidate: string | undefined | null,
  mode: ImageContrastMode,
  fallback: string
): string {
  const luma = hexLuminance(candidate);
  if (luma == null) return fallback;
  // "dark" photo needs a light-enough accent; "light" photo needs a dark-enough accent.
  const legible = mode === "dark" ? luma >= 130 : luma <= 140;
  return legible ? (candidate as string) : fallback;
}
