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

export const CATALOG_TEMPLATES: CatalogTemplate[] = [
  { slug: "wedding-classic-gold", name: "Classic Gold Frame", description: "Timeless wedding elegance with gold ornament frame", category: "Wedding", style: "Classic", layoutSlug: "classic-gold", previewGradient: "from-stone-100 to-amber-50", isPremium: false, features: ["RSVP", "Gallery", "Countdown", "Maps"] },
  { slug: "wedding-luxury-rings", name: "Luxury Rings", description: "High-contrast luxury with interlocking rings motif", category: "Wedding", style: "Luxury", layoutSlug: "luxury-rings", previewGradient: "from-neutral-900 to-black", isPremium: true, features: ["RSVP", "QR", "Music", "Gallery"] },
  { slug: "wedding-arch-vine", name: "Arch & Vine", description: "Forest green arched card with vine illustrations", category: "Wedding", style: "Floral", layoutSlug: "arch-green", previewGradient: "from-emerald-900 to-emerald-950", isPremium: false, features: ["RSVP", "Story", "Directions"] },
  { slug: "wedding-boho-hex", name: "Boho Hexagon", description: "Soft florals with gold hexagonal frame", category: "Wedding", style: "Modern", layoutSlug: "boho-hexagon", previewGradient: "from-rose-50 to-amber-50", isPremium: false, features: ["RSVP", "Gallery", "Share"] },
  { slug: "engagement-royal-gold", name: "Royal Engagement", description: "Regal announcement for your engagement celebration", category: "Engagement", style: "Royal", layoutSlug: "luxury-rings", previewGradient: "from-amber-900 to-yellow-950", isPremium: true, features: ["RSVP", "Countdown", "Gallery"] },
  { slug: "birthday-modern-pop", name: "Birthday Celebration", description: "Vibrant modern birthday invitation", category: "Birthday", style: "Modern", layoutSlug: "boho-hexagon", previewGradient: "from-teal-100 to-coral-100", isPremium: false, features: ["RSVP", "Share", "Calendar"] },
  { slug: "funeral-dignity", name: "Funeral Dignity", description: "Respectful memorial invitation with calm tones", category: "Funeral", style: "Minimal", layoutSlug: "arch-green", previewGradient: "from-slate-700 to-slate-900", isPremium: false, features: ["RSVP", "Directions", "Tributes"] },
  { slug: "classic-memorial", name: "Classic Memorial", description: "Timeless memorial book opening experience", category: "Funeral", style: "Classic", layoutSlug: "classic-gold", previewGradient: "from-slate-800 to-slate-950", isPremium: false, features: ["Obituary", "Tributes", "Candles", "RSVP"] },
  { slug: "celebration-of-life", name: "Celebration of Life", description: "Floral reveal honoring a life well lived", category: "Funeral", style: "Floral", layoutSlug: "boho-hexagon", previewGradient: "from-emerald-900 to-teal-950", isPremium: false, features: ["Timeline", "Gallery", "Tributes"] },
  { slug: "traditional-ghanaian-funeral", name: "Traditional Ghanaian Funeral", description: "Cultural heritage memorial with kente accents", category: "Funeral", style: "Traditional Ghanaian", layoutSlug: "rustic-lace", previewGradient: "from-amber-800 to-emerald-950", isPremium: true, features: ["Program", "Contributions", "Guestbook"] },
  { slug: "christian-funeral", name: "Christian Funeral", description: "Candlelight reveal with hymns and scripture", category: "Funeral", style: "Classic", layoutSlug: "classic-gold", previewGradient: "from-indigo-950 to-slate-900", isPremium: false, features: ["Prayers", "Livestream", "RSVP"] },
  { slug: "catholic-funeral", name: "Catholic Funeral", description: "Reverent memorial book with mass program", category: "Funeral", style: "Royal", layoutSlug: "luxury-rings", previewGradient: "from-purple-950 to-black", isPremium: false, features: ["Program", "Candles", "Contributions"] },
  { slug: "methodist-funeral", name: "Methodist Funeral", description: "Warm candlelight memorial invitation", category: "Funeral", style: "Classic", layoutSlug: "arch-green", previewGradient: "from-slate-700 to-blue-950", isPremium: false, features: ["Hymns", "Guestbook", "Directions"] },
  { slug: "pentecostal-funeral", name: "Pentecostal Funeral", description: "Dove release animation with celebration tone", category: "Funeral", style: "Modern", layoutSlug: "boho-hexagon", previewGradient: "from-violet-900 to-indigo-950", isPremium: false, features: ["Tributes", "Livestream", "Gallery"] },
  { slug: "islamic-janazah", name: "Islamic Janazah", description: "Respectful janazah announcement", category: "Funeral", style: "Minimal", layoutSlug: "arch-green", previewGradient: "from-emerald-950 to-teal-950", isPremium: false, features: ["Program", "Directions", "Prayers"] },
  { slug: "royal-family-memorial", name: "Royal Family Memorial", description: "Regal photo frame reveal for distinguished lives", category: "Funeral", style: "Royal", layoutSlug: "luxury-rings", previewGradient: "from-amber-900 to-black", isPremium: true, features: ["Timeline", "VIP Seating", "Livestream"] },
  { slug: "military-tribute", name: "Military Tribute", description: "Honour guard memorial with service record", category: "Funeral", style: "Premium Dark", layoutSlug: "classic-gold", previewGradient: "from-slate-900 to-green-950", isPremium: true, features: ["Timeline", "Tributes", "Seating"] },
  { slug: "statesman-tribute", name: "Statesman Tribute", description: "Legacy timeline for public figures", category: "Funeral", style: "Luxury", layoutSlug: "luxury-rings", previewGradient: "from-neutral-900 to-slate-950", isPremium: true, features: ["Timeline", "Contributions", "Archive"] },
  { slug: "modern-memorial", name: "Modern Memorial", description: "Clean photo frame reveal with gallery", category: "Funeral", style: "Modern", layoutSlug: "boho-hexagon", previewGradient: "from-slate-800 to-zinc-900", isPremium: false, features: ["Gallery", "Tributes", "Memory Vault"] },
  { slug: "minimal-memorial", name: "Minimal Memorial", description: "Understated instant view memorial", category: "Funeral", style: "Minimal", layoutSlug: "arch-green", previewGradient: "from-gray-800 to-gray-950", isPremium: false, features: ["Obituary", "Candles", "Guestbook"] },
  { slug: "church-purple-gold", name: "Church Royal", description: "Church programme invitation with royal accents", category: "Church", style: "Royal", layoutSlug: "classic-gold", previewGradient: "from-purple-900 to-indigo-950", isPremium: false, features: ["RSVP", "Programme", "Maps"] },
  { slug: "corporate-clean", name: "Corporate Clean", description: "Professional clean white corporate invite", category: "Corporate", style: "Clean White", layoutSlug: "classic-gold", previewGradient: "from-slate-50 to-white", isPremium: false, features: ["RSVP", "Calendar", "Contact"] },
  { slug: "conference-navy", name: "Conference Navy", description: "Premium dark conference invitation", category: "Conference", style: "Premium Dark", layoutSlug: "luxury-rings", previewGradient: "from-slate-900 to-blue-950", isPremium: true, features: ["RSVP", "Tickets", "Agenda"] },
  { slug: "concert-vibe", name: "Concert Vibe", description: "Bold concert announcement layout", category: "Concert", style: "Modern", layoutSlug: "custom-media", previewGradient: "from-fuchsia-900 to-purple-950", isPremium: false, features: ["RSVP", "Tickets", "Share"] },
  { slug: "kente-heritage", name: "Kente Heritage", description: "Traditional Ghanaian kente-inspired celebration", category: "Wedding", style: "Kente-inspired", layoutSlug: "rustic-lace", previewGradient: "from-amber-600 to-teal-800", isPremium: true, features: ["RSVP", "Gallery", "Story", "QR"] },
  { slug: "ghanaian-traditional", name: "Traditional Ghanaian", description: "Cultural elegance for traditional ceremonies", category: "Private Event", style: "Traditional Ghanaian", layoutSlug: "rustic-lace", previewGradient: "from-orange-800 to-emerald-900", isPremium: true, features: ["RSVP", "Gallery", "Directions"] },
  { slug: "private-minimal", name: "Private Minimal", description: "Understated private event invitation", category: "Private Event", style: "Minimal", layoutSlug: "arch-green", previewGradient: "from-gray-100 to-gray-200", isPremium: false, features: ["RSVP", "Maps"] },
  { slug: "custom-upload", name: "Build From Your Design", description: "Upload your artwork — we frame it beautifully", category: "Private Event", style: "Modern", layoutSlug: "custom-media", previewGradient: "from-teal-600 to-teal-800", isPremium: false, features: ["RSVP", "Media", "Designer assist"] },
  { slug: "royal-emerald-wedding", name: "Royal Emerald Wedding", description: "Emerald green, gold, ivory — palace wax seal reveal", category: "Wedding", style: "Royal", layoutSlug: "royal-emerald-wedding", previewGradient: "from-emerald-900 via-emerald-950 to-amber-950", isPremium: true, isNew: true, mood: "European", features: ["RSVP", "QR", "Music", "Gallery", "Countdown", "Maps", "Calendar"] },
  { slug: "midnight-velvet-reception", name: "Midnight Velvet Reception", description: "Black, navy, silver — velvet curtain cinematic reveal", category: "Wedding", style: "Luxury", layoutSlug: "midnight-velvet-reception", previewGradient: "from-slate-950 via-indigo-950 to-black", isPremium: true, isNew: true, mood: "Cinematic", features: ["RSVP", "QR", "Music", "Gallery", "Calendar"] },
  { slug: "kente-heritage-union", name: "Kente Heritage Union", description: "Kente gold, red, green — traditional cloth unfold", category: "Wedding", style: "Kente-inspired", layoutSlug: "kente-heritage-union", previewGradient: "from-amber-700 via-red-900 to-emerald-900", isPremium: true, isNew: true, mood: "Traditional", features: ["RSVP", "Seating", "Music", "Gallery", "Guest Wishes"] },
  { slug: "floral-garden-romance", name: "Floral Garden Romance", description: "Soft pink, cream, sage — floating petal envelope", category: "Wedding", style: "Floral", layoutSlug: "floral-garden-romance", previewGradient: "from-rose-100 via-pink-50 to-emerald-50", isPremium: false, mood: "Romantic", features: ["RSVP", "Story", "Music", "Gallery", "Calendar", "Countdown"] },
  { slug: "passport-destination-wedding", name: "Passport Destination Wedding", description: "Travel paper, navy stamps — passport boarding pass", category: "Wedding", style: "Luxury", layoutSlug: "passport-destination-wedding", previewGradient: "from-slate-100 via-amber-50 to-teal-900", isPremium: true, isNew: true, mood: "European", features: ["RSVP", "QR", "Maps", "Music", "Calendar"] },
  { slug: "crystal-acrylic-luxury", name: "Crystal Acrylic Luxury", description: "Glass shimmer, white, gold champagne acrylic reveal", category: "Wedding", style: "Luxury", layoutSlug: "crystal-acrylic-luxury", previewGradient: "from-sky-100 via-white to-amber-100", isPremium: true, isNew: true, mood: "Luxury", features: ["RSVP", "Gallery", "Music", "Countdown", "Calendar", "Maps"] },
  { slug: "golden-islamic-nikkah", name: "Golden Islamic Nikkah", description: "Gold, ivory, emerald ornamental palace entrance", category: "Wedding", style: "Royal", layoutSlug: "golden-islamic-nikkah", previewGradient: "from-amber-100 via-emerald-50 to-emerald-900", isPremium: false, mood: "Traditional", features: ["RSVP", "Schedule", "Maps", "Music", "Calendar"] },
  { slug: "memorial-candle-tribute", name: "Memorial Candle Tribute", description: "Black, ivory, candle gold — solemn tribute wall", category: "Funeral", style: "Classic", layoutSlug: "memorial-candle-tribute", previewGradient: "from-slate-900 via-stone-900 to-red-950", isPremium: false, features: ["Tributes", "Contributions", "Music", "Gallery"] },
  { slug: "neon-celebration-party", name: "Neon Celebration Party", description: "Purple, electric blue, hot pink — neon scratch reveal", category: "Birthday", style: "Modern", layoutSlug: "neon-celebration-party", previewGradient: "from-fuchsia-600 via-purple-900 to-black", isPremium: false, features: ["RSVP", "Tickets", "QR", "Music"] },
  { slug: "corporate-prestige-summit", name: "Corporate Prestige Summit", description: "Navy, white, platinum — professional summit motion", category: "Corporate", style: "Premium Dark", layoutSlug: "corporate-prestige-summit", previewGradient: "from-slate-900 via-slate-800 to-teal-900", isPremium: true, features: ["RSVP", "QR", "Agenda", "Music"] },
];

export function getCatalogTemplate(slug: string) {
  return CATALOG_TEMPLATES.find((t) => t.slug === slug);
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
      if (!t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
