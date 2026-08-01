/**
 * Safe destination validation for custom Event QR Hub links.
 */

const BLOCKED_SCHEMES = /^(javascript|data|vbscript|file|about):/i;
const ADMIN_PATHS = [
  "/admin",
  "/dashboard",
  "/api/",
  "/login",
  "/register",
];

export function validateCustomQrDestination(
  raw: string
): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Destination URL is required" };
  if (BLOCKED_SCHEMES.test(trimmed)) {
    return { ok: false, error: "This URL scheme is not allowed" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a valid absolute URL (https://…)" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "Only http and https destinations are allowed" };
  }

  const path = parsed.pathname.toLowerCase();
  if (ADMIN_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    return { ok: false, error: "Admin and dashboard destinations cannot be used in public QRs" };
  }

  return { ok: true, url: parsed.toString() };
}

export const VENDOR_PRINT_ROLES: Array<{ key: string; heading: string }> = [
  { key: "dj", heading: "DJ" },
  { key: "mc", heading: "MC" },
  { key: "event_organiser", heading: "Event Organiser" },
  { key: "caterer", heading: "Caterer" },
  { key: "chef", heading: "Chef" },
  { key: "ushers", heading: "Ushers" },
  { key: "waiters", heading: "Waiters" },
  { key: "security", heading: "Security" },
  { key: "celeventic_team", heading: "Celeventic Team" },
  { key: "decorator", heading: "Decorator" },
  { key: "photographer", heading: "Photographer" },
  { key: "videographer", heading: "Videographer" },
  { key: "band", heading: "Band / Performer" },
  { key: "venue_staff", heading: "Venue Staff" },
  { key: "technical", heading: "Technical Team" },
  { key: "protocol", heading: "Protocol" },
  { key: "custom", heading: "Custom Role" },
];

export type QrHubAssetKind =
  | "GIFT"
  | "MENU"
  | "SEATING"
  | "VENDOR"
  | "MEMORY_UPLOAD"
  | "MEMORY_ALBUM"
  | "COMPANION"
  | "PROGRAMME"
  | "VENUE"
  | "HELP"
  | "CUSTOM";

export interface QrHubAssetCard {
  kind: QrHubAssetKind;
  title: string;
  purpose: string;
  enabled: boolean;
  statusLabel: string;
  url: string | null;
  qrPreviewUrl: string | null;
  openStudioHref?: string | null;
  printHeading?: string | null;
  printSupporting?: string | null;
  printFooter?: string | null;
  lastUpdated?: string | null;
  meta?: Record<string, unknown>;
}
