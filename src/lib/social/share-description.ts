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
 * Never names an organizer, RSVP contact, or CRM host. WhatsApp already
 * shows the event title — this line only restates the invitation.
 */
export function buildShareDescription(params: {
  hostName?: string | null;
  title: string;
}): string {
  const title = params.title?.trim() || "this celebration";
  return truncateForShare(`You're invited to ${title}.`);
}
