import { EDWIN_PUBLIC_INVITE_PATH, EDWIN_PUBLISHED_INVITE_LINK } from "@/lib/invitation/public-invite-alias";

export type CanonicalInviteCandidate = {
  slug: string;
  uniqueLink: string;
  isGeneralPass?: boolean;
  templateId?: string | null;
};

/** Guest-facing path for a known published board (pretty URL, not the opaque token). */
export function publicPathForInviteLink(link: string): string | null {
  const key = link.trim();
  if (!key) return null;
  if (key.toLowerCase() === EDWIN_PUBLIC_INVITE_PATH) return EDWIN_PUBLIC_INVITE_PATH;
  if (key === EDWIN_PUBLISHED_INVITE_LINK) return EDWIN_PUBLIC_INVITE_PATH;
  return null;
}

function looksLikePublicSlug(value: string): boolean {
  const slug = value.trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(slug) && slug.length <= 80;
}

/**
 * Path segment for `/invite/{path}` that opens the event's main published
 * invitation, not a later guest pass or general-admission token.
 */
export function canonicalGuestInvitePath(
  eventSlug: string | null | undefined,
  invitations: CanonicalInviteCandidate[]
): string | null {
  const live = invitations.filter((row) => row.uniqueLink?.trim());
  if (!live.length) return null;

  for (const row of live) {
    const pretty = publicPathForInviteLink(row.uniqueLink) ?? publicPathForInviteLink(row.slug);
    if (pretty) return pretty;
  }

  const slug = (eventSlug || "").trim().toLowerCase();
  if (slug) {
    const matched = live.find(
      (row) => row.slug.toLowerCase() === slug || row.uniqueLink.toLowerCase() === slug
    );
    if (matched) return looksLikePublicSlug(matched.slug) ? matched.slug : matched.uniqueLink;
  }

  const designed = live.filter((row) => !row.isGeneralPass);
  const prettySlug = designed.find((row) => looksLikePublicSlug(row.slug));
  if (prettySlug) return prettySlug.slug;

  const withTemplate = designed.find((row) => row.templateId);
  if (withTemplate) {
    return looksLikePublicSlug(withTemplate.slug) ? withTemplate.slug : withTemplate.uniqueLink;
  }

  const main = designed[0] ?? live[0]!;
  return looksLikePublicSlug(main.slug) ? main.slug : main.uniqueLink;
}

export function canonicalGuestInviteHref(
  eventSlug: string | null | undefined,
  invitations: CanonicalInviteCandidate[]
): string | null {
  const path = canonicalGuestInvitePath(eventSlug, invitations);
  return path ? `/invite/${encodeURIComponent(path)}` : null;
}
