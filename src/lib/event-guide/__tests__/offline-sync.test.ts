import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateQueue,
  normalizeQueue,
  planOfflineSync,
  type OfflineQueueRecord,
  type PackSyncState,
} from "../offline-sync";

const NOW = new Date("2026-08-06T20:00:00Z");

function record(over: Partial<OfflineQueueRecord> & { clientRecordId: string }): OfflineQueueRecord {
  return {
    capturedAt: "2026-08-06T19:00:00.000Z",
    day: "2026-08-06",
    tab: "programme",
    views: 1,
    searches: 0,
    matches: 0,
    ...over,
  };
}

function pack(over: Partial<PackSyncState> = {}): PackSyncState {
  return {
    status: "ACTIVE",
    packVersion: 1,
    guideVersion: 4,
    expiresAt: new Date("2026-08-09T00:00:00Z"),
    appliedRecordIds: new Set<string>(),
    ...over,
  };
}

describe("queue sanitisation", () => {
  it("keeps a well-formed record", () => {
    const out = normalizeQueue([record({ clientRecordId: "r1", views: 3 })]);
    assert.equal(out.length, 1);
    assert.equal(out[0]!.views, 3);
  });

  it("drops records with no id, a bad day or an unknown tab", () => {
    const out = normalizeQueue([
      { ...record({ clientRecordId: "r1" }), clientRecordId: "" },
      { ...record({ clientRecordId: "r2" }), day: "06/08/2026" },
      { ...record({ clientRecordId: "r3" }), tab: "admin" },
      null,
      "nope",
      7,
    ]);
    assert.deepEqual(out, []);
  });

  it("returns an empty queue for anything that is not an array", () => {
    assert.deepEqual(normalizeQueue(null), []);
    assert.deepEqual(normalizeQueue({ records: [] }), []);
    assert.deepEqual(normalizeQueue("[]"), []);
  });

  it("clamps counters so a tampered pack cannot inflate analytics", () => {
    const out = normalizeQueue([
      record({ clientRecordId: "r1", views: -5, searches: 10_000_000, matches: 1.9 }),
    ]);
    assert.equal(out[0]!.views, 0);
    assert.equal(out[0]!.searches, 10_000);
    assert.equal(out[0]!.matches, 1);
  });

  it("coerces non-numeric counters to zero", () => {
    const out = normalizeQueue([
      { ...record({ clientRecordId: "r1" }), views: "many", searches: Number.NaN, matches: null },
    ]);
    assert.deepEqual([out[0]!.views, out[0]!.searches, out[0]!.matches], [0, 0, 0]);
  });

  it("caps the size of a single upload", () => {
    const many = Array.from({ length: 6000 }, (_, i) => record({ clientRecordId: `r${i}` }));
    assert.equal(normalizeQueue(many).length, 5000);
  });

  it("truncates an over-long client record id rather than rejecting it", () => {
    const out = normalizeQueue([record({ clientRecordId: "x".repeat(500) })]);
    assert.equal(out[0]!.clientRecordId.length, 80);
  });

  it("carries no guest fields through, whatever the pack sends", () => {
    const out = normalizeQueue([
      { ...record({ clientRecordId: "r1" }), guestName: "Chidi Okafor", query: "chidi", seat: "12" },
    ]);
    assert.deepEqual(Object.keys(out[0]!).sort(), [
      "capturedAt",
      "clientRecordId",
      "day",
      "matches",
      "searches",
      "tab",
      "views",
    ]);
    assert.doesNotMatch(JSON.stringify(out), /Chidi|chidi|12/);
  });
});

describe("sync conflicts", () => {
  it("accepts a clean sync from a current pack", () => {
    const { report, apply } = planOfflineSync({
      request: { packVersion: 1, guideVersion: 4, records: [record({ clientRecordId: "r1" })] },
      pack: pack(),
      serverGuideVersion: 4,
      now: NOW,
    });
    assert.equal(report.accepted, true);
    assert.equal(report.acceptedRecords, 1);
    assert.deepEqual(report.conflicts, []);
    assert.equal(report.freshPackRequired, false);
    assert.equal(apply.length, 1);
  });

  it("rejects everything from a revoked pack", () => {
    const { report, apply } = planOfflineSync({
      request: { packVersion: 1, guideVersion: 4, records: [record({ clientRecordId: "r1" })] },
      pack: pack({ status: "REVOKED" }),
      serverGuideVersion: 4,
      now: NOW,
    });
    assert.equal(report.accepted, false);
    assert.equal(report.rejectedRecords, 1);
    assert.equal(apply.length, 0);
    assert.ok(report.conflicts.some((c) => c.kind === "PACK_REVOKED"));
    assert.equal(report.freshPackRequired, true);
  });

  it("rejects a sync from a pack whose window has closed", () => {
    const { report } = planOfflineSync({
      request: { packVersion: 1, guideVersion: 4, records: [] },
      pack: pack({ expiresAt: new Date("2026-08-06T19:59:59Z") }),
      serverGuideVersion: 4,
      now: NOW,
    });
    assert.equal(report.accepted, false);
    assert.ok(report.conflicts.some((c) => c.kind === "PACK_EXPIRED"));
  });

  it("rejects a replayed sync from a superseded pack version", () => {
    const { report } = planOfflineSync({
      request: { packVersion: 1, guideVersion: 4, records: [] },
      pack: pack({ packVersion: 2 }),
      serverGuideVersion: 4,
      now: NOW,
    });
    assert.equal(report.accepted, false);
    assert.ok(report.conflicts.some((c) => c.kind === "PACK_VERSION_MISMATCH"));
  });

  it("never overwrites newer server content, and says so", () => {
    const { report, apply } = planOfflineSync({
      request: { packVersion: 1, guideVersion: 4, records: [record({ clientRecordId: "r1" })] },
      pack: pack(),
      serverGuideVersion: 9,
      now: NOW,
    });

    const conflict = report.conflicts.find((c) => c.kind === "GUIDE_UPDATED");
    assert.ok(conflict, "a republished guide must be reported as a conflict");
    assert.match(conflict.detail, /nothing was overwritten/i);
    assert.equal(report.serverGuideVersion, 9);
    assert.equal(report.packGuideVersion, 4);
    assert.equal(report.freshPackRequired, true);

    // Counters are additive facts about the night, so they still merge — only
    // content would have conflicted, and a pack never uploads content.
    assert.equal(report.accepted, true);
    assert.equal(apply.length, 1);
  });

  it("does not flag a conflict when the pack is ahead of a stale read", () => {
    const { report } = planOfflineSync({
      request: { packVersion: 1, guideVersion: 5, records: [] },
      pack: pack(),
      serverGuideVersion: 4,
      now: NOW,
    });
    assert.deepEqual(report.conflicts, []);
    assert.equal(report.freshPackRequired, false);
  });

  it("reports every blocking problem at once", () => {
    const { report } = planOfflineSync({
      request: { packVersion: 3, guideVersion: 4, records: [] },
      pack: pack({ status: "REVOKED", expiresAt: new Date("2020-01-01T00:00:00Z") }),
      serverGuideVersion: 4,
      now: NOW,
    });
    const kinds = report.conflicts.map((c) => c.kind).sort();
    assert.deepEqual(kinds, ["PACK_EXPIRED", "PACK_REVOKED", "PACK_VERSION_MISMATCH"]);
  });
});

describe("replaying a queue never double-counts", () => {
  it("ignores records the server has already applied", () => {
    const { report, apply } = planOfflineSync({
      request: {
        packVersion: 1,
        guideVersion: 4,
        records: [record({ clientRecordId: "r1" }), record({ clientRecordId: "r2" })],
      },
      pack: pack({ appliedRecordIds: new Set(["r1"]) }),
      serverGuideVersion: 4,
      now: NOW,
    });
    assert.equal(report.acceptedRecords, 1);
    assert.equal(report.duplicateRecords, 1);
    assert.deepEqual(apply.map((r) => r.clientRecordId), ["r2"]);
  });

  it("de-duplicates within a single upload", () => {
    const { report, apply } = planOfflineSync({
      request: {
        packVersion: 1,
        guideVersion: 4,
        records: [record({ clientRecordId: "r1" }), record({ clientRecordId: "r1" })],
      },
      pack: pack(),
      serverGuideVersion: 4,
      now: NOW,
    });
    assert.equal(apply.length, 1);
    assert.equal(report.duplicateRecords, 1);
  });

  it("is idempotent — syncing the same queue twice changes nothing the second time", () => {
    const records = [record({ clientRecordId: "r1" }), record({ clientRecordId: "r2" })];
    const first = planOfflineSync({
      request: { packVersion: 1, guideVersion: 4, records },
      pack: pack(),
      serverGuideVersion: 4,
      now: NOW,
    });

    const second = planOfflineSync({
      request: { packVersion: 1, guideVersion: 4, records },
      pack: pack({ appliedRecordIds: new Set(first.apply.map((r) => r.clientRecordId)) }),
      serverGuideVersion: 4,
      now: NOW,
    });

    assert.equal(second.apply.length, 0);
    assert.equal(second.report.duplicateRecords, 2);
    assert.equal(second.report.accepted, true);
  });
});

describe("aggregation", () => {
  it("sums a night's counters into one row per day and tab", () => {
    const rows = aggregateQueue([
      record({ clientRecordId: "r1", tab: "programme", views: 2 }),
      record({ clientRecordId: "r2", tab: "programme", views: 3 }),
      record({ clientRecordId: "r3", tab: "seating", views: 1, searches: 4, matches: 3 }),
      record({ clientRecordId: "r4", tab: "seating", day: "2026-08-07", views: 5 }),
    ]);

    assert.equal(rows.length, 3);
    const programme = rows.find((r) => r.tab === "programme" && r.day === "2026-08-06");
    assert.equal(programme?.views, 5);

    const seating = rows.find((r) => r.tab === "seating" && r.day === "2026-08-06");
    assert.deepEqual([seating?.views, seating?.searches, seating?.matches], [1, 4, 3]);
  });

  it("returns nothing for an empty queue", () => {
    assert.deepEqual(aggregateQueue([]), []);
  });
});
