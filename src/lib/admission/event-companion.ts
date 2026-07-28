/**
 * Event Companion (post-admission) URL helpers.
 * Admitted guests land here instead of replaying the invitation ceremony
 * until an organiser resets admission.
 */

export function buildEventCompanionHref(
  uniqueLink: string,
  guestQrToken?: string | null
): string {
  const base = `/invite/${encodeURIComponent(uniqueLink)}/event-day`;
  const token = guestQrToken?.trim();
  return token ? `${base}?guest=${encodeURIComponent(token)}` : base;
}

/** True when the live invite should skip ceremony and open the companion only. */
export function shouldOpenEventCompanionOnly(admission: {
  postAdmissionEnabled: boolean;
  canAccessPortal: boolean;
} | null | undefined): boolean {
  return Boolean(admission?.postAdmissionEnabled && admission.canAccessPortal);
}
