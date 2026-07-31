import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeGuestCrmPeopleStats } from "@/lib/seating/people-stats";

describe("computeGuestCrmPeopleStats", () => {
  it("counts expected people from admission allowance, not invitation rows", () => {
    const stats = computeGuestCrmPeopleStats([
      {
        id: "g1",
        invitationId: "inv-obuah",
        partySize: 4,
        status: "ACCEPTED",
        admission: { allowance: 4, admittedCount: 0 },
      },
      {
        id: "g2",
        invitationId: "inv-ama",
        partySize: 1,
        status: "INVITED",
        admission: { allowance: 1, admittedCount: 0 },
      },
    ]);
    assert.equal(stats.total, 5);
    assert.equal(stats.invitationRecords, 2);
    assert.equal(stats.counts.ACCEPTED, 4);
    assert.equal(stats.counts.INVITED, 1);
    assert.equal(stats.counts.CHECKED_IN, 0);
  });

  it("dedupes multiple guest rows on one invitation", () => {
    const stats = computeGuestCrmPeopleStats([
      {
        id: "a",
        invitationId: "family",
        partySize: 3,
        status: "ACCEPTED",
        admission: { allowance: 3, admittedCount: 0 },
      },
      {
        id: "b",
        invitationId: "family",
        partySize: 1,
        status: "INVITED",
        admission: { allowance: 1, admittedCount: 0 },
      },
    ]);
    assert.equal(stats.total, 3);
    assert.equal(stats.counts.ACCEPTED, 3);
    assert.equal(stats.invitationRecords, 1);
  });

  it("CHECKED IN uses admitted heads and leaves remaining in planning status", () => {
    const stats = computeGuestCrmPeopleStats([
      {
        id: "g1",
        invitationId: "inv-obuah",
        partySize: 4,
        status: "ACCEPTED",
        admission: { allowance: 4, admittedCount: 2 },
      },
      {
        id: "g2",
        invitationId: "inv-solo",
        partySize: 1,
        status: "CHECKED_IN",
        admission: { allowance: 1, admittedCount: 1 },
      },
    ]);
    assert.equal(stats.total, 5);
    assert.equal(stats.counts.CHECKED_IN, 3);
    assert.equal(stats.counts.ACCEPTED, 2);
  });

  it("fully admitted parties count entirely under CHECKED IN", () => {
    const stats = computeGuestCrmPeopleStats([
      {
        id: "g1",
        invitationId: "inv-obuah",
        partySize: 4,
        status: "CHECKED_IN",
        admission: { allowance: 4, admittedCount: 4 },
      },
    ]);
    assert.equal(stats.counts.CHECKED_IN, 4);
    assert.equal(stats.counts.ACCEPTED, 0);
    assert.equal(stats.total, 4);
  });
});
