import { getDefaultDesignConfig, getTemplatePreset } from "@/lib/invitation-templates";
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { catalogMusicUrl } from "@/lib/music/audio-experience-catalog";
import { resolveInvitationMusic } from "@/lib/music/resolve-invitation-music";
import { getDemoGalleryUrls, getDemoHeroUrl, getDemoBackgroundUrl, resolveEventTheme } from "@/lib/invitation/demo-gallery-assets";
import { syncDesignPageBackground } from "@/lib/invitation/studio-media-utils";
import { getLayoutVisualProfile } from "@/lib/experience/layout-visual-profiles";
import { getLayoutEnabledTabs } from "@/lib/invitation/layout-template-signatures";
import { EVENT_TIME_ZONE } from "@/lib/constants";
import {
  buildCatalogDemoMemorialVisionBoard,
  buildCatalogDemoVisionBoard,
  buildCatalogDemoWeddingBoard,
} from "@/lib/invitation-mvp/catalog-demo-boards";
import {
  CATALOG_DEMO_IDENTITIES,
  withoutCatalogDashes,
} from "@/lib/invitation-mvp/catalog-public-copy";
import type { MusicSelection } from "@/lib/music/music-types";
import type { InvitationDesignConfig, InvitationEventData } from "@/types/invitation-design";
import type { WeddingBoardContent } from "@/lib/invitation/wedding-board";
import type { VisionBoardContent } from "@/lib/invitation/vision-board";

/**
 * Demo previews render on the server and hydrate on the client, so this date has to
 * resolve to the same instant in both runtimes. A clock offset (`Date.now() + 90d`) is
 * evaluated once per runtime — at build/boot on the server, at bundle load in the
 * browser — so the two drift apart and the rendered time fails hydration. Anchoring to
 * a fixed UTC slot in the following calendar year keeps the date plausibly upcoming
 * while only ever changing on a year boundary.
 */
const FUTURE_DATE = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 5, 14, 16, 0, 0));

function formatDemoDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    timeZone: EVENT_TIME_ZONE,
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
  sealInitials?: string;
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
    title: "Engagement Celebration of Zara & Michael",
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
    title: "Live in Accra: Aurora Night",
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

export function getDemoContentForCategory(category?: string, layoutOrCatalogSlug?: string): DemoContent {
  const base = !category ? DEFAULT_DEMO : CATEGORY_DEMOS[category] ?? DEFAULT_DEMO;
  const override = layoutOrCatalogSlug
    ? CATALOG_DEMO_IDENTITIES[layoutOrCatalogSlug]
    : undefined;
  const merged = override ? { ...base, ...override } : base;
  return {
    ...merged,
    title: withoutCatalogDashes(merged.title),
    hostName: withoutCatalogDashes(merged.hostName),
    message: withoutCatalogDashes(merged.message),
    invitationName: withoutCatalogDashes(merged.invitationName),
    venueName: withoutCatalogDashes(merged.venueName),
    landmark: withoutCatalogDashes(merged.landmark),
    dressCode: merged.dressCode ? withoutCatalogDashes(merged.dressCode) : undefined,
    sealInitials: merged.sealInitials
      ? withoutCatalogDashes(merged.sealInitials)
      : undefined,
  };
}

/** Sample guest shown only in catalog / studio live previews — never used on `/invite/{link}`. */
export const DEMO_PREVIEW_GUEST_NAME = "Alex Mensah";

export function buildLivePreviewProps(
  layoutSlug: string,
  category?: string,
  options?: {
    features?: string[];
    musicEnabled?: boolean;
    musicAutoplay?: boolean;
    skipIntro?: boolean;
    skipTapGate?: boolean;
    /** Prefer catalog SKU so Wave-1 shared layouts keep unique DNA */
    catalogSlug?: string | null;
  }
) {
  const theme = resolveEventTheme(layoutSlug, category);
  const preset = getTemplatePreset(layoutSlug);
  const identitySlug = options?.catalogSlug || layoutSlug;
  const baseDesign: InvitationDesignConfig = getDefaultDesignConfig(identitySlug) ?? preset?.config ?? getDefaultDesignConfig(layoutSlug);
  const demo = getDemoContentForCategory(theme, identitySlug);
  const enriched = enrichDesignWithExperienceDNA(baseDesign);
  const visual = getLayoutVisualProfile(layoutSlug);
  const layoutTabs = getLayoutEnabledTabs(layoutSlug);

  const eventInstantIso = FUTURE_DATE.toISOString();
  const contactPhone = "+233 25 766 0734";
  const demoIdentity = {
    title: demo.title,
    hostName: demo.hostName,
    message: demo.message,
    venueName: demo.venueName,
    landmark: demo.landmark,
    dressCode: demo.dressCode,
    contactPhone,
    invitationName: demo.invitationName,
    sealInitials: demo.sealInitials,
  };

  const studioBase = enriched.studio ?? {};
  const existingWeddingBoard = (studioBase as { weddingBoard?: WeddingBoardContent }).weddingBoard;
  const existingVisionBoard = (studioBase as { visionBoard?: VisionBoardContent }).visionBoard;
  const needsWeddingDemo =
    Boolean(existingWeddingBoard) ||
    layoutSlug === "forever-afaris-wedding" ||
    identitySlug === "forever-afaris-wedding";
  const needsVisionDemo =
    Boolean(existingVisionBoard) ||
    layoutSlug === "traditional-marriage-ceremony" ||
    identitySlug === "traditional-marriage-ceremony";
  const needsMemorialDemo = theme === "Funeral";
  // Replace client ceremony identity on browse previews; keep envelope/gate/seal chrome.
  const catalogWeddingBoard = needsWeddingDemo
    ? {
        ...(existingWeddingBoard ?? {}),
        ...buildCatalogDemoWeddingBoard(demoIdentity, eventInstantIso),
      }
    : undefined;
  const catalogVisionBoard = needsMemorialDemo
    ? {
        ...(existingVisionBoard ?? {}),
        ...buildCatalogDemoMemorialVisionBoard(demoIdentity, eventInstantIso, identitySlug),
      }
    : needsVisionDemo
      ? {
          ...(existingVisionBoard ?? {}),
          ...buildCatalogDemoVisionBoard(demoIdentity, eventInstantIso),
        }
      : undefined;

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
      ...studioBase,
      fullScreen: studioBase.fullScreen ?? true,
      ...(catalogWeddingBoard ? { weddingBoard: catalogWeddingBoard } : {}),
      ...(catalogVisionBoard ? { visionBoard: catalogVisionBoard } : {}),
    },
  };

  const event: InvitationEventData = {
    title: demo.title,
    hostName: demo.hostName,
    description: demo.message,
    startDate: formatDemoDate(FUTURE_DATE),
    startDateRaw: eventInstantIso,
    venueName: demo.venueName,
    landmark: demo.landmark,
    mapsLink: "https://maps.google.com",
    contactPhone,
    dressCode: demo.dressCode ?? null,
    coverImageUrl: getDemoHeroUrl(layoutSlug, theme, identitySlug),
  };

  const demoGallery = getDemoGalleryUrls(layoutSlug, theme, 6, identitySlug);
  const themeBg = getDemoBackgroundUrl(layoutSlug, theme, identitySlug);

  const designWithMedia = syncDesignPageBackground(design, themeBg, "image");

  const withMusic = templateSupportsMusicPreview(options?.features, options?.musicEnabled);
  const dnaMusic = resolveInvitationMusic({
    design,
    catalogSlug: identitySlug,
  }).musicSelection;

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
    guestName: DEMO_PREVIEW_GUEST_NAME,
    musicSelection: resolvedMusic,
    galleryUrls: demoGallery,
    skipTapGate: options?.skipTapGate ?? false,
    skipIntro: options?.skipIntro ?? false,
  };
}
