import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADMISSION_SETTINGS_DEFAULTS,
  type ResolvedAdmissionSettings,
} from "../admission-settings";
import { decideAdmission, needsQuantityPrompt, type PassSnapshot } from "../pass-decision";
import { summarize } from "../admission-logic";
import { describeHeldSeats, resolveSeatingContinuity, type PartySeat } from "../seating-continuity";

/**
 * Partial group admission — the "party of three arrives in two waves" story,
 * end to end through the pure decision engine and the seating projection.
 */

const NOW = new Date("2026-06-20T18:00:00.000Z");
const EVENT = "evt_1";

function settings(patch: Partial<ResolvedAdmissionSettings> = {}): ResolvedAdmissionSettings {
  return { ...ADMISSION_SETTINGS_DEFAULTS, qrAdmissionEnabled: true, ...patch };
}

function pass(patch: Partial<PassSnapshot> = {}): PassSnapshot {
  return {
    eventId: EVENT,
    status: "ACTIVE",
    partySize: 1,
    admittedCount: 0,
    expiresAt: null,
    firstAdmittedAt: null,
    lastAdmittedAt: null,
    ...patch,
  };
}

const ctx = (patch: Partial<Parameters<typeof decideAdmission>[2]> = {}) => ({
  eventId: EVENT,
  now: NOW,
  source: "qr" as const,
  ...patch,
});

/* ── the quantity prompt ───────────────────────────────────────────────── */

test("a single-guest pass is admitted immediately with no question asked", () => {
  const d = decideAdmission(pass({ partySize: 1 }), settings(), ctx());
  assert.equal(d.requiresQuantityConfirmation, false);
  assert.equal(d.outcome, "ADMIT");
  assert.equal(d.admitQuantity, 1);
  assert.equal(d.allowance, 1);
  assert.equal(d.remaining, 1);
});

test("a group with places open is asked how many are arriving now", () => {
  const d = decideAdmission(pass({ partySize: 3 }), settings(), ctx());
  assert.equal(d.requiresQuantityConfirmation, true);
  assert.equal(d.admitQuantity, 0, "nothing may be written before the operator answers");
  assert.equal(d.remaining, 3);
  assert.match(d.message, /how many are arriving now/i);
});

test("fast admission cannot silently admit a multi-person remainder", () => {
  const d = decideAdmission(pass({ partySize: 4 }), settings({ fastAdmissionMode: true }), ctx());
  assert.equal(d.requiresQuantityConfirmation, true);
  assert.equal(d.admitQuantity, 0);
  assert.match(d.message, /how many are arriving now/i);
});

test("answering the prompt writes exactly the confirmed quantity", () => {
  const d = decideAdmission(
    pass({ partySize: 3 }),
    settings(),
    ctx({ requestedQuantity: 2, quantityConfirmed: true })
  );
  assert.equal(d.requiresQuantityConfirmation, false);
  assert.equal(d.outcome, "PARTIAL_ADMIT");
  assert.equal(d.admitQuantity, 2);
  assert.equal(d.resultingAdmittedCount, 2);
  assert.equal(d.resultingStatus, "PARTIALLY_ADMITTED");
});

test("the last remaining head needs no prompt", () => {
  const d = decideAdmission(
    pass({ partySize: 3, admittedCount: 2, status: "PARTIALLY_ADMITTED" }),
    settings(),
    ctx()
  );
  assert.equal(d.requiresQuantityConfirmation, false);
  assert.equal(d.admitQuantity, 1);
  assert.equal(d.outcome, "ADMIT");
});

test("multi-person accountability allows a confirmed partial arrival", () => {
  const d = decideAdmission(
    pass({ partySize: 3 }),
    settings({ allowPartialArrival: false }),
    ctx({ requestedQuantity: 1, quantityConfirmed: true })
  );
  assert.equal(d.requiresQuantityConfirmation, false);
  assert.equal(d.admitQuantity, 1);
  assert.equal(d.resultingStatus, "PARTIALLY_ADMITTED");
});

test("needsQuantityPrompt encodes every suppression rule", () => {
  const s = settings();
  assert.equal(needsQuantityPrompt(3, s, {}), true);
  assert.equal(needsQuantityPrompt(1, s, {}), false, "nothing to choose");
  assert.equal(needsQuantityPrompt(0, s, {}), false, "party is already inside");
  assert.equal(needsQuantityPrompt(3, s, { quantityConfirmed: true }), false);
  assert.equal(needsQuantityPrompt(3, s, { requestedQuantity: 2 }), false);
  assert.equal(needsQuantityPrompt(3, settings({ fastAdmissionMode: true }), {}), true);
  assert.equal(needsQuantityPrompt(3, settings({ allowPartialArrival: false }), {}), true);
});

/* ── the party of three ────────────────────────────────────────────────── */

test("a party of three admits two, then the third arrives later on the same pass", () => {
  const first = decideAdmission(
    pass({ partySize: 3 }),
    settings(),
    ctx({ requestedQuantity: 2, quantityConfirmed: true })
  );
  assert.equal(first.outcome, "PARTIAL_ADMIT");
  assert.equal(first.resultingAdmittedCount, 2);
  assert.equal(first.resultingStatus, "PARTIALLY_ADMITTED");

  // The pass stays usable — that is the whole point of partial admission.
  const later = decideAdmission(
    pass({ partySize: 3, admittedCount: 2, status: "PARTIALLY_ADMITTED" }),
    settings(),
    ctx({ requestedQuantity: 1, quantityConfirmed: true })
  );
  assert.equal(later.outcome, "ADMIT");
  assert.equal(later.resultingAdmittedCount, 3);
  assert.equal(later.resultingStatus, "ADMITTED");

  const done = decideAdmission(
    pass({ partySize: 3, admittedCount: 3, status: "ADMITTED" }),
    settings(),
    ctx()
  );
  assert.equal(done.outcome, "ALREADY_ADMITTED");
  assert.equal(done.admitQuantity, 0);
});

test("a party can never be admitted beyond its allowance", () => {
  const d = decideAdmission(
    pass({ partySize: 3, admittedCount: 2, status: "PARTIALLY_ADMITTED" }),
    settings(),
    ctx({ requestedQuantity: 2, quantityConfirmed: true })
  );
  assert.equal(d.outcome, "DENY");
  assert.equal(d.reason, "ALLOWANCE_EXCEEDED");
  assert.equal(d.admitQuantity, 0);
});

test("two scanners racing for the last place produce one admit and one refusal", () => {
  const snapshot = pass({ partySize: 3, admittedCount: 2, status: "PARTIALLY_ADMITTED" });

  // Both devices evaluated the same state; the database CAS decides the winner.
  const deviceA = decideAdmission(snapshot, settings(), ctx({ requestedQuantity: 1 }));
  const deviceB = decideAdmission(snapshot, settings(), ctx({ requestedQuantity: 1 }));
  assert.equal(deviceA.admitQuantity, 1);
  assert.equal(deviceB.admitQuantity, 1);

  // The loser re-reads the true state and is told the party is complete.
  const loserRetry = decideAdmission(
    pass({ partySize: 3, admittedCount: 3, status: "ADMITTED" }),
    settings(),
    ctx({ requestedQuantity: 1 })
  );
  assert.equal(loserRetry.outcome, "ALREADY_ADMITTED");
  assert.equal(loserRetry.admitQuantity, 0);
  assert.equal(loserRetry.resultingAdmittedCount, 3);
});

/* ── the projection the portal reads ───────────────────────────────────── */

test("the portal unlocks on the first head and stays unlocked while any remain inside", () => {
  assert.equal(summarize(0, 3).canAccessPortal, false);
  assert.equal(summarize(1, 3).state, "PARTIALLY_ADMITTED");
  assert.equal(summarize(1, 3).canAccessPortal, true);
  assert.equal(summarize(3, 3).state, "ADMITTED");
  assert.equal(summarize(3, 3).canAccessPortal, true);
});

test("the portal relocks only when a reset brings the party back to zero", () => {
  const partial = summarize(1, 3, { wasReset: true });
  assert.equal(partial.state, "PARTIALLY_ADMITTED");
  assert.equal(partial.canAccessPortal, true, "one member left inside keeps the portal open");

  const emptied = summarize(0, 3, { wasReset: true });
  assert.equal(emptied.state, "ADMISSION_RESET");
  assert.equal(emptied.canAccessPortal, false);
});

/* ── seating continuity ────────────────────────────────────────────────── */

const seat = (n: number, admitted: boolean, table = "7"): PartySeat => ({
  guestId: `g${n}`,
  guestName: `Guest ${n}`,
  tableNumber: table,
  seatLabel: String(n),
  zone: null,
  admitted,
});

test("two of three arriving reveals two seats and holds the third at the same table", () => {
  const c = resolveSeatingContinuity([seat(1, true), seat(2, true), seat(3, false)], 3, 2);

  assert.equal(c.revealed.length, 2);
  assert.deepEqual(
    c.revealed.map((s) => s.guestId),
    ["g1", "g2"]
  );
  assert.equal(c.reserved.length, 1);
  assert.equal(c.reserved[0].guestId, "g3");
  assert.equal(c.reserved[0].tableNumber, "7", "the held seat stays at the party's table");
  assert.equal(c.tableNumber, "7");
  assert.equal(c.heldAtTable, 1);
});

test("the late arrival takes the seat that was being held rather than a new one", () => {
  const before = resolveSeatingContinuity([seat(1, true), seat(2, true), seat(3, false)], 3, 2);
  const heldSeat = before.reserved[0];

  const after = resolveSeatingContinuity([seat(1, true), seat(2, true), seat(3, true)], 3, 3);
  assert.equal(after.reserved.length, 0);
  assert.ok(
    after.revealed.some((s) => s.guestId === heldSeat.guestId && s.seatLabel === heldSeat.seatLabel),
    "the seat held for the third guest is the seat they are given"
  );
});

test("a party admitted as a bare quantity still gets seats revealed in a stable order", () => {
  // Nobody was ticked off by name — the gate only knows "two of you are here".
  const c = resolveSeatingContinuity([seat(1, false), seat(2, false), seat(3, false)], 3, 2);
  assert.deepEqual(
    c.revealed.map((s) => s.guestId),
    ["g1", "g2"]
  );
  assert.equal(c.reserved.length, 1);
});

test("a table-only event preserves the party's remaining table capacity", () => {
  const tableOnly: PartySeat[] = [1, 2, 3, 4].map((n) => ({
    guestId: `g${n}`,
    guestName: `Guest ${n}`,
    tableNumber: "3",
    seatLabel: null,
    zone: null,
    admitted: n <= 1,
  }));

  const c = resolveSeatingContinuity(tableOnly, 4, 1);
  assert.equal(c.tableOnly, true);
  assert.equal(c.tableNumber, "3");
  assert.equal(c.heldAtTable, 3, "three places at Table 3 stay held");
});

test("missing seating degrades to a count the host desk can act on", () => {
  const c = resolveSeatingContinuity([], 3, 1);
  assert.equal(c.revealed.length, 0);
  assert.equal(c.reserved.length, 0);
  assert.equal(c.unseatedCount, 3);
  assert.equal(c.tableNumber, null);
});

test("a partly-seated party counts both held seats and unseated heads", () => {
  const c = resolveSeatingContinuity([seat(1, true), seat(2, false)], 4, 1);
  assert.equal(c.reserved.length, 1);
  assert.equal(c.unseatedCount, 2);
  assert.equal(c.heldAtTable, 3);
  assert.equal(describeHeldSeats(c), "3 more places are being held for your party at Table 7.");
});

test("held-seat copy never doubles the Table prefix", () => {
  const c = resolveSeatingContinuity(
    [seat(1, true, "Table 7"), seat(2, false, "Table 7")],
    2,
    1
  );
  assert.equal(describeHeldSeats(c), "1 more place is being held for your party at Table 7.");
});

test("nothing is described as held once the whole party is seated and inside", () => {
  const c = resolveSeatingContinuity([seat(1, true), seat(2, true)], 2, 2);
  assert.equal(describeHeldSeats(c), null);
});
