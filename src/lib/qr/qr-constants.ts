/** Branded QR export sizes (px) */
export const QR_EXPORT_SIZES = [512, 1024, 2048] as const;
export type QrExportSize = (typeof QR_EXPORT_SIZES)[number];

export const QR_DEFAULT_SIZE: QrExportSize = 1024;

/** Display mode — pass = high-contrast for phone-screen scanning at gates */
export type QrDisplayMode = "brand" | "pass";

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

export const CELEVENTIC_OFFICIAL_LOGO = "/brand/logo-full.png";
