import { googleMapsPlaceHref } from "@/lib/invitation/maps-utils";
import {
  AURELIA_CATALOG_SLUG,
  AURELIA_LAYOUT_SLUG,
  type AureliaThemeTokens,
  type AureliaWeddingConfig,
} from "./types";

export { AURELIA_CATALOG_SLUG, AURELIA_LAYOUT_SLUG };

export const AURELIA_THEME_DEFAULTS: AureliaThemeTokens = {
  ivory: "#F8F4EA",
  cream: "#EFE7D5",
  champagne: "#D8C09C",
  terracotta: "#B65A37",
  blush: "#DDA8A0",
  espresso: "#352019",
  brown: "#5A453C",
  gold: "#B69A63",
  text: "#3B2A25",
};

/** Traditional ceremony dress palette — Chamoisee through Smoky Black. */
export const AURELIA_TRADITIONAL_PALETTE = [
  { name: "Chamoisee", hex: "#A7795E" },
  { name: "Kobicha", hex: "#6E3C19" },
  { name: "Black Bean", hex: "#34170D" },
  { name: "Licorice", hex: "#230F08" },
  { name: "Smoky Black", hex: "#110703" },
] as const;

export const AURELIA_HERO_FALLBACK = "/templates/aurelia/hero.jpg";
export const AURELIA_STORY_FALLBACK = "/templates/aurelia/story.jpg";
/** Album QR inset — Enock & Ruth looking back, rust dress and ivory jacket. */
export const AURELIA_QR_CENTER = "/templates/aurelia/qr-center.jpg";
/** Enock & Ruth portraits for Our Beginning. Starts with the seated story photograph. */
export const AURELIA_COUPLE_GALLERY = [
  AURELIA_STORY_FALLBACK,
  "/templates/aurelia/couple/01-standing.jpg",
  "/templates/aurelia/couple/02-gold-laugh.jpg",
  "/templates/aurelia/couple/03-black-and-white.jpg",
  "/templates/aurelia/couple/04-chair.jpg",
  "/templates/aurelia/couple/05-gold-gaze.jpg",
] as const;
export const AURELIA_INVITE_MUSIC = "/templates/aurelia/ordinary.mp3";
export const AURELIA_INVITE_MUSIC_TITLE = "Ordinary";
export const AURELIA_INVITE_MUSIC_DURATION_SEC = 188.21;
/**
 * Seraphine score: Pachelbel’s Canon in D — the wedding love theme everyone
 * already knows. Recording by Kevin MacLeod (incompetech.com), CC BY 3.0.
 */
export const SERAPHINE_INVITE_MUSIC = "/templates/seraphine/canon-in-d.mp3";
export const SERAPHINE_INVITE_MUSIC_TITLE = "Canon in D";
export const SERAPHINE_INVITE_MUSIC_DURATION_SEC = 355.68;
export const AURELIA_JOURNEY_FALLBACKS = [
  "/templates/aurelia/journey-01.jpg",
  "/templates/aurelia/journey-02.jpg",
  "/templates/aurelia/journey-03.jpg",
  "/templates/aurelia/journey-04.jpg",
] as const;

export const AURELIA_TRADITIONAL_ISO = "2026-10-22T11:00:00+00:00";
export const AURELIA_WHITE_ISO = "2026-10-24T13:00:00+00:00";
export const AURELIA_RSVP_BY_ISO = "2026-09-22T23:59:00+00:00";

export const AURELIA_TRADITIONAL_MAPS =
  "https://maps.app.goo.gl/yMfDDtTU6BgxPrUaA?g_st=iwb";
export const AURELIA_WHITE_MAPS =
  "https://maps.app.goo.gl/F7wWqsUF7aH2efU96?g_st=iwb";

export const AURELIA_WEDDING_DEFAULTS: AureliaWeddingConfig = {
  partnerOneName: "Enock",
  partnerTwoName: "Ruth",
  monogram: "E & R",
  familyIntro: "Together with their families",
  marriedLine: "Are getting married",
  dateDisplay: "October 2026",
  heroTagline: "",
  heroImageUrl: AURELIA_HERO_FALLBACK,
  heroOverlay: 0.26,
  celebrationCta: "Our celebration",
  rsvpCta: "RSVP",
  rsvpByLabel: "",
  rsvpContactsEyebrow: "Call or WhatsApp",
  rsvpContacts: [
    { name: "Ohene", phone: "0246502998" },
    { name: "Prince", phone: "0242547213" },
  ],
  storyEyebrow: "Our Beginning",
  storyTitle: "Our Story",
  storyImageUrl: AURELIA_STORY_FALLBACK,
  storyParagraphs: [
    "Every beautiful love story begins in the most unexpected ways.",
    "Ours began with a dream, a podcast and a simple connection through a colleague. What started as a client and Business Owner relationship soon became something neither of us could have planned.",
    "Somewhere between conversations, creative ideas, shared moments and getting to know each other, we discovered something beautiful: a friendship that felt different, a connection that felt natural, and a love that grew with time.",
    "What began professionally slowly became personal.",
    "What began as a simple introduction became a journey.",
    "And what began with two people working together became two hearts choosing each other.",
    "Through laughter, friendship, faith, countless memories and THE GRACE OF GOD, our story has brought us here.",
    "Today, surrounded by the people who have loved, supported and prayed for us, we celebrate not just where our story began, but where it is going.",
    "From a client and business owner to partners for life.",
    "And now, we begin our greatest chapter yet.",
    "Forever starts here.",
  ],
  storySignature: "Enock & Ruth",
  celebrationsEyebrow: "Two days of joy",
  celebrationsTitle: "Celebrate With Us",
  celebrationsLede:
    "Two ceremonies, two families, one forever. We would be honoured to have you present.",
  venuesEyebrow: "Venues",
  venuesTitle: "Find Your Way",
  venuesLede: "Tap a map link for turn-by-turn directions from wherever you are.",
  privateAddressCopy: "Address shared privately with guests",
  dressEyebrow: "Dress code",
  dressTitle: "Dress to Celebrate",
  dressLede: "Come dressed to be photographed. We would love the day to look as beautiful as it feels.",
  journeyEyebrow: "Moments",
  journeyTitle: "Our Journey",
  journeyLede: "From our earliest memories to the promise of forever. Every chapter led us here.",
  albumEyebrow: "From your lens",
  albumTitle: "The Album",
  albumLede:
    "Share the day as you see it. Scan the QR or open the lens to add photos. Then find them together in the shared album.",
  albumUploadCta: "Open the lens",
  albumViewCta: "View the album",
  rsvpTitle: "Will You Celebrate With Us?",
  giftsEyebrow: "With gratitude",
  giftsTitle: "Your Presence Is Our Greatest Gift",
  giftsLede:
    "Having you celebrate this special moment with us means the world to us. For friends and family who wish to honour us with a gift, details are shared below.",
  giftsDetails: "A contribution toward our first home together would be received with love.",
  faqEyebrow: "Good to know",
  faqTitle: "Questions & Answers",
  finaleScript: "Some people, a brighter forever",
  finaleLine: "Love makes every moment more beautiful",
  countdownTitle: "The Countdown Begins",
  theme: AURELIA_THEME_DEFAULTS,
  ceremonies: [
    {
      id: "traditional",
      kicker: "Ceremony one",
      title: "The Traditional Ceremony",
      weekday: "Thursday",
      dateLabel: "22 October 2026",
      timeLabel: "11:00 AM",
      venueName: "TLPCI, Solution Centre",
      address: "",
      mapsUrl: AURELIA_TRADITIONAL_MAPS,
      startAtIso: AURELIA_TRADITIONAL_ISO,
    },
    {
      id: "white",
      kicker: "Ceremony two",
      title: "The White Wedding",
      weekday: "Saturday",
      dateLabel: "24 October 2026",
      timeLabel: "1:00 PM",
      venueName: "Ultimate Christian Ministry Tse-Addo",
      address: "",
      mapsUrl: AURELIA_WHITE_MAPS,
      startAtIso: AURELIA_WHITE_ISO,
    },
  ],
  venues: [
    {
      id: "traditional",
      eventLabel: "The Traditional Ceremony",
      venueName: "TLPCI, Solution Centre",
      address: "",
      mapsUrl: AURELIA_TRADITIONAL_MAPS,
    },
    {
      id: "white",
      eventLabel: "The White Wedding",
      venueName: "Ultimate Christian Ministry Tse-Addo",
      address: "",
      mapsUrl: AURELIA_WHITE_MAPS,
    },
  ],
  dressCodes: [
    {
      id: "traditional",
      eventLabel: "Traditional Wedding",
      dateLabel: "Thursday, 22 October",
      title: "Traditional Wedding",
      palette: [...AURELIA_TRADITIONAL_PALETTE],
      variant: "light",
    },
    {
      id: "white",
      eventLabel: "White Wedding",
      dateLabel: "Saturday, 24 October",
      title: "White Wedding",
      scriptLine: "Elegant & Formal",
      note: "Formal attire is encouraged. Kindly reserve white and ivory for the couple.",
      palette: [],
      variant: "dark",
    },
  ],
  journey: [],
  sections: {
    journey: { visible: false },
  },
  faqs: [
    {
      id: "arrive",
      question: "What time should I arrive?",
      answer:
        "Please arrive at least 30 minutes before the stated start time so you can be seated comfortably before the ceremony begins.",
    },
    {
      id: "guest",
      question: "Can I bring a guest?",
      answer: "Your invitation states the number of seats reserved in your name. Kindly RSVP so we can plan for you.",
    },
    {
      id: "dress",
      question: "Is there a dress code?",
      answer: "Yes. Please see Dress to Celebrate for each ceremony, including palette guidance.",
    },
    {
      id: "park",
      question: "Where can I park?",
      answer: "On-site parking is available at both venues. Attendants will guide you on arrival.",
    },
    {
      id: "album",
      question: "How do I share photos from the day?",
      answer:
        "Find the Album on this invitation. Scan the QR or open the lens to upload photos. Everyone can enjoy them together in the shared album.",
    },
    {
      id: "contact",
      question: "Who can I contact for assistance?",
      answer: "Call or WhatsApp Ohene or Prince.",
    },
  ],
};

export const SERAPHINE_HERO_FALLBACK = "/templates/seraphine/hero.jpg";
/** Kojo & Fafa framed lookbook — studio and pool portraits only. */
export const SERAPHINE_LOOKBOOK_GALLERY = [
  "/templates/seraphine/couple/11-studio-black.jpg",
  "/templates/seraphine/couple/12-ivory-embrace.jpg",
  "/templates/seraphine/couple/13-poolside-black.jpg",
  "/templates/seraphine/couple/14-ivory-spin.jpg",
  "/templates/seraphine/couple/15-pool-laugh.jpg",
  "/templates/seraphine/couple/16-ivory-steps.jpg",
] as const;
/** Lookbook portraits plus Our Journey stills for catalogue identity. */
export const SERAPHINE_COUPLE_GALLERY = [
  ...SERAPHINE_LOOKBOOK_GALLERY,
  "/templates/seraphine/couple/01-chambers.jpg",
  "/templates/seraphine/couple/02-beach.jpg",
  "/templates/seraphine/couple/03-dinner.jpg",
  "/templates/seraphine/couple/04-boat.jpg",
  "/templates/seraphine/couple/05-lounge.jpg",
] as const;
export const SERAPHINE_MONOGRAM = "/templates/seraphine/monogram-lockup.jpg";
export const SERAPHINE_MONOGRAM_PNG = "/templates/seraphine/monogram-qr.png";
export const SERAPHINE_MONOGRAM_CREST = "/templates/seraphine/monogram-crest.png";
export const SERAPHINE_GUEST_OUTFITS = "/templates/seraphine/guest-outfits-board.jpg";
export const SERAPHINE_GUEST_OUTFITS_PAIRS = "/templates/seraphine/guest-outfits-pairs.jpg";
export const SERAPHINE_GUEST_OUTFITS_GENTLEMEN = "/templates/seraphine/guest-outfits-gentlemen.jpg";
export const SERAPHINE_GUEST_OUTFIT_SLIDES = [
  {
    id: "ladies",
    label: "Ladies",
    imageUrl: SERAPHINE_GUEST_OUTFITS,
    alt: "Lookbook of bright guest gowns in garden soirée colours",
  },
  {
    id: "gentlemen",
    label: "Gentlemen",
    imageUrl: SERAPHINE_GUEST_OUTFITS_GENTLEMEN,
    alt: "Lookbook of tailored guest suits for the garden soirée",
  },
] as const;
export const SERAPHINE_TRADITIONAL_ISO = "2026-11-13T10:00:00+00:00";
export const SERAPHINE_WHITE_ISO = "2026-11-14T00:00:00+00:00";
/** Verified pin: Westville on Onyasia Street, West Legon (MQ3R+86). */
export const SERAPHINE_TRADITIONAL_PIN = {
  label: "Westville Homes, 20 Onyasia Street, West Legon, Accra, Ghana",
  lat: 5.653355,
  lng: -0.209499,
} as const;
/** Verified pin: Forest Grove Events, adjacent to 335 Place, North Dzorwulu. */
export const SERAPHINE_WHITE_PIN = {
  label: "The Forest Grove Event, Adjacent to 335 Place, Dzorwulu, Accra, Ghana",
  lat: 5.621568,
  lng: -0.18492,
} as const;
export const SERAPHINE_TRADITIONAL_MAPS = googleMapsPlaceHref(SERAPHINE_TRADITIONAL_PIN);
export const SERAPHINE_TRADITIONAL_MAP_IMAGE = "/templates/seraphine/westville-homes-map.jpg";
export const SERAPHINE_WHITE_MAPS = googleMapsPlaceHref(SERAPHINE_WHITE_PIN);
export const SERAPHINE_WHITE_MAP_IMAGE = "/templates/seraphine/forest-grove-map.jpg";

/** Traditional ceremony colour mood — tropical celebration, not Aurelia brown. */
export const SERAPHINE_TROPICAL_PALETTE = [
  { name: "Deep Leafy Green", hex: "#1F4D32" },
  { name: "Berry Wine", hex: "#8B1E4A" },
  { name: "Vibrant Pink", hex: "#E23E7A" },
  { name: "Vivid Orange", hex: "#F05A14" },
  { name: "Soft Peach", hex: "#F4C4A0" },
] as const;

/** White wedding colour direction — Sage and White mood board. */
export const SERAPHINE_SAGE_PALETTE = [
  { name: "Sage", hex: "#8BA888" },
  { name: "Muted Sage", hex: "#A8C0A0" },
  { name: "Soft White", hex: "#FAFAF5" },
  { name: "Warm Cream", hex: "#F5F0E4" },
  { name: "Pale Moss", hex: "#C0C8A8" },
] as const;

/**
 * Invitation chrome for Seraphine. Board swatches stay for dress chips;
 * espresso/text are deepened so every phrase reads on cream and sage.
 */
export const SERAPHINE_THEME_DEFAULTS: AureliaThemeTokens = {
  ivory: "#FAFAF5",
  cream: "#F5F0E4",
  champagne: "#C0C8A8",
  terracotta: "#5F7A58",
  blush: "#A8C0A0",
  espresso: "#2C3A2E",
  brown: "#3F5344",
  gold: "#C5B48A",
  text: "#2F3D32",
};

/** Independent defaults for Seraphine — customising this never rewrites Aurelia. */
export const SERAPHINE_WEDDING_DEFAULTS: AureliaWeddingConfig = {
  ...AURELIA_WEDDING_DEFAULTS,
  partnerOneName: "Kojo",
  partnerTwoName: "Fafa",
  monogram: "K & F",
  monogramImageUrl: SERAPHINE_MONOGRAM,
  familyIntro: "Together with their families",
  marriedLine: "Are getting married",
  dateDisplay: "13 | 14 November 2026",
  heroTagline: "",
  heroImageUrl: SERAPHINE_HERO_FALLBACK,
  heroOverlay: 0.16,
  rsvpCta: "RSVP",
  rsvpByLabel: "",
  rsvpContactsEyebrow: "Call or WhatsApp",
  rsvpContacts: [{ name: "Esther", phone: "0549436196" }],
  rsvpShowPhone: false,
  storyEyebrow: "Moments",
  storyTitle: "Our Journey",
  storyImageUrl: "",
  storyParagraphs: [
    "We met at a friend’s wedding, paired together as groomsman and bridesmaid. What started with a simple “Give me your number” became the beginning of something beautiful.",
    "Since then, our story has been filled with laughter, friendship, faith, countless memories, and plenty of love. Through every season, the Good Lord has been good to us, guiding our steps and bringing us to this special moment.",
    "And now, here we are—ready to say “I do.” We would love for you to be there as we begin this new chapter together.",
  ],
  storySignature: "Kojo & Fafa",
  celebrationsEyebrow: "Two days of joy",
  celebrationsTitle: "Celebrate With Us",
  celebrationsLede:
    "We would be honoured to have you present as we begin this new chapter together.",
  venuesEyebrow: "Venues",
  venuesTitle: "Find Your Way",
  venuesLede: "",
  dressEyebrow: "Attire",
  dressTitle: "Dress to Celebrate",
  dressLede:
    "Tropical elegance for the traditional ceremony, and bright, airy romance for the wedding day.",
  rsvpTitle: "RSVP",
  giftsEyebrow: "With love",
  giftsTitle: "Gift the Couple",
  giftsLede:
    "Your presence is the greatest gift. If you wish to send a cash gift, you may do so securely and privately here.",
  giftsDetails: "",
  faqEyebrow: "Good to know",
  faqTitle: "Questions & Answers",
  finaleScript: "Ready to say I do",
  finaleLine: "Kojo & Fafa",
  countdownTitle: "Until We Say I Do",
  theme: SERAPHINE_THEME_DEFAULTS,
  ceremonies: [
    {
      id: "traditional",
      kicker: "Ceremony one",
      title: "Traditional Ceremony",
      weekday: "Friday",
      dateLabel: "13 November 2026",
      timeLabel: "10:00 AM",
      venueName: "Westville Homes",
      address: "20 Onyasia Street, West Legon",
      mapsUrl: SERAPHINE_TRADITIONAL_MAPS,
      startAtIso: SERAPHINE_TRADITIONAL_ISO,
    },
    {
      id: "white",
      kicker: "Ceremony two",
      title: "Wedding Ceremony",
      weekday: "Saturday",
      dateLabel: "14 November 2026",
      timeLabel: "Details to be announced",
      venueName: "The Forest Grove Event",
      address: "Adjacent to 335 Place, Dzorwulu",
      mapsUrl: SERAPHINE_WHITE_MAPS,
      startAtIso: SERAPHINE_WHITE_ISO,
    },
  ],
  venues: [
    {
      id: "traditional",
      eventLabel: "Traditional Ceremony",
      venueName: "Westville Homes",
      address: "20 Onyasia Street, West Legon",
      mapsUrl: SERAPHINE_TRADITIONAL_MAPS,
    },
  ],
  dressCodes: [
    {
      id: "traditional",
      eventLabel: "Traditional Ceremony",
      dateLabel: "Friday, 13 November",
      title: "Traditional Dress Code",
      scriptLine: "Tropical Theme",
      note: "Tropical elegance in vibrant celebration colours. Guests are kindly encouraged to wear Kente, or white with a touch of green.",
      palette: [],
      variant: "light",
    },
    {
      id: "outfits",
      eventLabel: "Wedding Ceremony",
      dateLabel: "Saturday, 14 November",
      title: "Wedding Guest Outfits",
      scriptLine: "Dress Code: Garden Soirée",
      note:
        "Ladies — Florals & Fascinators\nElegant floral dresses paired with a beautiful fascinator or hat. Think romantic, graceful and garden-chic.\n\nGentlemen — Suited & Sophisticated\nA well-tailored suit, crisp shirt and polished shoes. Ties, bow ties and pocket squares are welcome for that extra touch of elegance.\n\nA little note from us:\nDress beautifully, celebrate colour and bring your own touch of elegance. We can’t wait to see our garden filled with florals, fascinators and dapper suits.",
      imageUrl: SERAPHINE_GUEST_OUTFITS,
      gentlemenImageUrl: SERAPHINE_GUEST_OUTFITS_GENTLEMEN,
      palette: [],
      variant: "light",
    },
  ],
  journey: [],
  faqs: [
    {
      id: "dress",
      question: "Is there a dress code?",
      answer:
        "Yes. Please see Traditional Dress Code and Wedding Guest Outfits for each celebration.",
    },
    {
      id: "contact",
      question: "Who can I contact for assistance?",
      answer: "Call or WhatsApp Esther.",
    },
    {
      id: "album",
      question: "How do I share photos from the day?",
      answer:
        "Find the Album on this invitation. Scan the QR or open the lens to upload photos. Everyone can enjoy them together in the shared album.",
    },
  ],
  sections: {
    journey: { visible: false },
  },
};
