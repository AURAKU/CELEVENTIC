/** Branded QR export sizes (px) */
export const QR_EXPORT_SIZES = [512, 1024, 2048] as const;
export type QrExportSize = (typeof QR_EXPORT_SIZES)[number];

export const QR_DEFAULT_SIZE: QrExportSize = 1024;

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
