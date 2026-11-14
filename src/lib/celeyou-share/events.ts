export const CELEYOU_PUBLIC_EVENT_KINDS = [
  "vcard_save",
  "call_tap",
  "whatsapp_tap",
  "email_tap",
  "website_tap",
  "share_tap",
  "social_tap",
  "location_tap",
  "meeting_open",
  "payment_open",
] as const;

export const CELEYOU_ACTIVITY_LABEL: Record<string, string> = {
  profile_open: "Profile opened",
  qr_open: "Smart QR link opened",
  nfc_tap: "NFC tag opened",
  vcard_save: "Save contact tapped",
  vcard_download: "vCard downloaded",
  vcard_denied: "Contact export blocked",
  call_tap: "Call tapped",
  whatsapp_tap: "WhatsApp tapped",
  email_tap: "Email tapped",
  website_tap: "Website tapped",
  social_tap: "Social link tapped",
  location_tap: "Location tapped",
  meeting_open: "Booking opened",
  meeting_booked: "Meeting requested",
  payment_open: "Payment details opened",
  share_tap: "Share started",
  connect: "Connect Back sent",
};

export type CeleYouPublicEventKind = (typeof CELEYOU_PUBLIC_EVENT_KINDS)[number];

export function isCeleYouPublicEventKind(value: string): value is CeleYouPublicEventKind {
  return (CELEYOU_PUBLIC_EVENT_KINDS as readonly string[]).includes(value);
}

export function celeYouActivityLabel(kind: string): string {
  return CELEYOU_ACTIVITY_LABEL[kind] || "Published action";
}

const CRAWLER_HINT =
  /bot|crawler|spider|facebookexternalhit|slackbot|twitterbot|linkedinbot|discordbot|telegrambot|embedly|applebot|bingpreview|semrush|ahrefs|bytespider/i;
const HEADLESS_PREVIEW =
  /bot|crawler|spider|preview|facebookexternalhit|whatsapp|slackbot|twitterbot|linkedinbot|discordbot|telegrambot|embedly|quora|pinterest|applebot|bingpreview|semrush|ahrefs|bytespider/i;
const REAL_BROWSER = /mozilla/i;
const REAL_ENGINE = /applewebkit|gecko|chrome|safari|firefox|edg/i;

export function isAutomatedPreviewAgent(userAgent: string): boolean {
  const ua = userAgent.trim();
  if (!ua) return false;
  if (REAL_BROWSER.test(ua) && REAL_ENGINE.test(ua)) return CRAWLER_HINT.test(ua);
  return HEADLESS_PREVIEW.test(ua);
}

export function shouldCountCeleYouGuestStat(input: {
  ownerUserId?: string | null;
  viewerUserId?: string | null;
  userAgent?: string | null;
  isDemo?: boolean;
}): boolean {
  if (input.isDemo) return false;
  if (input.viewerUserId && input.ownerUserId && input.viewerUserId === input.ownerUserId) return false;
  if (input.userAgent && isAutomatedPreviewAgent(input.userAgent)) return false;
  return true;
}

export type CeleYouGuestEventMeta = {
  brand?: string;
  outcome?: "attempted" | "completed";
};

export function trackCeleYouGuestEvent(
  slug: string,
  kind: CeleYouPublicEventKind,
  extra?: CeleYouGuestEventMeta
) {
  if (!slug || typeof window === "undefined") return;
  const path = `/api/digital-business-cards/public/${encodeURIComponent(slug)}/events`;
  const body = JSON.stringify({
    kind,
    ...(extra?.brand ? { brand: extra.brand } : {}),
    outcome: extra?.outcome === "completed" ? "attempted" : extra?.outcome || "attempted",
  });
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon(path, blob)) return;
    }
  } catch {
    /* fall through */
  }
  void fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
