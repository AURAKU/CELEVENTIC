export const INVITATION_CATEGORIES = [
  "Wedding",
  "Engagement",
  "Birthday",
  "Funeral",
  "Church",
  "Corporate",
  "Conference",
  "Concert",
  "Private Event",
] as const;

export const INVITATION_STYLES = [
  "Luxury",
  "Royal",
  "Minimal",
  "Floral",
  "Traditional",
  "Traditional Ghanaian",
  "Kente-inspired",
  "European",
  "Boho",
  "Romantic",
  "Cute",
  "Artistic",
  "Nature",
  "Classic",
  "Modern",
  "Premium Dark",
  "Clean White",
  "Cinematic",
] as const;

export const INVITATION_MOODS = [
  "European",
  "Traditional",
  "Romantic",
  "Cinematic",
  "Boho",
  "Nature",
  "Luxury",
  "Classic",
  "Cute",
  "Artistic",
] as const;

export type InvitationCategory = (typeof INVITATION_CATEGORIES)[number];
export type InvitationStyle = (typeof INVITATION_STYLES)[number];

export interface CatalogTemplate {
  /** Unique id — matches layoutSlug (one visual identity per template) */
  slug: string;
  name: string;
  description: string;
  category: InvitationCategory;
  style: InvitationStyle;
  layoutSlug: string;
  previewGradient: string;
  isPremium: boolean;
  features: string[];
  isNew?: boolean;
  mood?: string;
}

/**
 * One catalogue entry per layout — no recycled visuals.
 * slug === layoutSlug for clarity.
 */
export const CATALOG_TEMPLATES: CatalogTemplate[] = [
  {
    slug: "classic-gold",
    name: "Gilded Opulence",
    description: "Ivory card with hand-finished gold frame and serif vows",
    category: "Wedding",
    style: "Classic",
    layoutSlug: "classic-gold",
    previewGradient: "from-stone-100 to-amber-50",
    isPremium: false,
    mood: "Classic",
    features: ["RSVP", "Gallery", "Countdown", "Maps", "Music"],
  },
  {
    slug: "luxury-rings",
    name: "Onyx & Gold Vows",
    description: "High-contrast black stage with interlocking rings spotlight",
    category: "Wedding",
    style: "Luxury",
    layoutSlug: "luxury-rings",
    previewGradient: "from-neutral-900 to-black",
    isPremium: true,
    mood: "Luxury",
    features: ["RSVP", "QR", "Music", "Gallery", "Countdown"],
  },
  {
    slug: "arch-green",
    name: "Vine Cathedral",
    description: "Forest arch illustration with cream calligraphy on emerald",
    category: "Wedding",
    style: "Floral",
    layoutSlug: "arch-green",
    previewGradient: "from-emerald-900 to-emerald-950",
    isPremium: false,
    mood: "Nature",
    features: ["RSVP", "Story", "Directions", "Calendar"],
  },
  {
    slug: "rustic-lace",
    name: "Timber & Lace",
    description: "Full-bleed photo under ornate lace with warm wood tones",
    category: "Wedding",
    style: "Traditional",
    layoutSlug: "rustic-lace",
    previewGradient: "from-amber-900 to-amber-950",
    isPremium: true,
    mood: "Traditional",
    features: ["RSVP", "Gallery", "Story", "QR"],
  },
  {
    slug: "boho-hexagon",
    name: "Hexagon Reverie",
    description: "Soft florals inside a floating gold hexagon frame",
    category: "Engagement",
    style: "Boho",
    layoutSlug: "boho-hexagon",
    previewGradient: "from-rose-50 to-amber-50",
    isPremium: false,
    mood: "Boho",
    features: ["RSVP", "Gallery", "Share", "Countdown"],
  },
  {
    slug: "floral-garden",
    name: "Secret Garden",
    description: "Botanical borders with blush typography and petal motion",
    category: "Wedding",
    style: "Floral",
    layoutSlug: "floral-garden",
    previewGradient: "from-rose-100 to-pink-50",
    isPremium: false,
    mood: "Romantic",
    features: ["RSVP", "Gallery", "Music", "Calendar"],
  },
  {
    slug: "passport-luxe",
    name: "Stamped Romance",
    description: "Booklet passport reveal with visa stamps and travel motifs",
    category: "Wedding",
    style: "Luxury",
    layoutSlug: "passport-luxe",
    previewGradient: "from-teal-900 to-slate-900",
    isPremium: true,
    mood: "European",
    features: ["RSVP", "Maps", "Music", "QR"],
  },
  {
    slug: "glass-acrylic",
    name: "Frostlight Dreamscape",
    description: "Frosted acrylic layers with luminous depth and glass buttons",
    category: "Wedding",
    style: "Modern",
    layoutSlug: "glass-acrylic",
    previewGradient: "from-sky-900 to-teal-800",
    isPremium: true,
    mood: "Luxury",
    features: ["RSVP", "Gallery", "Music", "Countdown"],
  },
  {
    slug: "royal-emerald-wedding",
    name: "Palace Emerald Reign",
    description: "Palace entrance, wax seal, emerald velvet and gold crown",
    category: "Wedding",
    style: "Royal",
    layoutSlug: "royal-emerald-wedding",
    previewGradient: "from-emerald-900 via-emerald-950 to-amber-950",
    isPremium: true,
    isNew: true,
    mood: "European",
    features: ["RSVP", "QR", "Music", "Gallery", "Countdown", "Maps"],
  },
  {
    slug: "midnight-velvet-reception",
    name: "Velvet Midnight Soirée",
    description: "Curtain reveal on navy velvet with silver champagne accents",
    category: "Wedding",
    style: "Cinematic",
    layoutSlug: "midnight-velvet-reception",
    previewGradient: "from-slate-950 via-indigo-950 to-black",
    isPremium: true,
    isNew: true,
    mood: "Cinematic",
    features: ["RSVP", "QR", "Music", "Gallery", "Calendar"],
  },
  {
    slug: "kente-heritage-union",
    name: "Kente Covenant",
    description: "Kente cloth unfold with drum pulse and heritage typography",
    category: "Wedding",
    style: "Kente-inspired",
    layoutSlug: "kente-heritage-union",
    previewGradient: "from-amber-700 via-red-900 to-emerald-900",
    isPremium: true,
    isNew: true,
    mood: "Traditional",
    features: ["RSVP", "Seating", "Music", "Gallery", "Guest Wishes"],
  },
  {
    slug: "floral-garden-romance",
    name: "Petal Promise",
    description: "Cinematic garden romance — floating petals and bloom reveal",
    category: "Engagement",
    style: "Romantic",
    layoutSlug: "floral-garden-romance",
    previewGradient: "from-rose-100 via-pink-50 to-emerald-50",
    isPremium: false,
    mood: "Romantic",
    features: ["RSVP", "Story", "Music", "Gallery", "Countdown"],
  },
  {
    slug: "passport-destination-wedding",
    name: "Horizon Boarding Pass",
    description: "Flip boarding-pass reveal for destination celebrations",
    category: "Wedding",
    style: "Luxury",
    layoutSlug: "passport-destination-wedding",
    previewGradient: "from-slate-100 via-amber-50 to-teal-900",
    isPremium: true,
    isNew: true,
    mood: "European",
    features: ["RSVP", "QR", "Maps", "Music", "Calendar"],
  },
  {
    slug: "crystal-acrylic-luxury",
    name: "Champagne Crystal",
    description: "Glass shimmer acrylic reveal with champagne gold highlights",
    category: "Wedding",
    style: "Luxury",
    layoutSlug: "crystal-acrylic-luxury",
    previewGradient: "from-sky-100 via-white to-amber-100",
    isPremium: true,
    isNew: true,
    mood: "Luxury",
    features: ["RSVP", "Gallery", "Music", "Countdown", "Maps"],
  },
  {
    slug: "golden-islamic-nikkah",
    name: "Nikkah Gold Geometry",
    description: "Ornamental palace geometry with soft instrumental score",
    category: "Wedding",
    style: "Royal",
    layoutSlug: "golden-islamic-nikkah",
    previewGradient: "from-amber-100 via-emerald-50 to-emerald-900",
    isPremium: false,
    mood: "Traditional",
    features: ["RSVP", "Schedule", "Maps", "Music", "Calendar"],
  },
  {
    slug: "memorial-candle-tribute",
    name: "Candlelight Elegy",
    description: "Solemn candle wall reveal with tribute gallery and hymns",
    category: "Funeral",
    style: "Classic",
    layoutSlug: "memorial-candle-tribute",
    previewGradient: "from-slate-900 via-stone-900 to-red-950",
    isPremium: false,
    mood: "Classic",
    features: ["Tributes", "Contributions", "Music", "Gallery", "RSVP"],
  },
  {
    slug: "neon-celebration-party",
    name: "Electric Pulse",
    description: "Neon scratch reveal with party energy and ticket QR",
    category: "Birthday",
    style: "Modern",
    layoutSlug: "neon-celebration-party",
    previewGradient: "from-fuchsia-600 via-purple-900 to-black",
    isPremium: false,
    mood: "Cute",
    features: ["RSVP", "Tickets", "QR", "Music", "Share"],
  },
  {
    slug: "corporate-prestige-summit",
    name: "Platinum Summit",
    description: "Navy motion graphics with agenda hub and check-in QR",
    category: "Corporate",
    style: "Premium Dark",
    layoutSlug: "corporate-prestige-summit",
    previewGradient: "from-slate-900 via-slate-800 to-teal-900",
    isPremium: true,
    mood: "Luxury",
    features: ["RSVP", "QR", "Agenda", "Music", "Calendar"],
  },
  {
    slug: "custom-media",
    name: "Your Canvas",
    description: "Upload your artwork, video, or PDF — we frame it cinematically",
    category: "Private Event",
    style: "Modern",
    layoutSlug: "custom-media",
    previewGradient: "from-teal-600 to-teal-800",
    isPremium: false,
    mood: "Artistic",
    features: ["RSVP", "Media", "Gallery", "Music"],
  },
];

/** Maps retired duplicate catalogue slugs → canonical layout slug */
export const LEGACY_CATALOG_SLUG_MAP: Record<string, string> = {
  "wedding-classic-gold": "classic-gold",
  "wedding-luxury-rings": "luxury-rings",
  "wedding-arch-vine": "arch-green",
  "wedding-boho-hex": "boho-hexagon",
  "engagement-royal-gold": "luxury-rings",
  "birthday-modern-pop": "neon-celebration-party",
  "funeral-dignity": "memorial-candle-tribute",
  "classic-memorial": "memorial-candle-tribute",
  "celebration-of-life": "memorial-candle-tribute",
  "traditional-ghanaian-funeral": "memorial-candle-tribute",
  "christian-funeral": "memorial-candle-tribute",
  "catholic-funeral": "memorial-candle-tribute",
  "methodist-funeral": "memorial-candle-tribute",
  "pentecostal-funeral": "memorial-candle-tribute",
  "islamic-janazah": "memorial-candle-tribute",
  "royal-family-memorial": "memorial-candle-tribute",
  "military-tribute": "memorial-candle-tribute",
  "statesman-tribute": "memorial-candle-tribute",
  "modern-memorial": "memorial-candle-tribute",
  "minimal-memorial": "memorial-candle-tribute",
  "church-purple-gold": "royal-emerald-wedding",
  "corporate-clean": "corporate-prestige-summit",
  "conference-navy": "corporate-prestige-summit",
  "concert-vibe": "neon-celebration-party",
  "kente-heritage": "kente-heritage-union",
  "ghanaian-traditional": "kente-heritage-union",
  "private-minimal": "arch-green",
  "custom-upload": "custom-media",
};

export function resolveCatalogSlug(slug: string): string {
  return LEGACY_CATALOG_SLUG_MAP[slug] ?? slug;
}

export function getCatalogTemplate(slug: string) {
  const resolved = resolveCatalogSlug(slug);
  return CATALOG_TEMPLATES.find((t) => t.slug === resolved || t.layoutSlug === resolved);
}

export function filterCatalogTemplates(filters: {
  category?: string;
  style?: string;
  search?: string;
}) {
  return CATALOG_TEMPLATES.filter((t) => {
    if (filters.category && filters.category !== "all" && t.category !== filters.category) return false;
    if (filters.style && filters.style !== "all" && t.style !== filters.style) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !t.name.toLowerCase().includes(q) &&
        !t.description.toLowerCase().includes(q) &&
        !t.slug.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
}

/** One template per layout — for admin / analytics */
export function getUniqueLayoutCount(): number {
  return new Set(CATALOG_TEMPLATES.map((t) => t.layoutSlug)).size;
}
