/**
 * Replay bridge — lets a template's "replay the opening" control restart the
 * invitation pipeline (soft intro → template intro → reveal) without a page
 * reload. `PremiumInviteWrapper` owns the phase state and listens for this.
 */
export const INVITATION_REPLAY_EVENT = "celeventic:replay-invitation";

export function requestInvitationReplay(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(INVITATION_REPLAY_EVENT));
}

export function onInvitationReplay(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(INVITATION_REPLAY_EVENT, handler);
  return () => window.removeEventListener(INVITATION_REPLAY_EVENT, handler);
}
