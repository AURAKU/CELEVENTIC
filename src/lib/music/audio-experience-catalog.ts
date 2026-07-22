import type { MusicLibraryTrack, MusicSelection } from "@/lib/music/music-types";
import {
  BUNDLED_MUSIC_FILES,
  buildMusicSelectionForLayout,
  bundledMusicUrl,
  getLayoutMusicCatalogTracks,
  getLayoutMusicProfile,
  getLayoutMusicProfileByTrackId,
  getLayoutSlugByTrackId,
  type BundledMusicFile,
} from "@/lib/invitation/layout-music-identity";
import {
  buildMusicSelectionForCatalog,
  getCatalogMusicLibraryTracks,
  getCatalogMusicProfileByTrackId,
  resolveMusicForCatalogOrLayout,
} from "@/lib/invitation/catalog-music-identity";

/** Tracks with bundled MP3 files in public/music/ */
export const BUNDLED_MUSIC_IDS = new Set<string>([
  ...BUNDLED_MUSIC_FILES,
  ...getLayoutMusicCatalogTracks().map((t) => t.id),
  ...getCatalogMusicLibraryTracks().map((t) => t.id),
]);

/** Legacy semantic ids → bundled file (for backwards-compatible order selections) */
const LEGACY_TRACK_FILE: Record<string, BundledMusicFile> = {
  "memorial-piano": "piano-elegance",
  "memorial-violin": "violin-elegance",
  "wedding-romantic": "luxury-piano-romance",
  "luxury-piano-romance": "luxury-piano-romance",
  "piano-garden": "piano-garden",
  "piano-elegance": "piano-elegance",
  "violin-elegance": "violin-elegance",
  "strings-garden": "strings-garden",
  "strings-crystal": "strings-crystal",
  "orchestra-royal": "orchestra-royal",
  "jazz-soft-lounge": "jazz-soft-lounge",
  "jazz-midnight": "jazz-midnight",
  "acoustic-warm": "acoustic-warm",
  "party-edm-energy": "party-edm-energy",
  "happy-celebration": "happy-celebration",
  "african-drums-celebration": "african-drums-celebration",
  "corporate-summit": "corporate-summit",
  "ambient-cinematic": "ambient-cinematic",
  "travel-wanderlust": "travel-wanderlust",
  "islamic-soft-instrumental": "piano-elegance",
  "nature-forest": "strings-crystal",
  "nature-ocean": "orchestra-royal",
  "soundhelix-ambient-1": "soundhelix-ambient-1",
};

const CATEGORY_FILE_FALLBACK: Record<string, BundledMusicFile> = {
  funeral: "piano-elegance",
  wedding: "luxury-piano-romance",
  piano: "piano-garden",
  violin: "violin-elegance",
  strings: "strings-garden",
  jazz: "jazz-midnight",
  guitar: "acoustic-warm",
  celebration: "party-edm-energy",
  african: "african-drums-celebration",
  corporate: "corporate-summit",
  muslim: "piano-elegance",
  instrumentals: "ambient-cinematic",
  nature: "strings-crystal",
};

/** Resolve to a bundled file that exists on disk */
export function resolveBundledTrackId(trackId: string, category?: string): string {
  const catalogProfile = getCatalogMusicProfileByTrackId(trackId);
  if (catalogProfile) return catalogProfile.bundledFile;
  const layoutProfile = getLayoutMusicProfileByTrackId(trackId);
  if (layoutProfile) return layoutProfile.bundledFile;
  if (BUNDLED_MUSIC_FILES.includes(trackId as BundledMusicFile)) return trackId;
  const legacy = LEGACY_TRACK_FILE[trackId];
  if (legacy) return legacy;
  const catFallback = category ? CATEGORY_FILE_FALLBACK[category] : undefined;
  if (catFallback) return catFallback;
  return "luxury-piano-romance";
}

/** Public URL for a bundled catalog track file. */
export function catalogMusicUrl(trackId: string, category?: string): string {
  const resolved = resolveBundledTrackId(trackId, category);
  return bundledMusicUrl(resolved as BundledMusicFile);
}

/** Layout-first catalog + Wave 1 SKU tracks + library aliases for music picker UI */
export const AUDIO_EXPERIENCE_CATALOG: MusicLibraryTrack[] = [
  ...getLayoutMusicCatalogTracks(),
  ...getCatalogMusicLibraryTracks(),
  { id: "luxury-piano-romance", title: "Romantic Whispers (library)", category: "piano", url: catalogMusicUrl("luxury-piano-romance"), durationSec: 120 },
  { id: "piano-garden", title: "Garden Serenade (library)", category: "piano", url: catalogMusicUrl("piano-garden"), durationSec: 120 },
  { id: "piano-elegance", title: "Evening Elegance (library)", category: "piano", url: catalogMusicUrl("piano-elegance"), durationSec: 120 },
  { id: "violin-elegance", title: "Solo Violin (library)", category: "violin", url: catalogMusicUrl("violin-elegance"), durationSec: 120 },
  { id: "strings-garden", title: "String Quartet Garden (library)", category: "strings", url: catalogMusicUrl("strings-garden"), durationSec: 120 },
  { id: "strings-crystal", title: "Crystal Strings (library)", category: "strings", url: catalogMusicUrl("strings-crystal"), durationSec: 120 },
  { id: "orchestra-royal", title: "Royal Orchestra (library)", category: "strings", url: catalogMusicUrl("orchestra-royal"), durationSec: 120 },
  { id: "jazz-midnight", title: "Midnight Jazz (library)", category: "jazz", url: catalogMusicUrl("jazz-midnight"), durationSec: 120 },
  { id: "african-drums-celebration", title: "Heritage Drums (library)", category: "african", url: catalogMusicUrl("african-drums-celebration"), durationSec: 120 },
  { id: "party-edm-energy", title: "Neon Energy (library)", category: "celebration", url: catalogMusicUrl("party-edm-energy"), durationSec: 120 },
  { id: "corporate-summit", title: "Summit Pulse (library)", category: "corporate", url: catalogMusicUrl("corporate-summit"), durationSec: 120 },
  { id: "travel-wanderlust", title: "Wanderlust (library)", category: "instrumentals", url: catalogMusicUrl("travel-wanderlust"), durationSec: 120 },
  { id: "ambient-cinematic", title: "Cinematic Ambient (library)", category: "instrumentals", url: catalogMusicUrl("ambient-cinematic"), durationSec: 120 },
];

export const AUDIO_CATEGORY_GROUPS = [
  { id: "wedding", label: "Wedding & Love", moods: ["Romantic", "Piano", "Strings"] },
  { id: "piano", label: "Luxury Piano", moods: ["Romantic", "Elegant", "Garden"] },
  { id: "violin", label: "Solo Violin", moods: ["Elegance", "Palace"] },
  { id: "strings", label: "Strings & Orchestra", moods: ["Quartet", "Crystal", "Garden"] },
  { id: "celebration", label: "Celebration & Party", moods: ["Neon", "Boho", "Festival"] },
  { id: "african", label: "African Heritage", moods: ["Kente", "Drums"] },
  { id: "corporate", label: "Corporate", moods: ["Summit", "Professional"] },
  { id: "funeral", label: "Funeral / Memorial", moods: ["Solemn", "Candlelight"] },
  { id: "muslim", label: "Islamic / Nikkah", moods: ["Soft Instrumental"] },
  { id: "instrumentals", label: "Cinematic & Custom", moods: ["Ambient", "Story"] },
] as const;

export function getAudioTrackById(id: string): MusicLibraryTrack | undefined {
  const catalogProfile = getCatalogMusicProfileByTrackId(id);
  if (catalogProfile) {
    return {
      id: catalogProfile.trackId,
      title: catalogProfile.title,
      category: catalogProfile.category,
      url: bundledMusicUrl(catalogProfile.bundledFile),
      durationSec: catalogProfile.endSec - catalogProfile.startSec + 30,
    };
  }
  const layoutProfile = getLayoutMusicProfileByTrackId(id);
  if (layoutProfile) {
    return {
      id: layoutProfile.trackId,
      title: layoutProfile.title,
      category: layoutProfile.category,
      url: bundledMusicUrl(layoutProfile.bundledFile),
      durationSec: layoutProfile.endSec - layoutProfile.startSec + 30,
    };
  }
  return AUDIO_EXPERIENCE_CATALOG.find((t) => t.id === id);
}

export function getAudioTracksByCategory(category: string): MusicLibraryTrack[] {
  return AUDIO_EXPERIENCE_CATALOG.filter((t) => t.category === category);
}

export function getCatalogLibraryTracks(): MusicLibraryTrack[] {
  return AUDIO_EXPERIENCE_CATALOG.map((t) => ({
    ...t,
    artist: t.artist ?? "Celeventic Library",
  }));
}

export function buildMusicSelectionFromTrack(
  trackId: string,
  options?: Partial<MusicSelection>
): MusicSelection | null {
  const catalogByTrack = getCatalogMusicProfileByTrackId(trackId);
  if (catalogByTrack) {
    return {
      source: "library",
      libraryTrackId: catalogByTrack.trackId,
      url: bundledMusicUrl(catalogByTrack.bundledFile),
      title: catalogByTrack.title,
      startSec: catalogByTrack.startSec,
      endSec: catalogByTrack.endSec,
      originalDurationSec: 260,
      autoPlay: true,
      loop: true,
      volume: catalogByTrack.volume,
      fadeInSec: catalogByTrack.fadeInSec,
      fadeOutSec: catalogByTrack.fadeOutSec,
      ...options,
    };
  }

  const layoutSlug = getLayoutSlugByTrackId(trackId);
  if (layoutSlug) {
    return buildMusicSelectionForLayout(layoutSlug, options);
  }

  const track = getAudioTrackById(trackId);
  if (!track) return null;
  const duration = track.durationSec ?? 120;
  return {
    source: "library",
    libraryTrackId: track.id,
    url: catalogMusicUrl(track.id, track.category),
    title: track.title,
    startSec: 0,
    endSec: Math.min(duration, 90),
    originalDurationSec: duration,
    autoPlay: true,
    loop: true,
    volume: track.category === "funeral" ? 0.35 : 0.45,
    fadeInSec: 1.5,
    fadeOutSec: 1,
    ...options,
  };
}

export function resolveDefaultMusicForLayout(
  layout: string,
  trackId?: string,
  category?: string,
  catalogSlug?: string | null
): MusicSelection | null {
  if (catalogSlug) {
    const catalogMusic = buildMusicSelectionForCatalog(catalogSlug);
    if (catalogMusic && (!trackId || trackId === catalogMusic.libraryTrackId)) {
      return catalogMusic;
    }
  }

  const layoutProfile = getLayoutMusicProfile(layout);

  if (trackId && trackId !== layoutProfile.trackId) {
    const userTrack = buildMusicSelectionFromTrack(trackId);
    if (userTrack) return userTrack;
  }

  if (trackId) {
    const byLayoutTrack = buildMusicSelectionFromTrack(trackId);
    if (byLayoutTrack) return byLayoutTrack;
  }

  if (catalogSlug) {
    return resolveMusicForCatalogOrLayout(catalogSlug, layout);
  }

  const layoutMusic = buildMusicSelectionForLayout(layout);
  if (layoutMusic) return layoutMusic;

  if (category && category !== layoutProfile.category) {
    const catTrack = getAudioTracksByCategory(category)[0];
    if (catTrack) return buildMusicSelectionFromTrack(catTrack.id);
  }

  if (layout.includes("memorial") || category === "funeral") {
    return buildMusicSelectionForLayout("memorial-candle-tribute");
  }
  if (layout.includes("corporate") || category === "corporate") {
    return buildMusicSelectionForLayout("corporate-prestige-summit");
  }
  if (layout.includes("neon") || category === "celebration") {
    return buildMusicSelectionForLayout("neon-celebration-party");
  }

  return buildMusicSelectionForLayout("classic-gold");
}
