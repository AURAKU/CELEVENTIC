import type { InvitationDesignConfig, InvitationEventData, InvitationMediaAsset } from "@/types/invitation-design";
import { FEMMORA_HOUSE_DEFAULTS } from "./femmora-preset";
import type { FashionLookbookItem, LuxuryFashionHouseConfig } from "./types";

function trim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function mergeFashionHouse(
  base: LuxuryFashionHouseConfig,
  override?: Partial<LuxuryFashionHouseConfig> | null
): LuxuryFashionHouseConfig {
  if (!override) return base;
  return {
    ...base,
    ...override,
    navLabels: override.navLabels?.length ? override.navLabels : base.navLabels,
    lookbookItems: override.lookbookItems ?? base.lookbookItems,
    filmUrl: override.filmUrl === undefined ? base.filmUrl : override.filmUrl,
    filmPosterUrl: override.filmPosterUrl === undefined ? base.filmPosterUrl : override.filmPosterUrl,
  };
}

export function resolveFashionHouse(
  design?: InvitationDesignConfig | null,
  event?: InvitationEventData | null
): LuxuryFashionHouseConfig {
  const stored = design?.experience?.fashionHouse;
  const merged = mergeFashionHouse(FEMMORA_HOUSE_DEFAULTS, stored);

  const locationName = trim(event?.venueName) || merged.locationName;
  const address = trim(event?.landmark) || merged.address;
  const mapsUrl = trim(event?.mapsLink) || merged.mapsUrl;
  const eventTitle = trim(event?.title) || merged.eventTitle;
  const houseName = trim(event?.hostName) || merged.houseName;

  return {
    ...merged,
    houseName,
    eventTitle,
    locationName,
    address,
    mapsUrl,
    startAtIso: trim(event?.startDateRaw) || merged.startAtIso,
  };
}

export function resolveFashionFilm(input: {
  house: LuxuryFashionHouseConfig;
  media?: InvitationMediaAsset[] | null;
}): { src: string | null; poster: string | null; status?: InvitationMediaAsset["status"] } {
  const heroVideo = input.media?.find((m) => m.type === "video" && m.role === "hero" && m.url);
  const src = heroVideo?.url || input.house.filmUrl || null;
  const poster = heroVideo?.posterUrl || input.house.filmPosterUrl || null;
  return { src, poster, status: heroVideo?.status };
}

export function resolveFashionStoreStills(input: {
  house: LuxuryFashionHouseConfig;
  galleryUrls?: string[] | null;
  media?: InvitationMediaAsset[] | null;
  limit?: number;
}): FashionLookbookItem[] {
  const all = resolveFashionLookbook(input);
  const cap = Math.max(1, input.limit ?? 4);
  return all.slice(0, cap).map((item, index) => ({
    ...item,
    id: `atelier-${item.id}`,
    caption: item.caption || `Atelier ${String(index + 1).padStart(2, "0")}`,
    collectionName: item.collectionName || "Store preview",
  }));
}

export function resolveFashionLookbook(input: {
  house: LuxuryFashionHouseConfig;
  galleryUrls?: string[] | null;
  media?: InvitationMediaAsset[] | null;
}): FashionLookbookItem[] {
  if (input.house.lookbookItems?.length) {
    return input.house.lookbookItems.filter((item) => item.url);
  }

  const fromGallery = (input.galleryUrls ?? [])
    .filter(Boolean)
    .map((url, index) => ({
      id: `gallery-${index}`,
      url,
      type: "image" as const,
      caption: `Look ${String(index + 1).padStart(2, "0")}`,
      collectionName: input.house.lookbookTitle,
    }));
  if (fromGallery.length) return fromGallery;

  const fromMedia = (input.media ?? [])
    .filter((m) => m.role === "reference" && m.url)
    .map((m, index) => ({
      id: m.name || `ref-${index}`,
      url: m.url,
      type: (m.type === "video" ? "video" : "image") as "image" | "video",
      posterUrl: m.posterUrl,
    }));
  return fromMedia;
}
