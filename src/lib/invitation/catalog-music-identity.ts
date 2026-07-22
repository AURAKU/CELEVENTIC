import type { MusicSelection } from "@/lib/music/music-types";
import {
  bundledMusicUrl,
  getLayoutMusicProfile,
  type BundledMusicFile,
  type LayoutMusicProfile,
} from "@/lib/invitation/layout-music-identity";

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

  // —— Funeral Wave 1 (must not all share memorial-candle piano) ——
  "candlelight-farewell": {
    trackId: "catalog-candlelight-farewell",
    title: "Candlelight Farewell",
    category: "funeral",
    bundledFile: "piano-elegance",
    startSec: 0,
    endSec: 70,
    volume: 0.3,
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
    volume: 0.28,
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
    volume: 0.28,
    fadeInSec: 3.5,
    fadeOutSec: 2.5,
  },
  "white-lily-memorial-pages": {
    trackId: "catalog-white-lily-memorial-pages",
    title: "Memorial Ivory",
    category: "funeral",
    bundledFile: "ambient-cinematic",
    startSec: 0,
    endSec: 90,
    volume: 0.26,
    fadeInSec: 4,
    fadeOutSec: 3,
  },
  "royal-mourning-lite": {
    trackId: "catalog-royal-mourning-lite",
    title: "Royal Mourning Drum Soft",
    category: "funeral",
    bundledFile: "acoustic-warm",
    startSec: 0,
    endSec: 75,
    volume: 0.3,
    fadeInSec: 3,
    fadeOutSec: 2,
  },
  "royal-mourning-pages": {
    trackId: "catalog-royal-mourning-pages",
    title: "Estate Rite",
    category: "funeral",
    bundledFile: "jazz-midnight",
    startSec: 0,
    endSec: 85,
    volume: 0.28,
    fadeInSec: 3.5,
    fadeOutSec: 2.5,
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
    url: bundledMusicUrl(profile.bundledFile),
    title: profile.title,
    startSec: profile.startSec,
    endSec: profile.endSec,
    originalDurationSec: 260,
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
    url: bundledMusicUrl(layout.bundledFile as BundledMusicFile),
    title: layout.title,
    startSec: layout.startSec,
    endSec: layout.endSec,
    originalDurationSec: 260,
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
    artist: "Celeventic · " + slug.replace(/-/g, " "),
    category: p.category,
    url: bundledMusicUrl(p.bundledFile),
    durationSec: p.endSec - p.startSec + 30,
    catalogSlug: slug,
  }));
}
