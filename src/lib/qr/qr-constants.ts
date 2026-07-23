/** Branded QR export sizes (px) */
export const QR_EXPORT_SIZES = [512, 1024, 2048] as const;
export type QrExportSize = (typeof QR_EXPORT_SIZES)[number];

export const QR_DEFAULT_SIZE: QrExportSize = 1024;

/** Display mode — pass = high-contrast for phone-screen scanning at gates */
export type QrDisplayMode = "brand" | "pass";

/**
 * Center logo/inset size presets (ratio of QR width for the logo mark).
 * White frame is ~1.24× this (see FRAME_PAD_RATIO in branded-qr-generator).
 * Error-correction H supports ~30% damage — keep the framed inset ≤ ~27%
 * width (bold) so the full logo stays visible with padding and remains scannable.
 */
export const QR_LOGO_SIZE_PRESETS = {
  subtle: 0.15,
  balanced: 0.19,
  bold: 0.21,
} as const;

export type QrLogoSizePreset = keyof typeof QR_LOGO_SIZE_PRESETS;

/** Default inset — visible brand mark with safe padding for full-logo contain */
export const QR_DEFAULT_LOGO_SIZE: QrLogoSizePreset = "balanced";

/** Max safe logo mark ratio (bold preset) */
export const QR_MAX_SAFE_LOGO_RATIO = QR_LOGO_SIZE_PRESETS.bold;

/**
 * Bump when compositing geometry / center-resolution changes so disk-cached
 * PNGs regenerate (contain fit + Celeventic default, not cover-photo fallback).
 */
export const QR_COMPOSITE_CACHE_VERSION = "v3-contain-brand-default";

/** Default Celeventic QR center mark (public asset; contain-fitted in generator) */
export const CELEVENTIC_OFFICIAL_LOGO = "/brand/logo-full.png";
/** Square brand mark fallback used by the generator when logo-full is missing */
export const CELEVENTIC_LOGO_MARK = "/brand/logo-mark.png";

export const QR_LOGO_SIZE_LABELS: Record<QrLogoSizePreset, string> = {
  subtle: "Subtle",
  balanced: "Balanced",
  bold: "Bold",
};

export function parseQrLogoSize(raw: unknown): QrLogoSizePreset {
  if (raw === "subtle" || raw === "balanced" || raw === "bold") return raw;
  return QR_DEFAULT_LOGO_SIZE;
}

/** Minimum on-screen pass QR size (px) for reliable phone-to-phone scanning */
export const QR_PASS_DISPLAY_MIN_PX = 280;

/** Scanner target fps */
export const QR_SCANNER_FPS = 12;
export const QR_SCANNER_FPS_SCREEN = 6;

/** Admission status returned to clients (maps from scan + entity state) */
export type QrAdmissionDisplayStatus =
  | "valid"
  | "checked_in"
  | "duplicate_scan"
  | "wrong_event"
  | "expired"
  | "refunded"
  | "cancelled"
  | "invalid"
  | "not_found"
  | "revoked"
  | "unauthorized";
