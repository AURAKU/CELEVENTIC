/**
 * Capability matrix for the invitation wishes guestbook.
 *
 * - Anyone may add a wish (public guestbook).
 * - Only organizers / platform admins may edit or delete wishes.
 * - Guests (including authors) never get edit or delete.
 *
 * Kept free of Node/Prisma imports so client UI can share the same rules.
 */
export type WishCapabilities = {
  canAdd: boolean;
  canDelete: boolean;
  canEdit: boolean;
};

export function resolveWishCapabilities(input: {
  isModerator: boolean;
  /** @deprecated Author tokens no longer grant delete. Kept for call-site compatibility. */
  hasValidAuthorToken?: boolean;
}): WishCapabilities {
  return {
    canAdd: true,
    canDelete: input.isModerator,
    canEdit: input.isModerator,
  };
}

/**
 * Delete affordance: organizers/admins only.
 * Guests never see trash — wishes stay on the invitation for everyone.
 */
export function viewerCanDeleteWish(input: {
  canModerate: boolean;
  /** @deprecated Ignored — author tokens no longer unlock delete. */
  ownedToken?: string | null;
}): boolean {
  return resolveWishCapabilities({
    isModerator: input.canModerate,
  }).canDelete;
}

/** Edit affordance is organizer/admin only — guests never get edit UI. */
export function viewerCanEditWish(canModerate: boolean): boolean {
  return resolveWishCapabilities({
    isModerator: Boolean(canModerate),
  }).canEdit;
}
