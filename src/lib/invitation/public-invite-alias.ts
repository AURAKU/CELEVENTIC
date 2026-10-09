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
