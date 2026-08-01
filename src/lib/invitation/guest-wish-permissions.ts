/**
 * Capability matrix for invitation wishes + Thank You guest messages.
 *
 * Invitation guestbook (default):
 * - Anyone may add
 * - Only organizers / platform admins may edit or delete
 *
 * Thank You Page (allowAuthorSelfManage):
 * - Authors with a valid ownership token may edit/delete their own message
 * - Moderators may always edit/delete
 */

export type WishCapabilities = {
  canAdd: boolean;
  canDelete: boolean;
  canEdit: boolean;
};

export function resolveWishCapabilities(input: {
  isModerator: boolean;
  hasValidAuthorToken?: boolean;
  /**
   * When true (Thank You Page / companion write-ups), a valid author token
   * unlocks edit + delete for that message only.
   */
  allowAuthorSelfManage?: boolean;
}): WishCapabilities {
  const authorCanManage =
    Boolean(input.allowAuthorSelfManage) && Boolean(input.hasValidAuthorToken);
  return {
    canAdd: true,
    canDelete: input.isModerator || authorCanManage,
    canEdit: input.isModerator || authorCanManage,
  };
}

/**
 * Delete affordance.
 * - Moderators always
 * - Authors only when self-manage is enabled and they own the token
 */
export function viewerCanDeleteWish(input: {
  canModerate: boolean;
  ownedToken?: string | null;
  allowAuthorSelfManage?: boolean;
}): boolean {
  return resolveWishCapabilities({
    isModerator: input.canModerate,
    hasValidAuthorToken: Boolean(input.ownedToken),
    allowAuthorSelfManage: input.allowAuthorSelfManage,
  }).canDelete;
}

/** Edit affordance — moderators, or authors with self-manage + token. */
export function viewerCanEditWish(
  canModerate: boolean,
  options?: { ownedToken?: string | null; allowAuthorSelfManage?: boolean }
): boolean {
  return resolveWishCapabilities({
    isModerator: Boolean(canModerate),
    hasValidAuthorToken: Boolean(options?.ownedToken),
    allowAuthorSelfManage: options?.allowAuthorSelfManage,
  }).canEdit;
}
