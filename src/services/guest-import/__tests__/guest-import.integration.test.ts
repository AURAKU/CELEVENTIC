import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/**
 * End-to-end coverage for Bulk Guest Import against the real dev database.
 *
 * The unit tests in `src/lib/guest-import/__tests__` prove the pure parsing,
 * mapping and duplicate rules. This file proves the parts that only exist once
 * rows hit Postgres/SQLite: that a name and nothing else still produces a
 * complete, admissible invitation; that a preview creates nothing; that a
 * crash mid-generation cannot mint a second invitation for the same person;
 * that a shared registration link is not itself an entry credential; and that
 * an import can be undone without erasing an admission that already happened.
 *
 * Every row created here is namespaced by a run id and removed in `after`.
 */

process.env.ADMISSION_PASS_SECRET ??= "test-admission-secret-do-not-use-in-production";

const RUN = randomUUID().slice(0, 8);

let organizerId: string;
let eventId: string;

type Prisma = typeof import("../../../lib/prisma")["prisma"];
let prisma: Prisma;

async function loadPrisma(): Promise<Prisma> {
  if (!prisma) ({ prisma } = await import("../../../lib/prisma"));
  return prisma;
}

/** A paste-a-list-of-names table, the lowest-effort way in. */
async function nameOnlyTable(names: string[]) {
  const { parseLines } = await import("../../../lib/guest-import/table-parse");
  return parseLines(names.join("\n"));
}

async function stageBatch(
  names: string[],
  options: Partial<import("../../../lib/guest-import/types").ImportOptions> = {}
) {
  const { guestImportService } = await import("../guest-import.service");
  return guestImportService.createBatch({
    eventId,
    userId: organizerId,
    source: "PASTE_LINES",
    table: await nameOnlyTable(names),
    options,
  });
}

/** Confirm and drain the chunked job by hand — no worker runs in tests. */
async function generateFully(batchId: string): Promise<void> {
  const { generateBatchChunk } = await import("../generation.service");
  for (let pass = 0; pass < 50; pass++) {
    const result = await generateBatchChunk(batchId);
    if (result.remaining === 0) return;
  }
  assert.fail("generation did not converge within 50 chunks");
}

before(async () => {
  const db = await loadPrisma();
  const user = await db.user.create({
    data: { name: `Import Test Organizer ${RUN}`, email: `import-test-${RUN}@example.test` },
  });
  organizerId = user.id;
  const event = await db.event.create({
    data: {
      slug: `import-test-${RUN}`,
      title: `Import Test Event ${RUN}`,
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
  // Cascades clear batches, rows, invitations, guests, passes and deliveries.
  await db.event.deleteMany({ where: { organizerId } }).catch(() => {});
  await db.user.delete({ where: { id: organizerId } }).catch(() => {});
  await db.$disconnect();
});

describe("staging a preview", () => {
  it("creates nothing guest-facing until the organiser confirms", async () => {
    const db = await loadPrisma();
    const before = await db.invitation.count({ where: { eventId } });

    const { batch, summary } = await stageBatch([
      `Preview One ${RUN}`,
      `Preview Two ${RUN}`,
    ]);

    assert.equal(batch.status, "DRAFT");
    assert.equal(summary.total, 2);
    assert.equal(
      await db.invitation.count({ where: { eventId } }),
      before,
      "a preview must not create invitations"
    );
    assert.equal(await db.guestImportRow.count({ where: { batchId: batch.id } }), 2);
  });

  it("discarding a draft leaves the event untouched", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");
    const { batch } = await stageBatch([`Discarded ${RUN}`]);

    await guestImportService.discardDraft(batch.id, organizerId);

    assert.equal(await db.guestImportBatch.count({ where: { id: batch.id } }), 0);
    assert.equal(
      await db.invitation.count({ where: { eventId, name: `Discarded ${RUN}` } }),
      0
    );
  });
});

describe("name-only import", () => {
  it("gives a guest with no contact details a complete, admissible invitation", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");

    const name = `Nameonly Guest ${RUN}`;
    const { batch } = await stageBatch([name]);
    await guestImportService.confirmBatch(batch.id, organizerId);
    await generateFully(batch.id);

    const invitation = await db.invitation.findFirst({
      where: { eventId, name },
      include: { guests: true, guestPasses: true },
    });

    assert.ok(invitation, "an invitation must exist");
    assert.equal(invitation.status, "ACTIVE", "published so the link is live");
    assert.ok(invitation.uniqueLink.length >= 20, "the link is a bearer secret, not a slug");
    assert.equal(invitation.importBatchId, batch.id);

    assert.equal(invitation.guests.length, 1);
    assert.equal(invitation.guests[0].email, null);
    assert.equal(invitation.guests[0].phone, null);
    assert.ok(invitation.guests[0].manualCode, "a manual gate code is allocated");

    assert.equal(invitation.guestPasses.length, 1, "one Guest Entry Pass");
    assert.ok(invitation.guestPasses[0].code, "the pass carries an admission code");

    const features = invitation.featureConfig as Record<string, { enabled?: boolean }> | null;
    assert.equal(features?.PLACE_CARD?.enabled, true, "place card is on");
    assert.equal(features?.ENTRY_PASS?.enabled, true, "entry pass is on");
  });

  it("mints a distinct link, pass code and gate code for every row", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");

    const names = Array.from({ length: 12 }, (_, i) => `Unique ${RUN} ${i + 1}`);
    const { batch } = await stageBatch(names);
    await guestImportService.confirmBatch(batch.id, organizerId);
    await generateFully(batch.id);

    const invitations = await db.invitation.findMany({
      where: { importBatchId: batch.id },
      include: { guests: true, guestPasses: true },
    });

    assert.equal(invitations.length, 12);
    const links = new Set(invitations.map((i) => i.uniqueLink));
    const slugs = new Set(invitations.map((i) => i.slug));
    const issuedCodes = invitations.map((i) => i.guestPasses[0]?.code);
    const passCodes = new Set(issuedCodes);
    const gateCodes = new Set(invitations.map((i) => i.guests[0]?.manualCode));

    assert.equal(links.size, 12, "every invite link is unique");
    assert.equal(slugs.size, 12, "every slug is unique");
    assert.equal(passCodes.size, 12, "every admission code is unique");
    assert.equal(gateCodes.size, 12, "every manual gate code is unique");
    assert.ok(
      issuedCodes.every((code) => Boolean(code)),
      "every invitation was issued an admission code"
    );
  });
});

describe("party allowance", () => {
  it("carries a confirmed family allowance through to the pass the gate reads", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");
    const { parseTable } = await import("../../../lib/guest-import/table-parse");

    const name = `The Mensah Family ${RUN}`;
    const table = parseTable(`Name,Party size\n${name},5`);
    const { batch } = await guestImportService.createBatch({
      eventId,
      userId: organizerId,
      source: "PASTE_TABLE",
      table,
    });

    // A family allowance must be confirmed, not inferred silently.
    await guestImportService.bulkDecision(batch.id, organizerId, { decision: "CREATE" });
    await guestImportService.confirmBatch(batch.id, organizerId);
    await generateFully(batch.id);

    const invitation = await db.invitation.findFirst({
      where: { importBatchId: batch.id },
      include: { guests: true, guestPasses: true },
    });

    assert.ok(invitation);
    assert.equal(invitation.admissionAllowance, 5);
    assert.equal(invitation.guestPasses[0].partySize, 5, "the gate lets five people in");
    assert.equal(
      invitation.guests.reduce((sum, g) => sum + 1 + g.plusOnes, 0),
      5,
      "the guest rows account for all five heads"
    );
  });

  it("turns named party members into individually scannable guest rows", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");
    const { parseTable } = await import("../../../lib/guest-import/table-parse");

    const name = `Osei Party ${RUN}`;
    const table = parseTable(`Name,Party size,Members\n${name},3,"Ama Osei; Kofi Osei"`);
    const { batch } = await guestImportService.createBatch({
      eventId,
      userId: organizerId,
      source: "PASTE_TABLE",
      table,
    });
    await guestImportService.bulkDecision(batch.id, organizerId, { decision: "CREATE" });
    await guestImportService.confirmBatch(batch.id, organizerId);
    await generateFully(batch.id);

    const invitation = await db.invitation.findFirst({
      where: { importBatchId: batch.id },
      include: { guests: true, guestPasses: true },
    });

    assert.ok(invitation);
    const guestNames = invitation.guests.map((g) => g.name).sort();
    assert.deepEqual(guestNames, ["Ama Osei", "Kofi Osei", name].sort());
    assert.equal(invitation.guestPasses[0].partySize, 3);
  });
});

describe("duplicates", () => {
  it("blocks confirmation until every possible duplicate has a decision", async () => {
    const { guestImportService } = await import("../guest-import.service");

    const name = `Repeated Person ${RUN}`;
    const first = await stageBatch([name]);
    await guestImportService.confirmBatch(first.batch.id, organizerId);
    await generateFully(first.batch.id);

    const second = await stageBatch([name]);
    assert.equal(second.summary.duplicate, 1, "the existing guest is recognised");

    await assert.rejects(
      () => guestImportService.confirmBatch(second.batch.id, organizerId),
      /needs? a decision/i,
      "an unreviewed duplicate must never be silently resolved"
    );
  });

  it("records an explicit skip rather than quietly dropping the row", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");

    const name = `Skippable Person ${RUN}`;
    const first = await stageBatch([name]);
    await guestImportService.confirmBatch(first.batch.id, organizerId);
    await generateFully(first.batch.id);

    const second = await stageBatch([name, `Fresh Person ${RUN}`]);
    await guestImportService.confirmBatch(second.batch.id, organizerId, {
      allowUnreviewedDuplicates: true,
    });
    await generateFully(second.batch.id);

    const duplicateRow = await db.guestImportRow.findFirst({
      where: { batchId: second.batch.id, name },
    });
    assert.equal(duplicateRow?.status, "SKIPPED");
    assert.equal(duplicateRow?.decision, "SKIP");
    assert.ok(duplicateRow?.reviewedAt, "the skip is timestamped for the audit trail");

    assert.equal(
      await db.invitation.count({ where: { eventId, name } }),
      1,
      "no second invitation for the same person"
    );
    assert.equal(
      await db.invitation.count({ where: { eventId, name: `Fresh Person ${RUN}` } }),
      1,
      "the rest of the list still generated"
    );
  });

  it("merging widens the existing allowance instead of creating a rival invitation", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");

    const name = `Merge Target ${RUN}`;
    const first = await stageBatch([name]);
    await guestImportService.confirmBatch(first.batch.id, organizerId);
    await generateFully(first.batch.id);

    const original = await db.invitation.findFirstOrThrow({
      where: { importBatchId: first.batch.id },
    });

    const second = await stageBatch([name]);
    const row = await db.guestImportRow.findFirstOrThrow({
      where: { batchId: second.batch.id },
    });
    await guestImportService.updateRows(second.batch.id, organizerId, [
      { rowId: row.id, decision: "UPDATE_EXISTING" },
    ]);
    await guestImportService.confirmBatch(second.batch.id, organizerId);
    await generateFully(second.batch.id);

    assert.equal(
      await db.invitation.count({ where: { eventId, name } }),
      1,
      "still exactly one invitation for this person"
    );
    const after = await db.invitation.findUniqueOrThrow({ where: { id: original.id } });
    assert.equal(after.id, original.id);
  });
});

describe("saving settings from the review step", () => {
  /**
   * The wizard saves the organiser's settings immediately before confirming.
   * That save used to re-derive every row from the source cells, which threw
   * away renamed guests, corrected allowances and — fatally — the duplicate
   * decisions that confirmation waits for. The import became impossible to
   * complete: resolve every duplicate, press create, get told the duplicates
   * still need a decision.
   */
  it("keeps every review edit when a generation-time setting is saved", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");

    const repeated = `Settings Repeat ${RUN}`;
    const { batch } = await stageBatch([repeated, repeated, `Settings Other ${RUN}`]);

    const rows = await db.guestImportRow.findMany({
      where: { batchId: batch.id },
      orderBy: { rowIndex: "asc" },
    });
    await guestImportService.updateRows(batch.id, organizerId, [
      { rowId: rows[0].id, name: `Settings Renamed ${RUN}`, partySize: 4 },
      { rowId: rows[1].id, decision: "SKIP" },
    ]);

    await guestImportService.applyBatchPatch(batch.id, organizerId, {
      options: { message: "See you there.", publishImmediately: false, defaultTagIds: [] },
    });

    const after = await db.guestImportRow.findMany({
      where: { batchId: batch.id },
      orderBy: { rowIndex: "asc" },
    });
    assert.equal(after[0].name, `Settings Renamed ${RUN}`, "the rename survives");
    assert.equal(after[0].partySize, 4, "the corrected allowance survives");
    assert.equal(after[1].decision, "SKIP", "the duplicate decision survives");
    assert.ok(after[1].reviewedAt, "the row is still marked reviewed");

    const stored = await db.guestImportBatch.findUniqueOrThrow({ where: { id: batch.id } });
    assert.equal((stored.options as Record<string, unknown>).message, "See you there.");

    // And the whole point: confirmation is no longer blocked.
    const { queuedRows } = await guestImportService.confirmBatch(batch.id, organizerId);
    assert.equal(queuedRows, 2, "the renamed guest and the other row, not the skipped duplicate");

    await generateFully(batch.id);
    const invitation = await db.invitation.findFirstOrThrow({
      where: { importBatchId: batch.id, name: `Settings Renamed ${RUN}` },
    });
    assert.equal(invitation.admissionAllowance, 4, "the gate honours the reviewed allowance");
    assert.equal(invitation.status, "DRAFT", "the saved publish setting was applied");
  });

  it("re-derives rows when a setting changes how they parse", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");

    const { batch } = await stageBatch([`Rederive One ${RUN}`, `Rederive Two ${RUN}`]);
    const [first] = await db.guestImportRow.findMany({
      where: { batchId: batch.id },
      orderBy: { rowIndex: "asc" },
    });
    await guestImportService.updateRows(batch.id, organizerId, [
      { rowId: first.id, partySize: 7 },
    ]);

    // The default allowance decides what a row with no stated size admits, so
    // changing it has to reach rows the organiser has not touched.
    await guestImportService.applyBatchPatch(batch.id, organizerId, {
      options: { defaultPartySize: 3 },
    });

    const after = await db.guestImportRow.findMany({
      where: { batchId: batch.id },
      orderBy: { rowIndex: "asc" },
    });
    assert.deepEqual(after.map((row) => row.partySize), [3, 3]);
  });

  it("counts what confirming would actually create, skips excluded", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");

    const { batch } = await stageBatch([
      `Pending One ${RUN}`,
      `Pending Two ${RUN}`,
      `Pending Three ${RUN}`,
    ]);
    const rows = await db.guestImportRow.findMany({
      where: { batchId: batch.id },
      orderBy: { rowIndex: "asc" },
    });
    await guestImportService.updateRows(batch.id, organizerId, [
      { rowId: rows[0].id, partySize: 5 },
      { rowId: rows[2].id, decision: "SKIP" },
    ]);

    const pending = await guestImportService.pendingWork(batch.id);
    assert.equal(pending.rows, 2, "the skipped row is not counted");
    assert.equal(pending.heads, 6, "five heads plus one, the skip contributing nothing");
  });
});

describe("generation is resumable", () => {
  it("re-running a finished batch adds nothing", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");
    const { generateBatchChunk } = await import("../generation.service");

    const names = Array.from({ length: 5 }, (_, i) => `Resume ${RUN} ${i + 1}`);
    const { batch } = await stageBatch(names);
    await guestImportService.confirmBatch(batch.id, organizerId);
    await generateFully(batch.id);

    const first = await db.invitation.count({ where: { importBatchId: batch.id } });
    const passesFirst = await db.guestPass.count({
      where: { invitation: { importBatchId: batch.id } },
    });

    await generateBatchChunk(batch.id);
    await generateBatchChunk(batch.id);

    assert.equal(await db.invitation.count({ where: { importBatchId: batch.id } }), first);
    assert.equal(
      await db.guestPass.count({ where: { invitation: { importBatchId: batch.id } } }),
      passesFirst,
      "a retry must not mint a second pass"
    );

    const finished = await db.guestImportBatch.findUniqueOrThrow({ where: { id: batch.id } });
    assert.equal(finished.status, "COMPLETED");
    assert.equal(finished.generatedRows, 5);
  });

  it("resumes a row whose invitation was written before the crash", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");
    const { generateBatchChunk } = await import("../generation.service");

    const names = Array.from({ length: 30 }, (_, i) => `Chunked ${RUN} ${i + 1}`);
    const { batch } = await stageBatch(names);
    await guestImportService.confirmBatch(batch.id, organizerId);

    // One chunk only: the batch is deliberately left half-generated.
    const partial = await generateBatchChunk(batch.id);
    assert.ok(partial.remaining > 0, "30 rows must not finish in one chunk");
    assert.equal(partial.status, "GENERATING");

    await generateFully(batch.id);

    assert.equal(
      await db.invitation.count({ where: { importBatchId: batch.id } }),
      30,
      "exactly one invitation per row, no duplicates from the resumed pass"
    );
  });
});

describe("seating during import", () => {
  it("refuses to evict a guest already sitting in the seat", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");
    const { parseTable } = await import("../../../lib/guest-import/table-parse");

    const sitting = `Seated First ${RUN}`;
    const seatTable = parseTable(`Name,Table,Seat\n${sitting},Table 4,A1`);
    const firstBatch = await guestImportService.createBatch({
      eventId,
      userId: organizerId,
      source: "PASTE_TABLE",
      table: seatTable,
      options: { applySeating: true },
    });
    await guestImportService.confirmBatch(firstBatch.batch.id, organizerId);
    await generateFully(firstBatch.batch.id);

    const claimed = await db.seatingAssignment.findFirst({
      where: { seatingPlan: { eventId }, tableNumber: "Table 4", seatLabel: "A1" },
      include: { guest: true },
    });
    assert.equal(claimed?.guest.name, sitting);

    // A second import aiming at the same chair.
    const contender = `Seated Second ${RUN}`;
    const clashTable = parseTable(`Name,Table,Seat\n${contender},Table 4,A1`);
    const secondBatch = await guestImportService.createBatch({
      eventId,
      userId: organizerId,
      source: "PASTE_TABLE",
      table: clashTable,
      options: { applySeating: true },
    });

    const previewRow = await db.guestImportRow.findFirstOrThrow({
      where: { batchId: secondBatch.batch.id },
    });
    const issues = (previewRow.issues ?? []) as { code: string }[];
    assert.ok(
      issues.some((i) => i.code === "SEAT_CONFLICT"),
      "the clash is visible in the preview, before anything is created"
    );

    await guestImportService.bulkDecision(secondBatch.batch.id, organizerId, {
      decision: "CREATE",
    });
    await guestImportService.confirmBatch(secondBatch.batch.id, organizerId);
    await generateFully(secondBatch.batch.id);

    const stillSeated = await db.seatingAssignment.findFirst({
      where: { seatingPlan: { eventId }, tableNumber: "Table 4", seatLabel: "A1" },
      include: { guest: true },
    });
    assert.equal(stillSeated?.guest.name, sitting, "the original occupant keeps the chair");

    const newcomer = await db.guest.findFirstOrThrow({ where: { eventId, name: contender } });
    const newcomerSeat = await db.seatingAssignment.findFirst({
      where: { guestId: newcomer.id },
    });
    assert.equal(newcomerSeat?.tableNumber, "Table 4", "they still get the table");
    assert.equal(newcomerSeat?.seatLabel, null, "but not the contested chair");
    assert.match(newcomerSeat?.notes ?? "", /already taken/i);
  });
});

describe("general passes", () => {
  it("Method A mints N passes that are each individually scannable", async () => {
    const db = await loadPrisma();
    const { createGeneralPassBatch, mintGeneralPassChunk } = await import(
      "../general-pass.service"
    );

    const batch = await createGeneralPassBatch({
      eventId,
      userId: organizerId,
      label: `Gate passes ${RUN}`,
      method: "FIXED_QUANTITY",
      quantity: 8,
      passLabelPrefix: `G${RUN}`,
    });

    let guard = 0;
    while ((await mintGeneralPassChunk(batch.id)).remaining > 0 && guard++ < 20);

    const invitations = await db.invitation.findMany({
      where: { generalPassBatchId: batch.id },
      include: { guestPasses: true },
    });

    assert.equal(invitations.length, 8);
    assert.equal(new Set(invitations.map((i) => i.uniqueLink)).size, 8);
    assert.equal(new Set(invitations.map((i) => i.guestPasses[0]?.code)).size, 8);
    assert.ok(invitations.every((i) => i.isGeneralPass));
    assert.ok(
      invitations.every((i) => i.guestPasses.length === 1),
      "each general pass is a real, revocable Guest Entry Pass"
    );

    // Re-running must not overshoot the ordered quantity.
    await mintGeneralPassChunk(batch.id);
    assert.equal(await db.invitation.count({ where: { generalPassBatchId: batch.id } }), 8);
  });

  it("Method B issues a distinct pass per registration — the shared link is not a credential", async () => {
    const db = await loadPrisma();
    const { createGeneralPassBatch, registerForGeneralPass } = await import(
      "../general-pass.service"
    );

    const batch = await createGeneralPassBatch({
      eventId,
      userId: organizerId,
      label: `Open registration ${RUN}`,
      method: "OPEN_REGISTRATION",
      requireName: true,
    });
    assert.ok(batch.registrationToken, "an open batch publishes one shared token");

    const first = await registerForGeneralPass({
      token: batch.registrationToken!,
      name: `Walk In One ${RUN}`,
      ip: "203.0.113.10",
    });
    const second = await registerForGeneralPass({
      token: batch.registrationToken!,
      name: `Walk In Two ${RUN}`,
      ip: "203.0.113.11",
    });

    assert.notEqual(first.invitationId, second.invitationId);
    assert.notEqual(first.inviteUrl, second.inviteUrl);
    assert.notEqual(first.code, second.code);
    assert.ok(
      !first.inviteUrl.includes(batch.registrationToken!),
      "the personal invite never embeds the shared registration token"
    );

    const passes = await db.guestPass.findMany({
      where: { invitationId: { in: [first.invitationId, second.invitationId] } },
    });
    assert.equal(passes.length, 2);
    assert.equal(new Set(passes.map((p) => p.tokenHash)).size, 2, "two distinct QR credentials");
  });

  it("Method B enforces the name requirement and the registration ceiling", async () => {
    const { createGeneralPassBatch, registerForGeneralPass, GeneralPassRegistrationError } =
      await import("../general-pass.service");

    const batch = await createGeneralPassBatch({
      eventId,
      userId: organizerId,
      label: `Capped registration ${RUN}`,
      method: "OPEN_REGISTRATION",
      requireName: true,
      maxRegistrations: 1,
    });
    const token = batch.registrationToken!;

    await assert.rejects(
      () => registerForGeneralPass({ token, name: "", ip: "203.0.113.20" }),
      (error: unknown) =>
        error instanceof GeneralPassRegistrationError && error.code === "NAME_REQUIRED"
    );

    await registerForGeneralPass({ token, name: `Only Seat ${RUN}`, ip: "203.0.113.21" });

    await assert.rejects(
      () => registerForGeneralPass({ token, name: `Too Late ${RUN}`, ip: "203.0.113.22" }),
      (error: unknown) =>
        error instanceof GeneralPassRegistrationError && error.code === "FULL"
    );
  });

  it("revoking a leaked batch refuses the printouts without deleting the record", async () => {
    const db = await loadPrisma();
    const { createGeneralPassBatch, mintGeneralPassChunk, revokeGeneralPassBatch } = await import(
      "../general-pass.service"
    );

    const batch = await createGeneralPassBatch({
      eventId,
      userId: organizerId,
      label: `Leaked run ${RUN}`,
      method: "FIXED_QUANTITY",
      quantity: 3,
      passLabelPrefix: `L${RUN}`,
    });
    await mintGeneralPassChunk(batch.id);

    const { revoked } = await revokeGeneralPassBatch(batch.id, organizerId, "Printouts leaked");
    assert.equal(revoked, 3);

    const passes = await db.guestPass.findMany({
      where: { invitation: { generalPassBatchId: batch.id } },
    });
    assert.equal(passes.length, 3, "the passes still exist so the gate recognises them");
    assert.ok(passes.every((p) => p.status === "REVOKED"));
  });
});

describe("undoing an import", () => {
  it("rolls back everything it created while nobody has been admitted", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");
    const { rollbackImportBatch } = await import("../rollback.service");

    const names = Array.from({ length: 4 }, (_, i) => `Rollback ${RUN} ${i + 1}`);
    const { batch } = await stageBatch(names);
    await guestImportService.confirmBatch(batch.id, organizerId);
    await generateFully(batch.id);

    const result = await rollbackImportBatch(batch.id, organizerId, "Wrong list");

    assert.equal(result.invitationsRemoved, 4);
    assert.equal(await db.invitation.count({ where: { importBatchId: batch.id } }), 0);
    assert.equal(
      await db.guest.count({ where: { importBatchId: batch.id } }),
      0,
      "the guests go with the invitations"
    );

    const rolled = await db.guestImportBatch.findUniqueOrThrow({ where: { id: batch.id } });
    assert.equal(rolled.status, "ROLLED_BACK");
    assert.equal(rolled.generatedRows, 0);
    assert.equal(
      await db.guestImportRow.count({ where: { batchId: batch.id, status: "READY" } }),
      4,
      "the staged rows survive so the organiser can fix and re-run"
    );
  });

  it("refuses to roll back once a pass from the batch has opened the gate", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");
    const { rollbackImportBatch, RollbackBlockedError, archiveImportBatch } = await import(
      "../rollback.service"
    );

    const { batch } = await stageBatch([`Admitted Already ${RUN}`, `Their Friend ${RUN}`]);
    await guestImportService.confirmBatch(batch.id, organizerId);
    await generateFully(batch.id);

    const pass = await db.guestPass.findFirstOrThrow({
      where: { invitation: { importBatchId: batch.id } },
    });
    await db.guestPass.update({
      where: { id: pass.id },
      data: { admittedCount: 1, status: "ADMITTED" },
    });

    await assert.rejects(
      () => rollbackImportBatch(batch.id, organizerId, "Changed my mind"),
      (error: unknown) => error instanceof RollbackBlockedError && error.admittedCount === 1
    );

    // Archive is the safe alternative and must always be available.
    const archived = await archiveImportBatch(batch.id, organizerId, "Cancelled after check-in");
    assert.equal(archived.invitationsArchived, 2);
    assert.ok(archived.passesRevoked >= 1);

    const invitations = await db.invitation.findMany({ where: { importBatchId: batch.id } });
    assert.equal(invitations.length, 2, "the admission record survives");
    assert.ok(invitations.every((i) => i.archivedAt != null));

    const restored = await (await import("../rollback.service")).restoreImportBatch(
      batch.id,
      organizerId
    );
    assert.equal(restored.invitationsRestored, 2);
  });
});

describe("blast radius", () => {
  it("leaves invitations the organiser made by hand completely alone", async () => {
    const db = await loadPrisma();
    const { guestImportService } = await import("../guest-import.service");

    const handMade = await db.invitation.create({
      data: {
        eventId,
        name: `Hand Made ${RUN}`,
        slug: `hand-made-${RUN}`,
        uniqueLink: `hand-link-${RUN}`,
        status: "ACTIVE",
      },
    });

    const { batch } = await stageBatch([`Imported Alongside ${RUN}`]);
    await guestImportService.confirmBatch(batch.id, organizerId);
    await generateFully(batch.id);
    await (await import("../rollback.service")).rollbackImportBatch(
      batch.id,
      organizerId,
      "Undo"
    );

    const after = await db.invitation.findUnique({ where: { id: handMade.id } });
    assert.ok(after, "a rollback must never touch an invitation it did not create");
    assert.equal(after.status, "ACTIVE");
    assert.equal(after.archivedAt, null);
    assert.equal(after.importBatchId, null);
  });
});
