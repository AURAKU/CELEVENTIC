import { prisma } from "@/lib/prisma";
import {
  CATALOG_TEMPLATES,
  getBrowseCatalogTemplates,
  isCatalogTemplatePubliclyListed,
  type BrowseCatalogOptions,
  type CatalogTemplate,
} from "@/lib/invitation-mvp/catalogue";

export type CatalogVisibilityOverlay = {
  hiddenSlugs: string[];
  revealedSlugs: string[];
};

/** DB overlay for admin hide/unhide. Missing DATABASE_URL never 500s public browse. */
export async function loadCatalogVisibilityOverlay(): Promise<CatalogVisibilityOverlay> {
  if (!process.env.DATABASE_URL) {
    return { hiddenSlugs: [], revealedSlugs: [] };
  }
  try {
    const rows = await prisma.invitationCatalogTemplate.findMany({
      select: { slug: true, isActive: true },
    });
    return {
      hiddenSlugs: rows.filter((row) => !row.isActive).map((row) => row.slug),
      revealedSlugs: rows.filter((row) => row.isActive).map((row) => row.slug),
    };
  } catch {
    return { hiddenSlugs: [], revealedSlugs: [] };
  }
}

export function applyCatalogVisibility(
  overlay: CatalogVisibilityOverlay,
  options?: Pick<BrowseCatalogOptions, "includeHidden">
): BrowseCatalogOptions {
  return {
    hiddenSlugs: overlay.hiddenSlugs,
    revealedSlugs: overlay.revealedSlugs,
    includeHidden: options?.includeHidden,
  };
}

export function getVisibleBrowseCatalogTemplates(
  overlay: CatalogVisibilityOverlay,
  options?: Pick<BrowseCatalogOptions, "includeHidden">
): CatalogTemplate[] {
  return getBrowseCatalogTemplates(applyCatalogVisibility(overlay, options));
}

export function isCatalogSlugPubliclyListed(
  slug: string,
  overlay: CatalogVisibilityOverlay,
  options?: Pick<BrowseCatalogOptions, "includeHidden">
): boolean {
  const template = CATALOG_TEMPLATES.find((item) => item.slug === slug);
  if (!template) return false;
  return isCatalogTemplatePubliclyListed(template, applyCatalogVisibility(overlay, options));
}
