export const CELEYOU_PUBLIC_EVENT_KINDS = [
  "vcard_save",
  "call_tap",
  "whatsapp_tap",
  "email_tap",
  "website_tap",
  "share_tap",
] as const;

export type CeleYouPublicEventKind = (typeof CELEYOU_PUBLIC_EVENT_KINDS)[number];

export function isCeleYouPublicEventKind(value: string): value is CeleYouPublicEventKind {
  return (CELEYOU_PUBLIC_EVENT_KINDS as readonly string[]).includes(value);
}

export function isAutomatedPreviewAgent(userAgent: string): boolean {
  return /bot|crawler|spider|preview|facebookexternalhit|whatsapp|slackbot|twitterbot|linkedinbot|discordbot|telegrambot|embedly|quora|pinterest|applebot|bingpreview|semrush|ahrefs|bytespider/i.test(
    userAgent
  );
}

export function trackCeleYouGuestEvent(slug: string, kind: CeleYouPublicEventKind) {
  if (!slug || typeof window === "undefined") return;
  const path = `/api/digital-business-cards/public/${encodeURIComponent(slug)}/events`;
  const body = JSON.stringify({ kind });
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
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
