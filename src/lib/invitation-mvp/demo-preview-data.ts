import { getDefaultDesignConfig, getTemplatePreset } from "@/lib/invitation-templates";
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { resolveDefaultMusicForLayout } from "@/lib/music/audio-experience-catalog";
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

/** Short royalty-free clips for template previews (Mixkit preview URLs). */
const CATEGORY_DEMO_MUSIC: Record<string, { url: string; title: string }> = {
  Wedding: {
    url: "https://assets.mixkit.co/music/preview/mixkit-romantic-whispers-34.mp3",
    title: "Romantic ambience",
  },
  Engagement: {
    url: "https://assets.mixkit.co/music/preview/mixkit-romantic-whispers-34.mp3",
    title: "Celebration melody",
  },
  Funeral: {
    url: "https://assets.mixkit.co/music/preview/mixkit-silent-descent-ambient-442.mp3",
    title: "Peaceful reflection",
  },
  Concert: {
    url: "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3",
    title: "Live energy",
  },
  Birthday: {
    url: "https://assets.mixkit.co/music/preview/mixkit-happy-celebration-438.mp3",
    title: "Party vibes",
  },
};

const DEFAULT_DEMO_MUSIC = {
  url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3",
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
  return {
    source: "library",
    url: track.url,
    title: track.title,
    startSec: 0,
    endSec: 60,
    originalDurationSec: 60,
    autoPlay: true,
    loop: true,
    volume: 0.45,
    fadeInSec: 1,
    fadeOutSec: 1,
  };
}

export function getDemoContentForCategory(category?: string): DemoContent {
  if (!category) return DEFAULT_DEMO;
  return CATEGORY_DEMOS[category] ?? DEFAULT_DEMO;
}

export function buildLivePreviewProps(
  layoutSlug: string,
  category?: string,
  options?: {
    features?: string[];
    musicEnabled?: boolean;
    skipIntro?: boolean;
    skipTapGate?: boolean;
  }
) {
  const preset = getTemplatePreset(layoutSlug);
  const baseDesign: InvitationDesignConfig = preset?.config ?? getDefaultDesignConfig(layoutSlug);
  const demo = getDemoContentForCategory(category);
  const enriched = enrichDesignWithExperienceDNA(baseDesign);

  const design: InvitationDesignConfig = {
    ...enriched,
    experience: {
      ...enriched.experience,
      introEnabled: options?.skipIntro ? false : enriched.experience?.introEnabled ?? true,
      hubMode: enriched.experience?.hubMode ?? "scroll",
      enabledTabs: enriched.experience?.enabledTabs ?? DEFAULT_HUB_TABS,
    },
    studio: {
      ...enriched.studio,
      fullScreen: false,
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
    coverImageUrl: null,
  };

  const withMusic = templateSupportsMusicPreview(options?.features, options?.musicEnabled);
  const dnaMusic = resolveDefaultMusicForLayout(
    layoutSlug,
    design.experience?.defaultAudioTrackId,
    design.experience?.defaultAudioCategory
  );

  return {
    design,
    event,
    message: demo.message,
    invitationName: demo.invitationName,
    guestName: "Alex Mensah",
    musicSelection: withMusic ? (dnaMusic ?? buildDemoMusicSelection(category)) : null,
    skipTapGate: options?.skipTapGate ?? false,
  };
}
