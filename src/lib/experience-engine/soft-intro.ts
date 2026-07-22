/**
 * Platform soft intro — Celeventic-branded gate before template DNA intros / reveals.
 *
 * Live sequence (typical):
 *   soft-intro → (template intro) → tap-to-begin → opening reveal → invitation
 * Curtain openings (e.g. Kente Royale / curtain-wedding) own the tap beat:
 *   soft-intro → curtain closed (await touch) → slow open → invitation
 */

export const SOFT_INTRO_DURATION_MS = 2200;
export const SOFT_INTRO_REDUCED_MOTION_MS = 800;
export const SOFT_INTRO_EXIT_MS = 420;
export const SOFT_INTRO_FALLBACK_MS = 4000;

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

/** Hold duration before auto-advance; reduced-motion gets a short static brand hold. */
export function softIntroHoldMs(reducedMotion: boolean): number {
  return reducedMotion ? SOFT_INTRO_REDUCED_MOTION_MS : SOFT_INTRO_DURATION_MS;
}
