/**
 * Platform soft intro — Celeventic-branded cinematic gate before tap-to-begin / reveals.
 *
 * Live sequence (typical):
 *   brand video intro → tap-to-begin → opening reveal → invitation
 * Curtain openings (e.g. Kente Royale / curtain-wedding) own the tap beat:
 *   brand video intro → curtain closed (await touch) → slow open → invitation
 *
 * The brand MP4 is the only invitation intro. Template DNA intro variants and
 * organizer welcome photos are not used on this beat.
 */

/** Canonical Celeventic invitation intro — every template, every guest. */
export const CELEVENTIC_INVITATION_INTRO_VIDEO = "/brand/celeventic-invitation-intro.mp4?v=20260728b";
export const CELEVENTIC_INVITATION_INTRO_POSTER = "/brand/celeventic-invitation-intro-poster.jpg?v=20260728b";

/** Fallback hold when the video element cannot report duration (reduced motion / errors). */
export const SOFT_INTRO_DURATION_MS = 12_500;
export const SOFT_INTRO_REDUCED_MOTION_MS = 800;
export const SOFT_INTRO_EXIT_MS = 720;
/** Hard ceiling so a stalled video never blanks the guest forever (~2× clip length). */
export const SOFT_INTRO_FALLBACK_MS = 28_000;

/**
 * Returning guest still watches the full brand clip; Skip appears sooner so
 * they can move on — the ceremony after Tap to Begin is never auto-rushed.
 */
export const SOFT_INTRO_RETURN_HOLD_MS = 12_500;
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
  /** @deprecated DNA intro variants are retired — brand video is the only intro. */
  introEnabled?: boolean;
  needsTapGate?: boolean;
  showReveal?: boolean;
}

export interface SoftIntroAtmosphereInput {
  /** Dedicated pre-invite welcome photo (Studio "intro" upload) — Tap to Begin only. */
  introImageUrl?: string | null;
  backgroundImageUrl?: string | null;
  coverImageUrl?: string | null;
  mediaUrl?: string | null;
  layoutFallbackUrl?: string | null;
}

/**
 * Whether the platform brand-video intro should mount.
 *
 * Prefer explicit `skipSoftIntro`. When omitted, fall back to `skipIntro` so
 * tiny catalogue thumbs stay quiet — but callers that set `skipIntro` only to
 * retire DNA (while still wanting the brand MP4) must pass
 * `skipSoftIntro={false}`.
 */
export function shouldShowSoftIntro(input: SoftIntroGateInput): boolean {
  if (typeof input.skipSoftIntro === "boolean") return !input.skipSoftIntro;
  return !(input.skipIntro ?? false);
}

/** Resolve the first phase of the live invite pipeline. */
export function resolveInitialInvitePhase(input: SoftIntroGateInput): InvitePipelinePhase {
  if (shouldShowSoftIntro(input)) return "soft-intro";
  if (input.needsTapGate) return "tap-to-begin";
  if (input.showReveal) return "reveal";
  return "portal";
}

/**
 * Phase after the brand video intro completes (or is skipped).
 * Template DNA intros are never shown — the MP4 is the only intro.
 */
export function phaseAfterSoftIntro(input: SoftIntroGateInput): InvitePipelinePhase {
  if (input.needsTapGate) return "tap-to-begin";
  if (input.showReveal) return "reveal";
  return "portal";
}

/**
 * Hold duration before auto-advance when video cannot drive timing
 * (reduced motion / missing media). Returning guests still get the full
 * brand beat length — only the Skip control appears sooner in the UI.
 */
export function softIntroHoldMs(reducedMotion: boolean, _quick = false): number {
  return reducedMotion ? SOFT_INTRO_REDUCED_MOTION_MS : SOFT_INTRO_DURATION_MS;
}

/**
 * Atmosphere for Tap to Begin / reveal backdrops — not used by the brand video intro.
 * Prefer the dedicated welcome photo, then live media, then cover, then layout art.
 */
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
