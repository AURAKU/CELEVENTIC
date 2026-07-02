import type { InspirationPlatform } from "@prisma/client";

export function detectPlatform(url: string): InspirationPlatform {
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com") || lower.includes("instagr.am")) return "INSTAGRAM";
  if (lower.includes("tiktok.com")) return "TIKTOK";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YOUTUBE";
  if (lower.includes("pinterest.com") || lower.includes("pin.it")) return "PINTEREST";
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower)) return "IMAGE_LINK";
  if (/\.(mp4|webm|mov)(\?|$)/i.test(lower)) return "VIDEO_LINK";
  if (lower.includes("canva.com")) return "WEBSITE";
  return "UNKNOWN";
}

export function extractDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host;
  } catch {
    return null;
  }
}

const PLATFORM_SHORT: Record<InspirationPlatform, string> = {
  INSTAGRAM: "Reel",
  TIKTOK: "TikTok",
  YOUTUBE: "Short",
  PINTEREST: "Pin",
  WEBSITE: "Web",
  IMAGE_LINK: "Image",
  VIDEO_LINK: "Video",
  UPLOAD: "Upload",
  UNKNOWN: "Link",
};

export function inferTitleFromUrl(url: string, platform: InspirationPlatform): string {
  const domain = extractDomain(url) ?? "inspiration";
  return `${PLATFORM_SHORT[platform]} concept from ${domain}`;
}
