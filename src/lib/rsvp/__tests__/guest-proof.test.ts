import test from "node:test";
import assert from "node:assert/strict";
import { guestMatchesInvitationProof, rsvpGuestProofValid } from "../guest-proof";

test("guestId-only RSVP is rejected", () => {
  assert.equal(rsvpGuestProofValid({}), false);
  assert.equal(rsvpGuestProofValid({ invitationId: "inv_1" }), true);
});

test("guest must belong to the proven invitation", () => {
  const guest = {
    invitationId: "inv_1",
    qrToken: "tok",
    invitationUniqueLink: "abc",
  };
  assert.equal(guestMatchesInvitationProof(guest, { invitationId: "inv_1" }), true);
  assert.equal(guestMatchesInvitationProof(guest, { invitationId: "inv_other" }), false);
  assert.equal(guestMatchesInvitationProof(guest, { qrToken: "tok" }), true);
  assert.equal(guestMatchesInvitationProof(guest, { uniqueLink: "abc" }), true);
});
