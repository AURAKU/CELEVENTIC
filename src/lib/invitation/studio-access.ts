/**
 * Single source of truth for "can this order be opened in Design Studio?".
 *
 * Going live is not a one-way door: a published invitation stays fully
 * editable so hosts can fix a venue, swap photos or re-theme the whole thing
 * while guests already hold the link. Only unpaid and archived orders are
 * gated — everything past checkout keeps its Studio.
 */
export const STUDIO_UNLOCKED_STATUSES = new Set([
  "PAID",
  "IN_PRODUCTION",
  "APPROVED",
  "PUBLISHED",
  "REVISION_REQUESTED",
]);

export function isStudioUnlocked(status: string | null | undefined): boolean {
  return Boolean(status && STUDIO_UNLOCKED_STATUSES.has(status));
}

/** A published order already has a live guest URL behind it. */
export function isLiveInvitation(order: {
  status?: string | null;
  shareUrl?: string | null;
}): boolean {
  return Boolean(order.shareUrl) || order.status === "PUBLISHED";
}
