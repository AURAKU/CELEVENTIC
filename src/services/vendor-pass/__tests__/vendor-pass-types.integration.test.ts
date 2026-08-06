import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/**
 * Per-event vendor pass types, against the real dev database.
 *
 * The pure rules are covered in `src/lib/vendor-pass/__tests__/pass-types.test.ts`.
 * What only shows up once rows exist is proved here: that types are scoped to a
 * single event, that a type still carried by a live pass is never destroyed,
 * that hiding a built-in stops new passes without touching issued ones, and
 * that the write path refuses a retired type outright.
 *
 * Every row is namespaced per run and removed in `after`.
 */

process.env.ADMISSION_PASS_SECRET ??= "test-admission-secret-do-not-use-in-production";
process.env.VENDOR_TEAM_TOKEN_SECRET ??= "test-vendor-secret-do-not-use-in-production";

const RUN = randomUUID().slice(0, 8);

let organizerId: string;
let eventId: string;
let otherEventId: string;

type Prisma = (typeof import("../../../lib/prisma"))["prisma"];
let prisma: Prisma;

async function loadPrisma(): Promise<Prisma> {
  if (!prisma) ({ prisma } = await import("../../../lib/prisma"));
  return prisma;
}

async function service() {
  return import("../vendor-pass-type.service");
}

async function issuePass(passTypeValue: string, title: string) {
  const { createVendorTeamPass } = await import("../vendor-team-pass.service");
  const { resolveVendorPassTypeSelection } = await service();
  const selection = await resolveVendorPassTypeSelection({
    eventId,
    value: passTypeValue,
  });
  return createVendorTeamPass({
    eventId,
    actorUserId: organizerId,
    title,
    vendorName: `${title} Co`,
    passType: selection.passType,
    categoryLabel: selection.categoryLabel,
    passMode: "TEAM",
    teamCapacity: 4,
  });
}

before(async () => {
  const db = await loadPrisma();
  const user = await db.user.create({
    data: { name: `Pass Type Organizer ${RUN}`, email: `pass-type-${RUN}@example.test` },
  });
  organizerId = user.id;
  const [event, other] = await Promise.all([
    db.event.create({
      data: {
        slug: `pass-types-${RUN}`,
        title: `Pass Types Event ${RUN}`,
        eventType: "WEDDING",
        hostName: "Test Host",
        startDate: new Date(Date.now() + 60 * 60_000),
        organizerId,
      },
    }),
    db.event.create({
      data: {
        slug: `pass-types-other-${RUN}`,
        title: `Other Event ${RUN}`,
        eventType: "WEDDING",
        hostName: "Test Host",
        startDate: new Date(Date.now() + 60 * 60_000),
        organizerId,
      },
    }),
  ]);
  eventId = event.id;
  otherEventId = other.id;
});

after(async () => {
  const db = await loadPrisma();
  await db.event.deleteMany({ where: { organizerId } }).catch(() => {});
  await db.user.delete({ where: { id: organizerId } }).catch(() => {});
  await db.$disconnect();
});

describe("adding a vendor pass type", () => {
  it("adds a type to one event's picker and leaves other events alone", async () => {
    const { createEventVendorPassType, listEventVendorPassTypes } = await service();

    const created = await createEventVendorPassType({
      eventId,
      actorUserId: organizerId,
      label: "Catering",
    });
    assert.equal(created.key, "CATERING");
    assert.equal(created.value, "CUSTOM:CATERING");
    assert.equal(created.deletable, true);

    const mine = await listEventVendorPassTypes(eventId);
    assert.ok(mine.options.some((option) => option.key === "CATERING"));

    const theirs = await listEventVendorPassTypes(otherEventId);
    assert.equal(
      theirs.options.some((option) => option.key === "CATERING"),
      false,
      "pass types must not leak between events"
    );
  });

  it("refuses a duplicate", async () => {
    const { createEventVendorPassType, VendorPassTypeError } = await service();
    await createEventVendorPassType({ eventId, actorUserId: organizerId, label: "Valet" });
    await assert.rejects(
      () => createEventVendorPassType({ eventId, actorUserId: organizerId, label: "valet" }),
      (error: unknown) => error instanceof VendorPassTypeError && error.status === 409
    );
  });
});

describe("deleting a vendor pass type", () => {
  it("hard-deletes a type nothing uses", async () => {
    const { createEventVendorPassType, deleteEventVendorPassType, listEventVendorPassTypes } =
      await service();
    await createEventVendorPassType({ eventId, actorUserId: organizerId, label: "Florists" });

    const result = await deleteEventVendorPassType({
      eventId,
      actorUserId: organizerId,
      key: "FLORISTS",
    });
    assert.equal(result.action, "delete");

    const row = await (await loadPrisma()).eventVendorPassType.findFirst({
      where: { eventId, key: "FLORISTS" },
    });
    assert.equal(row, null);

    const listing = await listEventVendorPassTypes(eventId);
    assert.equal(listing.options.some((option) => option.key === "FLORISTS"), false);
  });

  it("refuses without confirmation while passes still use the type, then soft-deletes", async () => {
    const { createEventVendorPassType, deleteEventVendorPassType, listEventVendorPassTypes, VendorPassTypeError } =
      await service();
    await createEventVendorPassType({ eventId, actorUserId: organizerId, label: "Security Dogs" });
    const pass = await issuePass("CUSTOM:SECURITY_DOGS", `K9 ${RUN}`);
    assert.equal(pass.passType, "CUSTOM");
    assert.equal(pass.categoryLabel, "Security Dogs");

    await assert.rejects(
      () =>
        deleteEventVendorPassType({
          eventId,
          actorUserId: organizerId,
          key: "SECURITY_DOGS",
        }),
      (error: unknown) =>
        error instanceof VendorPassTypeError && error.requiresConfirmation && error.status === 409
    );

    const confirmed = await deleteEventVendorPassType({
      eventId,
      actorUserId: organizerId,
      key: "SECURITY_DOGS",
      confirm: true,
    });
    assert.equal(confirmed.action, "deactivate");
    assert.equal(confirmed.inUseCount, 1);

    // The row survives (deactivated) and the issued pass keeps its label.
    const row = await (await loadPrisma()).eventVendorPassType.findFirst({
      where: { eventId, key: "SECURITY_DOGS" },
    });
    assert.equal(row?.isActive, false);

    const { getVendorTeamPass } = await import("../vendor-team-pass.service");
    const stillThere = await getVendorTeamPass(pass.id);
    assert.equal(stillThere?.categoryLabel, "Security Dogs");

    const listing = await listEventVendorPassTypes(eventId);
    assert.equal(listing.options.some((option) => option.key === "SECURITY_DOGS"), false);
  });

  it("hides a built-in instead of destroying it, and can restore it", async () => {
    const { deleteEventVendorPassType, createEventVendorPassType, listEventVendorPassTypes } =
      await service();

    const hidden = await deleteEventVendorPassType({
      eventId,
      actorUserId: organizerId,
      key: "EXHIBITOR",
    });
    assert.equal(hidden.action, "hide");

    const afterHide = await listEventVendorPassTypes(eventId);
    assert.equal(afterHide.options.some((option) => option.key === "EXHIBITOR"), false);
    assert.ok(afterHide.hidden.some((entry) => entry.key === "EXHIBITOR"));

    await createEventVendorPassType({ eventId, actorUserId: organizerId, key: "EXHIBITOR" });
    const afterRestore = await listEventVendorPassTypes(eventId);
    assert.ok(afterRestore.options.some((option) => option.key === "EXHIBITOR"));
  });
});

describe("issuing passes against the picker", () => {
  it("keeps built-in types working unchanged", async () => {
    const pass = await issuePass("MUSICAL_BAND", `Golden Rhythms ${RUN}`);
    assert.equal(pass.passType, "MUSICAL_BAND");
    assert.equal(pass.categoryLabel, null);
  });

  it("refuses a type that this event never had or has retired", async () => {
    const { resolveVendorPassTypeSelection, deleteEventVendorPassType, VendorPassTypeError } =
      await service();

    await assert.rejects(
      () => resolveVendorPassTypeSelection({ eventId, value: "CUSTOM:NOT_A_TYPE" }),
      (error: unknown) => error instanceof VendorPassTypeError
    );

    await deleteEventVendorPassType({ eventId, actorUserId: organizerId, key: "SPONSOR" });
    await assert.rejects(
      () => resolveVendorPassTypeSelection({ eventId, value: "SPONSOR" }),
      (error: unknown) => error instanceof VendorPassTypeError,
      "a hidden built-in must not mint new passes"
    );
  });
});

describe("who may change the picker", () => {
  it("lets door staff read it but never edit it", async () => {
    const { VENDOR_PASS_TYPE_READ_PERMISSIONS, VENDOR_PASS_TYPE_WRITE_PERMISSIONS } =
      await service();
    assert.ok(VENDOR_PASS_TYPE_READ_PERMISSIONS.includes("SCAN_QR"));
    assert.equal(
      (VENDOR_PASS_TYPE_WRITE_PERMISSIONS as readonly string[]).includes("SCAN_QR"),
      false
    );
    assert.ok(VENDOR_PASS_TYPE_WRITE_PERMISSIONS.includes("MANAGE_VENDOR_ACCESS"));
    assert.ok(VENDOR_PASS_TYPE_WRITE_PERMISSIONS.includes("MANAGE_GUESTS"));
  });
});
