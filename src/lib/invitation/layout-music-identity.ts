import type { InvitationLayoutSlug } from "@/types/invitation-design";
import type { MusicSelection } from "@/lib/music/music-types";

/** Bundled MP3 filenames in public/music/ (without extension) */
export const BUNDLED_MUSIC_FILES = [
  "luxury-piano-romance",
  "piano-garden",
  "piano-elegance",
  "violin-elegance",
  "strings-garden",
  "strings-crystal",
  "soundhelix-ambient-1",
] as const;

export type BundledMusicFile = (typeof BUNDLED_MUSIC_FILES)[number];

export interface LayoutMusicProfile {
  /** Unique catalog id — one per layout, never shared */
  trackId: string;
  title: string;
  category: string;
  bundledFile: BundledMusicFile;
  startSec: number;
  endSec: number;
  volume: number;
  fadeInSec: number;
  fadeOutSec: number;
}

/**
 * One unique audible identity per template layout.
 * When multiple layouts share a file, playback windows do not overlap.
 */
export const LAYOUT_MUSIC_IDENTITY: Record<InvitationLayoutSlug, LayoutMusicProfile> = {
  "classic-gold": {
    trackId: "layout-classic-gold-romance",
    title: "Gilded Romance",
    category: "wedding",
    bundledFile: "luxury-piano-romance",
    startSec: 0,
    endSec: 58,
    volume: 0.48,
    fadeInSec: 2,
    fadeOutSec: 1.2,
  },
  "arch-green": {
    trackId: "layout-arch-green-strings",
    title: "Cathedral Strings",
    category: "wedding",
    bundledFile: "strings-garden",
    startSec: 0,
    endSec: 62,
    volume: 0.44,
    fadeInSec: 1.8,
    fadeOutSec: 1,
  },
  "rustic-lace": {
    trackId: "layout-rustic-lace-acoustic",
    title: "Lace & Timber",
    category: "wedding",
    bundledFile: "piano-garden",
    startSec: 0,
    endSec: 65,
    volume: 0.42,
    fadeInSec: 2,
    fadeOutSec: 1,
  },
  "boho-hexagon": {
    trackId: "layout-boho-hexagon-lounge",
    title: "Bohemian Lounge",
    category: "celebration",
    bundledFile: "soundhelix-ambient-1",
    startSec: 0,
    endSec: 70,
    volume: 0.4,
    fadeInSec: 1.5,
    fadeOutSec: 1,
  },
  "luxury-rings": {
    trackId: "layout-luxury-rings-violin",
    title: "Rings Serenade",
    category: "wedding",
    bundledFile: "violin-elegance",
    startSec: 0,
    endSec: 72,
    volume: 0.46,
    fadeInSec: 2,
    fadeOutSec: 1.2,
  },
  "custom-media": {
    trackId: "layout-custom-media-cinematic",
    title: "Your Story Score",
    category: "instrumentals",
    bundledFile: "soundhelix-ambient-1",
    startSec: 72,
    endSec: 142,
    volume: 0.38,
    fadeInSec: 2.5,
    fadeOutSec: 1.5,
  },
  "passport-luxe": {
    trackId: "layout-passport-luxe-voyage",
    title: "Stamped Voyage",
    category: "wedding",
    bundledFile: "strings-crystal",
    startSec: 0,
    endSec: 68,
    volume: 0.43,
    fadeInSec: 1.8,
    fadeOutSec: 1,
  },
  "glass-acrylic": {
    trackId: "layout-glass-acrylic-crystal",
    title: "Frostlight Crystal",
    category: "wedding",
    bundledFile: "strings-crystal",
    startSec: 68,
    endSec: 128,
    volume: 0.4,
    fadeInSec: 2,
    fadeOutSec: 1.2,
  },
  "floral-garden": {
    trackId: "layout-floral-garden-whispers",
    title: "Garden Whispers",
    category: "wedding",
    bundledFile: "piano-garden",
    startSec: 65,
    endSec: 118,
    volume: 0.45,
    fadeInSec: 2,
    fadeOutSec: 1,
  },
  "royal-emerald-wedding": {
    trackId: "layout-royal-emerald-orchestra",
    title: "Palace Orchestra",
    category: "wedding",
    bundledFile: "violin-elegance",
    startSec: 72,
    endSec: 132,
    volume: 0.47,
    fadeInSec: 2.2,
    fadeOutSec: 1.2,
  },
  "midnight-velvet-reception": {
    trackId: "layout-midnight-velvet-jazz",
    title: "Midnight Velvet",
    category: "wedding",
    bundledFile: "piano-elegance",
    startSec: 0,
    endSec: 64,
    volume: 0.4,
    fadeInSec: 2.5,
    fadeOutSec: 1.5,
  },
  "kente-heritage-union": {
    trackId: "layout-kente-heritage-drums",
    title: "Heritage Celebration",
    category: "african",
    bundledFile: "strings-garden",
    startSec: 62,
    endSec: 118,
    volume: 0.5,
    fadeInSec: 1.2,
    fadeOutSec: 0.8,
  },
  "floral-garden-romance": {
    trackId: "layout-floral-garden-romance-love",
    title: "Love in Bloom",
    category: "wedding",
    bundledFile: "luxury-piano-romance",
    startSec: 58,
    endSec: 112,
    volume: 0.48,
    fadeInSec: 2,
    fadeOutSec: 1,
  },
  "passport-destination-wedding": {
    trackId: "layout-passport-destination-dreams",
    title: "Destination Dreams",
    category: "wedding",
    bundledFile: "strings-crystal",
    startSec: 128,
    endSec: 185,
    volume: 0.44,
    fadeInSec: 1.8,
    fadeOutSec: 1,
  },
  "crystal-acrylic-luxury": {
    trackId: "layout-crystal-acrylic-prism",
    title: "Prism Elegance",
    category: "wedding",
    bundledFile: "strings-garden",
    startSec: 118,
    endSec: 172,
    volume: 0.41,
    fadeInSec: 2,
    fadeOutSec: 1.2,
  },
  "golden-islamic-nikkah": {
    trackId: "layout-golden-islamic-nikkah",
    title: "Nikkah Grace",
    category: "muslim",
    bundledFile: "piano-elegance",
    startSec: 64,
    endSec: 118,
    volume: 0.36,
    fadeInSec: 3,
    fadeOutSec: 2,
  },
  "memorial-candle-tribute": {
    trackId: "layout-memorial-candle-tribute",
    title: "Memorial Light",
    category: "funeral",
    bundledFile: "piano-elegance",
    startSec: 118,
    endSec: 168,
    volume: 0.3,
    fadeInSec: 3.5,
    fadeOutSec: 2.5,
  },
  "neon-celebration-party": {
    trackId: "layout-neon-celebration-party",
    title: "Neon Pulse",
    category: "celebration",
    bundledFile: "soundhelix-ambient-1",
    startSec: 142,
    endSec: 198,
    volume: 0.52,
    fadeInSec: 0.8,
    fadeOutSec: 0.6,
  },
  "corporate-prestige-summit": {
    trackId: "layout-corporate-prestige-summit",
    title: "Summit Horizon",
    category: "corporate",
    bundledFile: "soundhelix-ambient-1",
    startSec: 198,
    endSec: 248,
    volume: 0.38,
    fadeInSec: 1.5,
    fadeOutSec: 1,
  },
};

export function getLayoutMusicProfile(layout: string): LayoutMusicProfile {
  return LAYOUT_MUSIC_IDENTITY[layout as InvitationLayoutSlug] ?? LAYOUT_MUSIC_IDENTITY["classic-gold"];
}

export function getLayoutMusicProfileByTrackId(trackId: string): LayoutMusicProfile | null {
  return Object.values(LAYOUT_MUSIC_IDENTITY).find((p) => p.trackId === trackId) ?? null;
}

export function getLayoutSlugByTrackId(trackId: string): InvitationLayoutSlug | null {
  const entry = Object.entries(LAYOUT_MUSIC_IDENTITY).find(([, p]) => p.trackId === trackId);
  return entry ? (entry[0] as InvitationLayoutSlug) : null;
}

export function bundledMusicUrl(file: BundledMusicFile): string {
  return `/music/${file}.mp3`;
}

export function buildMusicSelectionForLayout(
  layout: string,
  options?: Partial<MusicSelection>
): MusicSelection {
  const profile = getLayoutMusicProfile(layout);
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

/** All layout track ids — for uniqueness validation */
export function getAllLayoutTrackIds(): string[] {
  return Object.values(LAYOUT_MUSIC_IDENTITY).map((p) => p.trackId);
}

/** Catalog entries derived from layout profiles (for music library UI) */
export function getLayoutMusicCatalogTracks() {
  return Object.entries(LAYOUT_MUSIC_IDENTITY).map(([layout, p]) => ({
    id: p.trackId,
    title: p.title,
    artist: "Celeventic · " + layout.replace(/-/g, " "),
    category: p.category,
    url: bundledMusicUrl(p.bundledFile),
    durationSec: p.endSec - p.startSec + 30,
    layoutSlug: layout,
  }));
}
