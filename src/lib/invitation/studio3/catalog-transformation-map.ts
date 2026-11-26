/**
 * Experience 3.0 — catalog transformation map (planning + tracking).
 * Protected / UNKNOWN original SKUs are never edited in place.
 * Successors are new ix3-* layout identities only.
 */

export type CatalogTransformStatus =
  | "mapped"
  | "batch1-review"
  | "batch2-planned"
  | "batch3-planned"
  | "batch4-planned";

export type CatalogTransformRow = {
  catalogSlug: string;
  name: string;
  category: string;
  originalLayout: string;
  protection: "PROTECTED" | "UNKNOWN";
  proposedSuccessor: string;
  designFamily: string;
  batch: 1 | 2 | 3 | 4;
  visualCompletion: 0 | 0.25 | 0.5 | 0.75 | 1;
  functionalCompletion: 0 | 0.25 | 0.5 | 0.75 | 1;
  studioCompatible: boolean;
  mobileQa: "pending" | "partial" | "pass" | "fail";
  desktopQa: "pending" | "partial" | "pass" | "fail";
  status: CatalogTransformStatus;
  notes: string;
};

type Seed = {
  catalogSlug: string;
  name: string;
  category: string;
  originalLayout: string;
  protection: "PROTECTED" | "UNKNOWN";
  proposedSuccessor: string;
  designFamily: string;
  batch: 1 | 2 | 3 | 4;
  visualCompletion: 0 | 0.25 | 0.5 | 0.75 | 1;
  functionalCompletion: 0 | 0.25 | 0.5 | 0.75 | 1;
  status: CatalogTransformStatus;
  notes: string;
};

function row(seed: Seed): CatalogTransformRow {
  return {
    ...seed,
    studioCompatible: true,
    mobileQa: seed.batch === 1 && seed.visualCompletion >= 0.5 ? "partial" : "pending",
    desktopQa: seed.batch === 1 && seed.visualCompletion >= 0.5 ? "partial" : "pending",
  };
}

/**
 * Complete 48-SKU mapping. Visual completion reflects honest redesign progress
 * of the *successor identity*, not the protected original.
 */
export const CATALOG_TRANSFORMATION_ROWS: readonly CatalogTransformRow[] = [
  // —— Batch 1: six registered families + reference successors ——
  row({
    catalogSlug: "traditional-marriage-ceremony",
    name: "Peach Silk Ribbon",
    category: "Wedding",
    originalLayout: "traditional-marriage-ceremony",
    protection: "PROTECTED",
    proposedSuccessor: "ix3-heritage-marriage",
    designFamily: "heritage-ceremony",
    batch: 1,
    visualCompletion: 0.75,
    functionalCompletion: 0.75,
    status: "batch1-review",
    notes:
      "Protected v1 untouched. Phase 5 refinement: envelope seal, couple card, programme, venue panel. Not yet parity with Forever Afaris craft.",
  }),
  row({
    catalogSlug: "kente-heritage-union",
    name: "Kente Covenant",
    category: "Wedding",
    originalLayout: "kente-heritage-union",
    protection: "UNKNOWN",
    proposedSuccessor: "ix3-heritage-marriage",
    designFamily: "heritage-ceremony",
    batch: 1,
    visualCompletion: 0.5,
    functionalCompletion: 0.5,
    status: "batch1-review",
    notes: "Interim mapping to heritage family; Batch 2 needs kente-specific art direction.",
  }),
  row({
    catalogSlug: "neon-celebration-party",
    name: "Electric Pulse",
    category: "Birthday",
    originalLayout: "neon-celebration-party",
    protection: "UNKNOWN",
    proposedSuccessor: "ix3-birthday-celebration",
    designFamily: "celebration",
    batch: 1,
    visualCompletion: 0.75,
    functionalCompletion: 0.75,
    status: "batch1-review",
    notes: "Phase 5 refinement: poster hero, night plan, venue panel. Still needs style variants for kids vs glam.",
  }),
  row({
    catalogSlug: "concert-night-bash",
    name: "Concert Night Bash",
    category: "Birthday",
    originalLayout: "neon-celebration-party",
    protection: "UNKNOWN",
    proposedSuccessor: "ix3-concert-night",
    designFamily: "celebration",
    batch: 1,
    visualCompletion: 0.75,
    functionalCompletion: 0.75,
    status: "batch1-review",
    notes: "Phase 5 refinement: ticket stub, lineup list, center hero. No background audio wired yet.",
  }),
  row({
    catalogSlug: "corporate-prestige-summit",
    name: "Platinum Summit",
    category: "Corporate",
    originalLayout: "corporate-prestige-summit",
    protection: "UNKNOWN",
    proposedSuccessor: "ix3-corporate-gala",
    designFamily: "conference",
    batch: 1,
    visualCompletion: 0.75,
    functionalCompletion: 0.75,
    status: "batch1-review",
    notes: "Phase 5 refinement: centered black-tie hero, agenda table, arrival panel. Speakers module not wired.",
  }),
  row({
    catalogSlug: "product-launch-pulse",
    name: "Product Launch Pulse",
    category: "Corporate",
    originalLayout: "corporate-prestige-summit",
    protection: "UNKNOWN",
    proposedSuccessor: "ix3-brand-launch",
    designFamily: "brand-launch",
    batch: 1,
    visualCompletion: 0.75,
    functionalCompletion: 0.5,
    status: "batch1-review",
    notes: "Uses brand-launch reference as successor path (reference polish, not Batch 1 family rewrite).",
  }),
  row({
    catalogSlug: "femmora-flagship-soft-opening",
    name: "Femmora Flagship Opening",
    category: "Lunch",
    originalLayout: "luxury-fashion-flagship",
    protection: "PROTECTED",
    proposedSuccessor: "ix3-brand-launch",
    designFamily: "brand-launch",
    batch: 1,
    visualCompletion: 0.5,
    functionalCompletion: 0.5,
    status: "batch1-review",
    notes: "Protected Femmora untouched; fashion-specific Batch 3 variant still required.",
  }),
  row({
    catalogSlug: "custom-media",
    name: "Your Canvas",
    category: "Private Event",
    originalLayout: "custom-media",
    protection: "UNKNOWN",
    proposedSuccessor: "ix3-graduation",
    designFamily: "academic",
    batch: 1,
    visualCompletion: 0.75,
    functionalCompletion: 0.75,
    status: "batch1-review",
    notes: "Phase 5 refinement: diploma frame, ceremony order, venue panel. Gallery/Memory Vault not in shell.",
  }),
  row({
    catalogSlug: "surprise-gift-soiree",
    name: "Surprise Gift Soiree",
    category: "Birthday",
    originalLayout: "neon-celebration-party",
    protection: "UNKNOWN",
    proposedSuccessor: "ix3-baby-shower",
    designFamily: "shower",
    batch: 1,
    visualCompletion: 0.75,
    functionalCompletion: 0.75,
    status: "batch1-review",
    notes:
      "Phase 5 refinement soft shower family; dedicated gift-soirée variant still pending. Gift wallet only when configured.",
  }),

  // —— Batch 2: remaining wedding + birthday social ——
  ...([
    ["forever-afaris-wedding", "The Aurora", "forever-afaris-wedding", "PROTECTED", "ix3-editorial-wedding", "editorial-wedding"],
    ["seraphine-champagne-wedding", "Seraphine Champagne Wedding", "seraphine-champagne-wedding", "PROTECTED", "ix3-editorial-wedding", "editorial-wedding"],
    ["aurelia-editorial-wedding", "Aurelia Editorial Wedding", "aurelia-editorial-wedding", "PROTECTED", "ix3-editorial-wedding", "editorial-wedding"],
    ["classic-gold", "Satin Bow Ivory", "classic-gold", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["gilded-vows", "Gilded Vows", "classic-gold", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["gilded-opulence-pages", "Gilded Opulence Gallery", "classic-gold", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["luxury-rings", "Onyx & Gold Vows", "luxury-rings", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["arch-green", "Vine Cathedral", "arch-green", "UNKNOWN", "ix3-heritage-marriage", "heritage-ceremony"],
    ["emerald-promise", "Emerald Promise", "arch-green", "UNKNOWN", "ix3-heritage-marriage", "heritage-ceremony"],
    ["emerald-cathedral", "Emerald Cathedral", "arch-green", "UNKNOWN", "ix3-heritage-marriage", "heritage-ceremony"],
    ["boho-hexagon", "Hexagon Reverie", "boho-hexagon", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["floral-garden", "Secret Garden", "floral-garden", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["floral-garden-romance", "Petal Promise", "floral-garden-romance", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["passport-luxe", "Stamped Romance", "passport-luxe", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["passport-destination-wedding", "Horizon Boarding Pass", "passport-destination-wedding", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["glass-acrylic", "Frostlight Premiere", "glass-acrylic", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["crystal-acrylic-luxury", "Champagne Crystal", "crystal-acrylic-luxury", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["royal-emerald-wedding", "Palace Emerald Reign", "royal-emerald-wedding", "UNKNOWN", "ix3-heritage-marriage", "heritage-ceremony"],
    ["midnight-velvet-reception", "Velvet Midnight Soirée", "midnight-velvet-reception", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["rustic-lace", "Timber & Lace", "rustic-lace", "UNKNOWN", "ix3-editorial-wedding", "editorial-wedding"],
    ["golden-islamic-nikkah", "Nikkah Gold Geometry", "golden-islamic-nikkah", "UNKNOWN", "ix3-heritage-marriage", "heritage-ceremony"],
    ["kente-court", "Kente Court", "kente-heritage-union", "UNKNOWN", "ix3-heritage-marriage", "heritage-ceremony"],
    ["kente-royale-pages", "Kente Royale", "kente-heritage-union", "UNKNOWN", "ix3-heritage-marriage", "heritage-ceremony"],
    ["pastel-balloon-garden", "Pastel Balloon Garden", "neon-celebration-party", "UNKNOWN", "ix3-birthday-celebration", "celebration"],
    ["gold-glam-milestone", "Gold Glam Milestone", "neon-celebration-party", "UNKNOWN", "ix3-birthday-celebration", "celebration"],
  ] as const).map(([catalogSlug, name, originalLayout, protection, proposedSuccessor, designFamily]) =>
    row({
      catalogSlug,
      name,
      category: catalogSlug.includes("balloon") || catalogSlug.includes("glam") ? "Birthday" : "Wedding",
      originalLayout,
      protection,
      proposedSuccessor,
      designFamily,
      batch: 2,
      visualCompletion: 0.25,
      functionalCompletion: 0.25,
      status: "batch2-planned",
      notes: "Mapped only. Distinct SKU-level visual variants still required.",
    })
  ),

  // —— Batch 3: corporate / professional ——
  ...([
    ["executive-boardroom-brief", "Executive Boardroom Brief"],
    ["investor-night-pass", "Investor Night Pass"],
    ["keynote-agenda-flip", "Keynote Agenda Flip"],
  ] as const).map(([catalogSlug, name]) =>
    row({
      catalogSlug,
      name,
      category: "Corporate",
      originalLayout: "corporate-prestige-summit",
      protection: "UNKNOWN",
      proposedSuccessor: "ix3-corporate-gala",
      designFamily: "conference",
      batch: 3,
      visualCompletion: 0.25,
      functionalCompletion: 0.25,
      status: "batch3-planned",
      notes: "Needs distinct professional compositions (boardroom / investor / keynote).",
    })
  ),

  // —— Batch 4: memorial / funeral (11) ——
  ...([
    ["memorial-candle-tribute", "Candlelight Elegy", "PROTECTED"],
    ["candlelight-farewell", "Candlelight Farewell", "UNKNOWN"],
    ["white-lily-rest", "White Lily Rest", "UNKNOWN"],
    ["royal-mourning-lite", "Royal Mourning Lite", "UNKNOWN"],
    ["candlelight-elegy-pages", "Candlelight Tribute Chapters", "UNKNOWN"],
    ["white-lily-memorial-pages", "White Lily Memorial", "UNKNOWN"],
    ["royal-mourning-pages", "Royal Mourning Estate", "UNKNOWN"],
    ["black-red-cloth-rite", "Black Red Cloth Rite", "UNKNOWN"],
    ["white-cloth-homegoing", "White Cloth Homegoing", "UNKNOWN"],
    ["kente-border-farewell", "Kente Border Farewell", "UNKNOWN"],
    ["one-week-vigil-notice", "One Week Vigil Notice", "UNKNOWN"],
  ] as const).map(([catalogSlug, name, protection]) =>
    row({
      catalogSlug,
      name,
      category: "Funeral",
      originalLayout: "memorial-candle-tribute",
      protection,
      proposedSuccessor: "ix3-memorial",
      designFamily: "memorial",
      batch: 4,
      visualCompletion: 0.25,
      functionalCompletion: 0.25,
      status: "batch4-planned",
      notes: "One memorial shell does not satisfy 11 SKUs — Batch 4 requires distinct solemn variants.",
    })
  ),
];

export function catalogTransformSummary() {
  const rows = CATALOG_TRANSFORMATION_ROWS;
  const avg = (key: "visualCompletion" | "functionalCompletion") =>
    rows.length ? rows.reduce((sum, r) => sum + r[key], 0) / rows.length : 0;
  return {
    skuMapped: rows.length,
    expectedSkus: 48,
    mappingComplete: rows.length === 48,
    visualPct: Math.round(avg("visualCompletion") * 1000) / 10,
    functionalPct: Math.round(avg("functionalCompletion") * 1000) / 10,
    batch1Review: rows.filter((r) => r.status === "batch1-review").length,
    batch2Planned: rows.filter((r) => r.batch === 2).length,
    batch3Planned: rows.filter((r) => r.batch === 3).length,
    batch4Planned: rows.filter((r) => r.batch === 4).length,
    fullyVisualRedesigns: rows.filter((r) => r.visualCompletion >= 1).length,
  };
}
