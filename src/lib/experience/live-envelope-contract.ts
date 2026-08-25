/**
 * Live envelope ceremony contract.
 *
 * Normal LIVE guest invitations must wait indefinitely on a sealed envelope
 * until the guest explicitly taps/clicks. Auto-open is reserved for
 * catalogue / studio / demo preview mounts that opt in.
 */

import { isPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";

export interface LiveGuestMountInput {
  /** Framed catalogue / studio / template preview shell. */
  embedded?: boolean;
  /** Analytics skipped on preview / demo mounts. */
  skipAnalytics?: boolean;
  invitationId?: string | null;
  uniqueLink?: string | null;
}

/**
 * True for a production `/invite/[link]` guest mount (and equivalents).
 * Preview / studio / embedded catalogue mounts are never live guests.
 */
export function isLiveGuestInviteMount(input: LiveGuestMountInput): boolean {
  if (input.embedded) return false;
  if (input.skipAnalytics) return false;
  const id = input.invitationId?.trim() ?? "";
  const link = input.uniqueLink?.trim() ?? "";
  if (id && isPreviewInvitationId(id)) return false;
  if (link === "preview" || link.startsWith("preview-")) return false;
  return true;
}

/**
 * Resolve whether the envelope may auto-open after mount.
 * LIVE guests: always false — even if a stale caller passes autoOpenReveal=true.
 * Preview/demo: honors explicit autoOpenReveal.
 */
export function resolveEnvelopeAutoOpen(input: {
  isLiveGuest: boolean;
  autoOpenReveal?: boolean;
}): boolean {
  if (input.isLiveGuest) return false;
  return Boolean(input.autoOpenReveal);
}

/**
 * EnvelopeCollectionReveal gate: auto-open only when explicitly requested
 * and not a static sealed preview tile.
 */
export function shouldEnvelopeAutoOpen(input: {
  autoOpen?: boolean;
  staticPreview?: boolean;
}): boolean {
  return Boolean(input.autoOpen) && !input.staticPreview;
}

export interface ShowRevealInput {
  isFuneralCollection: boolean;
  skipReveal?: boolean;
  revealEnabled?: boolean;
  openingExperience?: string | null;
  /** studio.revealMode */
  revealMode?: string | null;
}

/**
 * Whether the opening reveal ceremony (envelope/curtain/…) should run.
 * Funeral/memorial always keeps the ceremony unless skipReveal or revealMode=none.
 */
export function resolveShowReveal(input: ShowRevealInput): boolean {
  if (input.skipReveal) return false;
  if (input.revealMode === "none") return false;

  if (input.isFuneralCollection) {
    // Memorial guests keep the envelope even when legacy DNA set revealEnabled=false.
    return true;
  }

  return Boolean(input.revealEnabled) && input.openingExperience !== "none";
}
