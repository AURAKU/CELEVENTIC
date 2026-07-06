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

/** Tracks with bundled MP3 files in public/music/ */
export const BUNDLED_MUSIC_IDS = new Set<string>([
  ...BUNDLED_MUSIC_FILES,
  ...getLayoutMusicCatalogTracks().map((t) => t.id),
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
  "orchestra-royal": "violin-elegance",
  "jazz-soft-lounge": "soundhelix-ambient-1",
  "jazz-midnight": "piano-elegance",
  "acoustic-warm": "piano-garden",
  "party-edm-energy": "soundhelix-ambient-1",
  "happy-celebration": "strings-garden",
  "african-drums-celebration": "strings-garden",
  "corporate-summit": "soundhelix-ambient-1",
  "ambient-cinematic": "soundhelix-ambient-1",
  "travel-wanderlust": "strings-crystal",
  "islamic-soft-instrumental": "piano-elegance",
  "nature-forest": "piano-elegance",
  "nature-ocean": "strings-crystal",
};

const CATEGORY_FILE_FALLBACK: Record<string, BundledMusicFile> = {
  funeral: "piano-elegance",
  wedding: "luxury-piano-romance",
  piano: "piano-garden",
  violin: "violin-elegance",
  strings: "strings-garden",
  jazz: "soundhelix-ambient-1",
  guitar: "piano-garden",
  celebration: "strings-garden",
  african: "strings-garden",
  corporate: "soundhelix-ambient-1",
  muslim: "piano-elegance",
  instrumentals: "soundhelix-ambient-1",
  nature: "strings-crystal",
};

/** Resolve to a bundled file that exists on disk */
export function resolveBundledTrackId(trackId: string, category?: string): string {
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

/** Layout-first catalog + legacy aliases for music picker UI */
export const AUDIO_EXPERIENCE_CATALOG: MusicLibraryTrack[] = [
  ...getLayoutMusicCatalogTracks(),
  { id: "luxury-piano-romance", title: "Romantic Whispers (library)", category: "piano", url: catalogMusicUrl("luxury-piano-romance"), durationSec: 120 },
  { id: "piano-garden", title: "Garden Serenade (library)", category: "piano", url: catalogMusicUrl("piano-garden"), durationSec: 120 },
  { id: "piano-elegance", title: "Evening Elegance (library)", category: "piano", url: catalogMusicUrl("piano-elegance"), durationSec: 120 },
  { id: "violin-elegance", title: "Solo Violin (library)", category: "violin", url: catalogMusicUrl("violin-elegance"), durationSec: 120 },
  { id: "strings-garden", title: "String Quartet Garden (library)", category: "strings", url: catalogMusicUrl("strings-garden"), durationSec: 120 },
  { id: "strings-crystal", title: "Crystal Strings (library)", category: "strings", url: catalogMusicUrl("strings-crystal"), durationSec: 120 },
  { id: "soundhelix-ambient-1", title: "Ambient Journey (library)", category: "instrumentals", url: catalogMusicUrl("soundhelix-ambient-1"), durationSec: 260 },
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
  category?: string
): MusicSelection | null {
  const layoutProfile = getLayoutMusicProfile(layout);

  if (trackId && trackId !== layoutProfile.trackId) {
    const userTrack = buildMusicSelectionFromTrack(trackId);
    if (userTrack) return userTrack;
  }

  if (trackId) {
    const byLayoutTrack = buildMusicSelectionFromTrack(trackId);
    if (byLayoutTrack) return byLayoutTrack;
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
