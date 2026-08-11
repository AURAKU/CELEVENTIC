import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/**
 * Vendor pass update + delete semantics against the real dev database.
 *
 * Covers the Guest CRM edit/delete paths: organisers can patch entry fields,
 * hard-delete unused passes (QR gone forever), and must archive when admission
 * history exists so the entry log is preserved.
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

async function vendorPassService() {
  return import("../vendor-team-pass.service");
}

before(async () => {
  const db = await loadPrisma();
  const user = await db.user.create({
    data: {
      name: `Vendor Edit Organizer ${RUN}`,
      email: `vendor-edit-${RUN}@example.test`,
    },
  });
  organizerId = user.id;
  const event = await db.event.create({
    data: {
      slug: `vendor-edit-${RUN}`,
      title: `Vendor Edit Event ${RUN}`,
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

describe("updateVendorTeamPass", () => {
  it("patches organiser-editable entry fields without rotating the QR", async () => {
    const {
      createVendorTeamPass,
      updateVendorTeamPass,
      getVendorTeamPass,
    } = await vendorPassService();

    const created = await createVendorTeamPass({
      eventId,
      actorUserId: organizerId,
      title: `Band ${RUN}`,
      vendorName: `Band Co ${RUN}`,
      passType: "MUSICAL_BAND",
      passMode: "TEAM",
      teamCapacity: 6,
      contactName: "Old Contact",
      notes: "Setup at 3pm",
      reentryPolicy: "UNLIMITED",
    });

    const beforeToken = created.publicToken;
    const beforeCode = created.admissionCode;

    const updated = await updateVendorTeamPass(created.id, organizerId, {
      title: `Band Updated ${RUN}`,
      vendorName: `Band Co Updated ${RUN}`,
      contactName: "New Contact",
      phone: "+15550100",
      email: `band-${RUN}@example.test`,
      companyName: "Aura Audio",
      notes: "Load-in via south gate",
      teamCapacity: 8,
      reentryPolicy: "CUSTOM",
      reentryLimit: 3,
      entryMode: "SELECT_QUANTITY",
      accessZones: ["Main Entrance", "Stage"],
      vehicleRegistration: "ABC-123",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
    });

    assert.equal(updated.title, `Band Updated ${RUN}`);
    assert.equal(updated.vendorName, `Band Co Updated ${RUN}`);
    assert.equal(updated.contactName, "New Contact");
    assert.equal(updated.phone, "+15550100");
    assert.equal(updated.email, `band-${RUN}@example.test`);
    assert.equal(updated.companyName, "Aura Audio");
    assert.equal(updated.notes, "Load-in via south gate");
    assert.equal(updated.teamCapacity, 8);
    assert.equal(updated.reentryPolicy, "CUSTOM");
    assert.equal(updated.reentryLimit, 3);
    assert.equal(updated.entryMode, "SELECT_QUANTITY");
    assert.deepEqual(updated.accessZones, ["Main Entrance", "Stage"]);
    assert.equal(updated.vehicleRegistration, "ABC-123");
    assert.ok(updated.validUntil);
    assert.equal(updated.publicToken, beforeToken, "edit must not rotate the public QR token");
    assert.equal(updated.admissionCode, beforeCode, "edit must not rotate the access code");

    const fetched = await getVendorTeamPass(created.id);
    assert.equal(fetched?.title, `Band Updated ${RUN}`);
  });

  it("refuses capacity shrink below people already admitted without confirmation", async () => {
    const { createVendorTeamPass, updateVendorTeamPass } = await vendorPassService();
    const db = await loadPrisma();

    const created = await createVendorTeamPass({
      eventId,
      actorUserId: organizerId,
      title: `Crew ${RUN}`,
      vendorName: `Crew Co ${RUN}`,
      passType: "TECHNICAL_CREW",
      teamCapacity: 5,
    });

    await db.vendorTeamPass.update({
      where: { id: created.id },
      data: { admittedCount: 3, status: "PARTIALLY_ADMITTED" },
    });

    await assert.rejects(
      () =>
        updateVendorTeamPass(created.id, organizerId, {
          teamCapacity: 2,
        }),
      (error: unknown) =>
        error instanceof Error && /confirm capacity change/i.test(error.message)
    );

    const confirmed = await updateVendorTeamPass(created.id, organizerId, {
      teamCapacity: 4,
      confirmCapacityChange: true,
    });
    assert.equal(confirmed.teamCapacity, 4);
  });
});

describe("deleteVendorTeamPass", () => {
  it("hard-deletes a pass with no admission history", async () => {
    const {
      createVendorTeamPass,
      deleteVendorTeamPass,
      getVendorTeamPass,
    } = await vendorPassService();

    const created = await createVendorTeamPass({
      eventId,
      actorUserId: organizerId,
      title: `Temp ${RUN}`,
      vendorName: `Temp Co ${RUN}`,
      passType: "VENDOR",
      teamCapacity: 2,
    });

    const result = await deleteVendorTeamPass(created.id, organizerId, true);
    assert.equal(result.deleted, true);

    const gone = await getVendorTeamPass(created.id);
    assert.equal(gone, null);

    const db = await loadPrisma();
    const row = await db.vendorTeamPass.findUnique({ where: { id: created.id } });
    assert.equal(row, null);
  });

  it("refuses hard delete when admission history exists, and archive succeeds", async () => {
    const {
      createVendorTeamPass,
      deleteVendorTeamPass,
      archiveVendorTeamPass,
      getVendorTeamPass,
    } = await vendorPassService();
    const db = await loadPrisma();

    const created = await createVendorTeamPass({
      eventId,
      actorUserId: organizerId,
      title: `History ${RUN}`,
      vendorName: `History Co ${RUN}`,
      passType: "SECURITY",
      teamCapacity: 4,
    });

    await db.vendorTeamPassAdmission.create({
      data: {
        passId: created.id,
        eventId,
        quantity: 1,
        mode: "one",
        outcome: "ADMITTED",
        entryCycle: 1,
        channel: "dashboard",
      },
    });

    await assert.rejects(
      () => deleteVendorTeamPass(created.id, organizerId, true),
      (error: unknown) =>
        error instanceof Error && /admission history/i.test(error.message)
    );

    const archived = await archiveVendorTeamPass(created.id, organizerId);
    assert.equal(archived.status, "ARCHIVED");
    assert.ok(archived.id);

    const hidden = await getVendorTeamPass(created.id);
    assert.equal(hidden, null, "archived passes leave the live list / getVendorTeamPass");

    const row = await db.vendorTeamPass.findUnique({ where: { id: created.id } });
    assert.ok(row?.archivedAt);
    assert.equal(row?.status, "ARCHIVED");
  });
});
