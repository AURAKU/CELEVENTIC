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
 * Pass mode uses a separate, slightly smaller scale in branded-qr-generator
 * (still larger than the old speck-sized insets for couple photos).
 */
export const QR_LOGO_SIZE_PRESETS = {
  subtle: 0.16,
  balanced: 0.2,
  bold: 0.22,
} as const;

export type QrLogoSizePreset = keyof typeof QR_LOGO_SIZE_PRESETS;

/** Default inset — visible brand mark with safe padding for full-logo contain */
export const QR_DEFAULT_LOGO_SIZE: QrLogoSizePreset = "balanced";

/** Max safe logo mark ratio (bold preset) */
export const QR_MAX_SAFE_LOGO_RATIO = QR_LOGO_SIZE_PRESETS.bold;

/**
 * Bump when compositing geometry / center-resolution changes, OR when the
 * *encoded* verify URL logic changes, so disk-cached PNGs regenerate (the
 * cache key doesn't include the encoded URL — see `qr-cache.ts` — only the
 * token/size/center/logoSize, so a stale PNG baked from an old resolved app
 * URL would otherwise keep being served forever). Bumped for crisp module
 * rendering + larger (still ECC-H safe) pass-mode center photos.
 */
export const QR_COMPOSITE_CACHE_VERSION = "v6-larger-center-mark";

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

/** Preferred source resolution for on-screen entry-pass QR (retina + crisp downscale). */
export const QR_PASS_DISPLAY_SOURCE_PX: QrExportSize = 1024;

/** Balanced decode rate: responsive in queues without starving mobile autofocus. */
export const QR_SCANNER_FPS = 15;
/** Phone-screen mode samples slightly faster while staying stable on mid-range devices. */
export const QR_SCANNER_FPS_SCREEN = 18;
/** Cooldown between any two successful decodes (ms) — keep short for queue throughput */
export const QR_SCAN_DEBOUNCE_MS = 450;
/** Same code may re-fire after this window (ms) — never lock forever */
export const QR_SCAN_SAME_CODE_MS = 1400;

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
