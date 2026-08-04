import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEventCompanionHref,
  buildInviteCeremonyHref,
  resolveCompanionPlace,
  resolvePartyAdmissionSurface,
  shouldOpenEventCompanionOnly,
  wantsInviteCeremonyView,
} from "@/lib/admission/event-companion";
import type { PartySeat } from "@/lib/admission/seating-continuity";
import { openingMemoryKey } from "@/lib/experience/opening-visit-memory";
import { filterPartyOwnedRows } from "@/lib/invitation/party-isolation";

describe("event companion routing", () => {
  it("builds companion href with optional guest token", () => {
    assert.equal(buildEventCompanionHref("abc"), "/invite/abc/event-day");
    assert.equal(
      buildEventCompanionHref("abc", "tok-1"),
      "/invite/abc/event-day?guest=tok-1"
    );
  });

  it("builds invite ceremony href that opts out of companion redirect", () => {
    assert.equal(
      buildInviteCeremonyHref("abc"),
      "/invite/abc?view=invite"
    );
    assert.equal(
      buildInviteCeremonyHref("abc", "tok-1"),
      "/invite/abc?view=invite&guest=tok-1"
    );
  });

  it("detects explicit invite ceremony view", () => {
    assert.equal(wantsInviteCeremonyView({ view: "invite" }), true);
    assert.equal(wantsInviteCeremonyView({ view: "ceremony" }), true);
    assert.equal(wantsInviteCeremonyView({ view: "other" }), false);
    assert.equal(wantsInviteCeremonyView({}), false);
  });

  it("never opens companion for invite-open / RSVP-only signals (admittedCount must be > 0)", () => {
    // OPENED / ACCEPTED are seating signals only — they do not set admittedCount.
    assert.equal(
      shouldOpenEventCompanionOnly({
        postAdmissionEnabled: true,
        canAccessPortal: false,
        admittedCount: 0,
      }),
      false
    );
    assert.equal(
      shouldOpenEventCompanionOnly({
        postAdmissionEnabled: true,
        canAccessPortal: true,
        admittedCount: 0,
      }),
      false
    );
  });

  it("opens companion only after full admit on a shared party link", () => {
    assert.equal(
      shouldOpenEventCompanionOnly({
        postAdmissionEnabled: true,
        canAccessPortal: true,
        admittedCount: 1,
        remainingCount: 4,
        state: "PARTIALLY_ADMITTED",
      }),
      false
    );
    assert.equal(
      shouldOpenEventCompanionOnly({
        postAdmissionEnabled: true,
        canAccessPortal: true,
        admittedCount: 5,
        remainingCount: 0,
        state: "ADMITTED",
      }),
      true
    );
    assert.equal(
      shouldOpenEventCompanionOnly({
        postAdmissionEnabled: true,
        canAccessPortal: true,
        admittedCount: 1,
        remainingCount: 4,
        state: "PARTIALLY_ADMITTED",
        viewerAdmitted: true,
      }),
      true
    );
    assert.equal(
      shouldOpenEventCompanionOnly({
        postAdmissionEnabled: false,
        canAccessPortal: true,
        admittedCount: 1,
      }),
      false
    );
    assert.equal(shouldOpenEventCompanionOnly(null), false);
  });

  it("changes opening memory key when admission epoch bumps after reset", () => {
    const before = openingMemoryKey("inv-1", "guest-1", 0);
    const after = openingMemoryKey("inv-1", "guest-1", 1);
    assert.notEqual(before, after);
  });

  it("shows the personalized guest's assigned table, seat, and zone", () => {
    const result = resolveCompanionPlace(
      { tableNumber: "12", seatLabel: "B", zone: "Garden" },
      []
    );

    assert.deepEqual(result.place, {
      tableNumber: "12",
      seatLabel: "B",
      zone: "Garden",
    });
  });

  it("falls back to an assigned party seat when no personalized seat was passed", () => {
    const partySeats: PartySeat[] = [
      {
        guestId: "guest-1",
        guestName: "Ama",
        tableNumber: "7",
        seatLabel: "3",
        zone: "East wing",
        admitted: true,
      },
    ];

    const result = resolveCompanionPlace(null, partySeats);
    assert.deepEqual(result.place, {
      tableNumber: "7",
      seatLabel: "3",
      zone: "East wing",
    });
  });

  it("returns the empty state only when no real seating assignment exists", () => {
    assert.equal(resolveCompanionPlace(null, [], null).place, null);
  });
});

describe("resolvePartyAdmissionSurface", () => {
  const href = "/invite/akua/event-day";

  it("keeps View Event Access when ceremony is reopened via ?view=invite", () => {
    const result = resolvePartyAdmissionSurface({
      portalEnabled: true,
      preferInviteCeremony: true,
      eventAccessHref: href,
      admittedCount: 2,
      allowance: 5,
      state: "PARTIALLY_ADMITTED",
    });
    assert.equal(result.companionHandoffHref, null);
    assert.deepEqual(result.partyAdmission, {
      admittedCount: 2,
      allowance: 5,
      state: "PARTIALLY_ADMITTED",
      companionHref: href,
    });
  });

  it("enables auto-handoff only when not in ceremony view", () => {
    const result = resolvePartyAdmissionSurface({
      portalEnabled: true,
      preferInviteCeremony: false,
      eventAccessHref: href,
      admittedCount: 2,
      allowance: 5,
      state: "PARTIALLY_ADMITTED",
    });
    assert.equal(result.companionHandoffHref, href);
    assert.ok(result.partyAdmission);
  });

  it("hides Event Access before any admission (Akua & Kelly 0 of 2)", () => {
    const result = resolvePartyAdmissionSurface({
      portalEnabled: true,
      preferInviteCeremony: false,
      eventAccessHref: href,
      admittedCount: 0,
      allowance: 2,
      state: "NOT_ADMITTED",
    });
    assert.equal(result.partyAdmission, null);
  });

  it("never invents Event Access when portal is disabled", () => {
    const result = resolvePartyAdmissionSurface({
      portalEnabled: false,
      preferInviteCeremony: true,
      eventAccessHref: href,
      admittedCount: 5,
      allowance: 5,
      state: "ADMITTED",
    });
    assert.equal(result.companionHandoffHref, null);
    assert.equal(result.partyAdmission, null);
  });
});

describe("shared-table seating remains party-specific", () => {
  it("does not merge seat rows from another invitation at the same table", () => {
    const table2 = [
      {
        invitationId: "inv-obuah",
        guestName: "The OBUAH Family",
        tableNumber: "2",
        seatLabel: "A",
      },
      {
        invitationId: "inv-akua",
        guestName: "Akua & Kelly",
        tableNumber: "2",
        seatLabel: "B",
      },
      {
        invitationId: "inv-akua",
        guestName: "Kelly",
        tableNumber: "2",
        seatLabel: "C",
      },
    ];
    const akuaOnly = filterPartyOwnedRows(table2, "inv-akua");
    assert.equal(akuaOnly.length, 2);
    assert.ok(akuaOnly.every((row) => row.invitationId === "inv-akua"));
    assert.ok(!akuaOnly.some((row) => /OBUAH/i.test(row.guestName)));

    const obuahOnly = filterPartyOwnedRows(table2, "inv-obuah");
    assert.equal(obuahOnly.length, 1);
    assert.equal(obuahOnly[0]?.guestName, "The OBUAH Family");
  });
});
