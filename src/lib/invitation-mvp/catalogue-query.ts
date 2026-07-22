import { getBrowseCatalogTemplates, type CatalogTemplate } from "./catalogue";

/**
 * Pure catalogue query with cursor pagination — shared by the public API
 * route and server-side first-batch rendering. The cursor is an opaque
 * base64 offset over the canonical CATALOG_TEMPLATES ordering.
 */

export interface CatalogQueryFilters {
  category?: string;
  tier?: string;
  style?: string;
  mood?: string;
  colorFamily?: string;
  hasParallax?: boolean;
  tags?: string[];
  search?: string;
}

export function matchesCatalogFilters(t: CatalogTemplate, f: CatalogQueryFilters): boolean {
  if (f.category && f.category !== "all" && t.category !== f.category) return false;
  if (f.tier && f.tier !== "all") {
    const tier = t.tier ?? (t.isPremium ? "premium" : "free");
    if (tier !== f.tier) return false;
  }
  if (f.style && f.style !== "all" && t.style !== f.style) return false;
  if (f.mood && f.mood !== "all" && t.mood !== f.mood) return false;
  if (f.colorFamily && f.colorFamily !== "all" && t.colorFamily !== f.colorFamily) return false;
  if (f.hasParallax && !t.hasParallax) return false;
  if (f.tags?.length && !f.tags.every((tag) => t.tags?.includes(tag))) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    if (
      !t.name.toLowerCase().includes(q) &&
      !t.description.toLowerCase().includes(q) &&
      !t.slug.toLowerCase().includes(q) &&
      !(t.mood?.toLowerCase().includes(q)) &&
      !t.tags?.some((tag) => tag.toLowerCase().includes(q))
    ) {
      return false;
    }
  }
  return true;
}

export function encodeCatalogCursor(offset: number): string {
  return `c${offset.toString(36)}`;
}

export function decodeCatalogCursor(cursor: string | null | undefined): number {
  if (!cursor?.startsWith("c")) return 0;
  const parsed = parseInt(cursor.slice(1), 36);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export interface CatalogQueryResult {
  items: CatalogTemplate[];
  nextCursor: string | null;
  total: number;
}

export function queryCatalog(
  filters: CatalogQueryFilters,
  cursor?: string | null,
  limit = 12
): CatalogQueryResult {
  const matched = getBrowseCatalogTemplates().filter((t) => matchesCatalogFilters(t, filters));
  const start = decodeCatalogCursor(cursor);
  const end = Math.min(start + limit, matched.length);
  return {
    items: matched.slice(start, end),
    nextCursor: end < matched.length ? encodeCatalogCursor(end) : null,
    total: matched.length,
  };
}
