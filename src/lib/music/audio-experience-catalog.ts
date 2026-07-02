import type { MusicLibraryTrack, MusicSelection } from "@/lib/music/music-types";

/** Public URL for a bundled catalog track file. */
export function catalogMusicUrl(trackId: string): string {
  return `/music/${trackId}.mp3`;
}

/** Premium audio catalog — each template DNA track maps to a local file in public/music. */
export const AUDIO_EXPERIENCE_CATALOG: MusicLibraryTrack[] = [
  { id: "luxury-piano-romance", title: "Romantic Whispers", category: "piano", url: catalogMusicUrl("luxury-piano-romance"), durationSec: 120 },
  { id: "piano-garden", title: "Garden Serenade", category: "piano", url: catalogMusicUrl("piano-garden"), durationSec: 120 },
  { id: "piano-elegance", title: "Evening Elegance", category: "piano", url: catalogMusicUrl("piano-elegance"), durationSec: 120 },

  { id: "violin-elegance", title: "Solo Violin Elegance", category: "violin", url: catalogMusicUrl("violin-elegance"), durationSec: 120 },
  { id: "strings-garden", title: "String Quartet Garden", category: "strings", url: catalogMusicUrl("strings-garden"), durationSec: 120 },
  { id: "strings-crystal", title: "Crystal Strings", category: "strings", url: catalogMusicUrl("strings-crystal"), durationSec: 120 },
  { id: "orchestra-royal", title: "Royal Orchestra", category: "strings", url: catalogMusicUrl("orchestra-royal"), durationSec: 120 },

  { id: "jazz-soft-lounge", title: "Soft Jazz Lounge", category: "jazz", url: catalogMusicUrl("jazz-soft-lounge"), durationSec: 120 },
  { id: "jazz-midnight", title: "Midnight Jazz", category: "jazz", url: catalogMusicUrl("jazz-midnight"), durationSec: 120 },
  { id: "acoustic-warm", title: "Warm Acoustic Guitar", category: "guitar", url: catalogMusicUrl("acoustic-warm"), durationSec: 120 },

  { id: "party-edm-energy", title: "EDM Party Energy", category: "celebration", url: catalogMusicUrl("party-edm-energy"), durationSec: 120 },
  { id: "happy-celebration", title: "Happy Celebration", category: "celebration", url: catalogMusicUrl("happy-celebration"), durationSec: 120 },

  { id: "african-drums-celebration", title: "African Drums", category: "african", url: catalogMusicUrl("african-drums-celebration"), durationSec: 120 },

  { id: "corporate-summit", title: "Summit Presentation", category: "corporate", url: catalogMusicUrl("corporate-summit"), durationSec: 120 },
  { id: "ambient-cinematic", title: "Cinematic Ambient", category: "instrumentals", url: catalogMusicUrl("ambient-cinematic"), durationSec: 120 },
  { id: "travel-wanderlust", title: "Wanderlust Journey", category: "instrumentals", url: catalogMusicUrl("travel-wanderlust"), durationSec: 120 },

  { id: "memorial-piano", title: "Memorial Piano", category: "funeral", url: catalogMusicUrl("memorial-piano"), durationSec: 120 },
  { id: "memorial-violin", title: "Memorial Violin", category: "funeral", url: catalogMusicUrl("memorial-violin"), durationSec: 120 },

  { id: "islamic-soft-instrumental", title: "Soft Instrumental", category: "muslim", url: catalogMusicUrl("islamic-soft-instrumental"), durationSec: 120 },

  { id: "nature-forest", title: "Forest Ambience", category: "nature", url: catalogMusicUrl("nature-forest"), durationSec: 120 },
  { id: "nature-ocean", title: "Ocean Waves", category: "nature", url: catalogMusicUrl("nature-ocean"), durationSec: 120 },

  { id: "wedding-romantic", title: "Romantic Wedding", category: "wedding", url: catalogMusicUrl("wedding-romantic"), durationSec: 120 },
];

export const AUDIO_CATEGORY_GROUPS = [
  { id: "wedding", label: "Wedding", moods: ["Romantic", "Orchestra", "Piano"] },
  { id: "piano", label: "Luxury Piano", moods: ["Romantic", "Elegant", "Garden"] },
  { id: "violin", label: "Solo Violin", moods: ["Elegance", "Memorial"] },
  { id: "strings", label: "Strings & Orchestra", moods: ["Quartet", "Royal", "Crystal"] },
  { id: "jazz", label: "Jazz", moods: ["Lounge", "Midnight"] },
  { id: "guitar", label: "Acoustic Guitar", moods: ["Warm", "Folk"] },
  { id: "celebration", label: "Celebration", moods: ["Party", "EDM", "Festival"] },
  { id: "african", label: "African Drums", moods: ["Heritage", "Festival"] },
  { id: "corporate", label: "Corporate", moods: ["Summit", "Presentation"] },
  { id: "funeral", label: "Funeral / Memorial", moods: ["Piano", "Violin", "Choir"] },
  { id: "muslim", label: "Islamic", moods: ["Soft Instrumental"] },
  { id: "instrumentals", label: "Instrumentals", moods: ["Ambient", "Cinematic", "Travel"] },
  { id: "nature", label: "Nature", moods: ["Forest", "Ocean", "Rain"] },
] as const;

export function getAudioTrackById(id: string): MusicLibraryTrack | undefined {
  return AUDIO_EXPERIENCE_CATALOG.find((t) => t.id === id);
}

export function getAudioTracksByCategory(category: string): MusicLibraryTrack[] {
  return AUDIO_EXPERIENCE_CATALOG.filter((t) => t.category === category);
}

/** All catalog tracks for library UI (static + DB merge). */
export function getCatalogLibraryTracks(): MusicLibraryTrack[] {
  return AUDIO_EXPERIENCE_CATALOG.map((t) => ({ ...t, artist: "Celeventic Library" }));
}

export function buildMusicSelectionFromTrack(
  trackId: string,
  options?: Partial<MusicSelection>
): MusicSelection | null {
  const track = getAudioTrackById(trackId);
  if (!track) return null;
  const duration = track.durationSec ?? 120;
  return {
    source: "library",
    libraryTrackId: track.id,
    url: track.url,
    title: track.title,
    startSec: 0,
    endSec: Math.min(duration, 90),
    originalDurationSec: duration,
    autoPlay: true,
    loop: true,
    volume: 0.45,
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
  const byId = trackId ? buildMusicSelectionFromTrack(trackId) : null;
  if (byId) return byId;
  if (category) {
    const catTrack = getAudioTracksByCategory(category)[0];
    if (catTrack) return buildMusicSelectionFromTrack(catTrack.id);
  }
  return buildMusicSelectionFromTrack("wedding-romantic");
}
