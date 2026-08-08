import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/**
 * Vendor passes behave as reusable access cards against the real dev database.
 *
 * Covers the promises a gate makes to a caterer at 2am: the card still opens,
 * every scan (allowed or refused) is written to the entry log, and a revoked
 * card stops dead. Rows are namespaced per run and removed in `after`.
 */

process.env.ADMISSION_PASS_SECRET ??= "test-admission-secret-do-not-use-in-production";
process.env.VENDOR_TEAM_TOKEN_SECRET ??= "test-vendor-secret-do-not-use-in-production";

const RUN = randomUUID().slice(0, 8);

let organizerId: string;
let eventId: string;

type Prisma = (typeof import("../../../lib/prisma"))["prisma"];
let prisma: Prisma;

async function loadPrisma(): Promise<Prisma> {
  if (!prisma) ({ prisma } = await import("../../../lib/prisma"));
  return prisma;
}

async function createCard(options: {
  title: string;
  teamCapacity: number;
  reentryPolicy?: "NONE" | "ONE" | "UNLIMITED" | "CUSTOM";
  reentryLimit?: number | null;
}) {
  const { createVendorTeamPass } = await import(
    "../../vendor-pass/vendor-team-pass.service"
  );
  return createVendorTeamPass({
    eventId,
    actorUserId: organizerId,
    title: options.title,
    vendorName: `${options.title} Co`,
    passType: "VENDOR",
    passMode: options.teamCapacity > 1 ? "TEAM" : "INDIVIDUAL",
    entryMode: "INDIVIDUAL_ENTRY",
    teamCapacity: options.teamCapacity,
    reentryPolicy: options.reentryPolicy,
    reentryLimit: options.reentryLimit ?? null,
  });
}

async function admit(passId: string, mode: "one" | "full_team" = "one") {
  const { admitVendorTeamPass } = await import("../../vendor-pass/vendor-team-pass.service");
  return admitVendorTeamPass({
    eventId,
    passId,
    mode,
    scannerUserId: organizerId,
    gate: "Main Entrance",
    channel: "qr",
  });
}

before(async () => {
  const db = await loadPrisma();
  const user = await db.user.create({
    data: { name: `Vendor Test Organizer ${RUN}`, email: `vendor-test-${RUN}@example.test` },
  });
  organizerId = user.id;
  const event = await db.event.create({
    data: {
      slug: `vendor-card-${RUN}`,
      title: `Vendor Card Event ${RUN}`,
      eventType: "WEDDING",
      hostName: "Test Host",
      startDate: new Date(Date.now() + 60 * 60_000),
      organizerId,
    },
  });
  eventId = event.id;
});

after(async () => {
  const db = await loadPrisma();
  await db.event.deleteMany({ where: { organizerId } }).catch(() => {});
  await db.user.delete({ where: { id: organizerId } }).catch(() => {});
  await db.$disconnect();
});

describe("vendor access card admission", () => {
  it("new passes default to unlimited re-entry", async () => {
    const pass = await createCard({ title: `Default ${RUN}`, teamCapacity: 3 });
    assert.equal(pass.multiEntry, true);
    assert.equal(pass.reentryPolicy, "UNLIMITED");
  });

  it("admits repeatedly past capacity, opening a new entry cycle each time", async () => {
    const pass = await createCard({ title: `Caterers ${RUN}`, teamCapacity: 2 });

    const first = await admit(pass.id);
    assert.equal(first.ok, true);
    const second = await admit(pass.id);
    assert.equal(second.ok, true);

    // Capacity is now full — a one-time pass would refuse here.
    const third = await admit(pass.id);
    assert.equal(third.ok, true, "an access card must keep opening the gate");
    if (third.ok) {
      assert.equal(third.startsNewCycle, true);
      assert.equal(third.entryCycle, 2);
    }

    const db = await loadPrisma();
    const row = await db.vendorTeamPass.findUniqueOrThrow({ where: { id: pass.id } });
    assert.equal(row.entryCycle, 2);
    assert.equal(row.totalEntries, 3, "every scan counts towards the lifetime total");
    assert.equal(row.totalAdmitted, 3);
    assert.equal(row.admittedCount, 1, "the new cycle restarts the in-venue headcount");
  });

  it("writes one entry-log row per scan, with channel and cycle", async () => {
    const pass = await createCard({ title: `Logged ${RUN}`, teamCapacity: 1 });
    await admit(pass.id);
    await admit(pass.id);

    const { getVendorTeamPassHistory } = await import(
      "../../vendor-pass/vendor-team-pass.service"
    );
    const { history, summary } = await getVendorTeamPassHistory(pass.id, 50);

    assert.equal(history.length, 2);
    assert.equal(summary.entries, 2);
    assert.equal(summary.peopleAdmitted, 2);
    assert.equal(summary.currentCycle, 2);
    assert.deepEqual(
      history.map((h) => h.entryCycle).sort(),
      [1, 2]
    );
    for (const row of history) {
      assert.equal(row.outcome, "ADMITTED");
      assert.equal(row.channel, "qr");
      assert.equal(row.gate, "Main Entrance");
      assert.ok(!Number.isNaN(new Date(row.createdAt).getTime()), "every row is dated");
    }
  });

  it("records refused scans instead of failing silently", async () => {
    const pass = await createCard({ title: `Revoked ${RUN}`, teamCapacity: 2 });
    const { revokeVendorTeamPass, getVendorTeamPassHistory } = await import(
      "../../vendor-pass/vendor-team-pass.service"
    );
    await revokeVendorTeamPass(pass.id, organizerId, "Test revoke");

    const denied = await admit(pass.id);
    assert.equal(denied.ok, false);

    const { history, summary } = await getVendorTeamPassHistory(pass.id, 50);
    assert.equal(summary.deniedAttempts, 1);
    assert.equal(history[0].outcome, "DENIED");
    assert.ok(history[0].denialReason && history[0].denialReason.length > 0);
  });

  it("stops a limited card once its re-entries are spent", async () => {
    const pass = await createCard({
      title: `Limited ${RUN}`,
      teamCapacity: 1,
      reentryPolicy: "CUSTOM",
      reentryLimit: 1,
    });

    assert.equal((await admit(pass.id)).ok, true, "first visit");
    assert.equal((await admit(pass.id)).ok, true, "the single allowed re-entry");
    const third = await admit(pass.id);
    assert.equal(third.ok, false, "no allowance left");
  });

  it("single-visit cards still behave like one-time passes", async () => {
    const pass = await createCard({
      title: `Single ${RUN}`,
      teamCapacity: 1,
      reentryPolicy: "NONE",
    });
    assert.equal((await admit(pass.id)).ok, true);
    assert.equal((await admit(pass.id)).ok, false);
  });

  it("surfaces vendor entries in the unified gate scan log", async () => {
    const pass = await createCard({ title: `Unified ${RUN}`, teamCapacity: 2 });
    await admit(pass.id);

    const { getUnifiedScanLog } = await import("../scan-log.service");
    const log = await getUnifiedScanLog(eventId, { limit: 100 });
    const row = log.items.find((item) => item.displayName.includes(`Unified ${RUN}`));

    assert.ok(row, "the vendor scan must appear in the recent scans feed");
    assert.equal(row.source, "vendor_pass");
    assert.equal(row.passType, "Vendor access card");
    assert.equal(row.status, "ADMITTED");
    assert.equal(row.gate, "Main Entrance");
    assert.ok(row.code);
  });
});
