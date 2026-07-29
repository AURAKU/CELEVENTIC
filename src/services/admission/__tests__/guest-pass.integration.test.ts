import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/**
 * End-to-end coverage for the Guest Entry Pass against the real dev database.
 *
 * Exercises the behaviours a gate cannot get wrong: code uniqueness, party
 * allowance, partial group arrivals, concurrent scans, regeneration, offline
 * reconciliation and conflict review, admission reset, and portal unlock.
 *
 * Every row created here is namespaced by a run id and removed in `after`.
 */

process.env.ADMISSION_PASS_SECRET ??= "test-admission-secret-do-not-use-in-production";

const RUN = randomUUID().slice(0, 8);

let organizerId: string;
let eventId: string;
let secondEventId: string;

type Prisma = typeof import("../../../lib/prisma")["prisma"];
let prisma: Prisma;

async function loadPrisma(): Promise<Prisma> {
  if (!prisma) ({ prisma } = await import("../../../lib/prisma"));
  return prisma;
}

async function createEvent(title: string): Promise<string> {
  const db = await loadPrisma();
  const event = await db.event.create({
    data: {
      slug: `pass-test-${RUN}-${randomUUID().slice(0, 6)}`,
      title,
      eventType: "WEDDING",
      hostName: "Test Host",
      startDate: new Date(Date.now() + 60 * 60_000),
      organizerId,
    },
  });
  return event.id;
}

/** An invitation with `members` guest rows; `plusOnes` applies to the first row. */
async function createInvitation(
  targetEventId: string,
  name: string,
  members = 1,
  plusOnes = 0
): Promise<string> {
  const db = await loadPrisma();
  const invitation = await db.invitation.create({
    data: {
      eventId: targetEventId,
      name,
      slug: `inv-${RUN}-${randomUUID().slice(0, 8)}`,
      uniqueLink: `lnk-${RUN}-${randomUUID().slice(0, 8)}`,
      status: "ACTIVE",
    },
  });

  for (let i = 0; i < members; i++) {
    await db.guest.create({
      data: {
        eventId: targetEventId,
        invitationId: invitation.id,
        name: `${name} member ${i + 1}`,
        plusOnes: i === 0 ? plusOnes : 0,
      },
    });
  }
  return invitation.id;
}

async function enableQrAdmission(
  targetEventId: string,
  patch: Record<string, unknown> = {}
): Promise<void> {
  const db = await loadPrisma();
  await db.eventAdmissionSettings.upsert({
    where: { eventId: targetEventId },
    create: { eventId: targetEventId, qrAdmissionEnabled: true, ...patch },
    update: { qrAdmissionEnabled: true, ...patch },
  });
}

before(async () => {
  const db = await loadPrisma();
  const user = await db.user.create({
    data: { name: `Pass Test Organizer ${RUN}`, email: `pass-test-${RUN}@example.test` },
  });
  organizerId = user.id;
  eventId = await createEvent(`Pass Test Event ${RUN}`);
  secondEventId = await createEvent(`Other Event ${RUN}`);
  await enableQrAdmission(eventId);
  await enableQrAdmission(secondEventId);
});

after(async () => {
  const db = await loadPrisma();
  // Cascades clear passes, guests, invitations, scans and admission events.
  await db.event.deleteMany({ where: { organizerId } }).catch(() => {});
  await db.offlineDevice.deleteMany({ where: { userId: organizerId } }).catch(() => {});
  await db.user.delete({ where: { id: organizerId } }).catch(() => {});
  await db.$disconnect();
});

describe("pass issuance", () => {
  it("is idempotent — repeated calls never mint a second live pass", async () => {
    const db = await loadPrisma();
    const { ensureInvitationPass } = await import("../guest-pass.service");
    const invitationId = await createInvitation(eventId, "Idempotent Party");

    const first = await ensureInvitationPass(invitationId);
    const second = await ensureInvitationPass(invitationId);
    const third = await ensureInvitationPass(invitationId);

    assert.ok(first && second && third);
    assert.equal(first.pass.id, second.pass.id);
    assert.equal(second.pass.id, third.pass.id);
    assert.equal(first.token, third.token, "the same nonce must re-derive the same token");

    const count = await db.guestPass.count({ where: { invitationId } });
    assert.equal(count, 1);
  });

  it("issues a unique code per invitation within an event", async () => {
    const { ensureInvitationPass } = await import("../guest-pass.service");
    const codes = new Set<string>();
    const tokens = new Set<string>();

    for (let i = 0; i < 25; i++) {
      const invitationId = await createInvitation(eventId, `Unique ${i}`);
      const issued = await ensureInvitationPass(invitationId);
      assert.ok(issued);
      assert.ok(!codes.has(issued.pass.code), `duplicate code ${issued.pass.code}`);
      assert.ok(!tokens.has(issued.token), "duplicate token");
      codes.add(issued.pass.code);
      tokens.add(issued.token);
    }
    assert.equal(codes.size, 25);
  });

  it("derives party size from guests plus their plus-ones", async () => {
    const { ensureInvitationPass } = await import("../guest-pass.service");

    const single = await ensureInvitationPass(await createInvitation(eventId, "Single", 1, 0));
    assert.equal(single?.pass.partySize, 1);

    const couple = await ensureInvitationPass(await createInvitation(eventId, "Couple", 1, 1));
    assert.equal(couple?.pass.partySize, 2);

    const family = await ensureInvitationPass(await createInvitation(eventId, "Family", 2, 3));
    assert.equal(family?.pass.partySize, 5, "(1 + 3 plus-ones) + 1 second row");
  });

  it("widens the allowance when a plus-one is added after issuance", async () => {
    const db = await loadPrisma();
    const { ensureInvitationPass } = await import("../guest-pass.service");
    const invitationId = await createInvitation(eventId, "Late Plus One", 1, 0);

    const before = await ensureInvitationPass(invitationId);
    assert.equal(before?.pass.partySize, 1);

    await db.guest.create({
      data: { eventId, invitationId, name: "Late arrival", plusOnes: 0 },
    });

    const after = await ensureInvitationPass(invitationId);
    assert.equal(after?.pass.partySize, 2);
    assert.equal(after?.pass.id, before?.pass.id, "widening must not reissue the QR");
  });
});

describe("admission at the gate", () => {
  it("admits a single guest and unlocks the portal", async () => {
    const db = await loadPrisma();
    const { ensureInvitationPass, admitByPass } = await import("../guest-pass.service");
    const { getInvitationAdmission } = await import("../admission.service");

    const invitationId = await createInvitation(eventId, "Solo Guest");
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);

    const locked = await getInvitationAdmission(invitationId);
    assert.equal(locked?.canAccessPortal, false, "portal must be locked before arrival");

    const result = await admitByPass({
      eventId,
      token: issued.token,
      scannerUserId: organizerId,
    });

    assert.equal(result.decision.outcome, "ADMIT");
    assert.equal(result.decision.tone, "green");
    assert.equal(result.pass?.admittedCount, 1);
    assert.equal(result.pass?.status, "ADMITTED");

    const unlocked = await getInvitationAdmission(invitationId);
    assert.equal(unlocked?.canAccessPortal, true);
    assert.equal(unlocked?.state, "ADMITTED");

    const scans = await db.qrScan.count({ where: { guestPassId: issued.pass.id, result: "VALID" } });
    assert.equal(scans, 1, "every admission is written to the scan ledger");
  });

  it("admits a group in stages and never exceeds the allowance", async () => {
    const { ensureInvitationPass, admitByPass } = await import("../guest-pass.service");
    const { getInvitationAdmission } = await import("../admission.service");

    const invitationId = await createInvitation(eventId, "Staged Family", 1, 4);
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);
    assert.equal(issued.pass.partySize, 5);

    const first = await admitByPass({
      eventId,
      token: issued.token,
      quantity: 2,
      scannerUserId: organizerId,
    });
    assert.equal(first.decision.outcome, "PARTIAL_ADMIT");
    assert.equal(first.pass?.admittedCount, 2);

    const partial = await getInvitationAdmission(invitationId);
    assert.equal(partial?.state, "PARTIALLY_ADMITTED");
    assert.equal(partial?.canAccessPortal, true, "first head unlocks by default policy");

    const overshoot = await admitByPass({
      eventId,
      token: issued.token,
      quantity: 4,
      scannerUserId: organizerId,
    });
    assert.equal(overshoot.decision.reason, "ALLOWANCE_EXCEEDED");
    assert.equal(overshoot.pass?.admittedCount, 2, "a refused scan must not move the count");

    const rest = await admitByPass({
      eventId,
      token: issued.token,
      quantity: 3,
      scannerUserId: organizerId,
    });
    assert.equal(rest.decision.outcome, "ADMIT");
    assert.equal(rest.pass?.admittedCount, 5);
    assert.equal(rest.pass?.status, "ADMITTED");

    const duplicate = await admitByPass({
      eventId,
      token: issued.token,
      scannerUserId: organizerId,
    });
    assert.equal(duplicate.decision.admitQuantity, 0);
    assert.equal(duplicate.pass?.admittedCount, 5);
  });

  it("admits by named party member and flips only that guest row", async () => {
    const db = await loadPrisma();
    const { ensureInvitationPass, admitByPass } = await import("../guest-pass.service");

    const invitationId = await createInvitation(eventId, "Named Party", 3, 0);
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);

    const guests = await db.guest.findMany({
      where: { invitationId },
      orderBy: { createdAt: "asc" },
    });

    const result = await admitByPass({
      eventId,
      token: issued.token,
      guestIds: [guests[0].id],
      scannerUserId: organizerId,
    });

    assert.equal(result.decision.outcome, "PARTIAL_ADMIT");
    assert.equal(result.pass?.admittedCount, 1);

    const refreshed = await db.guest.findMany({
      where: { invitationId },
      orderBy: { createdAt: "asc" },
    });
    assert.equal(refreshed[0].status, "CHECKED_IN");
    assert.equal(refreshed[1].status, "INVITED");
    assert.equal(refreshed[2].status, "INVITED");
  });

  it("admits by manual code and rejects an unknown one", async () => {
    const { ensureInvitationPass, admitByPass } = await import("../guest-pass.service");
    const invitationId = await createInvitation(eventId, "Manual Code Party");
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);

    const good = await admitByPass({
      eventId,
      code: issued.pass.code,
      scannerUserId: organizerId,
    });
    assert.equal(good.decision.outcome, "ADMIT");
    assert.equal(good.pass?.id, issued.pass.id);

    const unknown = await admitByPass({
      eventId,
      code: "999999",
      scannerUserId: organizerId,
    });
    assert.equal(unknown.decision.reason, "NOT_FOUND");
    assert.equal(unknown.pass, null);
  });

  it("refuses a pass presented at another event's gate", async () => {
    const { ensureInvitationPass, admitByPass } = await import("../guest-pass.service");
    const invitationId = await createInvitation(eventId, "Wrong Gate Party");
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);

    const result = await admitByPass({
      eventId: secondEventId,
      token: issued.token,
      scannerUserId: organizerId,
    });
    assert.equal(result.decision.reason, "WRONG_EVENT");
    assert.equal(result.decision.admitQuantity, 0);
  });

  it("rejects a forged token without touching the pass", async () => {
    const { admitByPass } = await import("../guest-pass.service");
    const result = await admitByPass({
      eventId,
      token: `cvp1.${"A".repeat(22)}.${"B".repeat(22)}`,
      scannerUserId: organizerId,
    });
    assert.equal(result.decision.reason, "NOT_FOUND");
    assert.equal(result.pass, null);
  });

  it("a dry run reports the outcome without admitting anyone", async () => {
    const { ensureInvitationPass, admitByPass } = await import("../guest-pass.service");
    const invitationId = await createInvitation(eventId, "Preview Party", 1, 1);
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);

    const preview = await admitByPass({
      eventId,
      token: issued.token,
      scannerUserId: organizerId,
      dryRun: true,
    });
    assert.equal(preview.decision.outcome, "ADMIT");
    assert.equal(preview.pass?.admittedCount, 0, "dry run must not write");
    assert.equal(preview.party.length, 1);
  });

  it("two scanners racing a single-seat pass admit exactly once", async () => {
    const { ensureInvitationPass, admitByPass } = await import("../guest-pass.service");
    const invitationId = await createInvitation(eventId, "Race Party");
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);

    const [a, b] = await Promise.all([
      admitByPass({ eventId, token: issued.token, scannerUserId: organizerId }),
      admitByPass({ eventId, token: issued.token, scannerUserId: organizerId }),
    ]);

    const admittedTotal = a.decision.admitQuantity + b.decision.admitQuantity;
    assert.equal(admittedTotal, 1, "a concurrent double-scan must admit one head, not two");

    const db = await loadPrisma();
    const finalPass = await db.guestPass.findUniqueOrThrow({ where: { id: issued.pass.id } });
    assert.equal(finalPass.admittedCount, 1);
    assert.equal(finalPass.status, "ADMITTED");
  });
});

describe("regeneration and revocation", () => {
  it("regenerating issues a new token/code and refuses the old one", async () => {
    const { ensureInvitationPass, regenerateInvitationPass, admitByPass } = await import(
      "../guest-pass.service"
    );
    const invitationId = await createInvitation(eventId, "Lost Pass Party");
    const original = await ensureInvitationPass(invitationId);
    assert.ok(original);

    const replacement = await regenerateInvitationPass(invitationId, organizerId, "guest lost it");
    assert.ok(replacement);
    assert.notEqual(replacement.token, original.token);
    assert.notEqual(replacement.pass.code, original.pass.code);
    assert.equal(replacement.pass.tokenVersion, 2);
    assert.equal(replacement.pass.reissuedFromId, original.pass.id);

    const stale = await admitByPass({
      eventId,
      token: original.token,
      scannerUserId: organizerId,
    });
    assert.equal(stale.decision.reason, "REISSUED", "old printouts must be recognised, not unknown");
    assert.equal(stale.decision.admitQuantity, 0);

    const fresh = await admitByPass({
      eventId,
      token: replacement.token,
      scannerUserId: organizerId,
    });
    assert.equal(fresh.decision.outcome, "ADMIT");
  });

  it("regeneration carries admitted heads forward so no one enters twice", async () => {
    const { ensureInvitationPass, regenerateInvitationPass, admitByPass } = await import(
      "../guest-pass.service"
    );
    const invitationId = await createInvitation(eventId, "Half In Party", 1, 3);
    const original = await ensureInvitationPass(invitationId);
    assert.ok(original);

    await admitByPass({
      eventId,
      token: original.token,
      quantity: 2,
      scannerUserId: organizerId,
    });

    const replacement = await regenerateInvitationPass(invitationId, organizerId, "phone died");
    assert.ok(replacement);
    assert.equal(replacement.pass.admittedCount, 2);
    assert.equal(replacement.pass.status, "PARTIALLY_ADMITTED");

    const rest = await admitByPass({
      eventId,
      token: replacement.token,
      scannerUserId: organizerId,
    });
    assert.equal(rest.decision.admitQuantity, 2, "only the 2 who had not arrived");
    assert.equal(rest.pass?.admittedCount, 4);
  });

  it("revoking a pass closes the gate on it", async () => {
    const { ensureInvitationPass, revokeInvitationPass, admitByPass } = await import(
      "../guest-pass.service"
    );
    const invitationId = await createInvitation(eventId, "Revoked Party");
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);

    await revokeInvitationPass(invitationId, organizerId, "guest disinvited");

    const result = await admitByPass({
      eventId,
      token: issued.token,
      scannerUserId: organizerId,
    });
    assert.equal(result.decision.reason, "REVOKED");
    assert.equal(result.decision.admitQuantity, 0);
  });
});

describe("admission reset", () => {
  it("resets the party, zeroes the pass, and relocks the portal", async () => {
    const { ensureInvitationPass, admitByPass } = await import("../guest-pass.service");
    const { resetAdmission, getInvitationAdmission } = await import("../admission.service");
    const db = await loadPrisma();

    const invitationId = await createInvitation(eventId, "Reset Party", 2, 0);
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);

    await admitByPass({
      eventId,
      token: issued.token,
      quantity: 2,
      scannerUserId: organizerId,
    });
    assert.equal((await getInvitationAdmission(invitationId))?.canAccessPortal, true);

    await resetAdmission({
      invitationId,
      scope: "entire",
      actorUserId: organizerId,
      reason: "wrong party admitted",
    });

    const after = await getInvitationAdmission(invitationId);
    assert.equal(after?.admittedCount, 0);
    assert.equal(after?.canAccessPortal, false, "the portal must relock");
    assert.equal(after?.state, "ADMISSION_RESET");

    const pass = await db.guestPass.findUniqueOrThrow({ where: { id: issued.pass.id } });
    assert.equal(pass.admittedCount, 0);
    assert.equal(pass.status, "ACTIVE");

    const readmitted = await admitByPass({
      eventId,
      token: issued.token,
      quantity: 2,
      scannerUserId: organizerId,
    });
    assert.equal(readmitted.decision.outcome, "ADMIT", "a reset pass works again");
    assert.equal((await getInvitationAdmission(invitationId))?.canAccessPortal, true);
  });
});

describe("portal unlock policy", () => {
  it("ON_FULL_ADMISSION keeps the portal locked until the whole party is in", async () => {
    const { ensureInvitationPass, admitByPass } = await import("../guest-pass.service");
    const { getInvitationAdmission } = await import("../admission.service");

    const policyEventId = await createEvent(`Full Unlock Event ${RUN}`);
    await enableQrAdmission(policyEventId, { portalUnlockPolicy: "ON_FULL_ADMISSION" });

    const invitationId = await createInvitation(policyEventId, "Policy Party", 1, 2);
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);

    await admitByPass({
      eventId: policyEventId,
      token: issued.token,
      quantity: 1,
      scannerUserId: organizerId,
    });
    assert.equal((await getInvitationAdmission(invitationId))?.canAccessPortal, false);

    await admitByPass({
      eventId: policyEventId,
      token: issued.token,
      quantity: 2,
      scannerUserId: organizerId,
    });
    assert.equal((await getInvitationAdmission(invitationId))?.canAccessPortal, true);
  });
});

describe("offline admission", () => {
  let deviceId: string;

  beforeEach(async () => {
    const db = await loadPrisma();
    const device = await db.offlineDevice.create({
      data: {
        eventId,
        userId: organizerId,
        deviceName: `Gate phone ${randomUUID().slice(0, 6)}`,
        deviceToken: randomUUID(),
      },
    });
    deviceId = device.id;
  });

  it("builds a package that carries hashes, never usable tokens", async () => {
    const { ensureInvitationPass } = await import("../guest-pass.service");
    const { buildOfflinePackage } = await import("../offline-admission.service");
    const { hashPassToken } = await import("../../../lib/admission/pass-token");

    const invitationId = await createInvitation(eventId, "Offline Package Party", 1, 1);
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);

    const pkg = await buildOfflinePackage(eventId);
    const serialized = JSON.stringify(pkg);
    assert.ok(!serialized.includes(issued.token), "a package must never contain a live token");

    const record = pkg.passes.find((p) => p.h === hashPassToken(issued.token));
    assert.ok(record, "the pass must be indexed by its token hash");
    assert.equal(record.p, 2);
    assert.equal(record.c, issued.pass.code);
    assert.ok(pkg.checksum.length > 0);
  });

  it("replays offline admissions and is idempotent on retry", async () => {
    const { ensureInvitationPass } = await import("../guest-pass.service");
    const { reconcileOfflineAdmissions } = await import("../offline-admission.service");
    const { hashPassToken } = await import("../../../lib/admission/pass-token");

    const invitationId = await createInvitation(eventId, "Offline Sync Party", 1, 2);
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);

    const record = {
      clientRecordId: randomUUID(),
      tokenHash: hashPassToken(issued.token),
      quantity: 2,
      capturedAt: new Date().toISOString(),
    };

    const first = await reconcileOfflineAdmissions(deviceId, eventId, [record], organizerId);
    assert.equal(first.applied, 1);
    assert.equal(first.conflicts, 0);

    const db = await loadPrisma();
    const pass = await db.guestPass.findUniqueOrThrow({ where: { id: issued.pass.id } });
    assert.equal(pass.admittedCount, 2);
    assert.equal(pass.status, "PARTIALLY_ADMITTED");

    const retry = await reconcileOfflineAdmissions(deviceId, eventId, [record], organizerId);
    assert.equal(retry.duplicates, 1);
    assert.equal(retry.applied, 0);

    const unchanged = await db.guestPass.findUniqueOrThrow({ where: { id: issued.pass.id } });
    assert.equal(unchanged.admittedCount, 2, "a retried sync must not double-admit");
  });

  it("flags an offline over-admit for review instead of silently accepting it", async () => {
    const { ensureInvitationPass, admitByPass } = await import("../guest-pass.service");
    const { reconcileOfflineAdmissions, listConflicts, resolveConflict } = await import(
      "../offline-admission.service"
    );
    const { hashPassToken } = await import("../../../lib/admission/pass-token");

    const invitationId = await createInvitation(eventId, "Conflict Party");
    const issued = await ensureInvitationPass(invitationId);
    assert.ok(issued);

    // Online gate admitted them while this device was offline.
    await admitByPass({ eventId, token: issued.token, scannerUserId: organizerId });

    const result = await reconcileOfflineAdmissions(
      deviceId,
      eventId,
      [
        {
          clientRecordId: randomUUID(),
          tokenHash: hashPassToken(issued.token),
          quantity: 1,
          capturedAt: new Date().toISOString(),
        },
      ],
      organizerId
    );

    assert.equal(result.conflicts, 1);
    assert.equal(result.applied, 0);

    const db = await loadPrisma();
    const conflicted = await db.guestPass.findUniqueOrThrow({ where: { id: issued.pass.id } });
    assert.equal(conflicted.status, "CONFLICT");
    assert.equal(conflicted.admittedCount, 1, "the count must not be inflated by the conflict");

    const pending = await listConflicts(eventId);
    assert.ok(pending.some((p) => p.id === issued.pass.id));

    await resolveConflict(issued.pass.id, organizerId, "reject", "duplicate scan at the gate");
    const resolved = await db.guestPass.findUniqueOrThrow({ where: { id: issued.pass.id } });
    assert.notEqual(resolved.status, "CONFLICT");
  });

  it("rejects offline records that match no pass on this event", async () => {
    const { reconcileOfflineAdmissions } = await import("../offline-admission.service");
    const result = await reconcileOfflineAdmissions(
      deviceId,
      eventId,
      [
        {
          clientRecordId: randomUUID(),
          tokenHash: "0".repeat(64),
          quantity: 1,
          capturedAt: new Date().toISOString(),
        },
      ],
      organizerId
    );
    assert.equal(result.rejected, 1);
    assert.equal(result.applied, 0);
  });
});

describe("backfill", () => {
  it("provisions passes for pre-existing invitations without touching issued ones", async () => {
    const db = await loadPrisma();
    const { ensureEventPasses, ensureInvitationPass } = await import("../guest-pass.service");

    const backfillEventId = await createEvent(`Backfill Event ${RUN}`);
    await enableQrAdmission(backfillEventId);

    const legacyIds = [
      await createInvitation(backfillEventId, "Legacy A"),
      await createInvitation(backfillEventId, "Legacy B"),
      await createInvitation(backfillEventId, "Legacy C"),
    ];
    const alreadyIssued = await ensureInvitationPass(legacyIds[0]);
    assert.ok(alreadyIssued);

    const result = await ensureEventPasses(backfillEventId);
    assert.equal(result.total, 3);
    assert.equal(result.issued, 2, "the pre-issued invitation must be skipped");

    for (const id of legacyIds) {
      const count = await db.guestPass.count({ where: { invitationId: id } });
      assert.equal(count, 1);
    }

    const untouched = await db.guestPass.findUniqueOrThrow({ where: { id: alreadyIssued.pass.id } });
    assert.equal(untouched.code, alreadyIssued.pass.code);

    // Re-running is a no-op.
    const rerun = await ensureEventPasses(backfillEventId);
    assert.equal(rerun.issued, 0);
  });
});
