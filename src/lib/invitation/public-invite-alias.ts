/** Pretty public path for the published Edwin & Lordina invitation. */
export const EDWIN_PUBLIC_INVITE_PATH = "edwin-and-lordina";

/** Guest link already sent. It keeps working beside the public path. */
export const EDWIN_PUBLISHED_INVITE_LINK = "ihJPaMQxfFCRK21YPJwgGvhxFzqqP7oK";

const ALIASES: Record<string, string> = {
  [EDWIN_PUBLIC_INVITE_PATH]: EDWIN_PUBLISHED_INVITE_LINK,
};

export function publicInviteAliasTarget(link: string): string | null {
  const key = link.trim().toLowerCase();
  return ALIASES[key] ?? null;
}

export function isPublicInviteAlias(requested: string, uniqueLink: string): boolean {
  return publicInviteAliasTarget(requested) === uniqueLink;
}

/**
 * Exact uniqueLink values that identify the same published invitation.
 * Pretty path and opaque token both have to resolve on live and localhost.
 */
export function inviteLinkIdentityKeys(link: string): string[] {
  const key = link.trim();
  if (!key) return [];
  const keys = new Set<string>([key]);
  const alias = publicInviteAliasTarget(key);
  if (alias) keys.add(alias);
  if (key === EDWIN_PUBLISHED_INVITE_LINK) keys.add(EDWIN_PUBLIC_INVITE_PATH);
  return [...keys];
}

/** Guest-facing `/invite/{path}` segment. Pretty URL wins when one exists. */
export function guestFacingInviteLink(link: string): string {
  const key = link.trim();
  if (!key) return key;
  if (key === EDWIN_PUBLISHED_INVITE_LINK) return EDWIN_PUBLIC_INVITE_PATH;
  if (key.toLowerCase() === EDWIN_PUBLIC_INVITE_PATH) return EDWIN_PUBLIC_INVITE_PATH;
  return key;
}
