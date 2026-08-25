export type MemoryCommentCapabilities = {
  canAdd: boolean;
  canDelete: boolean;
};

export function resolveMemoryCommentCapabilities(input: {
  isModerator: boolean;
  hasValidAuthorToken?: boolean;
}): MemoryCommentCapabilities {
  return {
    canAdd: true,
    canDelete: input.isModerator || Boolean(input.hasValidAuthorToken),
  };
}

export function viewerCanDeleteMemoryComment(input: {
  canModerate: boolean;
  ownedToken?: string | null;
}): boolean {
  return resolveMemoryCommentCapabilities({
    isModerator: input.canModerate,
    hasValidAuthorToken: Boolean(input.ownedToken),
  }).canDelete;
}

/**
 * Media delete:
 * - Organizers / platform admins: any upload
 * - Guests: only uploads they own (matching uploaderGuestKey / guest identity)
 */
export function viewerCanDeleteMemoryMedia(input: {
  canModerate: boolean;
  isOwner?: boolean;
}): boolean {
  return Boolean(input.canModerate) || Boolean(input.isOwner);
}
