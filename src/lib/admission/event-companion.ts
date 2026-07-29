/**
 * Event Companion (post-admission) URL helpers.
 * Admitted guests land here instead of replaying the invitation ceremony
 * until an organiser resets admission.
 *
 * Gate rule: companion opens only after a successful QR scan or manual
 * admission code by an organiser/admin (admittedCount > 0 + portal unlock).
 *
 * Guests may still reopen the invitation ceremony via `?view=invite` while
 * admitted; after a reset, the bare invite link plays the full intro again.
 */

export function buildEventCompanionHref(
  uniqueLink: string,
  guestQrToken?: string | null
): string {
  const base = `/invite/${encodeURIComponent(uniqueLink)}/event-day`;
  const token = guestQrToken?.trim();
  return token ? `${base}?guest=${encodeURIComponent(token)}` : base;
}

/**
 * Invitation ceremony URL — used from Event Companion "View invitation".
 * `view=invite` prevents the admitted-guest redirect back to companion.
 */
export function buildInviteCeremonyHref(
  uniqueLink: string,
  guestQrToken?: string | null
): string {
  const params = new URLSearchParams();
  params.set("view", "invite");
  const token = guestQrToken?.trim();
  if (token) params.set("guest", token);
  return `/invite/${encodeURIComponent(uniqueLink)}?${params.toString()}`;
}

/** True when the guest explicitly asked to reopen the invitation ceremony. */
export function wantsInviteCeremonyView(
  searchParams: { view?: string | null } | null | undefined
): boolean {
  const view = searchParams?.view?.trim().toLowerCase();
  return view === "invite" || view === "ceremony";
}

/** True when the live invite should skip ceremony and open the companion only. */
export function shouldOpenEventCompanionOnly(admission: {
  postAdmissionEnabled: boolean;
  canAccessPortal: boolean;
  admittedCount?: number;
} | null | undefined): boolean {
  return Boolean(
    admission?.postAdmissionEnabled &&
      admission.canAccessPortal &&
      (admission.admittedCount ?? 0) > 0
  );
}
