import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findMislinkedGuests, findPassDisplayMismatches } from "../party-leakage";

describe("findMislinkedGuests — all parties, not one pair", () => {
  const eventId = "evt-1";
  const invitations = [
    { id: "inv-a", name: "The OBUAH Family", uniqueLink: "link-a", eventId },
    { id: "inv-b", name: "Akua & Kelly", uniqueLink: "link-b", eventId },
    { id: "inv-c", name: "Mr Kofi and Guest", uniqueLink: "link-c", eventId },
    { id: "inv-d", name: "Ama Mensah", uniqueLink: "link-d", eventId },
  ];

  it("flags a guest from party B attached to party A", () => {
    const findings = findMislinkedGuests({
      eventId,
      invitations,
      guests: [
        { id: "g1", name: "Akua & Kelly", invitationId: "inv-a" },
        { id: "g2", name: "Obuah Member", invitationId: "inv-a" },
      ],
    });
    assert.ok(findings.some((f) => f.guestId === "g1" && f.otherInvitationId === "inv-b"));
    assert.equal(
      findings.some((f) => f.guestId === "g2"),
      false
    );
  });

  it("flags orphans and third-party mix-ups the same way", () => {
    const findings = findMislinkedGuests({
      eventId,
      invitations,
      guests: [
        { id: "g3", name: "Ama Mensah", invitationId: null },
        { id: "g4", name: "Mr Kofi and Guest", invitationId: "inv-d" },
      ],
    });
    const orphan = findings.find((f) => f.kind === "orphan_guest_no_invitation");
    assert.equal(orphan?.otherInvitationId, "inv-d");
    assert.ok(findings.some((f) => f.guestId === "g4" && f.otherInvitationId === "inv-c"));
  });

  it("does not treat same-table family members as cross-party leaks", () => {
    const findings = findMislinkedGuests({
      eventId,
      invitations,
      guests: [
        { id: "g5", name: "Kwame Obuah", invitationId: "inv-a" },
        { id: "g6", name: "Ama Obuah", invitationId: "inv-a" },
      ],
    });
    assert.equal(findings.length, 0);
  });
});

describe("findPassDisplayMismatches", () => {
  it("flags pass labels that belong to another invitation party", () => {
    const eventId = "evt-1";
    const findings = findPassDisplayMismatches({
      eventId,
      invitations: [
        { id: "inv-a", name: "The OBUAH Family", uniqueLink: "a", eventId },
        { id: "inv-b", name: "Akua & Kelly", uniqueLink: "b", eventId },
      ],
      passes: [
        {
          invitationId: "inv-b",
          displayName: "The OBUAH Family",
          code: "1234",
          status: "ACTIVE",
        },
      ],
    });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].otherInvitationId, "inv-a");
  });
});
