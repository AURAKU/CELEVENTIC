import {
  AURELIA_CATALOG_SLUG,
  AURELIA_HERO_FALLBACK,
  isAureliaEditorialLayout,
  resolveAureliaHeroImage,
  SERAPHINE_CATALOG_SLUG,
  SERAPHINE_HERO_FALLBACK,
  SERAPHINE_LAYOUT_SLUG,
} from "@/lib/experience/aurelia-editorial";
import {
  FEMMORA_CATALOG_SLUG,
  FEMMORA_HOUSE_DEFAULTS,
  FEMMORA_SHARE_PLACECARD,
  LUXURY_FASHION_HOUSE_DEFAULTS,
  LUXURY_FASHION_LAYOUT_SLUG,
  mergeFashionHouse,
  type LuxuryFashionHouseConfig,
} from "@/lib/experience/luxury-fashion";

export type SocialHeroResolution = {
  url: string | null;
  source: "override" | "production-hero" | "cover" | "media-hero" | "template-safe" | "none";
};

function firstUrl(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function templateSafeFallback(input: {
  catalogSlug?: string | null;
  layoutSlug?: string | null;
}): string | null {
  const slug = input.catalogSlug?.trim() || "";
  const layout = input.layoutSlug?.trim() || "";
  if (layout === SERAPHINE_LAYOUT_SLUG || slug === SERAPHINE_CATALOG_SLUG) {
    return SERAPHINE_HERO_FALLBACK;
  }
  if (isAureliaEditorialLayout(layout) || slug === AURELIA_CATALOG_SLUG) {
    return AURELIA_HERO_FALLBACK;
  }
  if (slug === FEMMORA_CATALOG_SLUG || layout === LUXURY_FASHION_LAYOUT_SLUG) {
    return FEMMORA_SHARE_PLACECARD;
  }
  return null;
}

/**
 * Canonical social-card photograph. Never borrows another template's couple
 * image. A missing photo yields `null` so the renderer can fall back to a
 * text-led branded card instead of a broken image.
 */
export function resolveSocialHeroImage(input: {
  catalogSlug?: string | null;
  layoutSlug?: string | null;
  shareOgImageUrl?: string | null;
  fashionHouse?: Partial<LuxuryFashionHouseConfig> | null;
  heroImageUrl?: string | null;
  coverImageUrl?: string | null;
  mediaHeroUrl?: string | null;
}): SocialHeroResolution {
  const override = input.shareOgImageUrl?.trim();
  if (override) return { url: override, source: "override" };

  const slug = input.catalogSlug?.trim() || "";
  const isFemmoraSku = slug === FEMMORA_CATALOG_SLUG;
  const isFashionLayout =
    isFemmoraSku ||
    slug === LUXURY_FASHION_LAYOUT_SLUG ||
    input.layoutSlug === LUXURY_FASHION_LAYOUT_SLUG;
  if (isFashionLayout || input.fashionHouse) {
    const base = isFemmoraSku ? FEMMORA_HOUSE_DEFAULTS : LUXURY_FASHION_HOUSE_DEFAULTS;
    const house = mergeFashionHouse(base, input.fashionHouse);
    const fashion = house.shareOgImageUrl?.trim();
    if (fashion) return { url: fashion, source: "override" };
    if (isFemmoraSku) return { url: FEMMORA_SHARE_PLACECARD, source: "template-safe" };
  }

  if (isAureliaEditorialLayout(input.layoutSlug) || slug === AURELIA_CATALOG_SLUG || slug === SERAPHINE_CATALOG_SLUG) {
    const hero = resolveAureliaHeroImage({
      heroImageUrl: input.heroImageUrl,
      coverImageUrl: input.coverImageUrl,
      mediaHeroUrl: input.mediaHeroUrl,
      fallback:
        input.layoutSlug === SERAPHINE_LAYOUT_SLUG || slug === SERAPHINE_CATALOG_SLUG
          ? SERAPHINE_HERO_FALLBACK
          : AURELIA_HERO_FALLBACK,
    });
    return { url: hero, source: input.heroImageUrl || input.coverImageUrl || input.mediaHeroUrl ? "production-hero" : "template-safe" };
  }

  const production = firstUrl(input.heroImageUrl);
  if (production) return { url: production, source: "production-hero" };
  const cover = firstUrl(input.coverImageUrl);
  if (cover) return { url: cover, source: "cover" };
  const media = firstUrl(input.mediaHeroUrl);
  if (media) return { url: media, source: "media-hero" };

  const safe = templateSafeFallback(input);
  if (safe) return { url: safe, source: "template-safe" };
  return { url: null, source: "none" };
}
