import type { InvitationDesignConfig } from "@/types/invitation-design";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { buildMusicSelectionForLayout } from "@/lib/invitation/layout-music-identity";
import { resolveDefaultMusicForLayout } from "@/lib/music/audio-experience-catalog";
import type { MusicSelection } from "@/lib/music/music-types";
import { parseMusicSelection } from "@/lib/music/validate-selection";

export interface LibraryMusicTrackRef {
  id: string;
  title: string;
  artist?: string | null;
  url: string;
  durationSec?: number | null;
  isActive?: boolean;
}

export interface ResolveInvitationMusicInput {
  orderSelection?: unknown;
  legacyMusicUrl?: string | null;
  design?: InvitationDesignConfig | null;
  /** Catalog SKU slug — Wave 1 templates reuse layouts and need per-SKU audio */
  catalogSlug?: string | null;
  /** Event-level default from Invitation Music Library */
  eventDefaultTrack?: LibraryMusicTrackRef | null;
  /** Catalog template default from Invitation Music Library */
  templateDefaultTrack?: LibraryMusicTrackRef | null;
  /** When false, skip DNA defaults (rare — e.g. explicit opt-out) */
  allowDnaFallback?: boolean;
}

export interface ResolvedInvitationMusic {
  musicSelection: MusicSelection | null;
  hasMusic: boolean;
}

function legacyUrlToSelection(url: string): MusicSelection {
  return {
    source: "upload",
    url,
    title: "Event music",
    startSec: 0,
    endSec: 90,
    autoPlay: true,
    loop: true,
    volume: 0.45,
    fadeInSec: 1.5,
    fadeOutSec: 1,
  };
}

/** Map a library track (already trimmed clip or full file) to a playback selection. */
export function libraryTrackToSelection(track: LibraryMusicTrackRef): MusicSelection | null {
  if (!track?.url || track.isActive === false) return null;
  const duration =
    track.durationSec != null && Number.isFinite(track.durationSec) && track.durationSec > 0
      ? track.durationSec
      : 90;
  return {
    source: "library",
    libraryTrackId: track.id,
    url: track.url,
    title: track.artist ? `${track.title} — ${track.artist}` : track.title,
    startSec: 0,
    endSec: duration,
    originalDurationSec: duration,
    autoPlay: true,
    loop: true,
    volume: 0.45,
    fadeInSec: 1.5,
    fadeOutSec: 1,
  };
}

/**
 * Single resolver for preview + live invites:
 * order selection → legacy URL → event library default → template library default → DNA.
 */
export function resolveInvitationMusic(input: ResolveInvitationMusicInput): ResolvedInvitationMusic {
  const parsed = parseMusicSelection(input.orderSelection);
  if (parsed?.url) {
    return { musicSelection: parsed, hasMusic: true };
  }

  const legacy = input.legacyMusicUrl?.trim();
  if (legacy && /^(\/|https?:)/.test(legacy)) {
    return { musicSelection: legacyUrlToSelection(legacy), hasMusic: true };
  }

  const fromEvent = input.eventDefaultTrack
    ? libraryTrackToSelection(input.eventDefaultTrack)
    : null;
  if (fromEvent) {
    return { musicSelection: fromEvent, hasMusic: true };
  }

  const fromTemplate = input.templateDefaultTrack
    ? libraryTrackToSelection(input.templateDefaultTrack)
    : null;
  if (fromTemplate) {
    return { musicSelection: fromTemplate, hasMusic: true };
  }

  if (input.allowDnaFallback === false || !input.design) {
    return { musicSelection: null, hasMusic: false };
  }

  const enriched = enrichDesignWithExperienceDNA(input.design);
  const dnaMusic = resolveDefaultMusicForLayout(
    enriched.layout ?? "classic-gold",
    enriched.experience?.defaultAudioTrackId,
    enriched.experience?.defaultAudioCategory,
    input.catalogSlug
  );

  if (dnaMusic) {
    return { musicSelection: dnaMusic, hasMusic: true };
  }

  const fallback = buildMusicSelectionForLayout("classic-gold");
  return { musicSelection: fallback, hasMusic: true };
}
