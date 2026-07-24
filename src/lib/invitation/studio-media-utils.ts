import type { InvitationDesignConfig, InvitationMediaAsset } from "@/types/invitation-design";
import {
  getThemeGalleryUrls,
  getThemeHeroUrl,
  resolveEventTheme,
  isVideoUrl,
} from "@/lib/invitation/theme-media-assets";

export interface ResolvedBackgroundMedia {
  backgroundImageUrl: string | null;
  backgroundVideoUrl: string | null;
}

export function heroUrlFromDesign(design: InvitationDesignConfig): string | null {
  const hero = design.media?.find((m) => m.role === "hero");
  return hero?.url ?? null;
}

/** The dedicated pre-invite welcome photo — soft-intro / "BEGIN" gate only. */
export function introAtmosphereUrlFromDesign(design: InvitationDesignConfig): string | null {
  const shot = design.media?.find((m) => m.role === "intro");
  return shot?.url ?? null;
}

export function syncDesignIntroAtmosphere(
  design: InvitationDesignConfig,
  url: string | null
): InvitationDesignConfig {
  const rest = (design.media ?? []).filter((m) => m.role !== "intro");
  if (!url) return { ...design, media: rest.length ? rest : undefined };
  const asset: InvitationMediaAsset = {
    url,
    type: "image",
    role: "intro",
    name: "Pre-invite welcome photo",
  };
  return { ...design, media: [...rest, asset] };
}

export function pageBackgroundFromDesign(design: InvitationDesignConfig): ResolvedBackgroundMedia {
  const page = design.media?.find((m) => m.role === "background");
  if (!page) return { backgroundImageUrl: null, backgroundVideoUrl: null };
  if (page.type === "video") return { backgroundImageUrl: null, backgroundVideoUrl: page.url };
  return { backgroundImageUrl: page.url, backgroundVideoUrl: null };
}

export function resolveBackgroundMedia(
  design: InvitationDesignConfig,
  catalog?: { backgroundImageUrl?: string | null; backgroundVideoUrl?: string | null } | null
): ResolvedBackgroundMedia {
  const userBg = pageBackgroundFromDesign(design);
  if (userBg.backgroundImageUrl || userBg.backgroundVideoUrl) return userBg;
  return {
    backgroundImageUrl: catalog?.backgroundImageUrl ?? null,
    backgroundVideoUrl: catalog?.backgroundVideoUrl ?? null,
  };
}

export function syncDesignMediaHero(
  design: InvitationDesignConfig,
  url: string | null,
  type: "image" | "video" = "image"
): InvitationDesignConfig {
  const rest = (design.media ?? []).filter((m) => m.role !== "hero");
  if (!url) return { ...design, media: rest.length ? rest : undefined };
  const asset: InvitationMediaAsset = {
    url,
    type,
    role: "hero",
    name: type === "video" ? "Hero video" : "Hero photo",
  };
  return { ...design, media: [asset, ...rest] };
}

export function syncDesignPageBackground(
  design: InvitationDesignConfig,
  url: string | null,
  type: "image" | "video" = "image"
): InvitationDesignConfig {
  const rest = (design.media ?? []).filter((m) => m.role !== "background");
  if (!url) return { ...design, media: rest.length ? rest : undefined };
  const asset: InvitationMediaAsset = {
    url,
    type,
    role: "background",
    name: type === "video" ? "Page background video" : "Page background image",
  };
  return { ...design, media: [...rest, asset] };
}

export function resolvePreviewCoverImage(
  design: InvitationDesignConfig,
  galleryUrls?: string[] | null
): string {
  const layout = design.layout ?? "classic-gold";
  const theme = resolveEventTheme(layout);
  return heroUrlFromDesign(design) ?? galleryUrls?.[0] ?? getThemeHeroUrl(layout, theme);
}

export function resolvePreviewGalleryUrls(
  design: InvitationDesignConfig,
  galleryUrls?: string[] | null,
  catalog?: { defaultGalleryUrls?: string[] | null } | null
): string[] {
  if (galleryUrls?.length) return galleryUrls;
  const catalogGallery = catalog?.defaultGalleryUrls;
  if (Array.isArray(catalogGallery) && catalogGallery.length) return catalogGallery;
  const layout = design.layout ?? "classic-gold";
  const theme = resolveEventTheme(layout);
  const fromMedia = (design.media ?? [])
    .filter((m) => m.role === "reference" || m.role === "hero")
    .map((m) => m.url);
  if (fromMedia.length > 1) return fromMedia;
  return getThemeGalleryUrls(layout, theme);
}

export function galleryItemsFromUrls(urls: string[]) {
  return urls.map((url, i) => ({
    id: `g-${i}`,
    url,
    type: (isVideoUrl(url) ? "video" : "image") as "image" | "video",
  }));
}

export { isVideoUrl };
