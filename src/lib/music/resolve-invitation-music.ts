import type { InvitationDesignConfig } from "@/types/invitation-design";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { buildMusicSelectionForLayout, getLayoutMusicProfile } from "@/lib/invitation/layout-music-identity";
import { resolveDefaultMusicForLayout } from "@/lib/music/audio-experience-catalog";
import type { MusicSelection } from "@/lib/music/music-types";
import { parseMusicSelection } from "@/lib/music/validate-selection";

export interface ResolveInvitationMusicInput {
  orderSelection?: unknown;
  legacyMusicUrl?: string | null;
  design?: InvitationDesignConfig | null;
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

/**
 * Single resolver for preview + live invites:
 * order selection → legacy URL → template DNA default track.
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

  if (input.allowDnaFallback === false || !input.design) {
    return { musicSelection: null, hasMusic: false };
  }

  const enriched = enrichDesignWithExperienceDNA(input.design);
  const dnaMusic = resolveDefaultMusicForLayout(
    enriched.layout ?? "classic-gold",
    enriched.experience?.defaultAudioTrackId,
    enriched.experience?.defaultAudioCategory
  );

  if (dnaMusic) {
    return { musicSelection: dnaMusic, hasMusic: true };
  }

  const fallback = buildMusicSelectionForLayout("classic-gold");
  return { musicSelection: fallback, hasMusic: true };
}
