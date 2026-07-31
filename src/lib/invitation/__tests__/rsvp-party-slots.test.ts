import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampAttendingCount,
  rsvpAcceptedThankYou,
  rsvpPartyCapacityLine,
  rsvpPartySlotGuidance,
} from "../rsvp-party-slots";

describe("rsvp party slots", () => {
  it("clamps attending within the invitation allowance", () => {
    assert.equal(clampAttendingCount(0, 3), 1);
    assert.equal(clampAttendingCount(2, 3), 2);
    assert.equal(clampAttendingCount(9, 3), 3);
  });

  it("explains capacity for solo and plus-one invitations", () => {
    assert.match(rsvpPartyCapacityLine(1), /only you/i);
    assert.match(rsvpPartyCapacityLine(2), /1 companion/i);
    assert.match(rsvpPartyCapacityLine(4), /3 companions/i);
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

  it("thanks acceptances with the confirmed headcount", () => {
    assert.match(rsvpAcceptedThankYou(2, 3), /2 of 3 seats/i);
    assert.match(rsvpAcceptedThankYou(1, 1), /gratitude/i);
  });
});
