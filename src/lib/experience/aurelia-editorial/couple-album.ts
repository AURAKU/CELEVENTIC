import { isVideoUrl } from "@/lib/invitation/theme-media-assets";
import { isUploadedMediaUrl } from "@/lib/uploads/media-url";
import type { InvitationMediaAsset } from "@/types/invitation-design";
import type { AureliaJourneyItem } from "./types";

export type AureliaCoupleAlbumItem = {
  id: string;
  url: string;
  type: "image" | "video";
  caption?: string;
  posterUrl?: string | null;
};

const FAMILY_COUPLE_PORTRAIT_RE =
  /\/templates\/(?:aurelia|seraphine)\/(?:couple\/|story\.(?:jpe?g|png|webp)$)/i;
const STOCK_COUPLE_ALBUM_RE =
  /\/templates\/|\/brand\/|unsplash|picsum|placeholder|lorempixel|monogram-lockup|guest-outfits/i;

export function isAureliaCoupleAlbumStock(url?: string | null): boolean {
  const value = url?.trim() ?? "";
  if (!value) return true;
  if (FAMILY_COUPLE_PORTRAIT_RE.test(value)) return false;
  return STOCK_COUPLE_ALBUM_RE.test(value);
}

function isCoupleAlbumSource(url: string): boolean {
  if (FAMILY_COUPLE_PORTRAIT_RE.test(url)) return true;
  if (isAureliaCoupleAlbumStock(url)) return false;
  if (isUploadedMediaUrl(url)) return true;
  return url.startsWith("/uploads/") || url.startsWith("/api/uploads/");
}

export function resolveAureliaCoupleAlbum(input: {
  galleryUrls?: string[] | null;
  media?: InvitationMediaAsset[] | null;
  journey?: AureliaJourneyItem[] | null;
  reservedUrls?: Array<string | null | undefined>;
}): AureliaCoupleAlbumItem[] {
  const reserved = new Set(
    (input.reservedUrls ?? []).map((url) => url?.trim()).filter((url): url is string => Boolean(url))
  );
  const seen = new Set<string>();
  const items: AureliaCoupleAlbumItem[] = [];

  const push = (
    rawUrl?: string | null,
    type?: "image" | "video" | "pdf",
    caption?: string,
    posterUrl?: string | null,
    id?: string
  ) => {
    const url = rawUrl?.trim();
    if (!url || reserved.has(url) || seen.has(url) || type === "pdf") return;
    if (!isCoupleAlbumSource(url)) return;
    seen.add(url);
    items.push({
      id: id?.trim() || `couple-${items.length + 1}`,
      url,
      type: type === "video" || isVideoUrl(url) ? "video" : "image",
      caption: caption?.trim() || undefined,
      posterUrl: posterUrl?.trim() || null,
    });
  };

  for (const url of input.galleryUrls ?? []) {
    push(url);
  }
  for (const asset of input.media ?? []) {
    if (asset.role === "hero" || asset.role === "intro" || asset.role === "background") continue;
    push(asset.url, asset.type, asset.name, asset.posterUrl);
  }
  for (const item of input.journey ?? []) {
    push(item.imageUrl, "image", item.caption, null, item.id);
  }

  return items;
}

/** Guest playback: stills first, then films, so the last picture leads into video. */
export function orderCoupleAlbumForPlayback(items: AureliaCoupleAlbumItem[]): AureliaCoupleAlbumItem[] {
  const photos = items.filter((item) => item.type !== "video");
  const films = items.filter((item) => item.type === "video");
  return [...photos, ...films];
}
