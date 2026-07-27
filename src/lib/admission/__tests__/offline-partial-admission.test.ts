import { test } from "node:test";
import assert from "node:assert/strict";
import { projectLocalState, type QueuedAdmission } from "../offline-store";
import { ADMISSION_SETTINGS_DEFAULTS } from "../admission-settings";
import { decideAdmission, type PassSnapshot } from "../pass-decision";
import type {
  OfflinePackage,
  OfflinePassRecord,
} from "@/services/admission/offline-admission.service";

/**
 * Offline parity for partial group admission.
 *
 * The gate that loses signal must reach the same answer as the online one, and
 * a sync must never quietly over-admit a party.
 */

const EVENT = "evt_1";
const NOW = new Date("2026-06-20T18:00:00.000Z");

function record(patch: Partial<OfflinePassRecord> = {}): OfflinePassRecord {
  return {
    h: "hash-1",
    c: "1234",
    n: "The Mensah Family",
    p: 3,
    a: 0,
    r: 3,
    status: "ACTIVE",
    expiresAt: null,
    members: [
      { id: "g1", name: "Ama", plusOnes: 0, admitted: false, table: "7", seat: "1" },
      { id: "g2", name: "Kofi", plusOnes: 0, admitted: false, table: "7", seat: "2" },
      { id: "g3", name: "Esi", plusOnes: 0, admitted: false, table: "7", seat: "3" },
    ],
    table: "7",
    seat: "1",
    history: [],
    ...patch,
  };
}

function pkg(passes: OfflinePassRecord[] = [record()]): OfflinePackage {
  return {
    version: 2,
    eventId: EVENT,
    eventTitle: "Ama & Kofi",
    issuedAt: NOW.toISOString(),
    expiresAt: new Date(NOW.getTime() + 12 * 60 * 60_000).toISOString(),
    settings: {
      manualCodeEnabled: true,
      offlineAdmissionEnabled: true,
      allowPartialArrival: true,
      allowSeparateArrival: true,
      allowReEntry: false,
      reEntryWindowMinutes: null,
      requireScannerConfirmation: false,
      fastAdmissionMode: false,
      duplicatePolicy: "BLOCK",
      offlinePackageTtlMinutes: 720,
      showTableOnPass: true,
      showSeatOnPass: true,
      validFrom: null,
      validUntil: null,
    },
    passes,
    checksum: "test",
  };
}

function queued(patch: Partial<QueuedAdmission> = {}): QueuedAdmission {
  return {
    clientRecordId: "rec-1",
    eventId: EVENT,
    tokenHash: "hash-1",
    code: null,
    quantity: 2,
    capturedAt: NOW.toISOString(),
    usedManualCode: false,
    displayName: "The Mensah Family",
    ...patch,
  };
}

/* ── the cached package ────────────────────────────────────────────────── */

test("the offline package carries allowance, admitted, remaining, members, seats and history", () => {
  const r = record({ a: 1, r: 2 });
  assert.equal(r.p, 3);
  assert.equal(r.a, 1);
  assert.equal(r.r, 2);
  assert.equal(r.members.length, 3);
  assert.equal(r.members[0].table, "7");
  assert.equal(r.members[0].seat, "1");
  assert.ok(Array.isArray(r.history));
});

/* ── local projection ──────────────────────────────────────────────────── */

test("a queued partial admit is reflected locally so the next scan sees the truth", () => {
  const state = projectLocalState(pkg(), [queued({ quantity: 2 })]);
  const pass = state.get("hash-1");

  assert.equal(pass?.a, 2);
  assert.equal(pass?.r, 1);
  assert.equal(pass?.status, "PARTIALLY_ADMITTED");
});

test("named members ticked off offline are not offered a second time", () => {
  const state = projectLocalState(pkg(), [queued({ quantity: 2, guestIds: ["g1", "g2"] })]);
  const pass = state.get("hash-1");

  assert.deepEqual(
    pass?.members.filter((m) => m.admitted).map((m) => m.id),
    ["g1", "g2"]
  );
  assert.equal(pass?.members.find((m) => m.id === "g3")?.admitted, false);
});

test("two waves queued on the same device complete the party locally", () => {
  const state = projectLocalState(pkg(), [
    queued({ clientRecordId: "rec-1", quantity: 2 }),
    queued({ clientRecordId: "rec-2", quantity: 1 }),
  ]);
  const pass = state.get("hash-1");

  assert.equal(pass?.a, 3);
  assert.equal(pass?.r, 0);
  assert.equal(pass?.status, "ADMITTED");
});

test("the local projection can never push a party past its allowance", () => {
  const state = projectLocalState(pkg(), [queued({ quantity: 9 })]);
  assert.equal(state.get("hash-1")?.a, 3);
  assert.equal(state.get("hash-1")?.r, 0);
});

test("queued admissions are recorded in the local history", () => {
  const state = projectLocalState(pkg(), [queued({ quantity: 2 })]);
  const history = state.get("hash-1")?.history ?? [];

  assert.equal(history.length, 1);
  assert.equal(history[0].action, "PARTIAL_ADMIT");
  assert.equal(history[0].qty, 2);
});

test("a manual-code admit resolves to the same pass as its QR", () => {
  const state = projectLocalState(pkg(), [
    queued({ tokenHash: null, code: "1234", quantity: 1, usedManualCode: true }),
  ]);
  assert.equal(state.get("hash-1")?.a, 1);
});

test("a v1 package with no remaining or history field still projects cleanly", () => {
  const legacy = record();
  delete (legacy as Partial<OfflinePassRecord>).r;
  delete (legacy as Partial<OfflinePassRecord>).history;

  const state = projectLocalState({ ...pkg([legacy]), version: 1 }, [queued({ quantity: 1 })]);
  assert.equal(state.get("hash-1")?.a, 1);
  assert.equal(state.get("hash-1")?.r, 2);
  assert.equal(state.get("hash-1")?.history?.length, 1);
});

/* ── reconciliation ────────────────────────────────────────────────────── */

const snapshot = (patch: Partial<PassSnapshot> = {}): PassSnapshot => ({
  eventId: EVENT,
  status: "ACTIVE",
  partySize: 3,
  admittedCount: 0,
  expiresAt: null,
  firstAdmittedAt: null,
  lastAdmittedAt: null,
  ...patch,
});

test("an offline record replays against live state through the same engine", () => {
  const d = decideAdmission(
    snapshot(),
    { ...ADMISSION_SETTINGS_DEFAULTS, qrAdmissionEnabled: true },
    { eventId: EVENT, now: NOW, requestedQuantity: 2, source: "qr" }
  );
  assert.equal(d.admitQuantity, 2);
  assert.equal(d.outcome, "PARTIAL_ADMIT");
});

test("a sync that would exceed the allowance is refused, not silently accepted", () => {
  // Another gate admitted two heads while this device was dark.
  const d = decideAdmission(
    snapshot({ admittedCount: 2, status: "PARTIALLY_ADMITTED" }),
    { ...ADMISSION_SETTINGS_DEFAULTS, qrAdmissionEnabled: true },
    { eventId: EVENT, now: NOW, requestedQuantity: 2, source: "qr" }
  );

  // admitQuantity === 0 is what drives the reconciler to flag CONFLICT.
  assert.equal(d.admitQuantity, 0);
  assert.equal(d.reason, "ALLOWANCE_EXCEEDED");
  assert.equal(d.resultingAdmittedCount, 2, "the live count is left untouched");
});

test("a fully-admitted party replayed from offline is flagged rather than double counted", () => {
  const d = decideAdmission(
    snapshot({ admittedCount: 3, status: "ADMITTED" }),
    { ...ADMISSION_SETTINGS_DEFAULTS, qrAdmissionEnabled: true },
    { eventId: EVENT, now: NOW, requestedQuantity: 1, source: "qr" }
  );
  assert.equal(d.admitQuantity, 0);
  assert.equal(d.outcome, "ALREADY_ADMITTED");
});

test("a stale offline package is refused before it can admit anybody", () => {
  const d = decideAdmission(
    snapshot(),
    { ...ADMISSION_SETTINGS_DEFAULTS, qrAdmissionEnabled: true, offlinePackageTtlMinutes: 60 },
    {
      eventId: EVENT,
      now: NOW,
      source: "qr",
      offline: true,
      offlinePackageAgeMinutes: 240,
    }
  );
  assert.equal(d.reason, "OFFLINE_PACKAGE_STALE");
  assert.equal(d.admitQuantity, 0);
});
