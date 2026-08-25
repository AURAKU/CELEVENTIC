import { CELEVENTIC_GUIDE_CATALOG } from "./catalog";
import type { GuideCatalogEntry } from "./types";

export function resolveRelatedGuides(
  guide: Pick<GuideCatalogEntry, "slug" | "relatedSlugs" | "role" | "category">,
  catalog: GuideCatalogEntry[] = CELEVENTIC_GUIDE_CATALOG,
  limit = 4
): GuideCatalogEntry[] {
  const bySlug = new Map(catalog.map((g) => [g.slug, g]));
  const picked: GuideCatalogEntry[] = [];
  const seen = new Set<string>([guide.slug]);

  for (const slug of guide.relatedSlugs ?? []) {
    const hit = bySlug.get(slug);
    if (!hit || seen.has(hit.slug)) continue;
    if (hit.adminOnly) continue;
    if ((hit.status ?? "PUBLISHED") !== "PUBLISHED") continue;
    picked.push(hit);
    seen.add(hit.slug);
    if (picked.length >= limit) return picked;
  }

  for (const g of catalog) {
    if (seen.has(g.slug)) continue;
    if (g.adminOnly) continue;
    if ((g.status ?? "PUBLISHED") !== "PUBLISHED") continue;
    if (g.role === guide.role || g.category === guide.category) {
      picked.push(g);
      seen.add(g.slug);
      if (picked.length >= limit) break;
    }
  }

  return picked;
}
