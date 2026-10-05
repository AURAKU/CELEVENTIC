import { isVideoUrl } from "@/lib/invitation/theme-media-assets";
import { isUploadedMediaUrl } from "@/lib/uploads/media-url";
import type { InvitationMediaAsset } from "@/types/invitation-design";
import { SERAPHINE_LOOKBOOK_GALLERY } from "./preset";
import type { AureliaJourneyItem } from "./types";

const SERAPHINE_COUPLE_RE = /\/templates\/seraphine\/couple\//i;
const STOCK_JOURNEY_RE =
  /\/brand\/|unsplash|picsum|placeholder|lorempixel|monogram-lockup|guest-outfits|hero\.(?:jpe?g|png|webp)$/i;

export const SERAPHINE_JOURNEY_CHAPTERS: AureliaJourneyItem[] = [
  {
    id: "began",
    title: "Where it began",
    imageUrl: "/templates/seraphine/couple/01-chambers.jpg",
    caption: "Where it began",
  },
  {
    id: "sea",
    title: "By the sea",
    imageUrl: "/templates/seraphine/couple/02-beach.jpg",
    caption: "By the sea",
  },
  {
    id: "evening",
    title: "Evening light",
    imageUrl: "/templates/seraphine/couple/03-dinner.jpg",
    caption: "Evening light",
  },
  {
    id: "water",
    title: "On the water",
    imageUrl: "/templates/seraphine/couple/04-boat.jpg",
    caption: "On the water",
  },
  {
    id: "ease",
    title: "At ease",
    imageUrl: "/templates/seraphine/couple/05-lounge.jpg",
    caption: "At ease",
  },
  {
    id: "film",
    title: "Our Journey",
    imageUrl: "/templates/seraphine/couple/06-journey.mp4",
    caption: "Our Journey",
  },
];

const CATALOG_TITLE_BY_URL = new Map(
  SERAPHINE_JOURNEY_CHAPTERS.map((item) => [item.imageUrl?.trim() ?? "", item.title])
);

function trim(value?: string | null): string {
  return value?.trim() ?? "";
}

export function isSeraphineJourneyMedia(url?: string | null): boolean {
  const value = trim(url);
  if (!value) return false;
  if (SERAPHINE_COUPLE_RE.test(value)) return true;
  if (isUploadedMediaUrl(value)) return true;
  if (STOCK_JOURNEY_RE.test(value)) return false;
  if (/\/templates\//i.test(value)) return false;
  return value.startsWith("/uploads/") || value.startsWith("/api/uploads/");
}

function titleForUrl(url: string, index: number, fallback?: string): string {
  const catalog = CATALOG_TITLE_BY_URL.get(url);
  if (catalog) return catalog;
  const named = trim(fallback);
  if (named) return named;
  return index === 0 ? "Where it began" : `Chapter ${index + 1}`;
}

function toMoment(
  url: string,
  index: number,
  title?: string,
  caption?: string,
  id?: string
): AureliaJourneyItem {
  const label = titleForUrl(url, index, title || caption);
  return {
    id: trim(id) || `moment-${index + 1}`,
    title: label,
    imageUrl: url,
    caption: trim(caption) || label,
  };
}

/** Event uploads win. Catalogue Seraphine chapters fill an empty album. */
export function resolveAureliaJourneyMoments(input: {
  journey?: AureliaJourneyItem[] | null;
  galleryUrls?: string[] | null;
  media?: InvitationMediaAsset[] | null;
  catalogFallback?: AureliaJourneyItem[] | null;
  reservedUrls?: Array<string | null | undefined>;
}): AureliaJourneyItem[] {
  const reserved = new Set((input.reservedUrls ?? []).map((url) => trim(url)).filter(Boolean));
  const seen = new Set<string>();
  const items: AureliaJourneyItem[] = [];

  const push = (rawUrl?: string | null, title?: string, caption?: string, id?: string) => {
    const url = trim(rawUrl);
    if (!url || seen.has(url) || reserved.has(url) || !isSeraphineJourneyMedia(url)) return;
    seen.add(url);
    items.push(toMoment(url, items.length, title, caption, id));
  };

  for (const item of input.journey ?? []) {
    push(item.imageUrl, item.title, item.caption, item.id);
  }
  if (items.length > 0) return items;

  for (const url of input.galleryUrls ?? []) {
    if (isUploadedMediaUrl(url)) push(url);
  }
  for (const asset of input.media ?? []) {
    if (asset.role === "hero" || asset.role === "intro" || asset.role === "background") continue;
    if (isUploadedMediaUrl(asset.url)) push(asset.url, asset.name);
  }
  if (items.length > 0) return items;

  for (const item of input.catalogFallback ?? SERAPHINE_JOURNEY_CHAPTERS) {
    push(item.imageUrl, item.title, item.caption, item.id);
  }
  return items;
}

export function seraphineLookbookGallery(_coupleGallery?: readonly string[]): string[] {
  return [...SERAPHINE_LOOKBOOK_GALLERY];
}

export function isJourneyFilm(url?: string | null): boolean {
  return isVideoUrl(url);
}

export function journeyPosterUrl(items: AureliaJourneyItem[]): string | null {
  return items.find((item) => item.imageUrl && !isVideoUrl(item.imageUrl))?.imageUrl ?? null;
}
