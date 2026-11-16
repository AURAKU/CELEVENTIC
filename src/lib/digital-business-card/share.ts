import type { Metadata } from "next";
import { isLocalHost } from "@/lib/app-url";
import { SMARTCARD_BRAND_TAGLINE, SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
import { celeYouCameraScanUrl } from "@/lib/digital-business-card/share-identity";
import { DIGITAL_CARD_PUBLIC_PATH } from "@/lib/digital-business-card/types";
import { isAutomatedPreviewAgent } from "@/lib/celeyou-share/events";

export const CELECARD_OG_WIDTH = 1200;
export const CELECARD_OG_HEIGHT = 630;
export const CELECARD_CARD_ASPECT = 85.6 / 54;
export const CELECARD_EXPORT_WIDTH = 1712;
export const CELECARD_EXPORT_HEIGHT = 1080;

export type CeleCardShareFields = {
  slug: string;
  displayName: string;
  title?: string | null;
  company?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  isLive?: boolean;
  isDemo?: boolean;
  updatedAt?: Date | string | null;
};

export function digitalCardPresentPath(slug: string, options?: { immersive?: boolean }): string {
  const path = `${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(slug)}/present`;
  return options?.immersive ? `${path}?immersive=1` : path;
}

/** Guest Wallet card. Uploaded payment channels only. Access codes still apply. */
export function digitalCardWalletPath(slug: string): string {
  return `${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(slug)}/wallet`;
}

export function digitalCardPresentUrl(slug: string, origin?: string): string {
  const path = digitalCardPresentPath(slug);
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

export const CELECARD_PLATE_SHARE_GEN = "p6";

export function digitalCardOgImagePath(slug: string, version?: string | number | null): string {
  const base = `/card/${encodeURIComponent(slug)}/og`;
  if (version == null || version === "") return base;
  return `${base}?v=${encodeURIComponent(String(version))}`;
}

/** Cache-busted OG plate. Busts WhatsApp/iMessage tiles that cached the Celeventic icon. */
export function celeCardPageOgPath(slug: string, updatedAt?: Date | string | null, fallback = "live"): string {
  return digitalCardOgImagePath(slug, `${CELECARD_PLATE_SHARE_GEN}-${celeCardShareCacheVersion(updatedAt, fallback)}`);
}

export function digitalCardExportImagePath(slug: string, version?: string | number | null): string {
  const base = `/api/digital-business-cards/public/${encodeURIComponent(slug)}/card`;
  if (version == null || version === "") return `${base}?download=1`;
  return `${base}?download=1&v=${encodeURIComponent(String(version))}`;
}

/** Live plate PNG first (WhatsApp, iMessage, Instagram), then the 1200×630 OG tile. */
export function celeCardShareImageUrls(slug: string, version?: string | number | null): string[] {
  const token =
    version == null || version === ""
      ? CELECARD_PLATE_SHARE_GEN
      : `${CELECARD_PLATE_SHARE_GEN}-${version}`;
  return [digitalCardExportImagePath(slug, token), digitalCardOgImagePath(slug, token)];
}

/**
 * Share-sheet plate URLs for the cardholder's live activated plate.
 * Prefer updatedAt so each publish busts cached PNG/OG tiles.
 */
export function celeYouLivePlateShareUrls(
  slug: string,
  version?: string | number | Date | null
): string[] {
  if (version instanceof Date) {
    return celeCardShareImageUrls(slug, celeCardShareCacheVersion(version));
  }
  if (typeof version === "string" && version.trim() && Number.isNaN(Number(version))) {
    const parsed = Date.parse(version);
    if (Number.isFinite(parsed)) return celeCardShareImageUrls(slug, String(parsed));
  }
  return celeCardShareImageUrls(slug, version ?? "live");
}

/** Make plate/OG paths absolute so share/copy fetch always hits the live host. */
export function absoluteCeleYouAssetUrl(pathOrUrl: string, origin?: string | null): string {
  const raw = String(pathOrUrl || "").trim();
  if (!raw || /^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  const base = String(origin || "").replace(/\/$/, "");
  if (!base) return raw.startsWith("/") ? raw : `/${raw}`;
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

/**
 * Absolute live plate PNG + OG URLs for the cardholder's activated plate.
 * Always prefer these for Share / Copy Link so the exact plate is attached.
 */
export function absoluteCeleYouLivePlateShareUrls(
  slug: string,
  version?: string | number | Date | null,
  origin?: string | null
): string[] {
  // Prefer the host the guest is actually on so Share/Copy fetch the same cardplate they see.
  const browser =
    typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";
  const base = browser || origin?.replace(/\/$/, "") || "";
  return celeYouLivePlateShareUrls(slug, version).map((url) => absoluteCeleYouAssetUrl(url, base));
}

/** Relative plate paths for client share/copy (same-origin as the live cardplate page). */
export function celeYouRelativeLivePlateShareUrls(
  slug: string,
  version?: string | number | Date | null
): string[] {
  return celeYouLivePlateShareUrls(slug, version);
}

/** Encoded into the QR bitmap. Survives slug edits. Always a camera-safe guest URL. */
export function celeCardStableQrUrl(publicToken: string, origin?: string): string {
  return celeYouCameraScanUrl(publicToken, origin);
}

/** Live webpage tap. Canonical public profile, never the owner dashboard. */
export function celeCardQrTapPath(slug: string): string {
  return `${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(slug)}`;
}

export function celeCardReadableQrLabel(url: string): string {
  try {
    const parsed = new URL(url);
    if (isLocalHost(parsed.hostname)) return parsed.pathname;
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}`;
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/^(localhost|127\.0\.0\.1)(:\d+)?/i, "");
  }
}

export function celeCardShareCacheVersion(updatedAt?: Date | string | null, fallback = "1"): string {
  if (!updatedAt) return fallback;
  const time = updatedAt instanceof Date ? updatedAt.getTime() : Date.parse(updatedAt);
  return Number.isFinite(time) ? String(time) : fallback;
}

export function celeCardShareTitle(card: Pick<CeleCardShareFields, "displayName" | "title">): string {
  const name = card.displayName.trim();
  return name ? `${name} on ${SMARTCARD_PRODUCT_SHORT_NAME}` : SMARTCARD_PRODUCT_SHORT_NAME;
}

export function celeCardShareRoleLine(
  card: Pick<CeleCardShareFields, "title" | "company">
): string {
  const title = card.title?.trim() || "";
  const company = card.company?.trim() || "";
  if (title && company) return `${title} at ${company}`;
  return title || company;
}

/** Share caption for WhatsApp / iMessage / socials. Matches the proven live plate share voice. */
export function celeCardShareCommentary(
  card: Pick<CeleCardShareFields, "displayName" | "title" | "company">
): string {
  const name = card.displayName.trim();
  // Exact WhatsApp voice: "Meet AuraTheKing. Their live CeleYou plate."
  if (name) return `Meet ${name}. Their live CeleYou plate.`;
  return `Meet this live CeleYou plate. ${SMARTCARD_BRAND_TAGLINE}`;
}

/** Link preview subtitle on WhatsApp, iMessage, X, LinkedIn. Matches the share caption. */
export function celeCardShareDescription(
  card?: Pick<CeleCardShareFields, "title" | "company" | "bio" | "displayName" | "email" | "phone">
): string {
  if (!card) return SMARTCARD_BRAND_TAGLINE;
  return celeCardShareCommentary(card);
}

/** Native share body. Card commentary, then the live URL on its own line. */
export function celeCardShareMessage(
  card: Pick<CeleCardShareFields, "displayName" | "title" | "company">,
  url?: string | null
): string {
  const line = celeCardShareCommentary(card);
  const live = url?.trim();
  if (!live || line.includes(live)) return line;
  return `${line}\n${live}`;
}

export function celeCardShareClipboard(
  card: Pick<CeleCardShareFields, "displayName" | "title" | "company">,
  url: string
): string {
  return celeCardShareMessage(card, url);
}

export async function isCeleYouUnfurlRequest(): Promise<boolean> {
  try {
    const { headers } = await import("next/headers");
    return isAutomatedPreviewAgent((await headers()).get("user-agent") || "");
  } catch {
    return false;
  }
}

export function celeCardShareTextLeaksPrivate(
  text: string,
  card: Pick<CeleCardShareFields, "email" | "phone">
): boolean {
  const haystack = text.toLowerCase();
  const secrets = [card.email, card.phone]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value && value.length > 3));
  return secrets.some((secret) => haystack.includes(secret));
}

export function withheldCeleCardMetadata(): Metadata {
  return {
    title: SMARTCARD_PRODUCT_SHORT_NAME,
    description: "This CeleYou is unavailable.",
    robots: { index: false, follow: false },
  };
}

export function courtesyCeleCardMetadata(displayName?: string | null): Metadata {
  const name = displayName?.trim();
  return {
    title: name ? `${name} · ${SMARTCARD_PRODUCT_SHORT_NAME}` : SMARTCARD_PRODUCT_SHORT_NAME,
    description: "This CeleYou’s full profile is temporarily unavailable.",
    robots: { index: false, follow: false },
  };
}

export function buildCeleCardShareMetadata(input: {
  card: CeleCardShareFields;
  origin: string;
  imagePath: string;
  /** Prefer `/u/{username}` when the shared link is the live identity handle. */
  profilePath?: string | null;
}): Metadata {
  const title = celeCardShareTitle(input.card);
  const description = celeCardShareDescription(input.card);
  const path =
    input.profilePath?.trim() ||
    `${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(input.card.slug)}`;
  const canonical = `${input.origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const image = input.imagePath.startsWith("http")
    ? input.imagePath
    : `${input.origin.replace(/\/$/, "")}${input.imagePath}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    icons: {
      icon: [{ url: image, type: "image/jpeg", sizes: `${CELECARD_OG_WIDTH}x${CELECARD_OG_HEIGHT}` }],
      apple: [{ url: image, type: "image/jpeg" }],
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      siteName: SMARTCARD_PRODUCT_SHORT_NAME,
      images: [
        {
          url: image,
          secureUrl: image,
          width: CELECARD_OG_WIDTH,
          height: CELECARD_OG_HEIGHT,
          alt: `${input.card.displayName} ${SMARTCARD_PRODUCT_SHORT_NAME}`,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
