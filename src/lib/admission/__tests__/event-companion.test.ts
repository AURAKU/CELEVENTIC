import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEventCompanionHref,
  buildInviteCeremonyHref,
  resolveCompanionPlace,
  shouldOpenEventCompanionOnly,
  wantsInviteCeremonyView,
} from "@/lib/admission/event-companion";
import type { PartySeat } from "@/lib/admission/seating-continuity";
import { openingMemoryKey } from "@/lib/experience/opening-visit-memory";

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
