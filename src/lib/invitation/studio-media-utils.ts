import type { InvitationDesignConfig, InvitationMediaAsset } from "@/types/invitation-design";
import { getDemoGalleryUrls, getDemoHeroUrl, isVideoUrl } from "@/lib/invitation/demo-gallery-assets";

export function heroUrlFromDesign(design: InvitationDesignConfig): string | null {
  const hero = design.media?.find((m) => m.role === "hero" || m.role === "background");
  return hero?.url ?? null;
}

export function syncDesignMediaHero(
  design: InvitationDesignConfig,
  url: string | null,
  type: "image" | "video" = "image"
): InvitationDesignConfig {
  const rest = (design.media ?? []).filter((m) => m.role !== "hero" && m.role !== "background");
  if (!url) return { ...design, media: rest.length ? rest : undefined };
  const asset: InvitationMediaAsset = {
    url,
    type,
    role: type === "video" ? "background" : "hero",
    name: type === "video" ? "Hero video" : "Hero photo",
  };
  return { ...design, media: [asset, ...rest] };
}

export function resolvePreviewCoverImage(
  design: InvitationDesignConfig,
  galleryUrls?: string[] | null
): string {
  return heroUrlFromDesign(design) ?? galleryUrls?.[0] ?? getDemoHeroUrl(design.layout ?? "classic-gold");
}

export function resolvePreviewGalleryUrls(
  design: InvitationDesignConfig,
  galleryUrls?: string[] | null
): string[] {
  if (galleryUrls?.length) return galleryUrls;
  const fromMedia = (design.media ?? [])
    .filter((m) => m.role === "reference" || m.role === "hero")
    .map((m) => m.url);
  if (fromMedia.length > 1) return fromMedia;
  return getDemoGalleryUrls(design.layout ?? "classic-gold");
}

export function galleryItemsFromUrls(urls: string[]) {
  return urls.map((url, i) => ({
    id: `g-${i}`,
    url,
    type: (isVideoUrl(url) ? "video" : "image") as "image" | "video",
  }));
}
