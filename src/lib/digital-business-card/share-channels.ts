import { digitalCardQrImageSrc } from "@/lib/digital-business-card/types";

/** Print PNG: 2048px, ECC H, 8-module quiet zone, no logo. */
export function celeYouPrintQrPngSrc(shareUrl: string) {
  return digitalCardQrImageSrc(shareUrl, {
    size: 2048,
    variant: "guide",
    download: true,
  });
}

/** Print SVG: same destination and guide modules as the PNG. */
export function celeYouPrintQrSvgSrc(shareUrl: string) {
  return digitalCardQrImageSrc(shareUrl, {
    size: 2048,
    format: "svg",
    variant: "guide",
    download: true,
  });
}

function captionWithUrl(text: string, url: string) {
  const trimmed = text.trim();
  const destination = url.trim();
  if (!destination) return trimmed;
  return trimmed.includes(destination) ? trimmed : `${trimmed}\n${destination}`.trim();
}

/** Guest Share Card channels when the OS sheet is missing or the guest picks an app. */
export const CELEYOU_GUEST_SHARE_CHANNELS = [
  "whatsapp",
  "sms",
  "telegram",
  "facebook",
  "x",
  "linkedin",
  "email",
] as const;

export type CeleYouGuestShareChannel = (typeof CELEYOU_GUEST_SHARE_CHANNELS)[number];

export type CeleYouGuestSharePayload = {
  title: string;
  text: string;
  url: string;
};

/** WhatsApp share of the public profile. Never put private reach in `text`. */
export function celeYouWhatsAppShareHref(text: string, url: string) {
  return `https://wa.me/?text=${encodeURIComponent(captionWithUrl(text, url))}`;
}

/** Email share of the public profile. Never put private reach in `text`. */
export function celeYouEmailShareHref(title: string, text: string, url: string) {
  const subject = encodeURIComponent(title.trim() || "CeleYou");
  const body = encodeURIComponent(captionWithUrl(text, url));
  return `mailto:?subject=${subject}&body=${body}`;
}

/** Deep links / web intents for guest Share Card across socials. Public URL + caption only. */
export function celeYouShareChannelHref(
  channel: CeleYouGuestShareChannel,
  payload: CeleYouGuestSharePayload
): string {
  const title = payload.title.trim() || "CeleYou";
  const url = payload.url.trim();
  const text = payload.text.trim();
  const full = captionWithUrl(text, url);
  switch (channel) {
    case "whatsapp":
      return celeYouWhatsAppShareHref(text, url);
    case "sms":
      // iOS prefers &body=; Android accepts ?body= — combined form works on both.
      return `sms:?&body=${encodeURIComponent(full)}`;
    case "telegram":
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || title)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    case "x":
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text || title)}&url=${encodeURIComponent(url)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    case "email":
      return celeYouEmailShareHref(title, text, url);
  }
}

export function openCeleYouShareChannel(
  channel: CeleYouGuestShareChannel,
  payload: CeleYouGuestSharePayload
) {
  const href = celeYouShareChannelHref(channel, payload);
  if (!href || typeof window === "undefined") return;
  if (channel === "email" || channel === "sms") {
    window.location.href = href;
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}
