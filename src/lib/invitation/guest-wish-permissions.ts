/**
 * Capability matrix for the invitation wishes guestbook.
 *
 * - Anyone may add a wish (public guestbook).
 * - Authors may delete only their own wish (via one-time deleteToken).
 * - Organizers / platform admins may add, edit, and delete any wish.
 * - Guests never get edit (including on their own wish).
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
  hasValidAuthorToken: boolean;
}): WishCapabilities {
  return {
    canAdd: true,
    canDelete: input.isModerator || input.hasValidAuthorToken,
    canEdit: input.isModerator,
  };
}

/**
 * Client delete affordance: organizers/admins see trash on every card; guests
 * see trash only for wishes whose deleteToken they hold (created on this
 * device). Never key off guestId/name alone — that would incorrectly expose
 * delete on other guests' wishes.
 */
export function viewerCanDeleteWish(input: {
  canModerate: boolean;
  ownedToken?: string | null;
}): boolean {
  return resolveWishCapabilities({
    isModerator: input.canModerate,
    hasValidAuthorToken: Boolean(input.ownedToken),
  }).canDelete;
}

/** Edit affordance is organizer/admin only — guests never get edit UI. */
export function viewerCanEditWish(canModerate: boolean): boolean {
  return resolveWishCapabilities({
    isModerator: Boolean(canModerate),
    hasValidAuthorToken: false,
  }).canEdit;
}
