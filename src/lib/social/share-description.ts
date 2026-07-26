const MAX_SHARE_DESCRIPTION_LENGTH = 140;

/**
 * Truncates share copy to a WhatsApp/social-friendly length without cutting a
 * word in half, appending an ellipsis when it does have to cut.
 */
export function truncateForShare(text: string, maxLength = MAX_SHARE_DESCRIPTION_LENGTH): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;

  const sliced = trimmed.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const safe = lastSpace > maxLength * 0.4 ? sliced.slice(0, lastSpace) : sliced;
  return `${safe.trimEnd()}…`;
}

/**
 * Builds the guest-facing share description used for `og:description` /
 * `twitter:description` on invite and event-site link previews.
 *
 * Hosts fill `Event.description` / `InvitationOrder.story` with a long
 * personal narrative meant to be read *inside* the invitation experience —
 * never as the link-preview blurb. Surfacing that text verbatim in
 * `generateMetadata` meant WhatsApp/social previews dumped a paragraph of
 * story-entry-field prose next to the couple's photo instead of telling the
 * guest who's inviting them. This always leads with the couple/host name
 * (`Event.hostName`, already formatted as `"Name1 & Name2"` for weddings by
 * `PublishedInvitationSyncService`) so the preview reads like an invitation
 * teaser that sets up the experience ahead, and is length-capped for
 * WhatsApp's compact preview card.
 */
export function buildShareDescription(params: {
  hostName?: string | null;
  title: string;
}): string {
  const host = params.hostName?.trim();
  if (!host) {
    return truncateForShare(`You're invited to ${params.title} on Celeventic — tap to open your invitation.`);
  }

  const verb = host.includes("&") ? "invite" : "invites";
  return truncateForShare(`${host} ${verb} you — tap to open your invitation and step into the celebration.`);
}
