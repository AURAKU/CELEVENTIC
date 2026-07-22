import type { InvitationLayoutSlug } from "@/types/invitation-design";
import type { MusicSelection } from "@/lib/music/music-types";

/**
 * Bundled MP3 filenames in public/music/ (without extension).
 * Prefer one unique physical file per layout so templates never share the same audible identity.
 */
export const BUNDLED_MUSIC_FILES = [
  "luxury-piano-romance",
  "piano-garden",
  "piano-elegance",
  "violin-elegance",
  "strings-garden",
  "strings-crystal",
  "orchestra-royal",
  "jazz-soft-lounge",
  "jazz-midnight",
  "acoustic-warm",
  "party-edm-energy",
  "happy-celebration",
  "african-drums-celebration",
  "corporate-summit",
  "ambient-cinematic",
  "travel-wanderlust",
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
 * One unique audible identity per template layout — genre-fit file + dedicated trackId.
 * Two pairs intentionally share a file with non-overlapping windows:
 * passport-luxe / passport-destination-wedding → travel-wanderlust
 * golden-islamic-nikkah / memorial-candle-tribute → piano-elegance
 */
export const LAYOUT_MUSIC_IDENTITY: Record<InvitationLayoutSlug, LayoutMusicProfile> = {
  "classic-gold": {
    trackId: "layout-classic-gold-romance",
    title: "Gilded Romance",
    category: "wedding",
    bundledFile: "luxury-piano-romance",
    startSec: 0,
    endSec: 72,
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
    endSec: 75,
    volume: 0.44,
    fadeInSec: 1.8,
    fadeOutSec: 1,
  },
  "rustic-lace": {
    trackId: "layout-rustic-lace-acoustic",
    title: "Lace & Timber",
    category: "wedding",
    bundledFile: "acoustic-warm",
    startSec: 0,
    endSec: 80,
    volume: 0.42,
    fadeInSec: 2,
    fadeOutSec: 1,
  },
  "boho-hexagon": {
    trackId: "layout-boho-hexagon-lounge",
    title: "Bohemian Lounge",
    category: "celebration",
    bundledFile: "jazz-soft-lounge",
    startSec: 0,
    endSec: 78,
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
    endSec: 80,
    volume: 0.46,
    fadeInSec: 2,
    fadeOutSec: 1.2,
  },
  "custom-media": {
    trackId: "layout-custom-media-cinematic",
    title: "Your Story Score",
    category: "instrumentals",
    bundledFile: "ambient-cinematic",
    startSec: 0,
    endSec: 90,
    volume: 0.38,
    fadeInSec: 2.5,
    fadeOutSec: 1.5,
  },
  "passport-luxe": {
    trackId: "layout-passport-luxe-voyage",
    title: "Stamped Voyage",
    category: "wedding",
    bundledFile: "travel-wanderlust",
    startSec: 0,
    endSec: 75,
    volume: 0.43,
    fadeInSec: 1.8,
    fadeOutSec: 1,
  },
  "glass-acrylic": {
    trackId: "layout-glass-acrylic-crystal",
    title: "Frostlight Crystal",
    category: "wedding",
    bundledFile: "strings-crystal",
    startSec: 0,
    endSec: 78,
    volume: 0.4,
    fadeInSec: 2,
    fadeOutSec: 1.2,
  },
  "floral-garden": {
    trackId: "layout-floral-garden-whispers",
    title: "Garden Whispers",
    category: "wedding",
    bundledFile: "piano-garden",
    startSec: 0,
    endSec: 75,
    volume: 0.45,
    fadeInSec: 2,
    fadeOutSec: 1,
  },
  "royal-emerald-wedding": {
    trackId: "layout-royal-emerald-orchestra",
    title: "Palace Orchestra",
    category: "wedding",
    bundledFile: "orchestra-royal",
    startSec: 0,
    endSec: 85,
    volume: 0.47,
    fadeInSec: 2.2,
    fadeOutSec: 1.2,
  },
  "midnight-velvet-reception": {
    trackId: "layout-midnight-velvet-jazz",
    title: "Midnight Velvet",
    category: "wedding",
    bundledFile: "jazz-midnight",
    startSec: 0,
    endSec: 80,
    volume: 0.4,
    fadeInSec: 2.5,
    fadeOutSec: 1.5,
  },
  "kente-heritage-union": {
    trackId: "layout-kente-heritage-drums",
    title: "Heritage Celebration",
    category: "african",
    bundledFile: "african-drums-celebration",
    startSec: 0,
    endSec: 78,
    volume: 0.5,
    fadeInSec: 1.2,
    fadeOutSec: 0.8,
  },
  "traditional-marriage-ceremony": {
    trackId: "layout-traditional-marriage-ceremony",
    title: "Traditional Marriage Drums",
    category: "african",
    bundledFile: "african-drums-celebration",
    startSec: 8,
    endSec: 95,
    volume: 0.42,
    fadeInSec: 2,
    fadeOutSec: 1.2,
  },
  "floral-garden-romance": {
    trackId: "layout-floral-garden-romance-love",
    title: "Garden Piano Soft",
    category: "piano",
    bundledFile: "piano-garden",
    startSec: 0,
    endSec: 75,
    volume: 0.42,
    fadeInSec: 2.5,
    fadeOutSec: 1.5,
  },
  "passport-destination-wedding": {
    trackId: "layout-passport-destination-dreams",
    title: "Destination Dreams",
    category: "wedding",
    bundledFile: "travel-wanderlust",
    startSec: 80,
    endSec: 155,
    volume: 0.44,
    fadeInSec: 1.8,
    fadeOutSec: 1,
  },
  "crystal-acrylic-luxury": {
    trackId: "layout-crystal-acrylic-prism",
    title: "Prism Elegance",
    category: "wedding",
    bundledFile: "soundhelix-ambient-1",
    startSec: 0,
    endSec: 85,
    volume: 0.41,
    fadeInSec: 2,
    fadeOutSec: 1.2,
  },
  "golden-islamic-nikkah": {
    trackId: "layout-golden-islamic-nikkah",
    title: "Nikkah Grace",
    category: "muslim",
    bundledFile: "piano-elegance",
    startSec: 0,
    endSec: 85,
    volume: 0.34,
    fadeInSec: 3,
    fadeOutSec: 2,
  },
  "memorial-candle-tribute": {
    trackId: "layout-memorial-candle-tribute",
    title: "Memorial Light",
    category: "funeral",
    bundledFile: "piano-elegance",
    startSec: 90,
    endSec: 165,
    volume: 0.3,
    fadeInSec: 3.5,
    fadeOutSec: 2.5,
  },
  "neon-celebration-party": {
    trackId: "layout-neon-celebration-party",
    title: "Neon Pulse",
    category: "celebration",
    bundledFile: "party-edm-energy",
    startSec: 0,
    endSec: 75,
    volume: 0.52,
    fadeInSec: 0.8,
    fadeOutSec: 0.6,
  },
  "corporate-prestige-summit": {
    trackId: "layout-corporate-prestige-summit",
    title: "Summit Horizon",
    category: "corporate",
    bundledFile: "corporate-summit",
    startSec: 0,
    endSec: 80,
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
