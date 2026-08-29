import type { HubTabId } from "@/lib/experience/experience-types";
import type { InvitationDesignConfig, InvitationEventData, InvitationMediaAsset } from "@/types/invitation-design";
import { LUXURY_FASHION_HOUSE_DEFAULTS, mergeFashionHouse } from "./house-defaults";
import { resolveFashionSocialLinks } from "./social";
import type { FashionLookbookItem, FashionNavDestination, FashionOpeningStyle, LuxuryFashionHouseConfig } from "./types";

export { mergeFashionHouse };

function trim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function resolveFashionLede(house: LuxuryFashionHouseConfig): string {
  const lede = house.hubLede.trim();
  if (!lede || lede === LUXURY_FASHION_HOUSE_DEFAULTS.hubLede) return "";
  return lede;
}

export function resolveFashionHouse(
  design?: InvitationDesignConfig | null,
  event?: InvitationEventData | null
): LuxuryFashionHouseConfig {
  const stored = design?.experience?.fashionHouse;
  const merged = mergeFashionHouse(LUXURY_FASHION_HOUSE_DEFAULTS, stored);

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

export type FashionChapterId = Extract<
  FashionNavDestination,
  | "experience"
  | "store-preview"
  | "collection"
  | "event-details"
  | "location"
  | "rsvp"
  | "share"
  | "social"
>;

export type FashionChapterFlags = Record<FashionChapterId, boolean> & {
  countdown: boolean;
  mapsCta: boolean;
};

export function resolveFashionChapters(input: {
  house: LuxuryFashionHouseConfig;
  filmSrc: string | null;
  looksCount: number;
  enabledTabs?: HubTabId[] | null;
}): FashionChapterFlags {
  const tabs = new Set(input.enabledTabs ?? []);
  const tabOn = (id: HubTabId) => tabs.size === 0 || tabs.has(id);
  const ch = input.house.chapters;
  const hasVenue = Boolean(input.house.locationName || input.house.address);
  const socialLinks = resolveFashionSocialLinks(input.house);
  return {
    experience: ch?.boutique !== false,
    "store-preview": ch?.film !== false && Boolean(input.filmSrc),
    collection: ch?.collection !== false && input.looksCount > 0,
    "event-details": false,
    location: hasVenue,
    rsvp: ch?.rsvp !== false && tabOn("rsvp"),
    share: ch?.share !== false,
    social:
      ch?.social !== false &&
      input.house.showSocialSection === true &&
      socialLinks.length > 0,
    countdown: ch?.countdown !== false && Boolean(input.house.startAtIso) && tabOn("countdown"),
    mapsCta: ch?.maps !== false && Boolean(input.house.mapsUrl),
  };
}

export function resolveFashionOpeningStyle(house: LuxuryFashionHouseConfig): FashionOpeningStyle {
  if (house.openingStyle === "silk-only" || house.openingStyle === "portal-only") {
    return house.openingStyle;
  }
  return "card-envelope";
}

/** Envelope never plays store film. Dedicated teaser clips are unused. */
export function resolveFashionTeaser(): { src: string | null; poster: string | null } {
  return { src: null, poster: null };
}

export function resolveFashionFlyerCard(house: LuxuryFashionHouseConfig): string | null {
  return house.flyerCardUrl?.trim() || null;
}
