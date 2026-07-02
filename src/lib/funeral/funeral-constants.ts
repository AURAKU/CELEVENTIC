/** Funeral invitation template collections — each maps to a unique layout */
export const FUNERAL_TEMPLATE_COLLECTIONS = [
  { slug: "memorial-candle-tribute", name: "Candlelight Elegy", layoutSlug: "memorial-candle-tribute", revealStyle: "CANDLELIGHT" },
  { slug: "arch-green", name: "Forest Vigil", layoutSlug: "arch-green", revealStyle: "MEMORIAL_BOOK" },
  { slug: "classic-gold", name: "Ivory Remembrance", layoutSlug: "classic-gold", revealStyle: "MEMORIAL_BOOK" },
  { slug: "rustic-lace", name: "Heritage Timber Tribute", layoutSlug: "rustic-lace", revealStyle: "LEGACY_TIMELINE" },
  { slug: "golden-islamic-nikkah", name: "Janazah Ornamental", layoutSlug: "golden-islamic-nikkah", revealStyle: "INSTANT" },
  { slug: "corporate-prestige-summit", name: "Statesman Legacy", layoutSlug: "corporate-prestige-summit", revealStyle: "LEGACY_TIMELINE" },
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
