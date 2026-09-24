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
export const AURELIA_INVITE_MUSIC = "/templates/aurelia/ordinary.mp3";
export const AURELIA_INVITE_MUSIC_TITLE = "Ordinary";
export const AURELIA_INVITE_MUSIC_DURATION_SEC = 188.21;
export const AURELIA_JOURNEY_FALLBACKS = [
  "/templates/aurelia/journey-01.jpg",
  "/templates/aurelia/journey-02.jpg",
  "/templates/aurelia/journey-03.jpg",
  "/templates/aurelia/journey-04.jpg",
] as const;

export const AURELIA_TRADITIONAL_ISO = "2027-04-09T10:00:00+00:00";
export const AURELIA_WHITE_ISO = "2027-04-10T14:00:00+00:00";
export const AURELIA_RSVP_BY_ISO = "2027-03-10T23:59:00+00:00";

export const AURELIA_TRADITIONAL_MAPS =
  "https://maps.app.goo.gl/yMfDDtTU6BgxPrUaA?g_st=iwb";
export const AURELIA_WHITE_MAPS =
  "https://maps.app.goo.gl/F7wWqsUF7aH2efU96?g_st=iwb";

export const AURELIA_WEDDING_DEFAULTS: AureliaWeddingConfig = {
  partnerOneName: "Elorm",
  partnerTwoName: "Dansowaa",
  monogram: "E & D",
  familyIntro: "Together with their families",
  marriedLine: "Are getting married",
  dateDisplay: "April 2027",
  heroTagline: "The Covenant",
  heroImageUrl: AURELIA_HERO_FALLBACK,
  heroOverlay: 0.26,
  celebrationCta: "Our celebration",
  rsvpCta: "RSVP",
  rsvpByLabel: "Kindly respond by 10 March 2027",
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
  storySignature: "Elorm & Dansowaa",
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
  dressLede: "Come dressed to be photographed — we would love the day to look as beautiful as it feels.",
  journeyEyebrow: "Moments",
  journeyTitle: "Our Journey",
  journeyLede: "From our earliest memories to the promise of forever — every chapter led us here.",
  albumEyebrow: "From your lens",
  albumTitle: "The Album",
  albumLede:
    "Share the day as you see it. Scan the QR or open the lens to add photos and video — then find them together in the shared album.",
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
      weekday: "Friday",
      dateLabel: "9 April 2027",
      timeLabel: "10:00 AM",
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
      dateLabel: "10 April 2027",
      timeLabel: "2:00 PM",
      venueName: "Ultimate Christian Ministry",
      address: "Tse Addo",
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
      venueName: "Ultimate Christian Ministry",
      address: "Tse Addo",
      mapsUrl: AURELIA_WHITE_MAPS,
    },
  ],
  dressCodes: [
    {
      id: "traditional",
      eventLabel: "Traditional Wedding",
      dateLabel: "Friday, 9 April",
      title: "Traditional Wedding",
      palette: [...AURELIA_TRADITIONAL_PALETTE],
      variant: "light",
    },
    {
      id: "white",
      eventLabel: "White Wedding",
      dateLabel: "Saturday, 10 April",
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
      answer: "Yes — please see Dress to Celebrate for each ceremony, including palette guidance.",
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
        "Find the Album on this invitation. Scan the QR or open the lens to upload photos and video — everyone can enjoy them together in the shared album.",
    },
    {
      id: "contact",
      question: "Who can I contact for assistance?",
      answer: "Reach the couple through the contact details on your invitation if anything is unclear.",
    },
  ],
};

/** Independent defaults for Seraphine — customising this never rewrites Aurelia. */
export const SERAPHINE_WEDDING_DEFAULTS: AureliaWeddingConfig = {
  ...AURELIA_WEDDING_DEFAULTS,
  partnerOneName: "Efua",
  partnerTwoName: "Yaw",
  monogram: "E & Y",
  familyIntro: "Together with their families",
  marriedLine: "Are getting married",
  heroTagline: "The Promise",
  storyEyebrow: "Our Chapter",
  storySignature: "Efua & Yaw",
  countdownTitle: "Until We Say I Do",
};
