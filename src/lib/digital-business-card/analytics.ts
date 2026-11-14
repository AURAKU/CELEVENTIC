import { celeYouActivityLabel } from "@/lib/celeyou-share/events";
import { addDays, startOfDay, toDayKey } from "@/lib/digital-business-card/activity-range";

/** Owner dashboards never scan more than this many recent interaction rows for series. */
export const CELEYOU_ANALYTICS_TREND_MAX_ROWS = 4_000;
/** Trend charts default to the last 30 days even when totals are all-time. */
export const CELEYOU_ANALYTICS_TREND_DAYS = 30;
/** Custom date filters wider than this are clamped. */
export const CELEYOU_ANALYTICS_RANGE_MAX_DAYS = 90;
/** Display retention. Rows are not deleted automatically. */
export const CELEYOU_ANALYTICS_RETENTION_DAYS = 730;

export const CELEYOU_QR_ATTRIBUTION =
  "Smart QR counts visits that used this card’s /c link. Someone can also type or share that same link.";
export const CELEYOU_NFC_ATTRIBUTION =
  "NFC counts visits that used this card’s NFC tag address. A paused, lost, or replaced tag is not counted as a tap.";
export const CELEYOU_PAYMENT_ATTRIBUTION =
  "Payment details opened is not a Paystack charge. Opening a wallet or bank sheet is not proof that money moved.";
export const CELEYOU_SHARE_ATTRIBUTION =
  "Share started counts when a guest opens the share sheet or copy action. It is not proof the message was sent.";
export const CELEYOU_CONTACT_ATTRIBUTION =
  "Save contact counts a tap. vCard download counts when the contact file was actually served.";

export const CELEYOU_SERVER_EVENT_KINDS = [
  "profile_open",
  "qr_open",
  "nfc_tap",
  "vcard_download",
  "meeting_booked",
  "connect",
] as const;

export type CeleYouEventOutcome = "attempted" | "completed";
export type CeleYouDeviceCategory = "phone" | "tablet" | "desktop" | "unknown";
export type CeleYouEntryAttribution = "profile" | "qr" | "nfc";

const ALLOWED_BRAND = /^[a-z0-9_-]{1,32}$/;

export function isAllowedAnalyticsBrand(value: unknown): value is string {
  return typeof value === "string" && ALLOWED_BRAND.test(value);
}

export function celeYouDeviceCategory(userAgent: string): CeleYouDeviceCategory {
  const ua = userAgent.toLowerCase();
  if (!ua.trim()) return "unknown";
  if (/ipad|tablet|playbook|silk|kindle/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.+mobile|windows phone/.test(ua)) return "phone";
  if (/android/.test(ua)) return "tablet";
  if (/mozilla|chrome|safari|firefox|edg|opr/.test(ua)) return "desktop";
  return "unknown";
}

export function celeYouEventOutcome(kind: string, requested?: string | null): CeleYouEventOutcome {
  if (
    kind === "profile_open" ||
    kind === "qr_open" ||
    kind === "nfc_tap" ||
    kind === "vcard_download" ||
    kind === "meeting_booked" ||
    kind === "connect"
  ) {
    return "completed";
  }
  if (requested === "completed") return "attempted";
  return "attempted";
}

export function sanitizeCeleYouActivityMeta(meta: unknown): {
  surface?: string;
  reason?: string;
  brand?: string;
  outcome?: CeleYouEventOutcome;
  device?: CeleYouDeviceCategory;
  attribution?: CeleYouEntryAttribution;
} {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  const row = meta as Record<string, unknown>;
  const surface = typeof row.surface === "string" && row.surface.length <= 40 ? row.surface : undefined;
  const allowedReason = ["unpublished", "suspended", "inactive", "deleted"];
  const reason = typeof row.reason === "string" && allowedReason.includes(row.reason) ? row.reason : undefined;
  const brand = isAllowedAnalyticsBrand(row.brand) ? row.brand : undefined;
  const outcome =
    row.outcome === "attempted" || row.outcome === "completed" ? row.outcome : undefined;
  const device =
    row.device === "phone" || row.device === "tablet" || row.device === "desktop" || row.device === "unknown"
      ? row.device
      : undefined;
  const attribution =
    row.attribution === "profile" || row.attribution === "qr" || row.attribution === "nfc"
      ? row.attribution
      : undefined;
  return {
    ...(surface ? { surface } : {}),
    ...(reason ? { reason } : {}),
    ...(brand ? { brand } : {}),
    ...(outcome ? { outcome } : {}),
    ...(device ? { device } : {}),
    ...(attribution ? { attribution } : {}),
  };
}

export function clampAnalyticsRangeDays(from: Date, to: Date, maxDays = CELEYOU_ANALYTICS_RANGE_MAX_DAYS): {
  from: Date;
  to: Date;
} {
  const span = to.getTime() - from.getTime();
  const maxMs = maxDays * 86_400_000;
  if (span <= maxMs) return { from, to };
  return { from: new Date(to.getTime() - maxMs), to };
}

export function celeYouTrendWindow(now = new Date(), days = CELEYOU_ANALYTICS_TREND_DAYS): { from: Date; to: Date } {
  const end = new Date(now);
  const start = startOfDay(addDays(end, 1 - days));
  return { from: start, to: end };
}

export type CeleYouTrendPoint = {
  day: string;
  views: number;
  actions: number;
};

export function buildCeleYouTrendSeries(
  rows: Array<{ kind: string; createdAt: Date }>,
  from: Date,
  to: Date
): CeleYouTrendPoint[] {
  const start = startOfDay(from);
  const end = startOfDay(to);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const series: CeleYouTrendPoint[] = Array.from({ length: Math.min(days, 91) }, (_, index) => {
    const day = toDayKey(addDays(start, index));
    return { day, views: 0, actions: 0 };
  });
  const indexByDay = new Map(series.map((point, index) => [point.day, index]));
  for (const row of rows) {
    const key = toDayKey(row.createdAt);
    const index = indexByDay.get(key);
    if (index == null) continue;
    if (row.kind === "profile_open") series[index].views += 1;
    else series[index].actions += 1;
  }
  return series;
}

export type CeleYouPopularLink = {
  kind: string;
  label: string;
  count: number;
  outcome: CeleYouEventOutcome;
};

const POPULAR_ORDER = [
  "qr_open",
  "nfc_tap",
  "vcard_download",
  "vcard_save",
  "call_tap",
  "whatsapp_tap",
  "email_tap",
  "website_tap",
  "social_tap",
  "location_tap",
  "meeting_open",
  "meeting_booked",
  "payment_open",
  "share_tap",
  "connect",
] as const;

export function celeYouPopularLinks(byKind: Record<string, number>): CeleYouPopularLink[] {
  return POPULAR_ORDER.map((kind) => ({
    kind,
    label: celeYouActivityLabel(kind),
    count: byKind[kind] ?? 0,
    outcome: celeYouEventOutcome(kind),
  }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function celeYouDeviceBreakdown(
  rows: Array<{ meta?: unknown }>
): Record<CeleYouDeviceCategory, number> {
  const counts: Record<CeleYouDeviceCategory, number> = {
    phone: 0,
    tablet: 0,
    desktop: 0,
    unknown: 0,
  };
  for (const row of rows) {
    const meta = sanitizeCeleYouActivityMeta(row.meta);
    counts[meta.device ?? "unknown"] += 1;
  }
  return counts;
}

export function ownerMayViewCeleYouAnalytics(input: {
  ownerUserId: string;
  viewerUserId: string | null | undefined;
}): boolean {
  return Boolean(input.viewerUserId && input.viewerUserId === input.ownerUserId);
}
