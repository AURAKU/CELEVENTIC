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
