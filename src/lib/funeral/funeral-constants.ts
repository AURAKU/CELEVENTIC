/** Funeral invitation template collections — maps to live catalogue SKUs + Funeral Experience themes */
export const FUNERAL_TEMPLATE_COLLECTIONS = [
  { slug: "memorial-candle-tribute", name: "Candlelight Elegy", layoutSlug: "memorial-candle-tribute", revealStyle: "CANDLELIGHT", experienceTheme: "burgundy-honour" },
  { slug: "candlelight-farewell", name: "Candlelight Farewell", layoutSlug: "memorial-candle-tribute", revealStyle: "CANDLELIGHT", experienceTheme: "burgundy-honour" },
  { slug: "white-lily-rest", name: "White Lily Rest", layoutSlug: "memorial-candle-tribute", revealStyle: "FLORAL", experienceTheme: "heavenly-peace" },
  { slug: "royal-mourning-lite", name: "Royal Mourning", layoutSlug: "memorial-candle-tribute", revealStyle: "MEMORIAL_BOOK", experienceTheme: "golden-legacy" },
  { slug: "black-red-cloth-rite", name: "Black & Red Cloth Rite", layoutSlug: "memorial-candle-tribute", revealStyle: "MEMORIAL_BOOK", experienceTheme: "ghana-heritage" },
  { slug: "white-cloth-homegoing", name: "White Cloth Homegoing", layoutSlug: "memorial-candle-tribute", revealStyle: "DOVE_RELEASE", experienceTheme: "heavenly-peace" },
  { slug: "kente-border-farewell", name: "Kente Border Farewell", layoutSlug: "memorial-candle-tribute", revealStyle: "MEMORIAL_BOOK", experienceTheme: "ghana-heritage" },
  { slug: "one-week-vigil-notice", name: "One Week Vigil Notice", layoutSlug: "memorial-candle-tribute", revealStyle: "LEGACY_TIMELINE", experienceTheme: "midnight-memorial" },
  { slug: "eternal-rose", name: "Eternal Rose", layoutSlug: "memorial-candle-tribute", revealStyle: "FLORAL", experienceTheme: "eternal-rose" },
  { slug: "peaceful-garden", name: "Peaceful Garden", layoutSlug: "memorial-candle-tribute", revealStyle: "FLORAL", experienceTheme: "peaceful-garden" },
] as const;

export const FUNERAL_REVEAL_STYLES = [
  { id: "MEMORIAL_BOOK", label: "Memorial Book Opening", introId: "ghanaian-regal" },
  { id: "CANDLELIGHT", label: "Candlelight Reveal", introId: "candle-remembrance" },
  { id: "PHOTO_FRAME", label: "Photo Frame Reveal", introId: "floral-reveal" },
  { id: "DOVE_RELEASE", label: "Heavenly Dove Reveal", introId: "heavenly-reveal" },
  { id: "FLORAL", label: "Floral Reveal", introId: "floral-reveal" },
  { id: "LEGACY_TIMELINE", label: "Legacy Timeline Reveal", introId: "memory-journey" },
  { id: "INSTANT", label: "Instant View", introId: "instant" },
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
