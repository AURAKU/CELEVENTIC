/** Funeral invitation template collections */
export const FUNERAL_TEMPLATE_COLLECTIONS = [
  { slug: "classic-memorial", name: "Classic Memorial", layoutSlug: "arch-green", revealStyle: "MEMORIAL_BOOK" },
  { slug: "celebration-of-life", name: "Celebration of Life", layoutSlug: "boho-hexagon", revealStyle: "FLORAL" },
  { slug: "traditional-ghanaian", name: "Traditional Ghanaian Funeral", layoutSlug: "rustic-lace", revealStyle: "LEGACY_TIMELINE" },
  { slug: "christian-funeral", name: "Christian Funeral", layoutSlug: "classic-gold", revealStyle: "CANDLELIGHT" },
  { slug: "catholic-funeral", name: "Catholic Funeral", layoutSlug: "classic-gold", revealStyle: "MEMORIAL_BOOK" },
  { slug: "methodist-funeral", name: "Methodist Funeral", layoutSlug: "arch-green", revealStyle: "CANDLELIGHT" },
  { slug: "pentecostal-funeral", name: "Pentecostal Funeral", layoutSlug: "luxury-rings", revealStyle: "DOVE_RELEASE" },
  { slug: "islamic-janazah", name: "Islamic Janazah", layoutSlug: "arch-green", revealStyle: "INSTANT" },
  { slug: "royal-family", name: "Royal Family Memorial", layoutSlug: "luxury-rings", revealStyle: "PHOTO_FRAME" },
  { slug: "military-tribute", name: "Military Tribute", layoutSlug: "classic-gold", revealStyle: "MEMORIAL_BOOK" },
  { slug: "statesman-tribute", name: "Statesman Tribute", layoutSlug: "luxury-rings", revealStyle: "LEGACY_TIMELINE" },
  { slug: "modern-memorial", name: "Modern Memorial", layoutSlug: "boho-hexagon", revealStyle: "PHOTO_FRAME" },
  { slug: "minimal-memorial", name: "Minimal Memorial", layoutSlug: "arch-green", revealStyle: "INSTANT" },
] as const;

export const FUNERAL_REVEAL_STYLES = [
  { id: "MEMORIAL_BOOK", label: "Memorial Book Opening" },
  { id: "CANDLELIGHT", label: "Candlelight Reveal" },
  { id: "PHOTO_FRAME", label: "Photo Frame Reveal" },
  { id: "DOVE_RELEASE", label: "Dove Release Animation" },
  { id: "FLORAL", label: "Floral Reveal" },
  { id: "LEGACY_TIMELINE", label: "Legacy Timeline Reveal" },
  { id: "INSTANT", label: "Instant View" },
] as const;

export const FUNERAL_AUDIO_CATEGORIES = [
  "hymns",
  "instrumentals",
  "piano",
  "violin",
  "choir",
  "traditional",
  "gospel",
] as const;

export const CONTRIBUTION_PURPOSES = [
  { value: "FAMILY_SUPPORT", label: "Family Support" },
  { value: "BURIAL_SUPPORT", label: "Burial Support" },
  { value: "MEMORIAL_FUND", label: "Memorial Fund" },
  { value: "CHARITY_DONATION", label: "Charity Donation" },
  { value: "CHURCH_SUPPORT", label: "Church Support" },
] as const;

export const MEMORIAL_LOCALES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "tw", label: "Twi" },
  { code: "ga", label: "Ga" },
  { code: "ee", label: "Ewe" },
] as const;

export const FUNERAL_SEATING_ZONES = [
  "Family Section",
  "Clergy Section",
  "VIP Section",
  "General Guests",
  "Dignitaries",
] as const;
