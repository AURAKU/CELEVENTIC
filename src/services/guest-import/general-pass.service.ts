import { createHash, randomBytes } from "node:crypto";
import type { GeneralPassBatch, GeneralPassMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import { dispatchJob } from "@/lib/queue";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import { getAppUrlFromEnv } from "@/lib/app-url";
import { ensureInvitationPass } from "@/services/admission/guest-pass.service";
import { cleanName } from "@/lib/guest-import/name";
import { GENERAL_PASS_QUEUE } from "./queues";

/**
 * General Invitation Passes.
 *
 * Two ways to admit people you cannot name in advance:
 *
 *  **Method A — fixed quantity.** Mint N unique passes now. Each is a real
 *  Invitation with its own signed QR and admission code, so "Guest 037" is
 *  scanned, counted and (if it walks in twice) refused exactly like a named
 *  guest. Print them, hand them out, done.
 *
 *  **Method B — open registration.** Publish one link. Each person who opens
 *  it and registers is *issued their own* unique pass. The shared link is a
 *  door to the form, never a credential: forwarding it to a hundred people
 *  produces a hundred distinct, individually revocable passes rather than one
 *  QR that a hundred people screenshot.
 *
 * Both reuse the existing Invitation + GuestPass stack, so nothing downstream —
 * scanner, offline package, analytics, place card — needs to know the
 * difference.
 */

const MINT_CHUNK_SIZE = 25;
const MAX_FIXED_QUANTITY = 5000;
const REGISTRATION_TOKEN_BYTES = 24;

export interface CreateGeneralBatchInput {
  eventId: string;
  userId: string;
  label: string;
  method: GeneralPassMethod;
  quantity?: number;
  partySize?: number;
  maxRegistrations?: number | null;
  requireName?: boolean;
  requireContact?: boolean;
  closesAt?: Date | null;
  passLabelPrefix?: string;
  welcomeMessage?: string | null;
  importBatchId?: string | null;
}

function newUniqueLink(): string {
  return randomBytes(24).toString("base64url");
}

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.NEXTAUTH_SECRET ?? "celeventic-general-pass";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export async function createGeneralPassBatch(
  input: CreateGeneralBatchInput
): Promise<GeneralPassBatch> {
  const quantity =
    input.method === "FIXED_QUANTITY"
      ? Math.min(Math.max(1, Math.floor(input.quantity ?? 0)), MAX_FIXED_QUANTITY)
      : 0;

  if (input.method === "FIXED_QUANTITY" && quantity < 1) {
    throw new Error("Enter how many general passes to create.");
  }

  const batch = await prisma.generalPassBatch.create({
    data: {
      eventId: input.eventId,
      createdById: input.userId,
      importBatchId: input.importBatchId ?? null,
      label: input.label.trim() || "General admission",
      method: input.method,
      status: input.method === "FIXED_QUANTITY" ? "GENERATING" : "ACTIVE",
      quantity,
      partySize: Math.min(Math.max(1, input.partySize ?? 1), 20),
      registrationToken:
        input.method === "OPEN_REGISTRATION"
          ? randomBytes(REGISTRATION_TOKEN_BYTES).toString("base64url")
          : null,
      registrationOpen: input.method === "OPEN_REGISTRATION",
      maxRegistrations: input.maxRegistrations ?? null,
      requireName: input.requireName ?? true,
      requireContact: input.requireContact ?? false,
      closesAt: input.closesAt ?? null,
      passLabelPrefix: (input.passLabelPrefix?.trim() || "Guest").slice(0, 40),
      welcomeMessage: input.welcomeMessage ?? null,
    },
  });

  if (input.method === "FIXED_QUANTITY") {
    await dispatchJob(GENERAL_PASS_QUEUE, { batchId: batch.id }, 5);
  }

  await createAuditLog({
    userId: input.userId,
    action: "CREATE",
    entity: "general_pass_batch",
    entityId: batch.id,
    details: {
      kind: "general_pass_batch_created",
      eventId: input.eventId,
      method: input.method,
      quantity,
      partySize: batch.partySize,
    },
  });

  return batch;
}

/** Mint one unnamed general pass. Shared by Method A and Method B. */
async function mintGeneralPass(
  batch: GeneralPassBatch,
  sequence: number,
  guestName?: string | null
): Promise<{ invitationId: string; uniqueLink: string; code: string | null }> {
  const displayName =
    guestName?.trim() || `${batch.passLabelPrefix} ${String(sequence).padStart(3, "0")}`;

  const slug = `${slugify(batch.passLabelPrefix) || "guest"}-${randomBytes(5).toString("hex")}`;

  const invitation = await prisma.invitation.create({
    data: {
      eventId: batch.eventId,
      name: displayName,
      slug,
      uniqueLink: newUniqueLink(),
      status: "ACTIVE",
      admissionAllowance: batch.partySize,
      isGeneralPass: true,
      generalPassBatchId: batch.id,
      importBatchId: batch.importBatchId,
      message: batch.welcomeMessage,
      featureConfig: {
        ENTRY_PASS: { enabled: true },
        MANUAL_ADMISSION_CODE: { enabled: true },
        PARTY_ADMISSION: { enabled: true },
        // A general pass has no assigned recipient, so a place card would be
        // addressed to nobody. Named open registrations opt back in below.
        PLACE_CARD: { enabled: Boolean(guestName?.trim()) },
      } as Prisma.InputJsonValue,
    },
  });

  if (guestName?.trim()) {
    await prisma.guest.create({
      data: {
        eventId: batch.eventId,
        invitationId: invitation.id,
        name: cleanName(guestName).slice(0, 200),
        plusOnes: Math.max(0, batch.partySize - 1),
        status: "INVITED",
        partyType: batch.partySize > 1 ? "PLUS_GUEST" : "INDIVIDUAL",
      },
    });
  }

  const issued = await ensureInvitationPass(invitation.id);

  return {
    invitationId: invitation.id,
    uniqueLink: invitation.uniqueLink,
    code: issued?.pass.code ?? null,
  };
}

/** Method A: mint the next chunk of a fixed run. Idempotent and resumable. */
export async function mintGeneralPassChunk(
  batchId: string
): Promise<{ minted: number; remaining: number }> {
  const batch = await prisma.generalPassBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("General pass batch not found");
  if (batch.method !== "FIXED_QUANTITY") return { minted: 0, remaining: 0 };
  if (["REVOKED", "CLOSED", "FAILED"].includes(batch.status)) return { minted: 0, remaining: 0 };

  // Count what actually exists rather than trusting a counter: a crash between
  // the invitation write and the counter bump must not lose or duplicate a pass.
  const existing = await prisma.invitation.count({ where: { generalPassBatchId: batchId } });
  const outstanding = Math.max(0, batch.quantity - existing);
  const target = Math.min(outstanding, MINT_CHUNK_SIZE);

  let minted = 0;
  for (let i = 0; i < target; i++) {
    try {
      await mintGeneralPass(batch, existing + i + 1);
      minted++;
    } catch (error) {
      console.error("[general-pass] mint failed", { batchId, error });
      break;
    }
  }

  const issuedCount = await prisma.invitation.count({ where: { generalPassBatchId: batchId } });
  const remaining = Math.max(0, batch.quantity - issuedCount);

  await prisma.generalPassBatch.update({
    where: { id: batchId },
    data: {
      issuedCount,
      status: remaining === 0 ? "ACTIVE" : minted === 0 ? "FAILED" : "GENERATING",
      error: minted === 0 && remaining > 0 ? "Minting stalled — retry from the general passes panel." : null,
    },
  });

  return { minted, remaining };
}

export async function runGeneralPassJob(batchId: string): Promise<void> {
  const result = await mintGeneralPassChunk(batchId);
  if (result.remaining > 0 && result.minted > 0) {
    await dispatchJob(GENERAL_PASS_QUEUE, { batchId }, 5);
  }
}

export class GeneralPassRegistrationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "CLOSED"
      | "FULL"
      | "NAME_REQUIRED"
      | "CONTACT_REQUIRED"
      | "RATE_LIMITED"
  ) {
    super(message);
    this.name = "GeneralPassRegistrationError";
  }
}

/** Per-IP ceiling so one device cannot drain an open registration. */
const REGISTRATIONS_PER_IP = 5;

export interface RegistrationInput {
  token: string;
  name?: string | null;
  contact?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Method B: issue one unique pass to somebody who opened the shared link.
 *
 * Every guard here exists because the link is public by design: it can be
 * forwarded, posted, or scraped, and the only thing standing between that and
 * an unbounded guest list is this function.
 */
export async function registerForGeneralPass(input: RegistrationInput): Promise<{
  invitationId: string;
  inviteUrl: string;
  code: string | null;
  displayName: string;
}> {
  const batch = await prisma.generalPassBatch.findUnique({
    where: { registrationToken: input.token },
  });
  if (!batch || batch.method !== "OPEN_REGISTRATION") {
    throw new GeneralPassRegistrationError("This registration link is not valid.", "NOT_FOUND");
  }
  if (!batch.registrationOpen || batch.status !== "ACTIVE") {
    throw new GeneralPassRegistrationError("Registration for this event is closed.", "CLOSED");
  }
  if (batch.closesAt && batch.closesAt.getTime() < Date.now()) {
    throw new GeneralPassRegistrationError("Registration for this event has closed.", "CLOSED");
  }

  const name = input.name?.trim() ?? "";
  if (batch.requireName && name.replace(/[^A-Za-z0-9]/g, "").length < 2) {
    throw new GeneralPassRegistrationError("Please enter your name.", "NAME_REQUIRED");
  }
  if (batch.requireContact && !input.contact?.trim()) {
    throw new GeneralPassRegistrationError("Please enter a phone number or email.", "CONTACT_REQUIRED");
  }

  const issued = await prisma.generalPassRegistration.count({ where: { batchId: batch.id } });
  if (batch.maxRegistrations != null && issued >= batch.maxRegistrations) {
    throw new GeneralPassRegistrationError(
      "All passes for this event have been claimed.",
      "FULL"
    );
  }

  const ipHash = hashIp(input.ip);
  if (ipHash) {
    const fromThisDevice = await prisma.generalPassRegistration.count({
      where: { batchId: batch.id, ipHash },
    });
    if (fromThisDevice >= REGISTRATIONS_PER_IP) {
      throw new GeneralPassRegistrationError(
        "You have already claimed the maximum number of passes from this device.",
        "RATE_LIMITED"
      );
    }
  }

  const pass = await mintGeneralPass(batch, issued + 1, name || null);

  await prisma.generalPassRegistration.create({
    data: {
      batchId: batch.id,
      invitationId: pass.invitationId,
      name: name || null,
      contact: input.contact?.trim() || null,
      ipHash,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
    },
  });

  await prisma.generalPassBatch.update({
    where: { id: batch.id },
    data: { issuedCount: { increment: 1 } },
  });

  const displayName =
    name || `${batch.passLabelPrefix} ${String(issued + 1).padStart(3, "0")}`;

  return {
    invitationId: pass.invitationId,
    inviteUrl: `${getAppUrlFromEnv()}/invite/${pass.uniqueLink}`,
    code: pass.code,
    displayName,
  };
}

/** Public shape of an open registration page — no organiser data leaks. */
export async function getRegistrationPage(token: string) {
  const batch = await prisma.generalPassBatch.findUnique({
    where: { registrationToken: token },
    select: {
      id: true,
      label: true,
      status: true,
      registrationOpen: true,
      maxRegistrations: true,
      issuedCount: true,
      requireName: true,
      requireContact: true,
      closesAt: true,
      welcomeMessage: true,
      method: true,
      event: {
        select: { title: true, hostName: true, startDate: true, venueName: true, coverImageUrl: true },
      },
    },
  });
  if (!batch || batch.method !== "OPEN_REGISTRATION") return null;

  const claimed = await prisma.generalPassRegistration.count({ where: { batchId: batch.id } });
  const full = batch.maxRegistrations != null && claimed >= batch.maxRegistrations;
  const closed =
    !batch.registrationOpen ||
    batch.status !== "ACTIVE" ||
    (batch.closesAt != null && batch.closesAt.getTime() < Date.now());

  return {
    label: batch.label,
    welcomeMessage: batch.welcomeMessage,
    requireName: batch.requireName,
    requireContact: batch.requireContact,
    open: !closed && !full,
    full,
    closed,
    event: batch.event,
  };
}

export async function listGeneralPassBatches(
  eventId: string,
  options?: { page?: number; limit?: number }
) {
  const { page, limit, skip } = parsePaginationInput(options, { limit: 20 });
  const where: Prisma.GeneralPassBatchWhereInput = { eventId };
  const [items, total] = await Promise.all([
    prisma.generalPassBatch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { _count: { select: { invitations: true, registrations: true } } },
    }),
    prisma.generalPassBatch.count({ where }),
  ]);
  return paginatedResult(items, total, page, limit);
}

/** Paginated list of the passes a batch issued, for printing and hand-out. */
export async function listGeneralPasses(
  batchId: string,
  options?: { page?: number; limit?: number }
) {
  const { page, limit, skip } = parsePaginationInput(options, { limit: 50, maxLimit: 200 });
  const where: Prisma.InvitationWhereInput = { generalPassBatchId: batchId };
  const appUrl = getAppUrlFromEnv();

  const [items, total] = await Promise.all([
    prisma.invitation.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        uniqueLink: true,
        archivedAt: true,
        guestPasses: {
          where: { status: { notIn: ["REVOKED", "REISSUED"] } },
          orderBy: { tokenVersion: "desc" },
          take: 1,
          select: { code: true, status: true, partySize: true, admittedCount: true },
        },
      },
    }),
    prisma.invitation.count({ where }),
  ]);

  return paginatedResult(
    items.map((i) => ({
      id: i.id,
      name: i.name,
      inviteUrl: `${appUrl}/invite/${i.uniqueLink}`,
      archived: i.archivedAt != null,
      code: i.guestPasses[0]?.code ?? null,
      status: i.guestPasses[0]?.status ?? null,
      partySize: i.guestPasses[0]?.partySize ?? 1,
      admittedCount: i.guestPasses[0]?.admittedCount ?? 0,
    })),
    total,
    page,
    limit
  );
}

/** Stop new registrations without touching the passes already issued. */
export async function closeGeneralPassBatch(
  batchId: string,
  userId: string
): Promise<GeneralPassBatch> {
  const batch = await prisma.generalPassBatch.update({
    where: { id: batchId },
    data: { registrationOpen: false, status: "CLOSED" },
  });
  await createAuditLog({
    userId,
    action: "UPDATE",
    entity: "general_pass_batch",
    entityId: batchId,
    details: { kind: "general_pass_batch_closed", issuedCount: batch.issuedCount },
  });
  return batch;
}

/**
 * Revoke every pass in a batch — the "these leaked" button.
 *
 * Passes are revoked rather than deleted so a revoked printout is recognised
 * and politely refused at the gate instead of reading as an unknown QR, and so
 * anyone already admitted stays in the admission record.
 */
export async function revokeGeneralPassBatch(
  batchId: string,
  userId: string,
  reason: string
): Promise<{ revoked: number }> {
  const invitations = await prisma.invitation.findMany({
    where: { generalPassBatchId: batchId },
    select: { id: true },
  });

  const revoked = await prisma.guestPass.updateMany({
    where: {
      invitationId: { in: invitations.map((i) => i.id) },
      status: { notIn: ["REVOKED", "REISSUED"] },
    },
    data: { status: "REVOKED", revokedAt: new Date(), revokedReason: reason.slice(0, 300) },
  });

  await prisma.invitation.updateMany({
    where: { generalPassBatchId: batchId },
    data: { archivedAt: new Date(), status: "EXPIRED" },
  });

  await prisma.generalPassBatch.update({
    where: { id: batchId },
    data: { status: "REVOKED", registrationOpen: false },
  });

  await createAuditLog({
    userId,
    action: "UPDATE",
    entity: "general_pass_batch",
    entityId: batchId,
    details: { kind: "general_pass_batch_revoked", revoked: revoked.count, reason },
  });

  return { revoked: revoked.count };
}

export function registrationUrl(token: string): string {
  return `${getAppUrlFromEnv()}/join/${token}`;
}
