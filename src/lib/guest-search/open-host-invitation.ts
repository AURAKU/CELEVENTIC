import { nameKey } from "@/lib/guest-import/name";
import { looksLikeEventTitle } from "@/lib/invitation-features/place-card";

/**
 * Open / general template invitations are the published ceremony link that
 * anyone can RSVP on. They must stay guestless (or only briefly hold guests
 * pending promotion) so each self-registered person gets their own CRM card
 * and shareable invite URL.
 */
export function isOpenHostInvitation(input: {
  name: string;
  isGeneralPass?: boolean | null;
  eventTitle: string;
  guests: Array<{ name: string }>;
}): boolean {
  if (input.isGeneralPass) return false;
  if (looksLikeEventTitle(input.name)) return true;
  if (nameKey(input.name) === nameKey(input.eventTitle)) return true;
  if (input.guests.length === 0) return true;
  return !input.guests.some((guest) => nameKey(guest.name) === nameKey(input.name));
}
