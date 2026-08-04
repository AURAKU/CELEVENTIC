import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterForeignPartyGuests,
  filterPartyOwnedRows,
  formatPartyAdmissionProgress,
  guestBelongsToInvitation,
  looksLikeForeignPartyLabel,
  resolvePublicPartyDisplayName,
  shouldDefaultToEventAccess,
} from "../party-isolation";

describe("guestBelongsToInvitation", () => {
  it("requires an explicit matching invitationId", () => {
    assert.equal(
      guestBelongsToInvitation({ guestInvitationId: "inv-a", invitationId: "inv-a" }),
      true
    );
    assert.equal(
      guestBelongsToInvitation({ guestInvitationId: "inv-b", invitationId: "inv-a" }),
      false
    );
    assert.equal(
      guestBelongsToInvitation({ guestInvitationId: null, invitationId: "inv-a" }),
      false
    );
    assert.equal(
      guestBelongsToInvitation({ guestInvitationId: undefined, invitationId: "inv-a" }),
      false
    );
  });
});

describe("shouldDefaultToEventAccess", () => {
  const base = {
    postAdmissionEnabled: true,
    canAccessPortal: true,
    admittedCount: 2,
    remainingCount: 3,
    state: "PARTIALLY_ADMITTED",
  };

  it("keeps shared party links on the invitation while anyone awaits", () => {
    assert.equal(shouldDefaultToEventAccess(base), false);
  });

  it("opens companion for an admitted member-specific viewer", () => {
    assert.equal(shouldDefaultToEventAccess({ ...base, viewerAdmitted: true }), true);
  });

  it("keeps awaiting members on the invitation", () => {
    assert.equal(shouldDefaultToEventAccess({ ...base, viewerAdmitted: false }), false);
  });

  it("opens companion when the party is fully admitted", () => {
    assert.equal(
      shouldDefaultToEventAccess({
        ...base,
        admittedCount: 5,
        remainingCount: 0,
        state: "ADMITTED",
      }),
      true
    );
  });

  it("never opens companion before any admission", () => {
    assert.equal(
      shouldDefaultToEventAccess({
        postAdmissionEnabled: true,
        canAccessPortal: true,
        admittedCount: 0,
        remainingCount: 5,
        state: "NOT_ADMITTED",
      }),
      false
    );
  });
});

describe("formatPartyAdmissionProgress", () => {
  it("formats partial and complete progress", () => {
    assert.deepEqual(formatPartyAdmissionProgress(2, 5), {
      headline: "2 of 5 guests admitted",
      detail: "3 guests are still awaiting admission.",
      awaitingCount: 3,
    });
    assert.deepEqual(formatPartyAdmissionProgress(5, 5), {
      headline: "5 of 5 guests admitted",
      detail: null,
      awaitingCount: 0,
    });
  });
});

describe("filterPartyOwnedRows", () => {
  it("drops foreign invitation rows and keeps untagged rows from a scoped query", () => {
    const rows = [
      { id: "1", invitationId: "inv-a", name: "The OBUAH Family" },
      { id: "2", invitationId: "inv-b", name: "Akua & Kelly" },
      { id: "3", invitationId: null, name: "Scoped" },
    ];
    const filtered = filterPartyOwnedRows(rows, "inv-a");
    assert.deepEqual(
      filtered.map((r) => r.name),
      ["The OBUAH Family", "Scoped"]
    );
    assert.equal(
      filtered.some((r) => r.name === "Akua & Kelly"),
      false
    );
  });
});

describe("OBUAH vs Akua & Kelly public scrubbing", () => {
  const siblings = [
    { id: "inv-obuah", name: "The OBUAH Family" },
    { id: "inv-akua", name: "Akua & Kelly" },
  ];

  it("1-2. Akua link never surfaces OBUAH guests; OBUAH never surfaces Akua", () => {
    const pollutedOnAkua = [
      { id: "g1", name: "Akua", invitationId: "inv-akua" },
      { id: "g2", name: "Kelly", invitationId: "inv-akua" },
      { id: "g3", name: "The OBUAH Family", invitationId: "inv-akua" },
    ];
    const akuaOnly = filterForeignPartyGuests(pollutedOnAkua, {
      invitationId: "inv-akua",
      invitationName: "Akua & Kelly",
      otherInvitationNames: siblings,
    });
    assert.equal(
      akuaOnly.some((g) => /OBUAH/i.test(g.name)),
      false
    );
    assert.ok(akuaOnly.some((g) => g.name === "Akua"));

    const pollutedOnObuah = [
      { id: "g4", name: "The OBUAH Family", invitationId: "inv-obuah" },
      { id: "g5", name: "Akua & Kelly", invitationId: "inv-obuah" },
    ];
    const obuahOnly = filterForeignPartyGuests(pollutedOnObuah, {
      invitationId: "inv-obuah",
      invitationName: "The OBUAH Family",
      otherInvitationNames: siblings,
    });
    assert.equal(
      obuahOnly.some((g) => /Akua/i.test(g.name)),
      false
    );
  });

  it("rejects foreign pass display labels", () => {
    assert.equal(
      looksLikeForeignPartyLabel("The OBUAH Family", "Akua & Kelly", [
        "The OBUAH Family",
        "Akua & Kelly",
      ]),
      true
    );
    assert.equal(
      looksLikeForeignPartyLabel("Akua & Kelly", "Akua & Kelly", ["The OBUAH Family"]),
      false
    );
  });

  it("public display name stays on the invitation party", () => {
    assert.equal(
      resolvePublicPartyDisplayName({
        invitationName: "Akua & Kelly",
        passDisplayName: "The OBUAH Family",
        otherInvitationNames: ["The OBUAH Family"],
      }),
      "Akua & Kelly"
    );
    assert.equal(
      resolvePublicPartyDisplayName({
        invitationName: "The OBUAH Family",
        passDisplayName: "The OBUAH Family",
        otherInvitationNames: ["Akua & Kelly"],
      }),
      "The OBUAH Family"
    );
  });
});
