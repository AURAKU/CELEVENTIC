/** Public RSVP by guestId must prove possession of the invitation, not just the id. */
export function rsvpGuestProofValid(input: {
  invitationId?: string | null;
  uniqueLink?: string | null;
  qrToken?: string | null;
}): boolean {
  return Boolean(input.invitationId?.trim() || input.uniqueLink?.trim() || input.qrToken?.trim());
}

export function guestMatchesInvitationProof(guest: {
  invitationId: string | null;
  qrToken: string | null;
  invitationUniqueLink: string | null;
}, proof: { invitationId?: string | null; uniqueLink?: string | null; qrToken?: string | null }): boolean {
  if (proof.qrToken && guest.qrToken && proof.qrToken === guest.qrToken) return true;
  if (proof.uniqueLink && guest.invitationUniqueLink && proof.uniqueLink === guest.invitationUniqueLink) {
    return true;
  }
  if (proof.invitationId && guest.invitationId && proof.invitationId === guest.invitationId) {
    return true;
  }
  return false;
}
