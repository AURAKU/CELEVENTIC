export const CELEYOU_PUBLIC_EVENT_KINDS = [
  "vcard_save",
  "call_tap",
  "whatsapp_tap",
  "email_tap",
  "website_tap",
  "share_tap",
] as const;

export const CELEYOU_ACTIVITY_LABEL: Record<string, string> = {
  profile_open: "Profile opened",
  qr_open: "QR opened",
  nfc_tap: "NFC card opened",
  vcard_save: "Contact saved",
  vcard_denied: "Contact export blocked",
  call_tap: "Call",
  whatsapp_tap: "WhatsApp",
  email_tap: "Email",
  website_tap: "Website",
  share_tap: "Share",
  connect: "Connect Back",
};

export type CeleYouPublicEventKind = (typeof CELEYOU_PUBLIC_EVENT_KINDS)[number];

export function isCeleYouPublicEventKind(value: string): value is CeleYouPublicEventKind {
  return (CELEYOU_PUBLIC_EVENT_KINDS as readonly string[]).includes(value);
}

export function celeYouActivityLabel(kind: string): string {
  return CELEYOU_ACTIVITY_LABEL[kind] || "Published action";
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
