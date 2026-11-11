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

/** Cardholder Wallet card. QR opens the same public profile. Not phone to phone NFC. */
export function digitalCardWalletPath(slug: string): string {
  return `${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(slug)}/wallet`;
}

export function digitalCardPresentUrl(slug: string, origin?: string): string {
  const path = digitalCardPresentPath(slug);
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

export function digitalCardOgImagePath(slug: string, version?: string | number | null): string {
  const base = `/card/${encodeURIComponent(slug)}/og`;
  if (version == null || version === "") return base;
  return `${base}?v=${encodeURIComponent(String(version))}`;
}

export function digitalCardExportImagePath(slug: string, version?: string | number | null): string {
  const base = `/api/digital-business-cards/public/${encodeURIComponent(slug)}/card`;
  if (version == null || version === "") return `${base}?download=1`;
  return `${base}?download=1&v=${encodeURIComponent(String(version))}`;
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

/** Link preview subtitle on WhatsApp, iMessage, X, LinkedIn. Matches the share caption. */
export function celeCardShareDescription(
  _card?: Pick<CeleCardShareFields, "title" | "company" | "bio" | "displayName" | "email" | "phone">
): string {
  return SMARTCARD_BRAND_TAGLINE;
}

/** Native share body. Name, CeleYou, official line. Optional live URL on its own line. */
export function celeCardShareMessage(
  card: Pick<CeleCardShareFields, "displayName">,
  url?: string | null
): string {
  const name = card.displayName.trim();
  const line = name
    ? `${name} on ${SMARTCARD_PRODUCT_SHORT_NAME}. ${SMARTCARD_BRAND_TAGLINE}`
    : `My ${SMARTCARD_PRODUCT_SHORT_NAME}. ${SMARTCARD_BRAND_TAGLINE}`;
  const live = url?.trim();
  if (!live || line.includes(live)) return line;
  return `${line}\n${live}`;
}

export function celeCardShareClipboard(
  card: Pick<CeleCardShareFields, "displayName">,
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
}): Metadata {
  const title = celeCardShareTitle(input.card);
  const description = celeCardShareDescription(input.card);
  const canonical = `${input.origin.replace(/\/$/, "")}${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(input.card.slug)}`;
  const image = input.imagePath.startsWith("http")
    ? input.imagePath
    : `${input.origin.replace(/\/$/, "")}${input.imagePath}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "profile",
      url: canonical,
      siteName: SMARTCARD_PRODUCT_SHORT_NAME,
      images: [
        {
          url: image,
          width: CELECARD_OG_WIDTH,
          height: CELECARD_OG_HEIGHT,
          alt: `${input.card.displayName} ${SMARTCARD_PRODUCT_SHORT_NAME}`,
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
