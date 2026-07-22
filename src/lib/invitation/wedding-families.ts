/**
 * Wedding creative families — 20 mission concepts mapped onto existing
 * Wedding/Engagement catalogue SKUs. Scope: Wedding + Engagement only.
 *
 * Do not invent empty catalogue SKUs. Families without a dedicated SKU stay
 * `phase: "planned"` with DNA defaults for studio/admin growth.
 */

export type WeddingFamilyId =
  | "botanical-bloom"
  | "royal-wax-seal"
  | "palace-gates"
  | "swan-lake-romance"
  | "editorial-love-story"
  | "satin-bow"
  | "theater-curtain"
  | "destination-passport"
  | "traditional-heritage"
  | "islamic-ornamental"
  | "pearl-and-crystal"
  | "luxury-black-tie"
  | "storybook-romance"
  | "celestial-love"
  | "art-deco-wedding"
  | "minimal-fine-art"
  | "european-manor"
  | "tropical-destination"
  | "watercolor-garden"
  | "cinematic-film-premiere";

export type WeddingFamilyPhase = "shipped" | "metadata" | "planned";

export type WeddingFamilyRole = "primary" | "studio-variant" | "wave1-lite";

export interface WeddingFamilyDNA {
  openingDefault: string;
  interactionHint: string;
  motionProfile: string;
  typographySystem: string;
  buttonFamily: string;
  audioMood: string;
  motif: string;
  outroType: string;
  parallax: string;
}

export interface WeddingFamilyProfile {
  familyId: WeddingFamilyId;
  familyName: string;
  /** Null when the family is planned and has no catalogue SKU yet */
  catalogSlug: string | null;
  role: WeddingFamilyRole;
  phase: WeddingFamilyPhase;
  dna: WeddingFamilyDNA;
  notes?: string;
}

/**
 * Mission families 1–20. Primary rows first; studio/wave variants nested after
 * their parent concept where an existing SKU supports them.
 */
export const WEDDING_FAMILY_PROFILES: WeddingFamilyProfile[] = [
  {
    familyId: "botanical-bloom",
    familyName: "Botanical Bloom",
    catalogSlug: "floral-garden-romance",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "flower-bloom",
      interactionHint: "Tap flower to bloom",
      motionProfile: "organic",
      typographySystem: "romantic-script",
      buttonFamily: "floral-edge",
      audioMood: "piano garden",
      motif: "living petals, leaf depth",
      outroType: "rose-petals",
      parallax: "moderate",
    },
  },
  {
    familyId: "watercolor-garden",
    familyName: "Watercolor Garden",
    catalogSlug: "floral-garden",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "petal-fall",
      interactionHint: "Tap — petals fall",
      motionProfile: "romantic",
      typographySystem: "romantic-script",
      buttonFamily: "pearl",
      audioMood: "garden whispers",
      motif: "blush washes, botanical borders",
      outroType: "butterflies",
      parallax: "subtle",
    },
    notes: "Secret Garden SKU — watercolor petal ceremony DNA",
  },
  {
    familyId: "royal-wax-seal",
    familyName: "Royal Wax Seal",
    catalogSlug: "royal-emerald-wedding",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "wax-seal-emerald",
      interactionHint: "Press the emerald wax seal",
      motionProfile: "regal",
      typographySystem: "luxury-serif",
      buttonFamily: "embossed-royal",
      audioMood: "royal orchestra",
      motif: "emerald velvet, gold crown",
      outroType: "seal-reform",
      parallax: "cinematic",
    },
  },
  {
    familyId: "palace-gates",
    familyName: "Palace Gates",
    catalogSlug: "emerald-cathedral",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "archway",
      interactionHint: "Open the palace gates",
      motionProfile: "cinematic",
      typographySystem: "elegant-serif",
      buttonFamily: "ornamental-arch",
      audioMood: "crystal strings",
      motif: "cathedral arch, vine columns",
      outroType: "butterflies",
      parallax: "cinematic",
    },
  },
  {
    familyId: "palace-gates",
    familyName: "Palace Gates — Vine Cathedral",
    catalogSlug: "arch-green",
    role: "studio-variant",
    phase: "metadata",
    dna: {
      openingDefault: "palace-entrance",
      interactionHint: "Enter the vine hall",
      motionProfile: "organic",
      typographySystem: "elegant-serif",
      buttonFamily: "sharp",
      audioMood: "garden strings",
      motif: "living green arch",
      outroType: "memory-slideshow",
      parallax: "moderate",
    },
  },
  {
    familyId: "swan-lake-romance",
    familyName: "Swan Lake Romance",
    catalogSlug: "rustic-lace",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "zoom-reveal",
      interactionHint: "Photo develops into the frame",
      motionProfile: "dreamlike",
      typographySystem: "traditional-script",
      buttonFamily: "paper-tab",
      audioMood: "warm acoustic",
      motif: "lace overlay, timber warmth",
      outroType: "final-quote",
      parallax: "subtle",
    },
  },
  {
    familyId: "editorial-love-story",
    familyName: "Editorial Love Story",
    catalogSlug: "midnight-velvet-reception",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "magazine-page-turn",
      interactionHint: "Turn the magazine cover",
      motionProfile: "editorial",
      typographySystem: "editorial-serif",
      buttonFamily: "editorial-underline",
      audioMood: "midnight jazz",
      motif: "velvet night, credit type",
      outroType: "credits-page",
      parallax: "subtle",
    },
  },
  {
    familyId: "satin-bow",
    familyName: "Satin Bow",
    catalogSlug: "classic-gold",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "satin-bow",
      interactionHint: "Untie the satin bow",
      motionProfile: "romantic",
      typographySystem: "romantic-script",
      buttonFamily: "ribbon",
      audioMood: "soft piano romance",
      motif: "ivory card, satin ribbon",
      outroType: "rose-petals",
      parallax: "subtle",
    },
  },
  {
    familyId: "theater-curtain",
    familyName: "Theater Curtain",
    catalogSlug: null,
    role: "primary",
    phase: "planned",
    dna: {
      openingDefault: "curtain-wedding",
      interactionHint: "Touch to begin — pull the velvet curtain",
      motionProfile: "cinematic",
      typographySystem: "display-serif",
      buttonFamily: "ticket-stub",
      audioMood: "orchestra swell",
      motif: "red velvet, kente gold trim, stage lights",
      outroType: "closing-curtain",
      parallax: "cinematic",
    },
    notes:
      "curtain-wedding shipped on Kente Royale (kente-royale-pages); dedicated Theater Curtain SKU still planned",
  },
  {
    familyId: "destination-passport",
    familyName: "Destination Passport",
    catalogSlug: "passport-destination-wedding",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "passport",
      interactionHint: "Stamp the passport",
      motionProfile: "editorial",
      typographySystem: "editorial-mono",
      buttonFamily: "passport-stamp",
      audioMood: "travel wanderlust",
      motif: "boarding pass, visa stamps",
      outroType: "see-you-soon",
      parallax: "moderate",
    },
  },
  {
    familyId: "tropical-destination",
    familyName: "Tropical Destination",
    catalogSlug: "passport-luxe",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "flip-reveal",
      interactionHint: "Flip the travel booklet",
      motionProfile: "playful",
      typographySystem: "editorial-serif",
      buttonFamily: "ticket-stub",
      audioMood: "voyage lounge",
      motif: "teal covers, stamped romance",
      outroType: "final-quote",
      parallax: "moderate",
    },
    notes: "Stamped Romance SKU carries tropical/voyage DNA",
  },
  {
    familyId: "traditional-heritage",
    familyName: "Traditional Heritage",
    catalogSlug: "kente-royale-pages",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "curtain-wedding",
      interactionHint: "Touch to begin — curtains part",
      motionProfile: "traditional",
      typographySystem: "heritage-display",
      buttonFamily: "kente",
      audioMood: "celebration drums",
      motif: "velvet stage curtains, woven maroon and gold",
      outroType: "lanterns",
      parallax: "moderate",
    },
  },
  {
    familyId: "traditional-heritage",
    familyName: "Traditional Heritage — Covenant",
    catalogSlug: "kente-heritage-union",
    role: "studio-variant",
    phase: "metadata",
    dna: {
      openingDefault: "swipe-reveal",
      interactionHint: "Swipe the woven cloth",
      motionProfile: "energetic",
      typographySystem: "heritage-display",
      buttonFamily: "kente",
      audioMood: "african drums",
      motif: "cloth unfold, drum pulse",
      outroType: "lanterns",
      parallax: "moderate",
    },
  },
  {
    familyId: "traditional-heritage",
    familyName: "Traditional Heritage — Court",
    catalogSlug: "kente-court",
    role: "wave1-lite",
    phase: "metadata",
    dna: {
      openingDefault: "pop-reveal",
      interactionHint: "Tap to pop and celebrate",
      motionProfile: "energetic",
      typographySystem: "heritage-display",
      buttonFamily: "metallic",
      audioMood: "celebration drums",
      motif: "court gold foil",
      outroType: "fireworks",
      parallax: "subtle",
    },
  },
  {
    familyId: "islamic-ornamental",
    familyName: "Islamic Ornamental",
    catalogSlug: "golden-islamic-nikkah",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "envelope-islamic",
      interactionHint: "Open golden geometry seal",
      motionProfile: "traditional",
      typographySystem: "ornamental-serif",
      buttonFamily: "wax-seal",
      audioMood: "soft instrumental strings",
      motif: "islamic geometry, gold ink",
      outroType: "golden-sparkles",
      parallax: "subtle",
    },
  },
  {
    familyId: "pearl-and-crystal",
    familyName: "Pearl and Crystal",
    catalogSlug: "crystal-acrylic-luxury",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "glass",
      interactionHint: "Glass wipe to unveil",
      motionProfile: "luxurious",
      typographySystem: "minimal-luxury",
      buttonFamily: "glass",
      audioMood: "prism ambient",
      motif: "champagne crystal facets",
      outroType: "memory-slideshow",
      parallax: "interactive",
    },
  },
  {
    familyId: "luxury-black-tie",
    familyName: "Luxury Black Tie",
    catalogSlug: "luxury-rings",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "ring-box",
      interactionHint: "Open the ring box",
      motionProfile: "luxurious",
      typographySystem: "display-luxury",
      buttonFamily: "gold",
      audioMood: "violin elegance",
      motif: "onyx stage, interlocking rings",
      outroType: "fireworks",
      parallax: "cinematic",
    },
  },
  {
    familyId: "storybook-romance",
    familyName: "Storybook Romance",
    catalogSlug: "gilded-vows",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "letter-unfold",
      interactionHint: "Unfold the storybook letter",
      motionProfile: "dreamlike",
      typographySystem: "storybook-serif",
      buttonFamily: "paper-tab",
      audioMood: "piano romance",
      motif: "gilded pages, silver seal",
      outroType: "golden-sparkles",
      parallax: "subtle",
    },
  },
  {
    familyId: "celestial-love",
    familyName: "Celestial Love",
    catalogSlug: "emerald-promise",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "wax-seal-rose",
      interactionHint: "Press the rose-gold seal under starlight",
      motionProfile: "dreamlike",
      typographySystem: "elegant-serif",
      buttonFamily: "outline",
      audioMood: "harp night",
      motif: "chapel glow, starlight",
      outroType: "butterflies",
      parallax: "moderate",
    },
  },
  {
    familyId: "art-deco-wedding",
    familyName: "Art Deco Wedding",
    catalogSlug: "boho-hexagon",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "gift-box",
      interactionHint: "Open geometric gift frame",
      motionProfile: "playful",
      typographySystem: "modern-geometric",
      buttonFamily: "rounded",
      audioMood: "jazz lounge",
      motif: "gold hexagon, deco lines",
      outroType: "rose-petals",
      parallax: "subtle",
    },
    notes: "Engagement-primary SKU with art-deco geometry DNA",
  },
  {
    familyId: "minimal-fine-art",
    familyName: "Minimal Fine Art",
    catalogSlug: null,
    role: "primary",
    phase: "planned",
    dna: {
      openingDefault: "press-hold",
      interactionHint: "Press and hold to reveal",
      motionProfile: "minimal",
      typographySystem: "minimal-sans",
      buttonFamily: "minimal-text",
      audioMood: "soft piano silence",
      motif: "whitespace, thin rules",
      outroType: "thank-you-fade",
      parallax: "none",
    },
    notes: "No leftover minimal wedding SKU — planned for future catalogue wave",
  },
  {
    familyId: "european-manor",
    familyName: "European Manor",
    catalogSlug: "gilded-opulence-pages",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "wax-seal-gold",
      interactionHint: "Press gold manor seal",
      motionProfile: "regal",
      typographySystem: "manor-serif",
      buttonFamily: "embossed-royal",
      audioMood: "orchestra royal",
      motif: "ivory foil gallery pages",
      outroType: "golden-sparkles",
      parallax: "cinematic",
    },
  },
  {
    familyId: "cinematic-film-premiere",
    familyName: "Cinematic Film Premiere",
    catalogSlug: "glass-acrylic",
    role: "primary",
    phase: "shipped",
    dna: {
      openingDefault: "film-countdown",
      interactionHint: "3-2-1 premiere countdown",
      motionProfile: "cinematic",
      typographySystem: "minimal-luxury",
      buttonFamily: "crystal",
      audioMood: "crystal strings",
      motif: "frosted acrylic, premiere light",
      outroType: "closing-curtain",
      parallax: "interactive",
    },
  },
];

/** @deprecated Prefer WEDDING_FAMILY_PROFILES — kept for prior call sites */
export type WeddingFamilyAssignment = {
  familyId: WeddingFamilyId | string;
  familyName: string;
  catalogSlug: string;
  role: WeddingFamilyRole;
  phase: WeddingFamilyPhase | "phase-future";
  notes?: string;
};

export const WEDDING_FAMILY_ASSIGNMENTS: WeddingFamilyAssignment[] = WEDDING_FAMILY_PROFILES.filter(
  (p): p is WeddingFamilyProfile & { catalogSlug: string } => p.catalogSlug != null
).map((p) => ({
  familyId: p.familyId,
  familyName: p.familyName,
  catalogSlug: p.catalogSlug,
  role: p.role,
  phase: p.phase,
  notes: p.notes,
}));

/** Mission families still awaiting a dedicated catalogue SKU */
export const WEDDING_PHASE_FUTURE_FAMILIES: {
  familyId: WeddingFamilyId;
  familyName: string;
  reason: string;
}[] = WEDDING_FAMILY_PROFILES.filter((p) => p.phase === "planned" && p.role === "primary").map(
  (p) => ({
    familyId: p.familyId,
    familyName: p.familyName,
    reason: p.notes ?? "No dedicated wedding catalogue SKU yet",
  })
);

const WEDDING_CATEGORIES = new Set(["Wedding", "Engagement"]);

export function isWeddingCatalogCategory(category: string): boolean {
  return WEDDING_CATEGORIES.has(category);
}

export function getWeddingFamilyForSlug(catalogSlug: string): WeddingFamilyProfile | undefined {
  return WEDDING_FAMILY_PROFILES.find((a) => a.catalogSlug === catalogSlug);
}

export function listWeddingPrimaryFamilies(): WeddingFamilyProfile[] {
  return WEDDING_FAMILY_PROFILES.filter((a) => a.role === "primary");
}

export function listWeddingMissionFamilies(): WeddingFamilyProfile[] {
  const seen = new Set<WeddingFamilyId>();
  const out: WeddingFamilyProfile[] = [];
  for (const p of WEDDING_FAMILY_PROFILES) {
    if (p.role !== "primary") continue;
    if (seen.has(p.familyId)) continue;
    seen.add(p.familyId);
    out.push(p);
  }
  return out;
}

/** Slugs that should appear when browsing wedding/engagement experiences */
export function weddingBrowseCategoriesForEventType(eventType: string): string[] {
  const normalized = eventType.toUpperCase();
  if (normalized === "WEDDING" || normalized === "ENGAGEMENT") {
    return ["Wedding", "Engagement"];
  }
  return [];
}
