import { getDefaultDesignConfig, getTemplatePreset } from "@/lib/invitation-templates";
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { resolveDefaultMusicForLayout, catalogMusicUrl } from "@/lib/music/audio-experience-catalog";
import { getDemoGalleryUrls, getDemoHeroUrl, getDemoBackgroundUrl, resolveEventTheme } from "@/lib/invitation/demo-gallery-assets";
import { syncDesignPageBackground } from "@/lib/invitation/studio-media-utils";
import { getLayoutVisualProfile } from "@/lib/experience/layout-visual-profiles";
import { getLayoutEnabledTabs } from "@/lib/invitation/layout-template-signatures";
import type { MusicSelection } from "@/lib/music/music-types";
import type { InvitationDesignConfig, InvitationEventData } from "@/types/invitation-design";

const FUTURE_DATE = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

function formatDemoDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type DemoContent = {
  title: string;
  hostName: string;
  message: string;
  invitationName: string;
  venueName: string;
  landmark: string;
  dressCode?: string;
};

const CATEGORY_DEMOS: Record<string, DemoContent> = {
  Wedding: {
    title: "The Wedding of Amara & Kwame",
    hostName: "Amara Mensah & Kwame Osei",
    message: "We joyfully invite you to witness and celebrate our union.",
    invitationName: "Amara & Kwame Wedding",
    venueName: "Royal Palm Events Centre",
    landmark: "East Legon, Accra",
    dressCode: "Formal · Earth tones welcome",
  },
  Engagement: {
    title: "Engagement Celebration — Zara & Michael",
    hostName: "Zara Ibrahim & Michael Chen",
    message: "Join us as we celebrate our engagement and the journey ahead.",
    invitationName: "Zara & Michael Engagement",
    venueName: "The Garden Terrace",
    landmark: "Airport City, Accra",
    dressCode: "Smart casual",
  },
  Birthday: {
    title: "Nia's 30th Birthday Celebration",
    hostName: "Nia Adom",
    message: "You're invited to a night of music, laughter, and celebration.",
    invitationName: "Nia's Birthday",
    venueName: "Skyline Rooftop Lounge",
    landmark: "Osu, Accra",
    dressCode: "Festive · All white optional",
  },
  Funeral: {
    title: "In Loving Memory of Emmanuel K. Boateng",
    hostName: "The Boateng Family",
    message: "Celebrating a life well lived. All are welcome to pay respects.",
    invitationName: "Memorial Service",
    venueName: "Trinity Presbyterian Church",
    landmark: "Osu, Accra",
  },
  Church: {
    title: "Annual Thanksgiving Service",
    hostName: "Grace Community Church",
    message: "Join us for worship, fellowship, and thanksgiving.",
    invitationName: "Church Programme",
    venueName: "Grace Community Cathedral",
    landmark: "Tema, Ghana",
  },
  Corporate: {
    title: "Celeventic Product Launch 2026",
    hostName: "Celeventic Events Ltd",
    message: "You're invited to an exclusive product unveiling and networking reception.",
    invitationName: "Corporate Launch",
    venueName: "Mövenpick Ambassador Hotel",
    landmark: "Accra",
    dressCode: "Business formal",
  },
  Conference: {
    title: "West Africa Innovation Summit",
    hostName: "Summit Organizers",
    message: "Three days of keynotes, workshops, and networking.",
    invitationName: "Innovation Summit",
    venueName: "Accra International Conference Centre",
    landmark: "Accra",
  },
  Concert: {
    title: "Live in Accra — Aurora Night",
    hostName: "Pulse Live Events",
    message: "An unforgettable evening of live music under the stars.",
    invitationName: "Aurora Night Concert",
    venueName: "Black Star Square",
    landmark: "Accra",
  },
  "Private Event": {
    title: "Private Celebration Dinner",
    hostName: "The Adom Family",
    message: "An intimate evening with family and close friends.",
    invitationName: "Private Dinner",
    venueName: "The Residence",
    landmark: "Cantonments, Accra",
  },
};

const DEFAULT_DEMO = CATEGORY_DEMOS.Wedding;

/** Per-layout demo copy so catalogue previews feel distinct */
const LAYOUT_DEMO_OVERRIDES: Partial<Record<string, Partial<DemoContent>>> = {
  "classic-gold": {
    title: "The Union of Adwoa & Kofi",
    hostName: "Adwoa Serwaa & Kofi Mensah",
    message: "With golden hearts we invite you to our ivory-and-gold ceremony.",
    venueName: "Labadi Beach Hotel Ballroom",
  },
  "luxury-rings": {
    title: "Onyx Night — Diana & Samuel",
    hostName: "Diana Ofori & Samuel Asante",
    message: "A black-tie evening where two rings become one story.",
    venueName: "The Octagon, Cantonments",
    dressCode: "Black tie · Gold accents welcome",
  },
  "arch-green": {
    title: "Beneath the Vine Arch — Efua & Yaw",
    hostName: "Efua Agyeman & Yaw Boateng",
    message: "Walk with us through the forest arch into forever.",
    venueName: "Aburi Botanical Gardens",
  },
  "rustic-lace": {
    title: "Timber & Lace — Abena & Malik",
    hostName: "Abena Owusu & Malik Ibrahim",
    message: "Lace, timber, and laughter under open skies.",
    venueName: "Lake Bosomtwe Retreat",
  },
  "boho-hexagon": {
    title: "Hexagon Reverie — Lena & Jordan",
    hostName: "Lena Park & Jordan Blake",
    message: "Soft florals, golden geometry, and barefoot joy.",
    venueName: "The Wildflower Barn",
  },
  "floral-garden": {
    title: "Secret Garden Vows — Priya & Thomas",
    hostName: "Priya Sharma & Thomas Reid",
    message: "Petals fall as we say yes in the hidden garden.",
    venueName: "Rosewood Conservatory",
  },
  "passport-luxe": {
    title: "Stamped Romance — Ama & Luca",
    hostName: "Ama Darko & Luca Romano",
    message: "Your passport to our destination celebration.",
    venueName: "Santorini Cliff Terrace",
  },
  "glass-acrylic": {
    title: "Frostlight Dreamscape — Noelle & Andre",
    hostName: "Noelle Chen & Andre Silva",
    message: "Step through frosted glass into a luminous evening.",
    venueName: "Skyglass Pavilion",
  },
  "royal-emerald-wedding": {
    title: "Palace Emerald Reign — Queenie & Edmund",
    hostName: "Queenie Ampofo & Edmund Hastings",
    message: "Palace gates open for an emerald-and-gold coronation of love.",
    venueName: "Royal Palm Grand Hall",
  },
  "midnight-velvet-reception": {
    title: "Velvet Midnight Soirée — Isabel & Marcus",
    hostName: "Isabel Laurent & Marcus Webb",
    message: "Curtain rises on navy velvet and silver champagne.",
    venueName: "The Velvet Room, Labone",
    dressCode: "Cocktail · Midnight palette",
  },
  "kente-heritage-union": {
    title: "Kente Covenant — Akosua & Kwabena",
    hostName: "Akosua Frimpong & Kwabena Anane",
    message: "Cloth unfolds, drums pulse — witness our heritage union.",
    venueName: "Manhyia Palace Gardens",
  },
  "floral-garden-romance": {
    title: "Petal Promise — Hannah & David",
    hostName: "Hannah Cole & David Mensah",
    message: "Engagement blooms in a cinematic garden of roses.",
    venueName: "Petal Grove Estate",
  },
  "passport-destination-wedding": {
    title: "Horizon Boarding Pass — Zuri & Ethan",
    hostName: "Zuri Adeyemi & Ethan Moore",
    message: "Boarding now — destination wedding at golden hour.",
    venueName: "Zanzibar Sunset Deck",
  },
  "crystal-acrylic-luxury": {
    title: "Champagne Crystal — Vivian & Oliver",
    hostName: "Vivian Steele & Oliver Grant",
    message: "Glass shimmer, champagne gold, and crystal vows.",
    venueName: "The Prism Gallery",
  },
  "golden-islamic-nikkah": {
    title: "Nikkah Gold Geometry — Fatima & Hassan",
    hostName: "Fatima Al-Rashid & Hassan Mensah",
    message: "With blessings we invite you to our ornamental nikkah.",
    venueName: "Accra Central Mosque Hall",
  },
  "memorial-candle-tribute": {
    title: "Candlelight Elegy — Rev. Joseph Mensah",
    hostName: "The Mensah Family",
    message: "Gather with us in candlelight to honour a faithful life.",
    venueName: "Holy Trinity Cathedral",
  },
  "neon-celebration-party": {
    title: "Electric Pulse — DJ Nia Live",
    hostName: "Nia 'Voltage' Adom",
    message: "Neon lights, bass drops, and birthday energy all night.",
    venueName: "Pulse Nightclub",
    dressCode: "Neon · Street luxe",
  },
  "corporate-prestige-summit": {
    title: "Platinum Summit 2026",
    hostName: "West Africa Business Council",
    message: "Executive briefing, keynote, and platinum networking.",
    venueName: "Kempinski Gold Coast City",
    dressCode: "Business formal",
  },
  "custom-media": {
    title: "Your Canvas — Private Premiere",
    hostName: "The Owusu Family",
    message: "Your artwork, your video, our cinematic frame.",
    venueName: "Private Residence",
  },
};

/** Bundled local clips for catalogue previews. */
const CATEGORY_DEMO_MUSIC: Record<string, { url: string; title: string }> = {
  Wedding: { url: catalogMusicUrl("wedding-romantic", "wedding"), title: "Romantic ambience" },
  Engagement: { url: catalogMusicUrl("luxury-piano-romance", "wedding"), title: "Celebration melody" },
  Funeral: { url: catalogMusicUrl("memorial-piano", "funeral"), title: "Peaceful reflection" },
  Concert: { url: catalogMusicUrl("party-edm-energy", "celebration"), title: "Live energy" },
  Birthday: { url: catalogMusicUrl("happy-celebration", "celebration"), title: "Party vibes" },
  Corporate: { url: catalogMusicUrl("corporate-summit", "corporate"), title: "Summit presentation" },
  Conference: { url: catalogMusicUrl("corporate-summit", "corporate"), title: "Conference ambience" },
  Church: { url: catalogMusicUrl("piano-elegance", "piano"), title: "Worship instrumental" },
  "Private Event": { url: catalogMusicUrl("piano-garden", "piano"), title: "Elegant evening" },
};

const DEFAULT_DEMO_MUSIC = {
  url: catalogMusicUrl("piano-elegance", "piano"),
  title: "Event soundtrack",
};

export function templateSupportsMusicPreview(features?: string[], musicEnabled?: boolean): boolean {
  if (musicEnabled === false) return false;
  if (musicEnabled) return true;
  if (features?.some((f) => f.toLowerCase() === "music")) return true;
  /** Template previews always include default DNA music unless explicitly disabled */
  return true;
}

export function buildDemoMusicSelection(category?: string): MusicSelection {
  const track = (category && CATEGORY_DEMO_MUSIC[category]) || DEFAULT_DEMO_MUSIC;
  const isFuneral = category === "Funeral";
  const isCelebration = category === "Birthday" || category === "Concert";
  return {
    source: "library",
    url: track.url,
    title: track.title,
    startSec: 0,
    endSec: 60,
    originalDurationSec: 60,
    autoPlay: true,
    loop: true,
    volume: isFuneral ? 0.3 : isCelebration ? 0.5 : 0.45,
    fadeInSec: isFuneral ? 2 : 1,
    fadeOutSec: 1,
  };
}

export function getDemoContentForCategory(category?: string, layoutSlug?: string): DemoContent {
  const base = !category ? DEFAULT_DEMO : CATEGORY_DEMOS[category] ?? DEFAULT_DEMO;
  const override = layoutSlug ? LAYOUT_DEMO_OVERRIDES[layoutSlug] : undefined;
  return override ? { ...base, ...override } : base;
}

export function buildLivePreviewProps(
  layoutSlug: string,
  category?: string,
  options?: {
    features?: string[];
    musicEnabled?: boolean;
    musicAutoplay?: boolean;
    skipIntro?: boolean;
    skipTapGate?: boolean;
  }
) {
  const theme = resolveEventTheme(layoutSlug, category);
  const preset = getTemplatePreset(layoutSlug);
  const baseDesign: InvitationDesignConfig = preset?.config ?? getDefaultDesignConfig(layoutSlug);
  const demo = getDemoContentForCategory(theme, layoutSlug);
  const enriched = enrichDesignWithExperienceDNA(baseDesign);
  const visual = getLayoutVisualProfile(layoutSlug);
  const layoutTabs = getLayoutEnabledTabs(layoutSlug);

  const design: InvitationDesignConfig = {
    ...enriched,
    experience: {
      ...enriched.experience,
      introEnabled: options?.skipIntro ? false : enriched.experience?.introEnabled ?? true,
      hubMode: enriched.experience?.hubMode ?? "scroll",
      enabledTabs: layoutTabs ?? enriched.experience?.enabledTabs ?? DEFAULT_HUB_TABS,
      ...(theme === "Funeral"
        ? { environment: "none" as const, environmentIntensity: "none" as const }
        : {
            environment: enriched.experience?.environment ?? visual.environment,
            environmentIntensity:
              visual.environment === "none"
                ? ("none" as const)
                : (enriched.experience?.environmentIntensity ?? "medium"),
          }),
    },
    studio: {
      ...enriched.studio,
      fullScreen: enriched.studio?.fullScreen ?? true,
    },
  };

  const event: InvitationEventData = {
    title: demo.title,
    hostName: demo.hostName,
    description: demo.message,
    startDate: formatDemoDate(FUTURE_DATE),
    startDateRaw: FUTURE_DATE.toISOString(),
    venueName: demo.venueName,
    landmark: demo.landmark,
    mapsLink: "https://maps.google.com",
    contactPhone: "+233 25 766 0734",
    dressCode: demo.dressCode ?? null,
    coverImageUrl: getDemoHeroUrl(layoutSlug, theme),
  };

  const demoGallery = getDemoGalleryUrls(layoutSlug, theme, 6);
  const themeBg = getDemoBackgroundUrl(layoutSlug, theme);

  const designWithMedia = syncDesignPageBackground(design, themeBg, "image");

  const withMusic = templateSupportsMusicPreview(options?.features, options?.musicEnabled);
  const dnaMusic = resolveDefaultMusicForLayout(
    layoutSlug,
    design.experience?.defaultAudioTrackId,
    design.experience?.defaultAudioCategory
  );

  let resolvedMusic = withMusic ? (dnaMusic ?? buildDemoMusicSelection(theme)) : null;
  if (resolvedMusic && theme === "Funeral") {
    resolvedMusic = {
      ...resolvedMusic,
      volume: 0.3,
      fadeInSec: 2,
    };
  }
  if (resolvedMusic && options?.musicAutoplay === false) {
    resolvedMusic = { ...resolvedMusic, autoPlay: false };
  }

  return {
    design: designWithMedia,
    event,
    message: demo.message,
    invitationName: demo.invitationName,
    guestName: "Alex Mensah",
    musicSelection: resolvedMusic,
    galleryUrls: demoGallery,
    skipTapGate: options?.skipTapGate ?? false,
    skipIntro: options?.skipIntro ?? false,
  };
}
