import type { MusicLibraryTrack, MusicSelection } from "@/lib/music/music-types";

/** Premium audio catalog — diverse moods per category (Mixkit royalty-free previews). */
export const AUDIO_EXPERIENCE_CATALOG: MusicLibraryTrack[] = [
  // Luxury Piano
  { id: "luxury-piano-romance", title: "Romantic Whispers", category: "piano", url: "https://assets.mixkit.co/music/preview/mixkit-romantic-whispers-34.mp3", durationSec: 120 },
  { id: "piano-garden", title: "Garden Serenade", category: "piano", url: "https://assets.mixkit.co/music/preview/mixkit-piano-reflections-22.mp3", durationSec: 120 },
  { id: "piano-elegance", title: "Evening Elegance", category: "piano", url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3", durationSec: 120 },

  // Violin & Strings
  { id: "violin-elegance", title: "Solo Violin Elegance", category: "violin", url: "https://assets.mixkit.co/music/preview/mixkit-silent-descent-ambient-442.mp3", durationSec: 120 },
  { id: "strings-garden", title: "String Quartet Garden", category: "strings", url: "https://assets.mixkit.co/music/preview/mixkit-a-very-happy-christmas-897.mp3", durationSec: 120 },
  { id: "strings-crystal", title: "Crystal Strings", category: "strings", url: "https://assets.mixkit.co/music/preview/mixkit-spirit-in-the-woods-138.mp3", durationSec: 120 },
  { id: "orchestra-royal", title: "Royal Orchestra", category: "strings", url: "https://assets.mixkit.co/music/preview/mixkit-a-very-happy-christmas-897.mp3", durationSec: 120 },

  // Jazz & Guitar
  { id: "jazz-soft-lounge", title: "Soft Jazz Lounge", category: "jazz", url: "https://assets.mixkit.co/music/preview/mixkit-jazz-comedy-434.mp3", durationSec: 120 },
  { id: "jazz-midnight", title: "Midnight Jazz", category: "jazz", url: "https://assets.mixkit.co/music/preview/mixkit-jazz-comedy-434.mp3", durationSec: 120 },
  { id: "acoustic-warm", title: "Warm Acoustic Guitar", category: "guitar", url: "https://assets.mixkit.co/music/preview/mixkit-guitar-vibes-37.mp3", durationSec: 120 },

  // Celebration & Party
  { id: "party-edm-energy", title: "EDM Party Energy", category: "celebration", url: "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3", durationSec: 120 },
  { id: "happy-celebration", title: "Happy Celebration", category: "celebration", url: "https://assets.mixkit.co/music/preview/mixkit-happy-celebration-438.mp3", durationSec: 120 },

  // African & Traditional
  { id: "african-drums-celebration", title: "African Drums", category: "african", url: "https://assets.mixkit.co/music/preview/mixkit-tribal-festival-419.mp3", durationSec: 120 },

  // Corporate & Ambient
  { id: "corporate-summit", title: "Summit Presentation", category: "corporate", url: "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3", durationSec: 120 },
  { id: "ambient-cinematic", title: "Cinematic Ambient", category: "instrumentals", url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3", durationSec: 120 },
  { id: "travel-wanderlust", title: "Wanderlust Journey", category: "instrumentals", url: "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3", durationSec: 120 },

  // Funeral & Memorial
  { id: "memorial-piano", title: "Memorial Piano", category: "funeral", url: "https://assets.mixkit.co/music/preview/mixkit-silent-descent-ambient-442.mp3", durationSec: 120 },
  { id: "memorial-violin", title: "Memorial Violin", category: "funeral", url: "https://assets.mixkit.co/music/preview/mixkit-silent-descent-ambient-442.mp3", durationSec: 120 },

  // Islamic
  { id: "islamic-soft-instrumental", title: "Soft Instrumental", category: "muslim", url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3", durationSec: 120 },

  // Nature
  { id: "nature-forest", title: "Forest Ambience", category: "nature", url: "https://assets.mixkit.co/music/preview/mixkit-spirit-in-the-woods-138.mp3", durationSec: 120 },
  { id: "nature-ocean", title: "Ocean Waves", category: "nature", url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3", durationSec: 120 },

  // Wedding general
  { id: "wedding-romantic", title: "Romantic Wedding", category: "wedding", url: "https://assets.mixkit.co/music/preview/mixkit-romantic-whispers-34.mp3", durationSec: 120 },
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

export function buildMusicSelectionFromTrack(
  trackId: string,
  options?: Partial<MusicSelection>
): MusicSelection | null {
  const track = getAudioTrackById(trackId);
  if (!track) return null;
  const duration = track.durationSec ?? 60;
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
