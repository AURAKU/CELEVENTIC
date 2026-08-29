import type { MusicSelection } from "@/lib/music/music-types";
import {
  getLayoutMusicProfile,
  musicProfileUrl,
  type LayoutMusicProfile,
} from "@/lib/invitation/layout-music-identity";
import {
  FEMMORA_INVITE_MUSIC,
  FEMMORA_INVITE_MUSIC_DURATION_SEC,
} from "@/lib/experience/luxury-fashion/femmora-preset";

/**
 * Per-catalog-SKU music overrides.
 * Wave 1 templates reuse layout engines — without this map they would share audio.
 * Key = catalog slug (not layoutSlug).
 */
export const CATALOG_MUSIC_IDENTITY: Record<string, LayoutMusicProfile> = {
  // —— Wedding Wave 1 ——
  "gilded-vows": {
    trackId: "catalog-gilded-vows",
    title: "Ivory Foil Prelude",
    category: "wedding",
    bundledFile: "luxury-piano-romance",
    startSec: 0,
    endSec: 58,
    volume: 0.46,
    fadeInSec: 2,
    fadeOutSec: 1.2,
  },
  "gilded-opulence-pages": {
    trackId: "catalog-gilded-opulence-pages",
    title: "Opulent Gallery Score",
    category: "wedding",
    bundledFile: "orchestra-royal",
    startSec: 0,
    endSec: 80,
    volume: 0.48,
    fadeInSec: 2.2,
    fadeOutSec: 1.2,
  },
  "emerald-promise": {
    trackId: "catalog-emerald-promise",
    title: "Botanical Promise",
    category: "wedding",
    bundledFile: "strings-garden",
    startSec: 0,
    endSec: 65,
    volume: 0.44,
    fadeInSec: 1.8,
    fadeOutSec: 1,
  },
  "emerald-cathedral": {
    trackId: "catalog-emerald-cathedral",
    title: "Emerald Nave",
    category: "wedding",
    bundledFile: "strings-crystal",
    startSec: 0,
    endSec: 78,
    volume: 0.45,
    fadeInSec: 2,
    fadeOutSec: 1.2,
  },
  "kente-court": {
    trackId: "catalog-kente-court",
    title: "Court Drum Welcome",
    category: "african",
    bundledFile: "african-drums-celebration",
    startSec: 0,
    endSec: 60,
    volume: 0.48,
    fadeInSec: 1,
    fadeOutSec: 0.8,
  },
  "kente-royale-pages": {
    trackId: "catalog-kente-royale-pages",
    title: "Royale Weave Celebration",
    category: "african",
    bundledFile: "happy-celebration",
    startSec: 0,
    endSec: 75,
    volume: 0.5,
    fadeInSec: 1.2,
    fadeOutSec: 0.8,
  },

  // —— Funeral (calm, soft, memorial — never jazz/party/celebration) ——
  "memorial-candle-tribute": {
    trackId: "catalog-memorial-candle-tribute",
    title: "Candlelight Remembrance",
    category: "funeral",
    bundledFile: "memorial-piano",
    startSec: 0,
    endSec: 72,
    volume: 0.28,
    fadeInSec: 3.5,
    fadeOutSec: 2.5,
  },
  "candlelight-farewell": {
    trackId: "catalog-candlelight-farewell",
    title: "Candlelight Farewell",
    category: "funeral",
    bundledFile: "memorial-violin",
    startSec: 0,
    endSec: 75,
    volume: 0.27,
    fadeInSec: 3.5,
    fadeOutSec: 2.5,
  },
  "candlelight-elegy-pages": {
    trackId: "catalog-candlelight-elegy-pages",
    title: "Elegy Chapters",
    category: "funeral",
    bundledFile: "violin-elegance",
    startSec: 0,
    endSec: 85,
    volume: 0.26,
    fadeInSec: 3.5,
    fadeOutSec: 2.5,
  },
  "white-lily-rest": {
    trackId: "catalog-white-lily-rest",
    title: "Lily Quietude",
    category: "funeral",
    bundledFile: "strings-crystal",
    startSec: 80,
    endSec: 155,
    volume: 0.26,
    fadeInSec: 4,
    fadeOutSec: 3,
  },
  "white-lily-memorial-pages": {
    trackId: "catalog-white-lily-memorial-pages",
    title: "Memorial Ivory",
    category: "funeral",
    bundledFile: "ambient-cinematic",
    startSec: 0,
    endSec: 90,
    volume: 0.24,
    fadeInSec: 4,
    fadeOutSec: 3,
  },
  "royal-mourning-lite": {
    trackId: "catalog-royal-mourning-lite",
    title: "Royal Mourning Soft",
    category: "funeral",
    bundledFile: "piano-elegance",
    startSec: 0,
    endSec: 75,
    volume: 0.27,
    fadeInSec: 3.5,
    fadeOutSec: 2.5,
  },
  "royal-mourning-pages": {
    trackId: "catalog-royal-mourning-pages",
    title: "Estate Rite",
    category: "funeral",
    bundledFile: "strings-garden",
    startSec: 20,
    endSec: 100,
    volume: 0.26,
    fadeInSec: 3.5,
    fadeOutSec: 2.5,
  },
  "black-red-cloth-rite": {
    trackId: "catalog-black-red-cloth-rite",
    title: "Cloth of Honour",
    category: "funeral",
    bundledFile: "islamic-soft-instrumental",
    startSec: 0,
    endSec: 80,
    volume: 0.26,
    fadeInSec: 3.5,
    fadeOutSec: 2.5,
  },
  "white-cloth-homegoing": {
    trackId: "catalog-white-cloth-homegoing",
    title: "Homegoing Quietude",
    category: "funeral",
    bundledFile: "nature-forest",
    startSec: 0,
    endSec: 85,
    volume: 0.24,
    fadeInSec: 4,
    fadeOutSec: 3,
  },
  "kente-border-farewell": {
    trackId: "catalog-kente-border-farewell",
    title: "Heritage Farewell",
    category: "funeral",
    bundledFile: "piano-garden",
    startSec: 40,
    endSec: 115,
    volume: 0.26,
    fadeInSec: 3.5,
    fadeOutSec: 2.5,
  },
  "one-week-vigil-notice": {
    trackId: "catalog-one-week-vigil-notice",
    title: "Vigil Soft Piano",
    category: "funeral",
    bundledFile: "memorial-piano",
    startSec: 40,
    endSec: 110,
    volume: 0.27,
    fadeInSec: 3.5,
    fadeOutSec: 2.5,
  },
  // Birthday browse — one unique bundled file per SKU (never share)
  "neon-celebration-party": {
    trackId: "catalog-neon-celebration-party",
    title: "Electric Neon Pulse",
    category: "party",
    bundledFile: "party-edm-energy",
    startSec: 0,
    endSec: 58,
    volume: 0.48,
    fadeInSec: 0.7,
    fadeOutSec: 0.8,
  },
  "pastel-balloon-garden": {
    trackId: "catalog-pastel-balloon-garden",
    title: "Pastel Garden Cheer",
    category: "celebration",
    bundledFile: "happy-celebration",
    startSec: 0,
    endSec: 55,
    volume: 0.4,
    fadeInSec: 1.4,
    fadeOutSec: 1,
  },
  "gold-glam-milestone": {
    trackId: "catalog-gold-glam-milestone",
    title: "Champagne Milestone Lounge",
    category: "jazz",
    bundledFile: "jazz-soft-lounge",
    startSec: 8,
    endSec: 70,
    volume: 0.38,
    fadeInSec: 2.2,
    fadeOutSec: 1.3,
  },
  "concert-night-bash": {
    trackId: "catalog-concert-night-bash",
    title: "Birthday Stage Drums",
    category: "african",
    bundledFile: "african-drums-celebration",
    startSec: 0,
    endSec: 55,
    volume: 0.46,
    fadeInSec: 0.9,
    fadeOutSec: 0.8,
  },
  "surprise-gift-soiree": {
    trackId: "catalog-surprise-gift-soiree",
    title: "Surprise Soft Piano",
    category: "piano",
    bundledFile: "piano-garden",
    startSec: 4,
    endSec: 62,
    volume: 0.36,
    fadeInSec: 1.8,
    fadeOutSec: 1.1,
  },
  "executive-boardroom-brief": {
    trackId: "catalog-executive-boardroom-brief",
    title: "Boardroom Soft Ambient",
    category: "corporate",
    bundledFile: "corporate-summit",
    startSec: 0,
    endSec: 55,
    volume: 0.34,
    fadeInSec: 2,
    fadeOutSec: 1.2,
  },
  "product-launch-pulse": {
    trackId: "catalog-product-launch-pulse",
    title: "Launch Pulse Underscore",
    category: "corporate",
    bundledFile: "ambient-cinematic",
    startSec: 8,
    endSec: 68,
    volume: 0.4,
    fadeInSec: 1.2,
    fadeOutSec: 0.9,
  },
  "investor-night-pass": {
    trackId: "catalog-investor-night-pass",
    title: "Investor Lounge Jazz",
    category: "jazz",
    bundledFile: "jazz-midnight",
    startSec: 10,
    endSec: 75,
    volume: 0.36,
    fadeInSec: 2.2,
    fadeOutSec: 1.4,
  },
  "keynote-agenda-flip": {
    trackId: "catalog-keynote-agenda-flip",
    title: "Keynote Soft Piano",
    category: "piano",
    bundledFile: "piano-elegance",
    startSec: 6,
    endSec: 64,
    volume: 0.35,
    fadeInSec: 1.8,
    fadeOutSec: 1.1,
  },
  "femmora-flagship-soft-opening": {
    trackId: "catalog-femmora-flagship-soft-opening",
    title: "The Beauty",
    category: "cinematic",
    bundledFile: "ambient-cinematic",
    url: FEMMORA_INVITE_MUSIC,
    startSec: 0,
    endSec: FEMMORA_INVITE_MUSIC_DURATION_SEC,
    originalDurationSec: FEMMORA_INVITE_MUSIC_DURATION_SEC,
    volume: 0.4,
    fadeInSec: 1.8,
    fadeOutSec: 1.6,
  },
};

export function getCatalogMusicProfile(catalogSlug: string | null | undefined): LayoutMusicProfile | null {
  if (!catalogSlug) return null;
  return CATALOG_MUSIC_IDENTITY[catalogSlug] ?? null;
}

export function getCatalogMusicProfileByTrackId(trackId: string): LayoutMusicProfile | null {
  return Object.values(CATALOG_MUSIC_IDENTITY).find((p) => p.trackId === trackId) ?? null;
}

export function buildMusicSelectionForCatalog(
  catalogSlug: string,
  options?: Partial<MusicSelection>
): MusicSelection | null {
  const profile = getCatalogMusicProfile(catalogSlug);
  if (!profile) return null;
  return {
    source: "library",
    libraryTrackId: profile.trackId,
    url: musicProfileUrl(profile),
    title: profile.title,
    startSec: profile.startSec,
    endSec: profile.endSec,
    originalDurationSec: profile.originalDurationSec ?? 260,
    autoPlay: true,
    loop: true,
    volume: profile.volume,
    fadeInSec: profile.fadeInSec,
    fadeOutSec: profile.fadeOutSec,
    ...options,
  };
}

/**
 * Resolve music for a catalog SKU: catalog override → layout default.
 */
export function resolveMusicForCatalogOrLayout(
  catalogSlug: string | null | undefined,
  layoutSlug: string
): MusicSelection {
  const fromCatalog = catalogSlug ? buildMusicSelectionForCatalog(catalogSlug) : null;
  if (fromCatalog) return fromCatalog;
  const layout = getLayoutMusicProfile(layoutSlug);
  return {
    source: "library",
    libraryTrackId: layout.trackId,
    url: musicProfileUrl(layout),
    title: layout.title,
    startSec: layout.startSec,
    endSec: layout.endSec,
    originalDurationSec: layout.originalDurationSec ?? 260,
    autoPlay: true,
    loop: true,
    volume: layout.volume,
    fadeInSec: layout.fadeInSec,
    fadeOutSec: layout.fadeOutSec,
  };
}

export function getAllCatalogTrackIds(): string[] {
  return Object.values(CATALOG_MUSIC_IDENTITY).map((p) => p.trackId);
}

export function getCatalogMusicLibraryTracks() {
  return Object.entries(CATALOG_MUSIC_IDENTITY).map(([slug, p]) => ({
    id: p.trackId,
    title: p.title,
    artist: slug === "femmora-flagship-soft-opening" ? "Adrian Berenguer" : "Celeventic · " + slug.replace(/-/g, " "),
    category: p.category,
    url: musicProfileUrl(p),
    durationSec: p.endSec - p.startSec + 30,
    catalogSlug: slug,
  }));
}
