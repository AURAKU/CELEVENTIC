/**
 * Vendor & Team Access Passes — capacity-tracked, never guest invitations.
 */

import type {
  Prisma,
  VendorTeamEntryMode,
  VendorTeamPassMode,
  VendorTeamPassStatus,
  VendorTeamPassType,
  VendorReentryPolicy,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import { normalizeAdmissionCode } from "@/lib/admission/pass-code";
import { generateVendorManualCode } from "@/lib/qr-hub/vendor-token";
import {
  clampTeamCapacity,
  DEFAULT_ACCESS_ZONES,
  deriveVendorPassStatus,
  remainingCapacity,
  resolveAdmitQuantity,
  type VendorAdmitMode,
} from "@/lib/vendor-pass/capacity";
import {
  buildVendorTeamPassUrl,
  hashVendorTeamToken,
  mintVendorTeamPublicToken,
  mintVendorTeamToken,
  vendorTeamTokenFromNonce,
  verifyVendorTeamTokenSignature,
} from "@/lib/vendor-pass/token";

const LIVE: VendorTeamPassStatus[] = ["ACTIVE", "PARTIALLY_ADMITTED", "ADMITTED"];

function parseZones(value: unknown): string[] {
  if (!value) return [...DEFAULT_ACCESS_ZONES];
  if (Array.isArray(value)) {
    return value.map(String).map((z) => z.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split(/[·|,]/).map((z) => z.trim()).filter(Boolean);
    }
  }
  return [...DEFAULT_ACCESS_ZONES];
}

async function allocateCode(eventId: string, length = 6): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const code = generateVendorManualCode(length);
    const taken = await prisma.vendorTeamPass.findFirst({
      where: { eventId, admissionCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error("Could not allocate a unique vendor admission code for this event.");
}

function toView(
  pass: {
    id: string;
    eventId: string;
    passType: VendorTeamPassType;
    passMode: VendorTeamPassMode;
    entryMode: VendorTeamEntryMode;
    title: string;
    vendorName: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    companyName: string | null;
    categoryLabel: string | null;
    teamCapacity: number;
    admittedCount: number;
    accessZones: unknown;
    setupAccess: boolean;
    breakdownAccess: boolean;
    equipmentAccess: boolean;
    vehicleRegistration: string | null;
    notes: string | null;
    logoUrl: string | null;
    photoUrl: string | null;
    admissionCode: string;
    publicToken: string;
    status: VendorTeamPassStatus;
    validFrom: Date | null;
    validUntil: Date | null;
    firstAdmittedAt: Date | null;
    lastAdmittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdById: string | null;
    tokenNonce: string;
    members?: Array<{ id: string; name: string; role: string | null; admitted: boolean; sortOrder: number }>;
    createdBy?: { id: string; name: string | null } | null;
    event?: { id: string; title: string } | null;
  },
  opts: { includeToken?: boolean; baseUrl?: string } = {}
) {
  const remaining = remainingCapacity(pass);
  const token = opts.includeToken ? vendorTeamTokenFromNonce(pass.tokenNonce) : null;
  return {
    id: pass.id,
    eventId: pass.eventId,
    eventTitle: pass.event?.title ?? null,
    passType: pass.passType,
    passMode: pass.passMode,
    entryMode: pass.entryMode,
    title: pass.title,
    vendorName: pass.vendorName,
    contactName: pass.contactName,
    phone: pass.phone,
    email: pass.email,
    companyName: pass.companyName,
    categoryLabel: pass.categoryLabel,
    teamCapacity: pass.teamCapacity,
    admittedCount: pass.admittedCount,
    remainingCount: remaining,
    accessZones: parseZones(pass.accessZones),
    setupAccess: pass.setupAccess,
    breakdownAccess: pass.breakdownAccess,
    equipmentAccess: pass.equipmentAccess,
    vehicleRegistration: pass.vehicleRegistration,
    notes: pass.notes,
    logoUrl: pass.logoUrl,
    photoUrl: pass.photoUrl,
    admissionCode: pass.admissionCode,
    publicToken: pass.publicToken,
    passUrl: buildVendorTeamPassUrl(pass.publicToken, opts.baseUrl),
    status: pass.status,
    validFrom: pass.validFrom?.toISOString() ?? null,
    validUntil: pass.validUntil?.toISOString() ?? null,
    firstAdmittedAt: pass.firstAdmittedAt?.toISOString() ?? null,
    lastAdmittedAt: pass.lastAdmittedAt?.toISOString() ?? null,
    createdAt: pass.createdAt.toISOString(),
    updatedAt: pass.updatedAt.toISOString(),
    createdById: pass.createdById,
    createdByName: pass.createdBy?.name ?? null,
    members: pass.members ?? [],
    token,
    kind: "vendor_team_pass" as const,
    guestInvitation: false,
  };
}

export interface CreateVendorTeamPassInput {
  eventId: string;
  actorUserId: string;
  passType?: VendorTeamPassType;
  passMode?: VendorTeamPassMode;
  entryMode?: VendorTeamEntryMode;
  title: string;
  vendorName: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  companyName?: string | null;
  categoryLabel?: string | null;
  teamCapacity?: number;
  accessZones?: string[];
  setupAccess?: boolean;
  breakdownAccess?: boolean;
  equipmentAccess?: boolean;
  vehicleRegistration?: string | null;
  notes?: string | null;
  logoUrl?: string | null;
  photoUrl?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  reentryPolicy?: VendorReentryPolicy;
  reentryLimit?: number | null;
  memberNames?: string[];
  codeLength?: 4 | 6;
}

export async function createVendorTeamPass(input: CreateVendorTeamPassInput) {
  const title = input.title.trim();
  const vendorName = input.vendorName.trim();
  if (title.length < 2) throw new Error("Enter a pass title.");
  if (vendorName.length < 2) throw new Error("Enter the vendor or team name.");

  const passMode = input.passMode ?? (Math.max(1, input.teamCapacity ?? 1) > 1 ? "TEAM" : "INDIVIDUAL");
  let capacity = Math.max(1, Math.trunc(input.teamCapacity ?? 1));
  if (passMode === "INDIVIDUAL") capacity = 1;
  if (passMode === "TEAM" && capacity < 2) capacity = 2;

  const { nonce, token } = mintVendorTeamToken();
  const codeLength = input.codeLength === 4 ? 4 : 6;
  const admissionCode = await allocateCode(input.eventId, codeLength);
  const zones = input.accessZones?.length ? input.accessZones : [...DEFAULT_ACCESS_ZONES];
  const members = (input.memberNames ?? [])
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 100);

  const pass = await prisma.vendorTeamPass.create({
    data: {
      eventId: input.eventId,
      createdById: input.actorUserId,
      passType: input.passType ?? "VENDOR",
      passMode,
      entryMode: input.entryMode ?? "INDIVIDUAL_ENTRY",
      title,
      vendorName,
      contactName: input.contactName?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      companyName: input.companyName?.trim() || null,
      categoryLabel: input.categoryLabel?.trim() || null,
      teamCapacity: capacity,
      accessZones: zones,
      setupAccess: Boolean(input.setupAccess),
      breakdownAccess: Boolean(input.breakdownAccess),
      equipmentAccess: Boolean(input.equipmentAccess),
      vehicleRegistration: input.vehicleRegistration?.trim() || null,
      notes: input.notes?.trim() || null,
      logoUrl: input.logoUrl?.trim() || null,
      photoUrl: input.photoUrl?.trim() || null,
      tokenHash: hashVendorTeamToken(token),
      tokenNonce: nonce,
      tokenPrefix: "cvt1",
      admissionCode,
      codeLength,
      publicToken: mintVendorTeamPublicToken(),
      status: "ACTIVE",
      validFrom: input.validFrom ? new Date(input.validFrom) : null,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      reentryPolicy: input.reentryPolicy ?? "NONE",
      reentryLimit: input.reentryLimit ?? null,
      members: members.length
        ? {
            create: members.map((name, index) => ({
              name,
              sortOrder: index,
            })),
          }
        : undefined,
    },
    include: {
      members: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { id: true, name: true } },
      event: { select: { id: true, title: true } },
    },
  });

  await createAuditLog({
    userId: input.actorUserId,
    action: "CREATE",
    entity: "vendor_team_pass",
    entityId: pass.id,
    details: {
      kind: "vendor_team_pass_created",
      eventId: input.eventId,
      passMode,
      teamCapacity: capacity,
      passType: pass.passType,
    },
  });

  return toView(pass, { includeToken: true });
}

export async function listVendorTeamPasses(input: {
  eventId: string;
  q?: string;
  status?: string | null;
  passType?: string | null;
  passMode?: string | null;
  page?: number;
  limit?: number;
}) {
  const { page, limit, skip } = parsePaginationInput(
    { page: input.page, limit: input.limit },
    { limit: 20, maxLimit: 50 }
  );

  const where: Prisma.VendorTeamPassWhereInput = {
    eventId: input.eventId,
    archivedAt: null,
  };
  if (input.status) where.status = input.status as VendorTeamPassStatus;
  if (input.passType) where.passType = input.passType as VendorTeamPassType;
  if (input.passMode) where.passMode = input.passMode as VendorTeamPassMode;

  const q = input.q?.trim();
  if (q) {
    const digits = q.replace(/\D+/g, "");
    where.OR = [
      { title: { contains: q } },
      { vendorName: { contains: q } },
      { contactName: { contains: q } },
      { companyName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { publicToken: { contains: q } },
      { vehicleRegistration: { contains: q } },
      ...(digits.length >= 4 ? [{ admissionCode: digits }] : []),
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.vendorTeamPass.count({ where }),
    prisma.vendorTeamPass.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      include: {
        members: { orderBy: { sortOrder: "asc" } },
        createdBy: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
      },
    }),
  ]);

  return paginatedResult(
    rows.map((row) => toView(row)),
    total,
    page,
    limit
  );
}

export async function getVendorTeamPass(id: string, opts: { includeToken?: boolean } = {}) {
  const pass = await prisma.vendorTeamPass.findUnique({
    where: { id },
    include: {
      members: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { id: true, name: true } },
      event: { select: { id: true, title: true } },
    },
  });
  if (!pass || pass.archivedAt) return null;
  return toView(pass, opts);
}

export async function getVendorTeamPassByPublicToken(publicToken: string) {
  const pass = await prisma.vendorTeamPass.findUnique({
    where: { publicToken },
    include: {
      members: { orderBy: { sortOrder: "asc" } },
      event: { select: { id: true, title: true } },
    },
  });
  if (!pass || pass.archivedAt) return null;
  if (pass.status === "REVOKED" || pass.status === "EXPIRED") {
    return {
      invalid: true as const,
      status: pass.status,
      title: pass.title,
      vendorName: pass.vendorName,
      eventTitle: pass.event.title,
    };
  }
  return { invalid: false as const, pass: toView(pass, { includeToken: true }) };
}

export async function updateVendorTeamPass(
  id: string,
  actorUserId: string,
  patch: Partial<CreateVendorTeamPassInput> & {
    teamCapacity?: number;
    confirmCapacityChange?: boolean;
  }
) {
  const current = await prisma.vendorTeamPass.findUnique({ where: { id } });
  if (!current || current.archivedAt) throw new Error("Vendor pass not found");

  const data: Prisma.VendorTeamPassUpdateInput = {};
  if (patch.title?.trim()) data.title = patch.title.trim();
  if (patch.vendorName?.trim()) data.vendorName = patch.vendorName.trim();
  if (patch.contactName !== undefined) data.contactName = patch.contactName?.trim() || null;
  if (patch.phone !== undefined) data.phone = patch.phone?.trim() || null;
  if (patch.email !== undefined) data.email = patch.email?.trim() || null;
  if (patch.companyName !== undefined) data.companyName = patch.companyName?.trim() || null;
  if (patch.categoryLabel !== undefined) data.categoryLabel = patch.categoryLabel?.trim() || null;
  if (patch.notes !== undefined) data.notes = patch.notes?.trim() || null;
  if (patch.vehicleRegistration !== undefined) {
    data.vehicleRegistration = patch.vehicleRegistration?.trim() || null;
  }
  if (patch.accessZones) data.accessZones = patch.accessZones;
  if (patch.setupAccess !== undefined) data.setupAccess = patch.setupAccess;
  if (patch.breakdownAccess !== undefined) data.breakdownAccess = patch.breakdownAccess;
  if (patch.equipmentAccess !== undefined) data.equipmentAccess = patch.equipmentAccess;
  if (patch.entryMode) data.entryMode = patch.entryMode;
  if (patch.passType) data.passType = patch.passType;
  if (patch.validFrom !== undefined) {
    data.validFrom = patch.validFrom ? new Date(patch.validFrom) : null;
  }
  if (patch.validUntil !== undefined) {
    data.validUntil = patch.validUntil ? new Date(patch.validUntil) : null;
  }

  if (typeof patch.teamCapacity === "number") {
    const next = clampTeamCapacity(patch.teamCapacity, current.admittedCount);
    if (next !== current.teamCapacity) {
      if (current.admittedCount > 0 && !patch.confirmCapacityChange) {
        throw new Error("Confirm capacity change after admissions have started.");
      }
      data.teamCapacity = next;
      data.status = deriveVendorPassStatus(
        current.admittedCount,
        next
      ) as VendorTeamPassStatus;
    }
  }

  const updated = await prisma.vendorTeamPass.update({
    where: { id },
    data,
    include: {
      members: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { id: true, name: true } },
      event: { select: { id: true, title: true } },
    },
  });

  await createAuditLog({
    userId: actorUserId,
    action: "UPDATE",
    entity: "vendor_team_pass",
    entityId: id,
    details: { kind: "vendor_team_pass_updated", eventId: current.eventId, patch: Object.keys(data) },
  });

  return toView(updated);
}

export async function regenerateVendorTeamPass(
  id: string,
  actorUserId: string,
  target: "qr" | "code" | "both",
  reason: string,
  confirm: boolean
) {
  if (!confirm) throw new Error("Regeneration requires confirmation.");
  const current = await prisma.vendorTeamPass.findUnique({ where: { id } });
  if (!current || current.archivedAt) throw new Error("Vendor pass not found");

  const data: Prisma.VendorTeamPassUpdateInput = {};
  let rawToken: string | null = null;

  if (target === "qr" || target === "both") {
    const { nonce, token } = mintVendorTeamToken();
    rawToken = token;
    data.tokenHash = hashVendorTeamToken(token);
    data.tokenNonce = nonce;
    data.tokenVersion = current.tokenVersion + 1;
    data.publicToken = mintVendorTeamPublicToken();
  }
  if (target === "code" || target === "both") {
    data.admissionCode = await allocateCode(current.eventId, current.codeLength);
  }

  const updated = await prisma.vendorTeamPass.update({
    where: { id },
    data,
    include: {
      members: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { id: true, name: true } },
      event: { select: { id: true, title: true } },
    },
  });

  await createAuditLog({
    userId: actorUserId,
    action: "UPDATE",
    entity: "vendor_team_pass",
    entityId: id,
    details: { kind: "vendor_team_pass_regenerated", target, reason, eventId: current.eventId },
  });

  const view = toView(updated, { includeToken: true });
  if (rawToken) view.token = rawToken;
  return view;
}

export async function revokeVendorTeamPass(id: string, actorUserId: string, reason?: string) {
  const updated = await prisma.vendorTeamPass.update({
    where: { id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedReason: reason?.trim() || "Revoked by organiser",
    },
    include: {
      members: true,
      event: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  await createAuditLog({
    userId: actorUserId,
    action: "UPDATE",
    entity: "vendor_team_pass",
    entityId: id,
    details: { kind: "vendor_team_pass_revoked", reason, eventId: updated.eventId },
  });
  return toView(updated);
}

export async function reactivateVendorTeamPass(id: string, actorUserId: string) {
  const current = await prisma.vendorTeamPass.findUnique({ where: { id } });
  if (!current) throw new Error("Vendor pass not found");
  const status = deriveVendorPassStatus(current.admittedCount, current.teamCapacity);
  const updated = await prisma.vendorTeamPass.update({
    where: { id },
    data: { status: status as VendorTeamPassStatus, revokedAt: null, revokedReason: null },
    include: {
      members: true,
      event: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  await createAuditLog({
    userId: actorUserId,
    action: "UPDATE",
    entity: "vendor_team_pass",
    entityId: id,
    details: { kind: "vendor_team_pass_reactivated", eventId: current.eventId },
  });
  return toView(updated);
}

export async function archiveVendorTeamPass(id: string, actorUserId: string) {
  const updated = await prisma.vendorTeamPass.update({
    where: { id },
    data: { archivedAt: new Date(), status: "ARCHIVED" },
    include: {
      members: true,
      event: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  await createAuditLog({
    userId: actorUserId,
    action: "UPDATE",
    entity: "vendor_team_pass",
    entityId: id,
    details: { kind: "vendor_team_pass_archived", eventId: updated.eventId },
  });
  return toView(updated);
}

export async function deleteVendorTeamPass(id: string, actorUserId: string, confirm: boolean) {
  if (!confirm) throw new Error("Deletion requires confirmation.");
  const current = await prisma.vendorTeamPass.findUnique({
    where: { id },
    include: { _count: { select: { admissions: true } } },
  });
  if (!current) throw new Error("Vendor pass not found");
  if (current._count.admissions > 0) {
    throw new Error("This pass has admission history. Archive it instead of deleting.");
  }
  await prisma.vendorTeamPass.delete({ where: { id } });
  await createAuditLog({
    userId: actorUserId,
    action: "DELETE",
    entity: "vendor_team_pass",
    entityId: id,
    details: { kind: "vendor_team_pass_deleted", eventId: current.eventId },
  });
  return { deleted: true };
}

async function findPassForAdmit(input: {
  eventId: string;
  token?: string | null;
  code?: string | null;
}) {
  const include = {
    members: { orderBy: { sortOrder: "asc" as const } },
    event: { select: { id: true, title: true } },
  };
  if (input.token) {
    if (!verifyVendorTeamTokenSignature(input.token)) return { pass: null, wrongEvent: false as const };
    const hash = hashVendorTeamToken(input.token);
    const pass = await prisma.vendorTeamPass.findFirst({
      where: { eventId: input.eventId, tokenHash: hash, archivedAt: null },
      include,
    });
    if (pass) return { pass, wrongEvent: false as const };
    // Token is valid but owned by another event — never admit across events.
    const elsewhere = await prisma.vendorTeamPass.findFirst({
      where: { tokenHash: hash, archivedAt: null },
      select: { id: true },
    });
    return { pass: null, wrongEvent: Boolean(elsewhere) };
  }
  if (input.code) {
    const code = normalizeAdmissionCode(input.code);
    const pass = await prisma.vendorTeamPass.findFirst({
      where: { eventId: input.eventId, admissionCode: code, archivedAt: null },
      include,
    });
    if (pass) return { pass, wrongEvent: false as const };
    const elsewhere = await prisma.vendorTeamPass.findFirst({
      where: { admissionCode: code, archivedAt: null },
      select: { id: true, eventId: true },
    });
    // Codes are unique per event; same digits on another event must not open this gate.
    return {
      pass: null,
      wrongEvent: Boolean(elsewhere && elsewhere.eventId !== input.eventId),
    };
  }
  return { pass: null, wrongEvent: false as const };
}

export async function admitVendorTeamPass(input: {
  eventId: string;
  token?: string | null;
  code?: string | null;
  passId?: string | null;
  mode: VendorAdmitMode;
  quantity?: number;
  scannerUserId: string | null;
  gate?: string | null;
  deviceInfo?: string | null;
  offline?: boolean;
  clientRecordId?: string | null;
  dryRun?: boolean;
}) {
  const include = {
    members: { orderBy: { sortOrder: "asc" as const } },
    event: { select: { id: true, title: true } },
  };

  const pass = input.passId
    ? await prisma.vendorTeamPass.findFirst({
        where: { id: input.passId, eventId: input.eventId, archivedAt: null },
        include,
      })
    : null;

  if (input.passId && !pass) {
    const elsewhere = await prisma.vendorTeamPass.findFirst({
      where: { id: input.passId, archivedAt: null },
      select: { id: true },
    });
    if (elsewhere) {
      return {
        found: true as const,
        ok: false as const,
        error: "This vendor pass belongs to a different event.",
        pass: null,
      };
    }
    return { found: false as const };
  }

  const lookup = pass ? { pass, wrongEvent: false as const } : await findPassForAdmit(input);
  if (lookup.wrongEvent) {
    return {
      found: true as const,
      ok: false as const,
      error: "This vendor pass belongs to a different event.",
      pass: null,
    };
  }
  if (!lookup.pass) {
    return { found: false as const };
  }
  const resolvedPass = lookup.pass;

  const now = new Date();
  if (resolvedPass.validFrom && now < resolvedPass.validFrom) {
    return {
      found: true as const,
      ok: false as const,
      error: "This pass is not valid yet.",
      pass: toView(resolvedPass),
    };
  }
  if (resolvedPass.validUntil && now > resolvedPass.validUntil) {
    return {
      found: true as const,
      ok: false as const,
      error: "This pass has expired.",
      pass: toView(resolvedPass),
    };
  }

  const decision = resolveAdmitQuantity(
    {
      teamCapacity: resolvedPass.teamCapacity,
      admittedCount: resolvedPass.admittedCount,
      status: resolvedPass.status,
    },
    input.mode,
    input.quantity
  );
  if (!decision.ok) {
    return {
      found: true as const,
      ok: false as const,
      error: decision.error,
      pass: toView(resolvedPass),
    };
  }

  if (input.dryRun) {
    return {
      found: true as const,
      ok: true as const,
      dryRun: true as const,
      quantity: decision.quantity,
      pass: toView(resolvedPass),
      remainingAfter: remainingCapacity(resolvedPass) - decision.quantity,
    };
  }

  if (input.clientRecordId) {
    const existing = await prisma.vendorTeamPassAdmission.findUnique({
      where: { clientRecordId: input.clientRecordId },
    });
    if (existing) {
      const fresh = await getVendorTeamPass(resolvedPass.id);
      return {
        found: true as const,
        ok: true as const,
        alreadyRecorded: true as const,
        quantity: existing.quantity,
        pass: fresh!,
      };
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.vendorTeamPass.findUnique({ where: { id: resolvedPass.id } });
    if (!current) return null;
    if (
      current.revision !== resolvedPass.revision &&
      current.admittedCount !== resolvedPass.admittedCount
    ) {
      // Concurrent update — re-check remaining
    }
    const remaining = remainingCapacity(current);
    if (decision.quantity > remaining) return { conflict: true as const, current };

    const nextAdmitted = current.admittedCount + decision.quantity;
    const nextStatus = deriveVendorPassStatus(nextAdmitted, current.teamCapacity);
    const updated = await tx.vendorTeamPass.updateMany({
      where: {
        id: current.id,
        admittedCount: current.admittedCount,
        revision: current.revision,
      },
      data: {
        admittedCount: nextAdmitted,
        revision: current.revision + 1,
        status: nextStatus as VendorTeamPassStatus,
        firstAdmittedAt: current.firstAdmittedAt ?? now,
        lastAdmittedAt: now,
      },
    });
    if (updated.count !== 1) return { conflict: true as const, current };

    await tx.vendorTeamPassAdmission.create({
      data: {
        passId: current.id,
        eventId: current.eventId,
        quantity: decision.quantity,
        mode: input.mode,
        scannedById: input.scannerUserId,
        gate: input.gate ?? null,
        deviceInfo: input.deviceInfo ?? null,
        offline: Boolean(input.offline),
        clientRecordId: input.clientRecordId ?? null,
      },
    });

    return { conflict: false as const };
  });

  if (!result || result.conflict) {
    const fresh = await getVendorTeamPass(resolvedPass.id);
    return {
      found: true as const,
      ok: false as const,
      error: "Another scan just used the remaining capacity. Refresh and try again.",
      pass: fresh!,
    };
  }

  const fresh = await getVendorTeamPass(resolvedPass.id);
  await createAuditLog({
    userId: input.scannerUserId ?? undefined,
    action: "QR_SCAN",
    entity: "vendor_team_pass",
    entityId: resolvedPass.id,
    details: {
      kind: "vendor_team_pass_admitted",
      eventId: input.eventId,
      mode: input.mode,
      quantity: decision.quantity,
      admittedCount: fresh?.admittedCount,
      teamCapacity: fresh?.teamCapacity,
    },
  });

  return {
    found: true as const,
    ok: true as const,
    quantity: decision.quantity,
    pass: fresh!,
    guestAdmissionIncremented: false,
    companionUnlocked: false,
  };
}

export async function getVendorTeamPassHistory(passId: string, limit = 50) {
  return prisma.vendorTeamPassAdmission.findMany({
    where: { passId },
    orderBy: { createdAt: "desc" },
    take: Math.min(100, Math.max(1, limit)),
  });
}

/** Offline package slice — capacity-aware vendor team passes for one event. */
export async function offlineVendorTeamSlice(eventId: string) {
  const rows = await prisma.vendorTeamPass.findMany({
    where: {
      eventId,
      archivedAt: null,
      status: { in: LIVE },
    },
    select: {
      id: true,
      eventId: true,
      tokenHash: true,
      admissionCode: true,
      passType: true,
      title: true,
      vendorName: true,
      teamCapacity: true,
      admittedCount: true,
      revision: true,
      accessZones: true,
      status: true,
      validFrom: true,
      validUntil: true,
      entryMode: true,
      updatedAt: true,
    },
  });
  return rows.map((row) => ({
    ...row,
    remainingCount: remainingCapacity(row),
    accessZones: parseZones(row.accessZones),
    kind: "vendor_team_pass" as const,
  }));
}
