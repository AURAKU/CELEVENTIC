import type { HubTabId } from "@/lib/experience/experience-types";
import type { InvitationDesignConfig, InvitationEventData, InvitationMediaAsset } from "@/types/invitation-design";
import { resolvePublicMediaUrl } from "@/lib/uploads/media-url";
import { fashionHouseLogoSrc, LUXURY_FASHION_HOUSE_DEFAULTS, mergeFashionHouse } from "./house-defaults";
import { resolveFashionSocialLinks } from "./social";
import type { FashionLookbookItem, FashionNavDestination, FashionOpeningStyle, LuxuryFashionHouseConfig } from "./types";

export { mergeFashionHouse };

function trim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function publicMediaUrl(url: string | null | undefined): string | null {
  const resolved = resolvePublicMediaUrl(url).trim();
  return resolved || null;
}

export function resolveFashionLede(house: LuxuryFashionHouseConfig): string {
  const lede = house.hubLede.trim();
  if (!lede || lede === LUXURY_FASHION_HOUSE_DEFAULTS.hubLede) return "";
  return lede;
}

/** One venue line — never "FEMMORA GH, FEMMORA GH". */
export function formatFashionVenueLine(locationName?: string | null, address?: string | null): string {
  const name = trim(locationName);
  const addr = trim(address);
  if (!name) return addr;
  if (!addr) return name;
  if (name.localeCompare(addr, undefined, { sensitivity: "accent" }) === 0) return name;
  const nameLower = name.toLowerCase();
  const addrLower = addr.toLowerCase();
  if (addrLower.startsWith(nameLower)) {
    const rest = addr.slice(name.length).replace(/^[\s,]+/, "");
    return rest ? `${name}, ${rest}` : name;
  }
  if (addrLower.includes(nameLower)) return addr;
  if (nameLower.includes(addrLower)) return name;
  return `${name}, ${addr}`;
}

function collapseFashionVenue(
  locationName: string,
  address: string,
  fallbackAddress = ""
): { locationName: string; address: string } {
  const name = trim(locationName);
  let addr = trim(address);
  if (!name) return { locationName: name, address: addr || trim(fallbackAddress) };
  // A duplicated venue name must not wipe the house district (Westlands).
  if (addr && name.localeCompare(addr, undefined, { sensitivity: "accent" }) === 0) {
    addr = trim(fallbackAddress);
    if (name.localeCompare(addr, undefined, { sensitivity: "accent" }) === 0) {
      addr = "";
    }
  }
  if (addr && addr.toLowerCase().startsWith(name.toLowerCase())) {
    addr = addr.slice(name.length).replace(/^[\s,]+/, "");
  }
  return { locationName: name, address: addr };
}

export function resolveFashionHouse(
  design?: InvitationDesignConfig | null,
  event?: InvitationEventData | null
): LuxuryFashionHouseConfig {
  const stored = design?.experience?.fashionHouse;
  const merged = mergeFashionHouse(LUXURY_FASHION_HOUSE_DEFAULTS, stored);

  const venue = collapseFashionVenue(
    trim(event?.venueName) || merged.locationName,
    trim(event?.landmark) || merged.address,
    merged.address
  );
  const locationName = venue.locationName;
  const address = venue.address;
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
  const src = publicMediaUrl(heroVideo?.url) || publicMediaUrl(input.house.filmUrl);
  const poster = publicMediaUrl(heroVideo?.posterUrl) || publicMediaUrl(input.house.filmPosterUrl);
  return { src, poster, status: heroVideo?.status };
}

export function resolveFashionLookbook(input: {
  house: LuxuryFashionHouseConfig;
  galleryUrls?: string[] | null;
  media?: InvitationMediaAsset[] | null;
}): FashionLookbookItem[] {
  const fromGallery = (input.galleryUrls ?? [])
    .map((url) => publicMediaUrl(url))
    .filter((url): url is string => Boolean(url))
    .map((url, index) => ({
      id: `gallery-${index}`,
      url,
      type: "image" as const,
      caption: `Look ${String(index + 1).padStart(2, "0")}`,
      collectionName: input.house.lookbookTitle,
    }));
  if (fromGallery.length) return fromGallery;

  if (input.house.lookbookItems?.length) {
    return input.house.lookbookItems
      .map((item) => ({
        ...item,
        url: publicMediaUrl(item.url) ?? "",
        posterUrl: publicMediaUrl(item.posterUrl) ?? item.posterUrl,
      }))
      .filter((item) => item.url);
  }

  const fromMedia = (input.media ?? [])
    .filter((m) => m.role === "reference" && m.url)
    .map((m, index) => ({
      id: m.name || `ref-${index}`,
      url: publicMediaUrl(m.url) ?? "",
      type: (m.type === "video" ? "video" : "image") as "image" | "video",
      posterUrl: publicMediaUrl(m.posterUrl),
    }))
    .filter((item) => item.url);
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
  return fashionHouseLogoSrc(house.flyerCardUrl, house.houseName);
}

export function resolveFashionVisionStore(house: LuxuryFashionHouseConfig): boolean {
  return house.visionStoreEnabled === true;
}
