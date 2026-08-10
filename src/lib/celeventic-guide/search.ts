import type { GuideCatalogEntry, GuideRole, GuideSearchHit } from "./types";
import { CELEVENTIC_GUIDE_CATALOG } from "./catalog";

/** Intent phrases → boost matching slugs / categories. */
export const GUIDE_SEARCH_SYNONYMS: Record<string, string[]> = {
  rsvp: ["respond", "attending", "decline", "reply"],
  invitation: ["invite", "card", "open invite"],
  seating: ["table", "seat", "where do i sit", "floor plan"],
  admission: ["qr", "pass", "entry", "check in", "door"],
  scan: ["scanner", "admit", "verify"],
  memory: ["photos", "gallery", "vault", "memories"],
  wishes: ["guestbook", "message", "congratulations"],
  guide: ["programme", "program", "menu", "event guide", "day of"],
  guests: ["guest list", "import", "csv", "plus one", "party"],
  vendor: ["staff", "crew", "team pass"],
  how: ["how it works", "see how", "overview", "learn"],
};

function normalize(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function expandQuery(query: string): string[] {
  const n = normalize(query);
  if (!n) return [];
  const tokens = new Set<string>(n.split(" ").filter(Boolean));
  tokens.add(n);
  for (const [canon, alts] of Object.entries(GUIDE_SEARCH_SYNONYMS)) {
    if (tokens.has(canon) || alts.some((a) => n.includes(a) || tokens.has(a))) {
      tokens.add(canon);
      for (const a of alts) tokens.add(a);
    }
  }
  return [...tokens];
}

export function scoreGuideAgainstQuery(
  guide: Pick<GuideCatalogEntry, "slug" | "title" | "summary" | "synonyms" | "category" | "role" | "featured">,
  query: string
): number {
  const tokens = expandQuery(query);
  if (!tokens.length) return 0;
  const hay = normalize(
    [guide.title, guide.summary, guide.slug, ...(guide.synonyms ?? []), guide.category, guide.role].join(" ")
  );
  let score = 0;
  for (const t of tokens) {
    if (!t) continue;
    if (normalize(guide.title) === t) score += 12;
    else if (normalize(guide.title).includes(t)) score += 8;
    if (guide.slug.includes(t.replace(/\s+/g, "-"))) score += 6;
    if ((guide.synonyms ?? []).some((s) => normalize(s).includes(t))) score += 5;
    if (hay.includes(t)) score += 2;
  }
  if (score > 0 && guide.featured) score += 1;
  return score;
}

export function searchGuides(
  query: string,
  options?: {
    role?: GuideRole | null;
    includeAdmin?: boolean;
    catalog?: GuideCatalogEntry[];
  }
): GuideSearchHit[] {
  const catalog = (options?.catalog ?? CELEVENTIC_GUIDE_CATALOG).filter((g) => {
    if (g.adminOnly && !options?.includeAdmin) return false;
    if ((g.status ?? "PUBLISHED") === "ARCHIVED") return false;
    if ((g.status ?? "PUBLISHED") === "DRAFT" && !options?.includeAdmin) return false;
    return true;
  });

  const q = normalize(query);
  let hits: GuideSearchHit[];

  if (!q) {
    hits = catalog.map((g) => ({
      slug: g.slug,
      title: g.title,
      summary: g.summary,
      role: g.role,
      category: g.category,
      score: g.featured ? 2 : 1,
      featured: !!g.featured,
    }));
  } else {
    hits = catalog
      .map((g) => ({
        slug: g.slug,
        title: g.title,
        summary: g.summary,
        role: g.role,
        category: g.category,
        score: scoreGuideAgainstQuery(g, q),
        featured: !!g.featured,
      }))
      .filter((h) => h.score > 0);
  }

  const preferred = options?.role;
  hits.sort((a, b) => {
    if (preferred) {
      const ar = a.role === preferred ? 1 : 0;
      const br = b.role === preferred ? 1 : 0;
      if (ar !== br) return br - ar;
    }
    if (b.score !== a.score) return b.score - a.score;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  return hits;
}
