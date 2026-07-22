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

export type CatalogTier = "free" | "premium" | "luxury";

/** Per-template creative direction — stored metadata, enforced unique by scripts/check-template-uniqueness.ts */
export interface TemplateCreativeBrief {
  creativeConcept: string;
  emotionalTone: string;
  visualLanguage: string;
  revealMechanic: string;
  audioMood: string;
  outroType: string;
}

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
  // — Studio 2.0: templates as content (blueprint × theme × motif × motion) —
  tier?: CatalogTier;
  tags?: string[];
  colorFamily?: string;
  hasParallax?: boolean;
  /** src/lib/invite-blueprints registry id; presence marks a Wave 1 paged template */
  blueprintId?: string;
  /** src/lib/invitation-theme registry id */
  themeId?: string;
  motifPackId?: string;
  motionProfileId?: "still" | "gentle-drift" | "layered-drift" | "solemn";
  performanceClass?: "light" | "standard";
  /** Godtier: this template's creative universe (uniqueness-enforced) */
  creativeBrief?: TemplateCreativeBrief;
  /** Godtier: experience identity applied as the template's default DNA overrides */
  experienceOverrides?: {
    introVariant?: string;
    openingExperience?: string;
    sceneTransition?: string;
    outroExperience?: string;
    typographyPackId?: string;
    slideshowStyle?: string;
    countdownStyle?: string;
  };
  /** Godtier: this template's button family */
  buttonStyle?: string;
}

/**
 * One catalogue entry per layout — no recycled visuals.
 * slug === layoutSlug for clarity.
 */
export const CATALOG_TEMPLATES: CatalogTemplate[] = [
  {
    slug: "classic-gold",
    name: "Satin Bow Ivory",
    description: "Ivory card with satin ribbon motif — untie the bow to open",
    category: "Wedding",
    style: "Classic",
    layoutSlug: "classic-gold",
    previewGradient: "from-stone-100 to-amber-50",
    isPremium: false,
    mood: "Classic",
    features: ["RSVP", "Gallery", "Countdown", "Maps", "Music"],
    creativeBrief: {
      creativeConcept: "Satin Bow — ivory parchment tied with a satin bow ceremony",
      emotionalTone: "romantic",
      visualLanguage: "ivory card, satin ribbon folds, blush accents, soft foil names",
      revealMechanic: "untie satin bow",
      audioMood: "soft piano romance",
      outroType: "rose petal cascade",
    },
    experienceOverrides: {
      introVariant: "foil-rise",
      openingExperience: "satin-bow",
      sceneTransition: "sparkle",
      outroExperience: "rose-petals",
      typographyPackId: "romantic",
      slideshowStyle: "floating-memories",
      countdownStyle: "ring",
    },
    buttonStyle: "ribbon",
  },
  {
    slug: "luxury-rings",
    name: "Onyx & Gold Vows",
    description: "High-contrast black stage — open the ring box under spotlight",
    category: "Wedding",
    style: "Luxury",
    layoutSlug: "luxury-rings",
    previewGradient: "from-neutral-900 to-black",
    isPremium: true,
    mood: "Luxury",
    features: ["RSVP", "QR", "Music", "Gallery", "Countdown"],
    creativeBrief: {
      creativeConcept: "Luxury Black Tie — onyx stage, interlocking rings, ring-box reveal",
      emotionalTone: "luxurious",
      visualLanguage: "matte black, interlocking gold rings, spotlight beam, tuxedo contrast",
      revealMechanic: "open ring box under spotlight",
      audioMood: "violin elegance",
      outroType: "fireworks finale",
    },
    experienceOverrides: {
      introVariant: "ring-orbit",
      openingExperience: "ring-box",
      sceneTransition: "curtain",
      outroExperience: "fireworks",
      typographyPackId: "luxury",
      slideshowStyle: "film-strip",
      countdownStyle: "luxury",
    },
    buttonStyle: "gold",
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
    creativeBrief: {
      creativeConcept: "Vine Cathedral lite — palace doors into a living green arch",
      emotionalTone: "nature",
      visualLanguage: "forest arch, cream calligraphy, vine frames",
      revealMechanic: "palace entrance gates",
      audioMood: "garden strings",
      outroType: "memory slideshow",
    },
    experienceOverrides: {
      introVariant: "vine-grow",
      openingExperience: "palace-entrance",
      sceneTransition: "fade",
      outroExperience: "memory-slideshow",
      typographyPackId: "elegant",
      slideshowStyle: "floating-memories",
      countdownStyle: "classic",
    },
    buttonStyle: "sharp",
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
    creativeBrief: {
      creativeConcept: "Swan Lake Romance — lace draw into a photo-develop chapter",
      emotionalTone: "romantic",
      visualLanguage: "ornate lace overlay, warm timber, full-bleed portraits, paper tabs",
      revealMechanic: "photo develop zoom",
      audioMood: "warm acoustic",
      outroType: "final quote",
    },
    experienceOverrides: {
      introVariant: "lace-draw",
      openingExperience: "zoom-reveal",
      sceneTransition: "book",
      outroExperience: "final-quote",
      typographyPackId: "traditional",
      slideshowStyle: "polaroid-stack",
      countdownStyle: "classic",
    },
    buttonStyle: "paper-tab",
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
    creativeBrief: {
      creativeConcept: "Art Deco Wedding — gift-box pop into floating gold geometry",
      emotionalTone: "playful",
      visualLanguage: "soft florals, gold hexagon frame, deco lounge warmth",
      revealMechanic: "gift box open",
      audioMood: "soft jazz lounge",
      outroType: "rose petals",
    },
    experienceOverrides: {
      introVariant: "hex-assemble",
      openingExperience: "gift-box",
      sceneTransition: "sparkle",
      outroExperience: "rose-petals",
      typographyPackId: "modern",
      slideshowStyle: "magazine-collage",
      countdownStyle: "ring",
    },
    buttonStyle: "rounded",
  },
  {
    slug: "floral-garden",
    name: "Secret Garden",
    description: "Watercolor botanical borders — tap and petals fall to open",
    category: "Wedding",
    style: "Floral",
    layoutSlug: "floral-garden",
    previewGradient: "from-rose-100 to-pink-50",
    isPremium: false,
    mood: "Romantic",
    features: ["RSVP", "Gallery", "Music", "Calendar"],
    creativeBrief: {
      creativeConcept: "Watercolor Garden — petal cascade into blush botanical borders",
      emotionalTone: "romantic",
      visualLanguage: "blush typography, watercolor washes, botanical borders, petal drifts",
      revealMechanic: "petal fall ceremony",
      audioMood: "garden piano",
      outroType: "butterflies",
    },
    experienceOverrides: {
      introVariant: "petal-cascade",
      openingExperience: "petal-fall",
      sceneTransition: "slide",
      outroExperience: "butterflies",
      typographyPackId: "romantic",
      slideshowStyle: "polaroid-stack",
      countdownStyle: "ring",
    },
    buttonStyle: "pearl",
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
    creativeBrief: {
      creativeConcept: "Tropical Destination — folio open into flip boarding booklet",
      emotionalTone: "wanderlust",
      visualLanguage: "visa stamps, teal covers, tropical voyage motifs",
      revealMechanic: "flip reveal booklet",
      audioMood: "travel wanderlust",
      outroType: "final quote",
    },
    experienceOverrides: {
      introVariant: "folio-open",
      openingExperience: "flip-reveal",
      sceneTransition: "door",
      outroExperience: "final-quote",
      typographyPackId: "editorial",
      slideshowStyle: "magazine-collage",
      countdownStyle: "classic",
    },
    buttonStyle: "ticket-stub",
  },
  {
    slug: "glass-acrylic",
    name: "Frostlight Premiere",
    description: "Frosted acrylic premiere — film countdown into luminous depth",
    category: "Wedding",
    style: "Modern",
    layoutSlug: "glass-acrylic",
    previewGradient: "from-sky-900 to-teal-800",
    isPremium: true,
    mood: "Luxury",
    features: ["RSVP", "Gallery", "Music", "Countdown"],
    creativeBrief: {
      creativeConcept: "Cinematic Film Premiere — marble veil into 3-2-1 premiere countdown",
      emotionalTone: "cinematic",
      visualLanguage: "frosted acrylic, teal depth, metallic edges, premiere countdown",
      revealMechanic: "film countdown",
      audioMood: "crystal strings",
      outroType: "closing curtain",
    },
    experienceOverrides: {
      introVariant: "marble-veil",
      openingExperience: "film-countdown",
      sceneTransition: "sparkle",
      outroExperience: "closing-curtain",
      typographyPackId: "minimal",
      slideshowStyle: "floating-memories",
      countdownStyle: "glass",
    },
    buttonStyle: "crystal",
  },
  {
    slug: "royal-emerald-wedding",
    name: "Palace Emerald Reign",
    description: "Palace emerald wax seal — press to open, velvet and gold crown",
    category: "Wedding",
    style: "Royal",
    layoutSlug: "royal-emerald-wedding",
    previewGradient: "from-emerald-900 via-emerald-950 to-amber-950",
    isPremium: true,
    isNew: true,
    mood: "European",
    features: ["RSVP", "QR", "Music", "Gallery", "Countdown", "Maps"],
    creativeBrief: {
      creativeConcept: "Royal Wax Seal — gold-light intro into embossed emerald envelope; press the wax seal",
      emotionalTone: "regal",
      visualLanguage: "deep emerald velvet, gold crown motifs, palace columns, embossed seal, paper and metal depth",
      revealMechanic: "press wax seal on embossed emerald envelope",
      audioMood: "royal orchestra and strings",
      outroType: "seal reforms with Replay and RSVP",
    },
    experienceOverrides: {
      introVariant: "gold-foil",
      openingExperience: "wax-seal-emerald",
      sceneTransition: "curtain",
      outroExperience: "seal-reform",
      typographyPackId: "luxury",
      slideshowStyle: "luxury-frame",
      countdownStyle: "gold-royal",
    },
    buttonStyle: "embossed-royal",
    hasParallax: true,
    motionProfileId: "layered-drift",
  },
  {
    slug: "midnight-velvet-reception",
    name: "Velvet Midnight Soirée",
    description: "Film-title intro into magazine cover and editorial page-turn chapters",
    category: "Wedding",
    style: "Cinematic",
    layoutSlug: "midnight-velvet-reception",
    previewGradient: "from-slate-950 via-indigo-950 to-black",
    isPremium: true,
    isNew: true,
    mood: "Cinematic",
    features: ["RSVP", "QR", "Music", "Gallery", "Calendar"],
    creativeBrief: {
      creativeConcept: "Editorial Love Story — title card into magazine cover; swipe page-turn chapters",
      emotionalTone: "editorial",
      visualLanguage: "asymmetric crops, silver type, velvet darkness, film-strip collage, credit typography",
      revealMechanic: "magazine cover page turn",
      audioMood: "midnight jazz and soft piano",
      outroType: "credits page Share and Replay",
    },
    experienceOverrides: {
      introVariant: "film-title",
      openingExperience: "magazine-page-turn",
      sceneTransition: "book",
      outroExperience: "credits-page",
      typographyPackId: "editorial",
      slideshowStyle: "magazine-collage",
      countdownStyle: "luxury",
    },
    buttonStyle: "editorial-underline",
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
    creativeBrief: {
      creativeConcept: "Kente Covenant — ticket tear into a swipe of woven heritage",
      emotionalTone: "traditional",
      visualLanguage: "woven maroon and gold, drum cadence, grand lettering",
      revealMechanic: "swipe reveal cloth",
      audioMood: "african drums celebration",
      outroType: "floating lanterns",
    },
    experienceOverrides: {
      introVariant: "ticket-tear",
      openingExperience: "swipe-reveal",
      sceneTransition: "book",
      outroExperience: "lanterns",
      typographyPackId: "traditional",
      slideshowStyle: "magazine-collage",
      countdownStyle: "classic",
    },
    buttonStyle: "kente",
  },
  {
    slug: "traditional-marriage-ceremony",
    name: "Traditional Marriage Ceremony",
    description:
      "Exact vision-board digital invite — peach floral card, ribbon art, live QR, RSVP, seating & ceremony music",
    category: "Wedding",
    style: "Traditional Ghanaian",
    layoutSlug: "traditional-marriage-ceremony",
    previewGradient: "from-rose-100 via-orange-50 to-amber-100",
    isPremium: true,
    isNew: true,
    mood: "Traditional",
    features: [
      "RSVP",
      "QR",
      "Music",
      "Gallery",
      "Seating",
      "Maps",
      "Memory",
      "Guest Welcome",
    ],
    creativeBrief: {
      creativeConcept:
        "Afari × Opoku Traditional Marriage vision board — peach silk ribbon card with exact ceremony copy and live gate QR",
      emotionalTone: "traditional",
      visualLanguage:
        "peach blossom backdrop, bronze Cinzel names, script ceremony title, date triptych, functional QR & RSVP footer",
      revealMechanic: "ribbon envelope open into the printed card",
      audioMood: "african ceremony drums soft",
      outroType: "hashtag forever thank-you",
    },
    experienceOverrides: {
      introVariant: "particle-burst",
      openingExperience: "envelope-royal",
      sceneTransition: "sparkle",
      outroExperience: "golden-sparkles",
      typographyPackId: "traditional",
      slideshowStyle: "magazine-collage",
      countdownStyle: "classic",
    },
    buttonStyle: "ribbon",
  },
  {
    slug: "floral-garden-romance",
    name: "Petal Promise",
    description: "Botanical Bloom — floral logo bloom into petal reveal and floating frames",
    category: "Engagement",
    style: "Romantic",
    layoutSlug: "floral-garden-romance",
    previewGradient: "from-rose-100 via-pink-50 to-emerald-50",
    isPremium: false,
    mood: "Romantic",
    features: ["RSVP", "Story", "Music", "Gallery", "Countdown"],
    creativeBrief: {
      creativeConcept: "Botanical Bloom — living romantic garden; logo bloom into petal reveal and floating frames",
      emotionalTone: "romantic",
      visualLanguage: "soft petals, rose light, floating botanical frames, leaf depth layers, flower parallax",
      revealMechanic: "tap flower or swipe petals to bloom",
      audioMood: "soft piano and garden acoustic",
      outroType: "petals thank-you cascade",
    },
    experienceOverrides: {
      introVariant: "logo-bloom",
      openingExperience: "flower-bloom",
      sceneTransition: "sparkle",
      outroExperience: "rose-petals",
      typographyPackId: "romantic",
      slideshowStyle: "floating-memories",
      countdownStyle: "ring",
    },
    buttonStyle: "floral-edge",
    hasParallax: true,
    motionProfileId: "gentle-drift",
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
    hasParallax: true,
    creativeBrief: {
      creativeConcept: "Horizon Boarding Pass — fabric unfold into passport stamp journey",
      emotionalTone: "wanderlust",
      visualLanguage: "boarding pass folds, visa stamps, horizon light",
      revealMechanic: "passport stamp",
      audioMood: "travel guitar",
      outroType: "departure board",
    },
    experienceOverrides: {
      introVariant: "fabric-unfold",
      openingExperience: "passport",
      sceneTransition: "slide",
      outroExperience: "see-you-soon",
      typographyPackId: "editorial",
      slideshowStyle: "timeline-gallery",
      countdownStyle: "classic",
    },
    buttonStyle: "passport-stamp",
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
    hasParallax: true,
    creativeBrief: {
      creativeConcept: "Champagne Crystal — prism refract into glass wipe with champagne light",
      emotionalTone: "luminous",
      visualLanguage: "frosted depth, refraction, champagne gold edges",
      revealMechanic: "glass wipe",
      audioMood: "harp ambient",
      outroType: "light shimmer",
    },
    experienceOverrides: {
      introVariant: "prism-refract",
      openingExperience: "glass",
      sceneTransition: "sparkle",
      outroExperience: "memory-slideshow",
      typographyPackId: "minimal",
      slideshowStyle: "luxury-frame",
      countdownStyle: "glass",
    },
    buttonStyle: "glass",
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
    creativeBrief: {
      creativeConcept: "Islamic Ornamental — quill script into geometric palace envelope",
      emotionalTone: "reverent",
      visualLanguage: "gold geometry, emerald fields, ornamental arches, soft instrumental",
      revealMechanic: "islamic envelope open",
      audioMood: "graceful piano",
      outroType: "golden sparkles",
    },
    experienceOverrides: {
      introVariant: "quill-script",
      openingExperience: "envelope-islamic",
      sceneTransition: "fade",
      outroExperience: "golden-sparkles",
      typographyPackId: "elegant",
      slideshowStyle: "ken-burns",
      countdownStyle: "circular",
    },
    buttonStyle: "wax-seal",
  },
  {
    slug: "memorial-candle-tribute",
    name: "Candlelight Elegy",
    description: "Memorial Candle — soft light, tap to light, timeline memory album",
    category: "Funeral",
    style: "Classic",
    layoutSlug: "memorial-candle-tribute",
    previewGradient: "from-slate-900 via-stone-900 to-red-950",
    isPremium: false,
    mood: "Classic",
    features: ["Tributes", "Contributions", "Music", "Gallery", "RSVP"],
    creativeBrief: {
      creativeConcept: "Memorial Candle — soft light into unlit candle; tap to light; life timeline album",
      emotionalTone: "solemn",
      visualLanguage: "candle glow, restrained portrait framing, warm stone, life timeline, memory album",
      revealMechanic: "tap unlit candle to light",
      audioMood: "memorial piano and soft choir",
      outroType: "candle fade legacy",
    },
    experienceOverrides: {
      introVariant: "candlelight",
      openingExperience: "candle-light",
      sceneTransition: "fade",
      outroExperience: "candle-legacy",
      typographyPackId: "funeral",
      slideshowStyle: "timeline-gallery",
      countdownStyle: "minimal",
    },
    buttonStyle: "solemn",
    hasParallax: true,
    motionProfileId: "solemn",
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
    creativeBrief: {
      creativeConcept: "Electric Pulse — neon pulse into confetti burst party ticket",
      emotionalTone: "high-energy",
      visualLanguage: "fuchsia neon, scratch energy, ticket QR",
      revealMechanic: "confetti burst",
      audioMood: "party edm",
      outroType: "fireworks",
    },
    experienceOverrides: {
      introVariant: "neon-pulse",
      openingExperience: "confetti-burst",
      sceneTransition: "slide",
      outroExperience: "fireworks",
      typographyPackId: "modern",
      slideshowStyle: "grid-reveal",
      countdownStyle: "flip",
    },
    buttonStyle: "neon",
  },
  {
    slug: "corporate-prestige-summit",
    name: "Platinum Summit",
    description: "Corporate Prestige — kinetic grid into agenda chapters and split media",
    category: "Corporate",
    style: "Premium Dark",
    layoutSlug: "corporate-prestige-summit",
    previewGradient: "from-slate-900 via-slate-800 to-teal-900",
    isPremium: true,
    mood: "Luxury",
    features: ["RSVP", "QR", "Agenda", "Music", "Calendar"],
    creativeBrief: {
      creativeConcept: "Corporate Prestige — kinetic logo grid into title; scroll/tap agenda chapters",
      emotionalTone: "corporate",
      visualLanguage: "refined grid, teal accents, precision kinetic type, glass parallax, speaker cards",
      revealMechanic: "corporate curtain into agenda chapters",
      audioMood: "corporate ambient",
      outroType: "registration calendar and share card",
    },
    experienceOverrides: {
      introVariant: "engine-grid",
      openingExperience: "curtain-corporate",
      sceneTransition: "slide",
      outroExperience: "see-you-soon",
      typographyPackId: "corporate",
      slideshowStyle: "split-media",
      countdownStyle: "glass",
    },
    buttonStyle: "corporate-solid",
    hasParallax: true,
    motionProfileId: "still",
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
    creativeBrief: {
      creativeConcept: "Your Canvas — canvas wipe into a foil-scratch media frame",
      emotionalTone: "creator-led",
      visualLanguage: "cinematic media frame, teal studio field, creator freedom",
      revealMechanic: "scratch foil media",
      audioMood: "cinematic ambient",
      outroType: "upload memories",
    },
    experienceOverrides: {
      introVariant: "canvas-wipe",
      openingExperience: "scratch",
      sceneTransition: "fade",
      outroExperience: "upload-memories",
      typographyPackId: "modern",
      slideshowStyle: "fullscreen-video",
      countdownStyle: "minimal",
    },
    buttonStyle: "gradient-cta",
  },

  // ————— Invitation Studio 2.0 · Wave 1 paged templates —————
  // Pure data: blueprint × theme × motion. Free tier: 4 pages, still motion,
  // never parallax. Funeral motion is always still (solemn, never playful).
  {
    slug: "gilded-vows",
    name: "Gilded Vows",
    description: "Ivory and gold paged invitation with foil names and flourish motifs",
    category: "Wedding",
    style: "Classic",
    layoutSlug: "classic-gold",
    previewGradient: "from-amber-50 via-stone-50 to-yellow-100",
    isPremium: false,
    isNew: true,
    mood: "Classic",
    features: ["Pages", "RSVP", "Countdown", "Calendar", "Maps"],
    tier: "free",
    tags: ["classic", "gold", "serif"],
    colorFamily: "gold",
    hasParallax: false,
    blueprintId: "wedding-free-v1",
    themeId: "gilded-serif",
    motifPackId: "gilded-classic",
    motionProfileId: "still",
    performanceClass: "light",
    creativeBrief: {
      creativeConcept: "Storybook Romance — seal impress into an unfolding gilded letter",
      emotionalTone: "storybook",
      visualLanguage: "ivory pages, foil names, silver seal, flourish motifs",
      revealMechanic: "letter unfold",
      audioMood: "ivory foil prelude",
      outroType: "golden sparkles",
    },
    experienceOverrides: {
      introVariant: "seal-impress",
      openingExperience: "letter-unfold",
      sceneTransition: "door",
      outroExperience: "golden-sparkles",
      typographyPackId: "luxury",
      slideshowStyle: "luxury-frame",
      countdownStyle: "gold-royal",
    },
    buttonStyle: "gold",
  },
  {
    slug: "emerald-promise",
    name: "Emerald Promise",
    description: "Deep emerald pages with cream calligraphy and botanical dividers",
    category: "Wedding",
    style: "Floral",
    layoutSlug: "arch-green",
    previewGradient: "from-emerald-950 to-emerald-900",
    isPremium: false,
    isNew: true,
    mood: "Nature",
    features: ["Pages", "RSVP", "Countdown", "Calendar", "Maps"],
    tier: "free",
    tags: ["botanical", "arch", "emerald"],
    colorFamily: "emerald",
    hasParallax: false,
    blueprintId: "wedding-free-v1",
    themeId: "emerald-arch",
    motifPackId: "emerald-botanical",
    motionProfileId: "still",
    performanceClass: "light",
    creativeBrief: {
      creativeConcept: "Celestial Love — chapel glow into a rose-gold seal under starlight",
      emotionalTone: "hopeful",
      visualLanguage: "deep emerald pages, cream calligraphy, starlit botanical dividers",
      revealMechanic: "rose gold wax seal",
      audioMood: "botanical promise strings",
      outroType: "butterflies",
    },
    experienceOverrides: {
      introVariant: "chapel-glow",
      openingExperience: "wax-seal-rose",
      sceneTransition: "book",
      outroExperience: "butterflies",
      typographyPackId: "elegant",
      slideshowStyle: "fade-carousel",
      countdownStyle: "classic",
    },
    buttonStyle: "outline",
  },
  {
    slug: "kente-court",
    name: "Kente Court",
    description: "Maroon and gold heritage pages with grand lettering",
    category: "Wedding",
    style: "Kente-inspired",
    layoutSlug: "kente-heritage-union",
    previewGradient: "from-amber-950 via-red-900 to-yellow-800",
    isPremium: false,
    isNew: true,
    mood: "Traditional",
    features: ["Pages", "RSVP", "Countdown", "Calendar", "Maps"],
    tier: "free",
    tags: ["kente", "royal", "heritage"],
    colorFamily: "maroon",
    hasParallax: false,
    blueprintId: "wedding-free-v1",
    themeId: "kente-royale",
    motifPackId: "kente-royal",
    motionProfileId: "still",
    performanceClass: "light",
    creativeBrief: {
      creativeConcept: "Kente Court — drum pulse into a joyful pop reveal",
      emotionalTone: "celebratory",
      visualLanguage: "maroon and gold pages, grand lettering, court drums",
      revealMechanic: "pop reveal",
      audioMood: "court drum welcome",
      outroType: "fireworks",
    },
    experienceOverrides: {
      introVariant: "drum-pulse",
      openingExperience: "pop-reveal",
      sceneTransition: "slide",
      outroExperience: "fireworks",
      typographyPackId: "traditional",
      slideshowStyle: "polaroid-stack",
      countdownStyle: "classic",
    },
    buttonStyle: "metallic",
  },
  {
    slug: "gilded-opulence-pages",
    name: "Gilded Opulence Gallery",
    description: "Five-page gilded experience with parallax cover and drifting motifs",
    category: "Wedding",
    style: "Luxury",
    layoutSlug: "classic-gold",
    previewGradient: "from-yellow-50 via-amber-100 to-stone-200",
    isPremium: true,
    isNew: true,
    mood: "Luxury",
    features: ["Pages", "Parallax", "RSVP", "Countdown", "Calendar", "Maps"],
    tier: "premium",
    tags: ["classic", "gold", "serif", "parallax"],
    colorFamily: "gold",
    hasParallax: true,
    blueprintId: "wedding-core-v1",
    themeId: "gilded-serif",
    motifPackId: "gilded-classic",
    motionProfileId: "layered-drift",
    performanceClass: "standard",
    creativeBrief: {
      creativeConcept: "European Manor — royal orbit into gold wax with parallax foil gallery",
      emotionalTone: "regal",
      visualLanguage: "ivory card stock, gilded frames, foil names, manor medallions",
      revealMechanic: "gold wax seal press",
      audioMood: "royal orchestra",
      outroType: "golden sparkles",
    },
    experienceOverrides: {
      introVariant: "orbit",
      openingExperience: "wax-seal-gold",
      sceneTransition: "door",
      outroExperience: "closing-curtain",
      typographyPackId: "luxury",
      slideshowStyle: "luxury-frame",
      countdownStyle: "gold-royal",
    },
    buttonStyle: "embossed-royal",
  },
  {
    slug: "emerald-cathedral",
    name: "Emerald Cathedral",
    description: "Arched emerald pages with drifting vines and a venue journey",
    category: "Wedding",
    style: "Floral",
    layoutSlug: "arch-green",
    previewGradient: "from-emerald-950 via-emerald-900 to-emerald-800",
    isPremium: true,
    isNew: true,
    mood: "Nature",
    features: ["Pages", "Parallax", "RSVP", "Countdown", "Calendar", "Maps"],
    tier: "premium",
    tags: ["botanical", "arch", "emerald", "parallax"],
    colorFamily: "emerald",
    hasParallax: true,
    blueprintId: "wedding-core-v1",
    themeId: "emerald-arch",
    motifPackId: "emerald-botanical",
    motionProfileId: "gentle-drift",
    performanceClass: "standard",
    creativeBrief: {
      creativeConcept: "Palace Gates — constellation into emerald archway gates",
      emotionalTone: "regal",
      visualLanguage: "cathedral arches, living vines, dusk-lit emerald depths",
      revealMechanic: "archway gates open",
      audioMood: "acoustic garden strings",
      outroType: "butterflies",
    },
    experienceOverrides: {
      introVariant: "constellation",
      openingExperience: "archway",
      sceneTransition: "book",
      outroExperience: "butterflies",
      typographyPackId: "elegant",
      slideshowStyle: "polaroid-stack",
      countdownStyle: "classic",
    },
    buttonStyle: "ornamental-arch",
  },
  {
    slug: "kente-royale-pages",
    name: "Kente Royale",
    description: "Full royal kente experience — gold foil, grand type, drifting weave",
    category: "Wedding",
    style: "Kente-inspired",
    layoutSlug: "kente-heritage-union",
    previewGradient: "from-amber-950 via-red-950 to-yellow-900",
    isPremium: true,
    isNew: true,
    mood: "Traditional",
    features: ["Pages", "Parallax", "RSVP", "Countdown", "Calendar", "Maps"],
    tier: "premium",
    tags: ["kente", "royal", "heritage", "parallax"],
    colorFamily: "maroon",
    hasParallax: true,
    blueprintId: "wedding-core-v1",
    themeId: "kente-royale",
    motifPackId: "kente-royal",
    motionProfileId: "layered-drift",
    performanceClass: "standard",
    creativeBrief: {
      creativeConcept: "Kente Royale — soft intro into theatrical velvet curtains with kente gold trim",
      emotionalTone: "traditional",
      visualLanguage: "woven maroon and gold, grand lettering, stage curtain reveal",
      revealMechanic: "wedding stage curtains",
      audioMood: "drums and strings",
      outroType: "golden sparkles",
    },
    experienceOverrides: {
      introVariant: "ink-reveal",
      openingExperience: "curtain-wedding",
      sceneTransition: "book",
      outroExperience: "golden-sparkles",
      typographyPackId: "traditional",
      slideshowStyle: "stacked-cards",
      countdownStyle: "classic",
    },
    buttonStyle: "kente",
  },
  {
    slug: "candlelight-farewell",
    name: "Candlelight Farewell",
    description: "Dignified candlelit pages announcing a celebration of life",
    category: "Funeral",
    style: "Classic",
    layoutSlug: "memorial-candle-tribute",
    previewGradient: "from-stone-950 to-amber-950",
    isPremium: false,
    isNew: true,
    mood: "Classic",
    features: ["Pages", "Attendance", "Calendar", "Maps"],
    tier: "free",
    tags: ["candlelight", "dignified"],
    colorFamily: "gold",
    hasParallax: false,
    blueprintId: "funeral-free-v1",
    themeId: "candlelight-elegy",
    motifPackId: "memorial-candle",
    motionProfileId: "still",
    performanceClass: "light",
    creativeBrief: {
      creativeConcept: "Chapel Candle Farewell — glass shimmer into a quiet curtain of remembrance",
      emotionalTone: "reverent",
      visualLanguage: "warm candle wall, soft gold on stone, restrained page rhythm",
      revealMechanic: "soft award curtain",
      audioMood: "memorial piano",
      outroType: "memory slideshow",
    },
    experienceOverrides: {
      introVariant: "glass-shimmer",
      openingExperience: "curtain-award",
      sceneTransition: "fade",
      outroExperience: "memory-slideshow",
      typographyPackId: "funeral",
      slideshowStyle: "classic-slideshow",
      countdownStyle: "minimal",
    },
    buttonStyle: "outline",
  },
  {
    slug: "white-lily-rest",
    name: "White Lily Rest",
    description: "Serene ivory pages with lily motifs and quiet typography",
    category: "Funeral",
    style: "Clean White",
    layoutSlug: "memorial-candle-tribute",
    previewGradient: "from-slate-50 to-stone-100",
    isPremium: false,
    isNew: true,
    mood: "Classic",
    features: ["Pages", "Attendance", "Calendar", "Maps"],
    tier: "free",
    tags: ["lily", "minimal", "serene"],
    colorFamily: "ivory",
    hasParallax: false,
    blueprintId: "funeral-free-v1",
    themeId: "white-lily-memorial",
    motifPackId: "white-lily",
    motionProfileId: "still",
    performanceClass: "light",
    creativeBrief: {
      creativeConcept: "White Lily Rest — ivory stillness with a floral envelope into quiet pages",
      emotionalTone: "serene",
      visualLanguage: "ivory lily motifs, pale stone, whisper typography",
      revealMechanic: "floral envelope open",
      audioMood: "quiet strings",
      outroType: "final quote",
    },
    experienceOverrides: {
      introVariant: "lily-breathe",
      openingExperience: "envelope-floral",
      sceneTransition: "fade",
      outroExperience: "final-quote",
      typographyPackId: "minimal",
      slideshowStyle: "fade-carousel",
      countdownStyle: "minimal",
    },
    buttonStyle: "minimal-text",
  },
  {
    slug: "royal-mourning-lite",
    name: "Royal Mourning Lite",
    description: "Black, red, and white pages honouring Ghanaian funeral custom",
    category: "Funeral",
    style: "Traditional Ghanaian",
    layoutSlug: "memorial-candle-tribute",
    previewGradient: "from-neutral-950 via-red-900 to-neutral-800",
    isPremium: false,
    isNew: true,
    mood: "Traditional",
    features: ["Pages", "Attendance", "Calendar", "Maps"],
    tier: "free",
    tags: ["ghanaian", "black-red-white", "royal"],
    colorFamily: "monochrome",
    hasParallax: false,
    blueprintId: "funeral-free-v1",
    themeId: "royal-mourning",
    motifPackId: "memorial-drape",
    motionProfileId: "still",
    performanceClass: "light",
    creativeBrief: {
      creativeConcept: "Royal Mourning Lite — black-red-white drape into a press-hold rite",
      emotionalTone: "dignified",
      visualLanguage: "mourning cloth, silver-on-black type, red honour accents",
      revealMechanic: "press and hold to open",
      audioMood: "acoustic warm choir",
      outroType: "final quote",
    },
    experienceOverrides: {
      introVariant: "drape-fall",
      openingExperience: "press-hold",
      sceneTransition: "door",
      outroExperience: "final-quote",
      typographyPackId: "elegant",
      slideshowStyle: "split-media",
      countdownStyle: "minimal",
    },
    buttonStyle: "ribbon",
  },
  {
    slug: "candlelight-elegy-pages",
    name: "Candlelight Tribute Chapters",
    description: "Six solemn pages with a full tribute and biography chapter",
    category: "Funeral",
    style: "Luxury",
    layoutSlug: "memorial-candle-tribute",
    previewGradient: "from-stone-950 via-amber-950 to-red-950",
    isPremium: true,
    isNew: true,
    mood: "Luxury",
    features: ["Pages", "Tribute", "Attendance", "Calendar", "Maps"],
    tier: "premium",
    tags: ["candlelight", "tribute", "dignified"],
    colorFamily: "gold",
    hasParallax: false,
    blueprintId: "funeral-core-v1",
    themeId: "candlelight-elegy",
    motifPackId: "memorial-candle",
    motionProfileId: "solemn",
    performanceClass: "light",
    creativeBrief: {
      creativeConcept: "Candlelight Tribute Chapters — spotlight into light-beam elegy",
      emotionalTone: "solemn",
      visualLanguage: "candlelit darkness, warm gold on velvet black, portrait framing",
      revealMechanic: "light beam",
      audioMood: "memorial violin",
      outroType: "thank-you fade",
    },
    experienceOverrides: {
      introVariant: "spotlight",
      openingExperience: "light-beam",
      sceneTransition: "fade",
      outroExperience: "thank-you-fade",
      typographyPackId: "funeral",
      slideshowStyle: "classic-slideshow",
      countdownStyle: "minimal",
    },
    buttonStyle: "minimal-text",
  },
  {
    slug: "white-lily-memorial-pages",
    name: "White Lily Memorial",
    description: "Full memorial journey in serene ivory with a tribute chapter",
    category: "Funeral",
    style: "Clean White",
    layoutSlug: "memorial-candle-tribute",
    previewGradient: "from-slate-50 via-stone-100 to-stone-200",
    isPremium: true,
    isNew: true,
    mood: "Classic",
    features: ["Pages", "Tribute", "Attendance", "Calendar", "Maps"],
    tier: "premium",
    tags: ["lily", "minimal", "tribute"],
    colorFamily: "ivory",
    hasParallax: false,
    blueprintId: "funeral-core-v1",
    themeId: "white-lily-memorial",
    motifPackId: "white-lily",
    motionProfileId: "still",
    performanceClass: "light",
    creativeBrief: {
      creativeConcept: "White Lily Memorial Journey — aurora rise into a silver-seal tribute chapter",
      emotionalTone: "tender",
      visualLanguage: "serene ivory chapters, lily dividers, soft portrait frames",
      revealMechanic: "silver wax seal",
      audioMood: "ambient cinematic",
      outroType: "thank-you fade",
    },
    experienceOverrides: {
      introVariant: "aurora-rise",
      openingExperience: "wax-seal-silver",
      sceneTransition: "book",
      outroExperience: "thank-you-fade",
      typographyPackId: "funeral",
      slideshowStyle: "polaroid-stack",
      countdownStyle: "minimal",
    },
    buttonStyle: "crystal",
  },
  {
    slug: "royal-mourning-pages",
    name: "Royal Mourning Estate",
    description: "The full black-red-white rite with tribute and family pages",
    category: "Funeral",
    style: "Traditional Ghanaian",
    layoutSlug: "memorial-candle-tribute",
    previewGradient: "from-neutral-950 via-red-950 to-black",
    isPremium: true,
    isNew: true,
    mood: "Traditional",
    features: ["Pages", "Tribute", "Attendance", "Calendar", "Maps"],
    tier: "premium",
    tags: ["ghanaian", "black-red-white", "royal", "tribute"],
    colorFamily: "monochrome",
    hasParallax: false,
    blueprintId: "funeral-core-v1",
    themeId: "royal-mourning",
    motifPackId: "memorial-drape",
    motionProfileId: "solemn",
    performanceClass: "light",
    creativeBrief: {
      creativeConcept: "Royal Mourning Estate — light sweep into parchment scroll rite",
      emotionalTone: "dignified",
      visualLanguage: "velvet drape, silver-on-black typography, Ghanaian mourning cloth",
      revealMechanic: "parchment scroll unroll",
      audioMood: "funeral choir",
      outroType: "final quote",
    },
    experienceOverrides: {
      introVariant: "light-sweep",
      openingExperience: "scroll-unroll",
      sceneTransition: "door",
      outroExperience: "final-quote",
      typographyPackId: "elegant",
      slideshowStyle: "split-media",
      countdownStyle: "minimal",
    },
    buttonStyle: "metallic",
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
  // Prefer exact SKU match first — shared layouts must not resolve to the first lite.
  return (
    CATALOG_TEMPLATES.find((t) => t.slug === resolved) ??
    CATALOG_TEMPLATES.find((t) => t.layoutSlug === resolved)
  );
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

/**
 * Public browse catalogue: one card per visual family.
 * Shared-layout Wave-1 lites collapse by layoutSlug; near-duplicate layout
 * pairs (floral / passport / glass) collapse by browse family so guests never
 * see two cards that feel like the same creative universe.
 */
function browseRank(t: CatalogTemplate): number {
  let score = 0;
  if (t.creativeBrief) score += 100;
  if (t.experienceOverrides) score += 40;
  if (t.hasParallax) score += 25;
  if (t.tier === "luxury") score += 20;
  else if (t.tier === "premium") score += 12;
  if (t.isNew) score += 6;
  if (t.slug === t.layoutSlug) score += 10;
  if (t.isPremium) score += 4;
  return score;
}

/** Near-duplicate layout pairs share one browse family key. */
const BROWSE_FAMILY_BY_SLUG: Record<string, string> = {
  // Botanical Bloom family — romance wins browse; secret garden is studio-only
  "floral-garden": "family-botanical",
  "floral-garden-romance": "family-botanical",
  // Destination Passport family
  "passport-luxe": "family-passport",
  "passport-destination-wedding": "family-passport",
  // Pearl and Crystal family
  "glass-acrylic": "family-crystal",
  "crystal-acrylic-luxury": "family-crystal",
  // Satin Bow stays distinct from Gilded Gallery (shared classic-gold layout)
  "classic-gold": "family-satin-bow",
  "gilded-vows": "family-gilded-gallery",
  "gilded-opulence-pages": "family-gilded-gallery",
};

/** When browse ranks tie, prefer the family primary SKU. */
const BROWSE_FAMILY_PREFERRED_SLUG: Record<string, string> = {
  "family-botanical": "floral-garden-romance",
  "family-passport": "passport-destination-wedding",
  "family-crystal": "crystal-acrylic-luxury",
  "family-gilded-gallery": "gilded-opulence-pages",
};

function browseDedupeKey(t: CatalogTemplate): string {
  return BROWSE_FAMILY_BY_SLUG[t.slug] ?? t.layoutSlug;
}

export function getBrowseCatalogTemplates(): CatalogTemplate[] {
  const bestByFamily = new Map<string, CatalogTemplate>();

  for (const template of CATALOG_TEMPLATES) {
    const key = browseDedupeKey(template);
    const current = bestByFamily.get(key);
    const nextRank = browseRank(template);
    const curRank = current ? browseRank(current) : -1;
    const preferred = BROWSE_FAMILY_PREFERRED_SLUG[key];
    const preferNext =
      !current ||
      nextRank > curRank ||
      (nextRank === curRank && preferred === template.slug);
    if (preferNext) {
      bestByFamily.set(key, template);
    }
  }

  const winners = new Set(
    Array.from(bestByFamily.values()).map((template) => template.slug)
  );

  return CATALOG_TEMPLATES.filter((template) => winners.has(template.slug));
}

