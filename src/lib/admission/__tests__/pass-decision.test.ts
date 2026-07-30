import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADMISSION_SETTINGS_DEFAULTS,
  resolveAdmissionSettings,
  type ResolvedAdmissionSettings,
} from "../admission-settings";
import { decideAdmission, notFoundDecision, type PassSnapshot } from "../pass-decision";

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

test("a single guest is admitted and the pass completes", () => {
  const d = decideAdmission(pass(), settings(), ctx());
  assert.equal(d.outcome, "ADMIT");
  assert.equal(d.tone, "green");
  assert.equal(d.admitQuantity, 1);
  assert.equal(d.resultingAdmittedCount, 1);
  assert.equal(d.resultingStatus, "ADMITTED");
});

test("a party arriving in pieces stays PARTIALLY_ADMITTED until the last head", () => {
  const family = pass({ partySize: 5 });

  const first = decideAdmission(family, settings(), ctx({ requestedQuantity: 2 }));
  assert.equal(first.outcome, "PARTIAL_ADMIT");
  assert.equal(first.resultingAdmittedCount, 2);
  assert.equal(first.resultingStatus, "PARTIALLY_ADMITTED");

  const second = decideAdmission(
    pass({ partySize: 5, admittedCount: 2, status: "PARTIALLY_ADMITTED" }),
    settings(),
    ctx({ requestedQuantity: 3 })
  );
  assert.equal(second.outcome, "ADMIT");
  assert.equal(second.resultingAdmittedCount, 5);
  assert.equal(second.resultingStatus, "ADMITTED");
});

test("a pass can never admit more heads than its allowance", () => {
  const d = decideAdmission(pass({ partySize: 4 }), settings(), ctx({ requestedQuantity: 5 }));
  assert.equal(d.outcome, "DENY");
  assert.equal(d.reason, "ALLOWANCE_EXCEEDED");
  assert.equal(d.admitQuantity, 0);

  const partial = decideAdmission(
    pass({ partySize: 4, admittedCount: 3, status: "PARTIALLY_ADMITTED" }),
    settings(),
    ctx({ requestedQuantity: 2 })
  );
  assert.equal(partial.reason, "ALLOWANCE_EXCEEDED");
  assert.equal(partial.admitQuantity, 0);
});

test("confirmed partial arrival remains countable for accountability", () => {
  const d = decideAdmission(
    pass({ partySize: 4 }),
    settings({ allowPartialArrival: false }),
    ctx({ requestedQuantity: 2, quantityConfirmed: true })
  );
  assert.equal(d.reason, "OK_PARTIAL");
  assert.equal(d.tone, "green");
  assert.equal(d.resultingAdmittedCount, 2);
});

test("duplicate policy decides what a second scan does", () => {
  const admitted = pass({ partySize: 2, admittedCount: 2, status: "ADMITTED" });

  const blocked = decideAdmission(admitted, settings(), ctx());
  assert.equal(blocked.reason, "DUPLICATE_BLOCKED");
  assert.equal(blocked.tone, "red");
  assert.equal(blocked.admitQuantity, 0);

  const warned = decideAdmission(admitted, settings({ duplicatePolicy: "WARN" }), ctx());
  assert.equal(warned.reason, "ALREADY_ADMITTED");
  assert.equal(warned.tone, "amber");
  assert.equal(warned.admitQuantity, 0);

  const allowed = decideAdmission(admitted, settings({ duplicatePolicy: "ALLOW" }), ctx());
  assert.equal(allowed.outcome, "ALREADY_ADMITTED");
  assert.equal(allowed.admitQuantity, 0, "re-entry must never inflate the count");
});

test("re-entry is allowed inside its window and refused outside it", () => {
  const admitted = pass({
    partySize: 2,
    admittedCount: 2,
    status: "ADMITTED",
    lastAdmittedAt: new Date(NOW.getTime() - 30 * 60_000),
  });

  const inside = decideAdmission(
    admitted,
    settings({ allowReEntry: true, reEntryWindowMinutes: 60 }),
    ctx()
  );
  assert.equal(inside.outcome, "RE_ENTRY");
  assert.equal(inside.tone, "green");
  assert.equal(inside.admitQuantity, 0);

  const outside = decideAdmission(
    admitted,
    settings({ allowReEntry: true, reEntryWindowMinutes: 15 }),
    ctx()
  );
  assert.equal(outside.outcome, "DENY");
  assert.equal(outside.reason, "DUPLICATE_BLOCKED");
});

test("terminal pass states are always refused", () => {
  for (const [status, reason] of [
    ["REVOKED", "REVOKED"],
    ["REISSUED", "REISSUED"],
    ["EXPIRED", "EXPIRED"],
  ] as const) {
    const d = decideAdmission(pass({ status }), settings(), ctx());
    assert.equal(d.outcome, "DENY");
    assert.equal(d.reason, reason);
    assert.equal(d.admitQuantity, 0);
  }
});

test("conflicted passes go to review, not to the gate", () => {
  for (const status of ["CONFLICT", "MANUAL_REVIEW"] as const) {
    const d = decideAdmission(pass({ status }), settings(), ctx());
    assert.equal(d.outcome, "REVIEW");
    assert.equal(d.tone, "amber");
    assert.equal(d.admitQuantity, 0);
  }
});

test("a pass from another event never opens this gate", () => {
  const d = decideAdmission(pass({ eventId: "evt_other" }), settings(), ctx());
  assert.equal(d.reason, "WRONG_EVENT");
  assert.equal(d.tone, "red");
});

test("validity windows gate entry on both sides", () => {
  const early = decideAdmission(
    pass(),
    settings({ validFrom: new Date(NOW.getTime() + 60 * 60_000) }),
    ctx()
  );
  assert.equal(early.reason, "NOT_YET_VALID");

  const late = decideAdmission(
    pass(),
    settings({ validUntil: new Date(NOW.getTime() - 60 * 60_000) }),
    ctx()
  );
  assert.equal(late.reason, "EXPIRED");

  const perPass = decideAdmission(
    pass({ expiresAt: new Date(NOW.getTime() - 1000) }),
    settings(),
    ctx()
  );
  assert.equal(perPass.reason, "EXPIRED");
});

test("manual codes obey the event switch", () => {
  const d = decideAdmission(
    pass(),
    settings({ manualCodeEnabled: false }),
    ctx({ source: "manual_code" })
  );
  assert.equal(d.reason, "MANUAL_CODE_DISABLED");
});

test("offline gates refuse to run disabled or on a stale package", () => {
  const disabled = decideAdmission(
    pass(),
    settings({ offlineAdmissionEnabled: false }),
    ctx({ offline: true })
  );
  assert.equal(disabled.reason, "OFFLINE_DISABLED");

  const stale = decideAdmission(
    pass(),
    settings({ offlinePackageTtlMinutes: 60 }),
    ctx({ offline: true, offlinePackageAgeMinutes: 90 })
  );
  assert.equal(stale.reason, "OFFLINE_PACKAGE_STALE");

  const fresh = decideAdmission(
    pass(),
    settings({ offlinePackageTtlMinutes: 60 }),
    ctx({ offline: true, offlinePackageAgeMinutes: 30 })
  );
  assert.equal(fresh.outcome, "ADMIT");
});

test("the offline engine is never more permissive than the online one", () => {
  const cases: PassSnapshot[] = [
    pass(),
    pass({ partySize: 4, admittedCount: 2, status: "PARTIALLY_ADMITTED" }),
    pass({ partySize: 2, admittedCount: 2, status: "ADMITTED" }),
    pass({ status: "REVOKED" }),
  ];
  for (const snapshot of cases) {
    const online = decideAdmission(snapshot, settings(), ctx());
    const offline = decideAdmission(snapshot, settings(), ctx({ offline: true }));
    assert.ok(
      offline.admitQuantity <= online.admitQuantity,
      `offline admitted more for status ${snapshot.status}`
    );
  }
});

test("confirmation is required unless fast admission is on", () => {
  const confirm = decideAdmission(pass(), settings({ requireScannerConfirmation: true }), ctx());
  assert.equal(confirm.requiresConfirmation, true);

  const fast = decideAdmission(
    pass(),
    settings({ requireScannerConfirmation: true, fastAdmissionMode: true }),
    ctx()
  );
  assert.equal(fast.requiresConfirmation, false);
});

test("not-found is explicit about the channel", () => {
  assert.equal(notFoundDecision("qr").reason, "NOT_FOUND");
  assert.match(notFoundDecision("manual_code").message, /code/i);
  assert.equal(notFoundDecision("qr").admitQuantity, 0);
});

test("settings fall back to safe defaults and derive a window from the event date", () => {
  const start = new Date("2026-06-20T18:00:00.000Z");
  const resolved = resolveAdmissionSettings(null, start);
  assert.equal(resolved.qrAdmissionEnabled, false, "QR admission stays off until opted in");
  assert.equal(resolved.duplicatePolicy, "BLOCK");
  assert.equal(
    resolved.validFrom?.toISOString(),
    new Date(start.getTime() - 12 * 3600_000).toISOString()
  );
  assert.equal(
    resolved.validUntil?.toISOString(),
    new Date(start.getTime() + 12 * 3600_000).toISOString()
  );
});
