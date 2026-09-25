import { qrBrandingService } from "@/services/qr/qr-branding.service";
import { resolveMediaUrl } from "@/lib/uploads/media-url";
import { CELEVENTIC_OFFICIAL_LOGO } from "@/lib/qr/qr-constants";
import {
  AURELIA_CATALOG_SLUG,
  AURELIA_HERO_FALLBACK,
  isAureliaEditorialLayout,
  resolveAureliaHeroImage,
  SERAPHINE_CATALOG_SLUG,
} from "@/lib/experience/aurelia-editorial";
import {
  FEMMORA_CATALOG_SLUG,
  FEMMORA_HOUSE_DEFAULTS,
  FEMMORA_SHARE_PLACECARD,
  FEMMORA_SHARE_PLACECARD_HEIGHT,
  FEMMORA_SHARE_PLACECARD_WIDTH,
  LUXURY_FASHION_HOUSE_DEFAULTS,
  LUXURY_FASHION_LAYOUT_SLUG,
  mergeFashionHouse,
  type LuxuryFashionHouseConfig,
} from "@/lib/experience/luxury-fashion";

export const FEMMORA_SHARE_PLACECARD_TYPE = "image/jpeg";
export const AURELIA_SHARE_HERO_WIDTH = 731;
export const AURELIA_SHARE_HERO_HEIGHT = 1024;
export const AURELIA_SHARE_HERO_TYPE = "image/jpeg";

export type ResolvedShareOgImage = {
  url: string;
  width?: number;
  height?: number;
  type?: string;
};

function toAbsoluteShareUrl(appUrl: string, pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  const base = appUrl.replace(/\/$/, "");
  return `${base}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function isFemmoraSharePlacecard(pathOrUrl: string): boolean {
  return (
    pathOrUrl === FEMMORA_SHARE_PLACECARD || pathOrUrl.includes("/templates/femmora/share-placecard.jpg")
  );
}

function isAureliaShareHero(pathOrUrl: string): boolean {
  return pathOrUrl === AURELIA_HERO_FALLBACK || /\/templates\/aurelia\/hero\.jpg(\?|$)/i.test(pathOrUrl);
}

function decorateShareImage(appUrl: string, pathOrUrl: string): ResolvedShareOgImage {
  const url = toAbsoluteShareUrl(appUrl, pathOrUrl);
  if (isFemmoraSharePlacecard(pathOrUrl)) {
    return {
      url,
      width: FEMMORA_SHARE_PLACECARD_WIDTH,
      height: FEMMORA_SHARE_PLACECARD_HEIGHT,
      type: FEMMORA_SHARE_PLACECARD_TYPE,
    };
  }
  if (isAureliaShareHero(pathOrUrl)) {
    return {
      url,
      width: AURELIA_SHARE_HERO_WIDTH,
      height: AURELIA_SHARE_HERO_HEIGHT,
      type: AURELIA_SHARE_HERO_TYPE,
    };
  }
  return { url };
}

/**
 * Fashion-house / Femmora-SKU link preview. Maison Vale and generic houses
 * return null unless they set their own `shareOgImageUrl` — they never inherit
 * the Femmora card photo.
 */
export function resolveFashionShareOgImageForInvitation(input: {
  appUrl: string;
  catalogSlug?: string | null;
  layoutSlug?: string | null;
  fashionHouse?: Partial<LuxuryFashionHouseConfig> | null;
}): ResolvedShareOgImage | null {
  const slug = input.catalogSlug?.trim() || "";
  const isFemmoraSku = slug === FEMMORA_CATALOG_SLUG;
  const isFashionLayout =
    isFemmoraSku ||
    slug === LUXURY_FASHION_LAYOUT_SLUG ||
    input.layoutSlug === LUXURY_FASHION_LAYOUT_SLUG;

  if (!isFashionLayout && !input.fashionHouse) return null;

  const base = isFemmoraSku ? FEMMORA_HOUSE_DEFAULTS : LUXURY_FASHION_HOUSE_DEFAULTS;
  const house = mergeFashionHouse(base, input.fashionHouse);
  const raw = house.shareOgImageUrl?.trim();
  if (raw) return decorateShareImage(input.appUrl, raw);
  if (isFemmoraSku) return decorateShareImage(input.appUrl, FEMMORA_SHARE_PLACECARD);
  return null;
}

/**
 * Aurelia-family link preview. WhatsApp / iMessage / social crawlers show the
 * couple hero photograph attached to the invitation URL.
 */
export function resolveAureliaShareOgImageForInvitation(input: {
  appUrl: string;
  catalogSlug?: string | null;
  layoutSlug?: string | null;
  heroImageUrl?: string | null;
  coverImageUrl?: string | null;
  mediaHeroUrl?: string | null;
}): ResolvedShareOgImage | null {
  const slug = input.catalogSlug?.trim() || "";
  const isAureliaSku = slug === AURELIA_CATALOG_SLUG || slug === SERAPHINE_CATALOG_SLUG;
  if (!isAureliaSku && !isAureliaEditorialLayout(input.layoutSlug)) return null;

  const hero = resolveAureliaHeroImage({
    heroImageUrl: input.heroImageUrl,
    coverImageUrl: input.coverImageUrl,
    mediaHeroUrl: input.mediaHeroUrl,
  });
  return decorateShareImage(input.appUrl, hero);
}

export function shareOgImageToOpenGraph(image: ResolvedShareOgImage, alt: string) {
  return {
    url: image.url,
    alt,
    ...(image.width ? { width: image.width } : {}),
    ...(image.height ? { height: image.height } : {}),
    ...(image.type ? { type: image.type } : {}),
  };
}

/**
 * Resolve the social share preview image for a guest-facing page (invite
 * links, event public pages, admission passes) shared on WhatsApp, iMessage,
 * Facebook, X/Twitter, Telegram, etc.
 *
 * Resolution order intentionally mirrors the branded QR center mark so the
 * link-preview thumbnail and the QR the guest scans always match:
 * 1. Event's uploaded QR center logo (`event.qrCenterImageUrl`)
 * 2. Admin platform default logo
 * 3. Celeventic official logo (`/brand/logo-full.png`)
 *
 * Always returns an absolute `https://` URL against `appUrl` so social
 * crawlers (which cannot resolve relative paths or localhost) can fetch it.
 *
 * Fashion invitations should call `resolveFashionShareOgImageForInvitation`
 * first — Femmora uses the physical card photo, not this logo fallback.
 * Aurelia-family invitations use the couple hero photograph next.
 */
export async function resolveShareOgImage(eventId: string, appUrl: string): Promise<string> {
  let centerImage: string;
  try {
    centerImage = await qrBrandingService.resolveCenterImageUrl(eventId);
  } catch {
    centerImage = CELEVENTIC_OFFICIAL_LOGO;
  }

  const resolved = resolveMediaUrl(centerImage) || CELEVENTIC_OFFICIAL_LOGO;
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) return resolved;
  return `${appUrl}${resolved.startsWith("/") ? resolved : `/${resolved}`}`;
}

export async function resolveInvitationShareOgImage(input: {
  eventId: string;
  appUrl: string;
  catalogSlug?: string | null;
  layoutSlug?: string | null;
  fashionHouse?: Partial<LuxuryFashionHouseConfig> | null;
  heroImageUrl?: string | null;
  coverImageUrl?: string | null;
  mediaHeroUrl?: string | null;
}): Promise<ResolvedShareOgImage> {
  const fashion = resolveFashionShareOgImageForInvitation(input);
  if (fashion) return fashion;
  const aurelia = resolveAureliaShareOgImageForInvitation(input);
  if (aurelia) return aurelia;
  return { url: await resolveShareOgImage(input.eventId, input.appUrl) };
}
