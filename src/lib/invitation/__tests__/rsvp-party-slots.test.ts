import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampAttendingCount,
  rsvpAcceptedThankYou,
  rsvpGuestFeedback,
  rsvpPartyCapacityLine,
  rsvpPartySlotGuidance,
} from "../rsvp-party-slots";

describe("rsvp party slots", () => {
  it("clamps attending within the invitation allowance", () => {
    assert.equal(clampAttendingCount(0, 3), 1);
    assert.equal(clampAttendingCount(2, 3), 2);
    assert.equal(clampAttendingCount(9, 3), 3);
  });

  it("states exact total guest capacity for solo and plus-one invitations", () => {
    assert.equal(rsvpPartyCapacityLine(1), "1 guest only");
    assert.equal(rsvpPartyCapacityLine(2), "2 guests only");
    assert.equal(rsvpPartyCapacityLine(4), "4 guests only");
  });

  it("reports remaining invitation seats while choosing a party size", () => {
    const full = rsvpPartySlotGuidance(3, 3);
    assert.equal(full.remaining, 0);
    assert.match(full.summary, /3 of 3/);
    assert.match(full.detail, /every seat/i);

    const partial = rsvpPartySlotGuidance(3, 1);
    assert.equal(partial.remaining, 2);
    assert.match(partial.summary, /just you/i);
    assert.match(partial.detail, /2 seats/i);
  });

  it("keeps Confirming status labels from mid-word wrapping (P1-7)", () => {
    const solo = rsvpPartySlotGuidance(1, 1);
    assert.match(solo.summary, /^Confirming\u00A01 seat$/);

    const party = rsvpPartySlotGuidance(3, 2);
    assert.match(party.summary, /^Confirming\u00A02 of 3 seats/);
    assert.equal(party.summary.includes("Confirming "), false);
  });

  it("thanks acceptances with the confirmed headcount", () => {
    assert.match(rsvpAcceptedThankYou(2, 3), /2 of 3 seats/i);
    assert.match(rsvpAcceptedThankYou(1, 1), /gratitude/i);
  });

  it("keeps Accept / Decline / Maybe wording in guest feedback", () => {
    const accept = rsvpGuestFeedback("ACCEPTED", 1, 1);
    assert.equal(accept.headline, "Accept");
    assert.equal(accept.whisper, "With joy");

    const decline = rsvpGuestFeedback("DECLINED");
    assert.equal(decline.headline, "Decline");
    assert.equal(decline.whisper, "With regret");
    assert.match(decline.body, /cannot join/i);

    const maybe = rsvpGuestFeedback("MAYBE");
    assert.equal(maybe.headline, "Maybe");
    assert.equal(maybe.whisper, "Still hoping");
    assert.match(maybe.body, /may still join/i);
  });
});
