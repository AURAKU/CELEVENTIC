/** User-selected invitation music (1 to 2 minute clip) */
export interface MusicSelection {
  source: "library" | "upload";
  libraryTrackId?: string;
  url: string;
  title?: string;
  startSec: number;
  endSec: number;
  originalDurationSec?: number;
  /** Playback options for guest invite */
  autoPlay?: boolean;
  loop?: boolean;
  volume?: number; // 0 to 1
  fadeInSec?: number;
  fadeOutSec?: number;
}

export interface MusicLibraryTrack {
  id: string;
  title: string;
  artist?: string | null;
  category: string;
  url: string;
  durationSec?: number | null;
}
