import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

/**
 * Undoing an import.
 *
 * Two operations, deliberately distinct, because "I pasted the wrong list" and
 * "these guests are no longer coming" are different problems:
 *
 *  **Rollback** deletes what the import created. It is only available while
 *  nothing has been admitted — once a QR from this batch has opened the gate,
 *  deleting the invitation would erase an admission record, so rollback
 *  refuses and points at archive instead.
 *
 *  **Archive** always works. Passes are revoked (so an old printout is
 *  recognised and refused rather than reading as unknown), invitations stop
 *  serving, guests leave the counts — and every row survives for the audit.
 */

const DELETE_CHUNK = 200;

export interface RollbackResult {
  invitationsRemoved: number;
  guestsRemoved: number;
  passesRemoved: number;
  deliveriesCancelled: number;
}

export class RollbackBlockedError extends Error {
  constructor(
    message: string,
    readonly admittedCount: number
  ) {
    super(message);
    this.name = "RollbackBlockedError";
  }
}

/** Heads already admitted on passes this batch created. */
export async function countAdmittedFromBatch(batchId: string): Promise<number> {
  const invitations = await prisma.invitation.findMany({
    where: { importBatchId: batchId },
    select: { id: true },
  });
  if (invitations.length === 0) return 0;

  const result = await prisma.guestPass.aggregate({
    where: { invitationId: { in: invitations.map((i) => i.id) } },
    _sum: { admittedCount: true },
  });
  return result._sum.admittedCount ?? 0;
}

export async function rollbackImportBatch(
  batchId: string,
  userId: string,
  reason: string
): Promise<RollbackResult> {
  const batch = await prisma.guestImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Import not found");
  if (batch.status === "ROLLED_BACK") throw new Error("This import has already been rolled back.");
  if (batch.status === "GENERATING") {
    throw new Error("This import is still generating. Wait for it to finish, then roll it back.");
  }

  const admitted = await countAdmittedFromBatch(batchId);
  if (admitted > 0) {
    throw new RollbackBlockedError(
      `${admitted} guest${admitted === 1 ? " has" : "s have"} already been admitted with a pass from this import. Archive it instead so the admission record survives.`,
      admitted
    );
  }

  const deliveries = await prisma.guestImportDelivery.updateMany({
    where: { batchId, status: { in: ["QUEUED", "SENDING"] } },
    data: { status: "CANCELLED" },
  });

  const invitations = await prisma.invitation.findMany({
    where: { importBatchId: batchId },
    select: { id: true },
  });
  const invitationIds = invitations.map((i) => i.id);

  let passesRemoved = 0;
  let guestsRemoved = 0;
  let invitationsRemoved = 0;

  for (let i = 0; i < invitationIds.length; i += DELETE_CHUNK) {
    const chunk = invitationIds.slice(i, i + DELETE_CHUNK);
    // Ordered deletes: passes → guests (and their seating, by cascade) →
    // invitations, so no foreign key is ever left dangling mid-rollback.
    const passes = await prisma.guestPass.deleteMany({ where: { invitationId: { in: chunk } } });
    const guests = await prisma.guest.deleteMany({ where: { invitationId: { in: chunk } } });
    const invites = await prisma.invitation.deleteMany({ where: { id: { in: chunk } } });
    passesRemoved += passes.count;
    guestsRemoved += guests.count;
    invitationsRemoved += invites.count;
  }

  // Guests the import created without an invitation (merge decisions).
  const orphanGuests = await prisma.guest.deleteMany({
    where: { importBatchId: batchId, invitationId: null },
  });
  guestsRemoved += orphanGuests.count;

  await prisma.guestImportRow.updateMany({
    where: { batchId },
    data: {
      status: "READY",
      invitationId: null,
      guestId: null,
      guestPassId: null,
      generatedAt: null,
      attempts: 0,
      error: null,
    },
  });

  await prisma.guestImportBatch.update({
    where: { id: batchId },
    data: {
      status: "ROLLED_BACK",
      rolledBackAt: new Date(),
      rollbackReason: reason.slice(0, 300),
      generatedRows: 0,
      failedRows: 0,
      generatedHeads: 0,
      completedAt: null,
    },
  });

  await createAuditLog({
    userId,
    action: "DELETE",
    entity: "guest_import_batch",
    entityId: batchId,
    details: {
      kind: "import_rolled_back",
      eventId: batch.eventId,
      reason,
      invitationsRemoved,
      guestsRemoved,
      passesRemoved,
    },
  });

  return {
    invitationsRemoved,
    guestsRemoved,
    passesRemoved,
    deliveriesCancelled: deliveries.count,
  };
}

export interface ArchiveResult {
  invitationsArchived: number;
  guestsArchived: number;
  passesRevoked: number;
  deliveriesCancelled: number;
}

/** Soft-retire everything an import created. Always available. */
export async function archiveImportBatch(
  batchId: string,
  userId: string,
  reason: string
): Promise<ArchiveResult> {
  const batch = await prisma.guestImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Import not found");

  const now = new Date();
  const invitations = await prisma.invitation.findMany({
    where: { importBatchId: batchId, archivedAt: null },
    select: { id: true },
  });
  const invitationIds = invitations.map((i) => i.id);

  const deliveries = await prisma.guestImportDelivery.updateMany({
    where: { batchId, status: { in: ["QUEUED", "SENDING"] } },
    data: { status: "CANCELLED" },
  });

  const passes = await prisma.guestPass.updateMany({
    where: { invitationId: { in: invitationIds }, status: { notIn: ["REVOKED", "REISSUED"] } },
    data: { status: "REVOKED", revokedAt: now, revokedReason: reason.slice(0, 300) },
  });

  const guests = await prisma.guest.updateMany({
    where: { importBatchId: batchId, archivedAt: null },
    data: { archivedAt: now },
  });

  const archived = await prisma.invitation.updateMany({
    where: { id: { in: invitationIds } },
    data: { archivedAt: now, status: "EXPIRED" },
  });

  await createAuditLog({
    userId,
    action: "UPDATE",
    entity: "guest_import_batch",
    entityId: batchId,
    details: {
      kind: "import_archived",
      eventId: batch.eventId,
      reason,
      invitationsArchived: archived.count,
      guestsArchived: guests.count,
      passesRevoked: passes.count,
    },
  });

  return {
    invitationsArchived: archived.count,
    guestsArchived: guests.count,
    passesRevoked: passes.count,
    deliveriesCancelled: deliveries.count,
  };
}

/** Bring an archived import back. Passes are re-minted, not un-revoked. */
export async function restoreImportBatch(
  batchId: string,
  userId: string
): Promise<{ invitationsRestored: number; guestsRestored: number }> {
  const invitations = await prisma.invitation.updateMany({
    where: { importBatchId: batchId, archivedAt: { not: null } },
    data: { archivedAt: null, status: "ACTIVE" },
  });
  const guests = await prisma.guest.updateMany({
    where: { importBatchId: batchId, archivedAt: { not: null } },
    data: { archivedAt: null },
  });

  await createAuditLog({
    userId,
    action: "UPDATE",
    entity: "guest_import_batch",
    entityId: batchId,
    details: {
      kind: "import_restored",
      invitationsRestored: invitations.count,
      guestsRestored: guests.count,
    },
  });

  return { invitationsRestored: invitations.count, guestsRestored: guests.count };
}
