/**
 * Platform soft intro — Celeventic-branded cinematic gate before template DNA intros / reveals.
 *
 * Live sequence (typical):
 *   soft-intro → (template intro) → tap-to-begin → opening reveal → invitation
 * Curtain openings (e.g. Kente Royale / curtain-wedding) own the tap beat:
 *   soft-intro → curtain closed (await touch) → slow open → invitation
 */

export const SOFT_INTRO_DURATION_MS = 3200;
export const SOFT_INTRO_REDUCED_MOTION_MS = 800;
export const SOFT_INTRO_EXIT_MS = 560;
export const SOFT_INTRO_FALLBACK_MS = 5200;

/**
 * Returning guest short hold — a guest who has already completed the full
 * ceremony once still gets a real, visible branded beat (never an instant
 * jump straight into mid-invitation), just shorter than the first-visit hold
 * since they don't need the full cinematic sell again.
 */
export const SOFT_INTRO_RETURN_HOLD_MS = 900;
export const SOFT_INTRO_RETURN_REDUCED_MOTION_MS = 400;

/** Optional shared begin label — tap gate owns the visible CTA. Soft intro is silent skip. */
export const SOFT_INTRO_CTA = "Begin";

export type InvitePipelinePhase =
  | "soft-intro"
  | "intro"
  | "tap-to-begin"
  | "reveal"
  | "portal";

export interface SoftIntroGateInput {
  /** Explicit skip; when undefined, falls back to skipIntro (thumbnail / studio previews). */
  skipSoftIntro?: boolean;
  skipIntro?: boolean;
  introEnabled?: boolean;
  needsTapGate?: boolean;
  showReveal?: boolean;
}

export interface SoftIntroAtmosphereInput {
  /** Dedicated pre-invite welcome photo (Studio "intro" upload) — always wins when set. */
  introImageUrl?: string | null;
  backgroundImageUrl?: string | null;
  coverImageUrl?: string | null;
  mediaUrl?: string | null;
  layoutFallbackUrl?: string | null;
}

/**
 * Whether the platform soft intro should mount.
 * Thumbnails that already skip DNA intro also skip soft intro unless overridden.
 */
export function shouldShowSoftIntro(input: SoftIntroGateInput): boolean {
  const skip = input.skipSoftIntro ?? input.skipIntro ?? false;
  return !skip;
}

/** Resolve the first phase of the live invite pipeline. */
export function resolveInitialInvitePhase(input: SoftIntroGateInput): InvitePipelinePhase {
  if (shouldShowSoftIntro(input)) return "soft-intro";
  if (!input.skipIntro && (input.introEnabled ?? true)) return "intro";
  if (input.needsTapGate) return "tap-to-begin";
  if (input.showReveal) return "reveal";
  return "portal";
}

/** Phase after soft intro completes (or is skipped). */
export function phaseAfterSoftIntro(input: SoftIntroGateInput): InvitePipelinePhase {
  if (!input.skipIntro && (input.introEnabled ?? true)) return "intro";
  if (input.needsTapGate) return "tap-to-begin";
  if (input.showReveal) return "reveal";
  return "portal";
}

/**
 * Hold duration before auto-advance; reduced-motion gets a short static brand
 * hold. `quick` shortens the hold further for a returning guest who has
 * already completed the opening once — still a real, visible beat, just brief.
 */
export function softIntroHoldMs(reducedMotion: boolean, quick = false): number {
  if (quick) {
    return reducedMotion ? SOFT_INTRO_RETURN_REDUCED_MOTION_MS : SOFT_INTRO_RETURN_HOLD_MS;
  }
  return reducedMotion ? SOFT_INTRO_REDUCED_MOTION_MS : SOFT_INTRO_DURATION_MS;
}

/** Prefer the dedicated intro photo, then live media, then cover, then layout identity art. */
export function resolveSoftIntroAtmosphere(input: SoftIntroAtmosphereInput): string | null {
  const candidates = [
    input.introImageUrl,
    input.backgroundImageUrl,
    input.coverImageUrl,
    input.mediaUrl,
    input.layoutFallbackUrl,
  ];
  for (const url of candidates) {
    const trimmed = url?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}
