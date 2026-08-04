/**
 * Guest Admission Identity Audit — invitation-party scoped.
 *
 * Unit of work = Invitation. Unnamed plus-ones / capacity slots never appear
 * as separate missing-identity rows.
 */

import type { GuestPassStatus, GuestStatus, InvitationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import {
  classifyAdmissionIdentity,
  matchesIssueFilter,
  normalizeAuditQuery,
  type AdmissionIdentityStatus,
  type AuditIssueFilter,
} from "@/lib/admission-identity/classify";
import type {
  AdmissionIdentityAuditRow,
  AuditSummary,
} from "@/lib/admission-identity/types";
import { resolveInvitationAllowance } from "@/lib/admission/admission-logic";
import {
  ensureInvitationPass,
  regenerateInvitationPass,
} from "@/services/admission/guest-pass.service";
import { ensureGuestGateCode, newUniqueLink } from "@/services/invitations/personalised-invitation";
import { setInvitationLifecycle } from "@/services/guest-search/quick-invite.service";
import { nameKey } from "@/lib/guest-import/name";

export type { AdmissionIdentityAuditRow, AuditSummary } from "@/lib/admission-identity/types";

const LIVE_PASS_STATUSES: GuestPassStatus[] = [
  "ACTIVE",
  "PARTIALLY_ADMITTED",
  "ADMITTED",
  "PENDING_SYNC",
  "CONFLICT",
  "MANUAL_REVIEW",
];

export interface AuditQueryInput {
  eventId?: string | null;
  /** Admin-only: search across events when true and eventId omitted. */
  global?: boolean;
  q?: string;
  issue?: AuditIssueFilter | null;
  invitationStatus?: InvitationStatus | null;
  guestStatus?: GuestStatus | null;
  admissionStatus?: string | null;
  createdFrom?: string | null;
  createdTo?: string | null;
  updatedFrom?: string | null;
  updatedTo?: string | null;
  page?: number;
  limit?: number;
}

function dateRange(
  from?: string | null,
  to?: string | null
): Prisma.DateTimeFilter | undefined {
  const filter: Prisma.DateTimeFilter = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) filter.gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) filter.lte = d;
  }
  return Object.keys(filter).length ? filter : undefined;
}

async function loadDuplicateCodeSet(eventIds: string[]): Promise<Set<string>> {
  if (eventIds.length === 0) return new Set();
  const rows = await prisma.guestPass.groupBy({
    by: ["eventId", "code"],
    where: {
      eventId: { in: eventIds },
      status: { in: LIVE_PASS_STATUSES },
      code: { not: "" },
    },
    _count: { _all: true },
  });
  const dup = new Set<string>();
  for (const row of rows) {
    if (row._count._all > 1) dup.add(`${row.eventId}:${row.code}`);
  }
  return dup;
}

function mapRow(
  invitation: {
    id: string;
    name: string;
    uniqueLink: string;
    status: InvitationStatus;
    admissionState: string;
    admittedCount: number;
    admissionAllowance: number | null;
    createdAt: Date;
    updatedAt: Date;
    eventId: string;
    event: { id: string; title: string };
    guests: Array<{
      id: string;
      name: string;
      status: GuestStatus;
      plusOnes: number;
      archivedAt: Date | null;
    }>;
    guestPasses: Array<{
      id: string;
      code: string;
      status: GuestPassStatus;
      tokenVersion: number;
    }>;
  },
  duplicateCodes: Set<string>
): AdmissionIdentityAuditRow {
  const named = invitation.guests.filter((g) => !g.archivedAt);
  const primary = named[0] ?? null;
  const livePass =
    invitation.guestPasses.find((p) => LIVE_PASS_STATUSES.includes(p.status)) ?? null;
  const latestPass = invitation.guestPasses[0] ?? null;
  const pass = livePass ?? latestPass;
  const code = livePass?.code ?? null;
  const codeDuplicated = Boolean(
    code && duplicateCodes.has(`${invitation.eventId}:${code}`)
  );

  const identity = classifyAdmissionIdentity({
    uniqueLink: invitation.uniqueLink,
    hasLivePass: Boolean(livePass),
    admissionCode: code,
    passStatus: pass?.status ?? null,
    codeDuplicated,
  });

  const partySize = resolveInvitationAllowance(
    named.map((g) => ({ plusOnes: g.plusOnes })),
    invitation.admissionAllowance,
    null
  );
  const additionalGuestSlots = Math.max(0, partySize - named.length);
  const remainingCount = Math.max(0, partySize - invitation.admittedCount);

  return {
    invitationId: invitation.id,
    partyId: invitation.id,
    displayName: invitation.name,
    primaryGuestName: primary?.name ?? null,
    primaryGuestId: primary?.id ?? null,
    eventId: invitation.event.id,
    eventTitle: invitation.event.title,
    partySize,
    namedMemberCount: named.length,
    additionalGuestSlots,
    uniqueLink: invitation.uniqueLink,
    invitePath: `/invite/${invitation.uniqueLink}`,
    invitationStatus: invitation.status,
    guestStatus: primary?.status ?? null,
    admissionState: invitation.admissionState,
    admittedCount: invitation.admittedCount,
    remainingCount,
    admissionCode: code,
    passStatus: pass?.status ?? null,
    passId: pass?.id ?? null,
    identity,
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
    duplicateHint: codeDuplicated
      ? "Possible duplicate because another invitation on this event uses the same admission number."
      : null,
  };
}

/**
 * Server-side audit search. Filters + pagination happen here — never ship the
 * full guest database to the browser.
 */
export async function searchAdmissionIdentityAudit(input: AuditQueryInput) {
  const { page, limit, skip } = parsePaginationInput(
    { page: input.page, limit: input.limit },
    { limit: 20, maxLimit: 50 }
  );

  const eventFilter: Prisma.InvitationWhereInput = {};
  if (input.eventId) {
    eventFilter.eventId = input.eventId;
  }

  const createdAt = dateRange(input.createdFrom, input.createdTo);
  const updatedAt = dateRange(input.updatedFrom, input.updatedTo);

  const where: Prisma.InvitationWhereInput = {
    archivedAt: null,
    ...eventFilter,
    ...(input.invitationStatus ? { status: input.invitationStatus } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(input.admissionStatus
      ? { admissionState: input.admissionStatus as never }
      : {}),
  };

  const q = (input.q ?? "").trim();
  if (q) {
    const { text, digits, tokens } = normalizeAuditQuery(q);
    const or: Prisma.InvitationWhereInput[] = [
      { name: { contains: text } },
      { uniqueLink: { contains: q.trim() } },
      { id: q.trim() },
      {
        guests: {
          some: {
            archivedAt: null,
            OR: [
              { name: { contains: text } },
              { email: { contains: text } },
              ...(digits.length >= 4
                ? [{ phone: { contains: digits } }, { manualCode: digits }]
                : []),
            ],
          },
        },
      },
      {
        guestPasses: {
          some: {
            OR: [
              ...(digits.length >= 4 ? [{ code: digits }] : []),
              { tokenPrefix: { contains: q.trim().slice(0, 12) } },
              { id: q.trim() },
            ],
          },
        },
      },
      { event: { title: { contains: text } } },
    ];
    // Fuzzy-ish: also match longest token when multi-word.
    const longest = tokens.reduce((a, b) => (b.length > a.length ? b : a), "");
    if (longest && longest !== text && longest.length >= 3) {
      or.push({ name: { contains: longest } });
      or.push({ guests: { some: { archivedAt: null, name: { contains: longest } } } });
    }
    where.OR = or;
  }

  if (input.guestStatus) {
    where.guests = {
      some: { archivedAt: null, status: input.guestStatus },
    };
  }

  // Pull a bounded window then apply issue filter in memory for correctness
  // (issue state depends on live pass + duplicate maps). Cap candidate scan.
  const candidateTake = Math.min(500, Math.max(limit * 8, 80));
  const invitations = await prisma.invitation.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: candidateTake,
    select: {
      id: true,
      name: true,
      uniqueLink: true,
      status: true,
      admissionState: true,
      admittedCount: true,
      admissionAllowance: true,
      createdAt: true,
      updatedAt: true,
      eventId: true,
      event: { select: { id: true, title: true } },
      guests: {
        where: { archivedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          status: true,
          plusOnes: true,
          archivedAt: true,
        },
      },
      guestPasses: {
        orderBy: { tokenVersion: "desc" },
        select: { id: true, code: true, status: true, tokenVersion: true },
      },
    },
  });

  const eventIds = [...new Set(invitations.map((i) => i.eventId))];
  const duplicateCodes = await loadDuplicateCodeSet(eventIds);
  let rows = invitations.map((inv) => mapRow(inv, duplicateCodes));

  const issue = input.issue ?? "all_incomplete";
  rows = rows.filter((row) => matchesIssueFilter(row.identity, issue));

  const total = rows.length;
  const pageRows = rows.slice(skip, skip + limit);

  const summary = await summarizeAudit(input.eventId ?? null, eventIds);

  return {
    ...paginatedResult(pageRows, total, page, limit),
    summary,
    truncated: invitations.length >= candidateTake,
  };
}

async function summarizeAudit(
  eventId: string | null,
  fallbackEventIds: string[]
): Promise<AuditSummary> {
  const scopeEventIds = eventId ? [eventId] : fallbackEventIds;
  if (scopeEventIds.length === 0) {
    return {
      totalInvitations: 0,
      incomplete: 0,
      missingQr: 0,
      missingCode: 0,
      missingLink: 0,
      complete: 0,
      revoked: 0,
      duplicateCode: 0,
    };
  }

  const where: Prisma.InvitationWhereInput = {
    archivedAt: null,
    eventId: { in: scopeEventIds },
  };

  const [totalInvitations, withLivePass, revokedOnly] = await Promise.all([
    prisma.invitation.count({ where }),
    prisma.invitation.count({
      where: {
        ...where,
        guestPasses: { some: { status: { in: LIVE_PASS_STATUSES } } },
      },
    }),
    prisma.invitation.count({
      where: {
        ...where,
        guestPasses: { some: { status: { in: ["REVOKED", "REISSUED", "EXPIRED"] } } },
        NOT: { guestPasses: { some: { status: { in: LIVE_PASS_STATUSES } } } },
      },
    }),
  ]);

  const missingQr = Math.max(0, totalInvitations - withLivePass);
  const duplicateCodes = await loadDuplicateCodeSet(scopeEventIds);

  // Approximate missing code: invitations without a live pass that has a code.
  const withCode = await prisma.invitation.count({
    where: {
      ...where,
      guestPasses: {
        some: { status: { in: LIVE_PASS_STATUSES }, code: { not: "" } },
      },
    },
  });
  const missingCode = Math.max(0, totalInvitations - withCode);
  const complete = await prisma.invitation.count({
    where: {
      ...where,
      uniqueLink: { not: "" },
      guestPasses: {
        some: { status: { in: LIVE_PASS_STATUSES }, code: { not: "" } },
      },
    },
  });

  return {
    totalInvitations,
    incomplete: Math.max(0, totalInvitations - complete),
    missingQr,
    missingCode,
    missingLink: 0, // uniqueLink is required + unique; empty is vanishingly rare
    complete,
    revoked: revokedOnly,
    duplicateCode: duplicateCodes.size,
  };
}

export type GenerateMode =
  | "complete"
  | "qr"
  | "code"
  | "link"
  | "regenerate_qr"
  | "regenerate_code"
  | "regenerate_link";

/**
 * Idempotent generate / explicit regenerate for one invitation party.
 * Never creates a second invitation. Preserves valid values unless regenerate*.
 */
export async function generateAdmissionIdentity(input: {
  invitationId: string;
  actorUserId: string;
  mode: GenerateMode;
  reason?: string;
  confirmRegenerate?: boolean;
}) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: input.invitationId },
    select: {
      id: true,
      eventId: true,
      name: true,
      uniqueLink: true,
      archivedAt: true,
      guests: {
        where: { archivedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      },
      guestPasses: {
        where: { status: { in: LIVE_PASS_STATUSES } },
        orderBy: { tokenVersion: "desc" },
        take: 1,
        select: { id: true, code: true, status: true },
      },
    },
  });
  if (!invitation || invitation.archivedAt) {
    throw new Error("Invitation not found");
  }

  const regenerating = input.mode.startsWith("regenerate_");
  if (regenerating && !input.confirmRegenerate) {
    throw new Error("Regeneration requires explicit confirmation.");
  }

  const reason = input.reason?.trim() || `admission_identity_${input.mode}`;
  let uniqueLink = invitation.uniqueLink;
  let passResult = null as Awaited<ReturnType<typeof ensureInvitationPass>>;

  if (input.mode === "regenerate_link" || (input.mode === "link" && !invitation.uniqueLink?.trim())) {
    uniqueLink = newUniqueLink();
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { uniqueLink },
    });
  } else if (input.mode === "complete" && !invitation.uniqueLink?.trim()) {
    uniqueLink = newUniqueLink();
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { uniqueLink },
    });
  }

  if (
    input.mode === "regenerate_qr" ||
    input.mode === "regenerate_code" ||
    (regenerating && input.mode !== "regenerate_link")
  ) {
    passResult = await regenerateInvitationPass(invitation.id, input.actorUserId, reason);
  } else if (
    input.mode === "complete" ||
    input.mode === "qr" ||
    input.mode === "code"
  ) {
    // Idempotent: existing live pass is preserved.
    passResult = await ensureInvitationPass(invitation.id, { refreshPartySize: true });
  }

  // Keep primary guest gate code in sync when present (legacy reveal path).
  const primaryGuestId = invitation.guests[0]?.id;
  if (primaryGuestId && (input.mode === "complete" || input.mode === "code")) {
    await ensureGuestGateCode(primaryGuestId, invitation.eventId).catch(() => null);
  }

  await createAuditLog({
    userId: input.actorUserId,
    action: regenerating ? "UPDATE" : "CREATE",
    entity: "admission_identity",
    entityId: invitation.id,
    details: {
      kind: regenerating ? "admission_identity_regenerated" : "admission_identity_generated",
      mode: input.mode,
      eventId: invitation.eventId,
      invitationId: invitation.id,
      partyId: invitation.id,
      reason,
      passId: passResult?.pass.id ?? invitation.guestPasses[0]?.id ?? null,
    },
  });

  const detail = await getAdmissionIdentityDetail(invitation.id);

  return {
    invitationId: invitation.id,
    uniqueLink,
    passCode: passResult?.pass.code ?? detail?.admissionCode ?? null,
    passStatus: passResult?.pass.status ?? detail?.passStatus ?? null,
    token: passResult?.token ?? null,
    row: detail,
  };
}

export async function getAdmissionIdentityDetail(
  invitationId: string
): Promise<AdmissionIdentityAuditRow | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      name: true,
      uniqueLink: true,
      status: true,
      admissionState: true,
      admittedCount: true,
      admissionAllowance: true,
      createdAt: true,
      updatedAt: true,
      eventId: true,
      event: { select: { id: true, title: true } },
      guests: {
        where: { archivedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          status: true,
          plusOnes: true,
          archivedAt: true,
        },
      },
      guestPasses: {
        orderBy: { tokenVersion: "desc" },
        select: { id: true, code: true, status: true, tokenVersion: true },
      },
    },
  });
  if (!invitation) return null;
  const duplicateCodes = await loadDuplicateCodeSet([invitation.eventId]);
  return mapRow(invitation, duplicateCodes);
}

export async function bulkGenerateAdmissionIdentities(input: {
  invitationIds: string[];
  actorUserId: string;
  mode: "complete" | "qr" | "code";
  batchSize?: number;
}) {
  const ids = [...new Set(input.invitationIds.filter(Boolean))];
  const batchSize = Math.min(25, Math.max(1, input.batchSize ?? 10));
  const results: Array<{
    invitationId: string;
    ok: boolean;
    error?: string;
    status?: AdmissionIdentityStatus;
  }> = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    const slice = ids.slice(i, i + batchSize);
    for (const invitationId of slice) {
      try {
        const detail = await getAdmissionIdentityDetail(invitationId);
        if (!detail) {
          results.push({ invitationId, ok: false, error: "Not found" });
          continue;
        }
        // Skip complete identities for non-forced generate.
        if (detail.identity.status === "COMPLETE") {
          results.push({ invitationId, ok: true, status: "COMPLETE" });
          continue;
        }
        // Skip ambiguous duplicate-code rows from bulk — force individual repair.
        if (
          detail.identity.status === "DUPLICATE_CODE" ||
          detail.identity.status === "DUPLICATE_LINK"
        ) {
          results.push({
            invitationId,
            ok: false,
            error: "Excluded: resolve duplicate identity individually.",
            status: detail.identity.status,
          });
          continue;
        }
        const generated = await generateAdmissionIdentity({
          invitationId,
          actorUserId: input.actorUserId,
          mode: input.mode,
        });
        results.push({
          invitationId,
          ok: true,
          status: generated.row?.identity.status,
        });
      } catch (error) {
        results.push({
          invitationId,
          ok: false,
          error: error instanceof Error ? error.message : "Generation failed",
        });
      }
    }
  }

  await createAuditLog({
    userId: input.actorUserId,
    action: "UPDATE",
    entity: "admission_identity",
    entityId: input.actorUserId,
    details: {
      kind: "admission_identity_bulk_generate",
      mode: input.mode,
      count: ids.length,
      success: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    },
  });

  return { results };
}

// ─── Duplicate review (invitation-party level) ───────────────────────────────

export interface DuplicatePair {
  left: AdmissionIdentityAuditRow;
  right: AdmissionIdentityAuditRow;
  confidence: "strong" | "possible";
  reasons: string[];
}

export async function findSuspectedDuplicates(eventId: string): Promise<DuplicatePair[]> {
  const invitations = await prisma.invitation.findMany({
    where: { eventId, archivedAt: null },
    select: {
      id: true,
      name: true,
      uniqueLink: true,
      status: true,
      admissionState: true,
      admittedCount: true,
      admissionAllowance: true,
      createdAt: true,
      updatedAt: true,
      eventId: true,
      event: { select: { id: true, title: true } },
      guests: {
        where: { archivedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          status: true,
          plusOnes: true,
          email: true,
          phone: true,
          archivedAt: true,
        },
      },
      guestPasses: {
        orderBy: { tokenVersion: "desc" },
        select: { id: true, code: true, status: true, tokenVersion: true },
      },
    },
  });

  const duplicateCodes = await loadDuplicateCodeSet([eventId]);
  const rows = invitations.map((inv) => mapRow(inv, duplicateCodes));
  const byId = new Map(rows.map((r) => [r.invitationId, r]));
  const pairs: DuplicatePair[] = [];
  const seen = new Set<string>();

  const guestMeta = new Map(
    invitations.map((inv) => {
      const primary = inv.guests[0];
      return [
        inv.id,
        {
          email: primary?.email?.trim().toLowerCase() || null,
          phone: primary?.phone?.replace(/\D+/g, "") || null,
          nameKey: nameKey(inv.name),
        },
      ] as const;
    })
  );

  for (let i = 0; i < invitations.length; i++) {
    for (let j = i + 1; j < invitations.length; j++) {
      const a = invitations[i];
      const b = invitations[j];
      const key = [a.id, b.id].sort().join(":");
      if (seen.has(key)) continue;

      const ma = guestMeta.get(a.id)!;
      const mb = guestMeta.get(b.id)!;
      const reasons: string[] = [];
      let strong = false;

      const liveA = a.guestPasses.find((p) => LIVE_PASS_STATUSES.includes(p.status));
      const liveB = b.guestPasses.find((p) => LIVE_PASS_STATUSES.includes(p.status));
      if (liveA?.code && liveB?.code && liveA.code === liveB.code) {
        reasons.push("both records use the same admission number and event");
        strong = true;
      }
      if (a.uniqueLink && a.uniqueLink === b.uniqueLink) {
        reasons.push("both records share the same unique invitation link");
        strong = true;
      }
      if (ma.email && mb.email && ma.email === mb.email) {
        reasons.push("both records use the same email address and event");
        strong = true;
      }
      if (ma.phone && mb.phone && ma.phone.length >= 7 && ma.phone === mb.phone) {
        reasons.push("both records use the same phone number and event");
        strong = true;
      }
      if (ma.nameKey && mb.nameKey && ma.nameKey === mb.nameKey) {
        reasons.push("both records use the same normalized full name and event");
        strong = true;
      } else if (
        ma.nameKey &&
        mb.nameKey &&
        (ma.nameKey.includes(mb.nameKey) || mb.nameKey.includes(ma.nameKey)) &&
        Math.min(ma.nameKey.length, mb.nameKey.length) >= 5
      ) {
        reasons.push("similar invitation display names on the same event");
      }

      // Same table alone is NOT a duplicate signal — skipped intentionally.

      if (reasons.length === 0) continue;
      // Party members of the same invitation never appear as two invitations here.

      seen.add(key);
      const left = byId.get(a.id)!;
      const right = byId.get(b.id)!;
      pairs.push({
        left,
        right,
        confidence: strong ? "strong" : "possible",
        reasons: reasons.map(
          (r) =>
            `${strong ? "Possible duplicate" : "Possible duplicate"} because ${r}.`
        ),
      });
    }
  }

  return pairs.sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence === "strong" ? -1 : 1;
    return a.left.displayName.localeCompare(b.right.displayName);
  });
}

export async function archiveDuplicateInvitation(input: {
  invitationId: string;
  actorUserId: string;
  reason: string;
  canonicalInvitationId: string;
}) {
  if (input.invitationId === input.canonicalInvitationId) {
    throw new Error("Cannot archive the canonical invitation as its own duplicate.");
  }

  const [dup, canonical] = await Promise.all([
    prisma.invitation.findUnique({
      where: { id: input.invitationId },
      select: { id: true, eventId: true, name: true },
    }),
    prisma.invitation.findUnique({
      where: { id: input.canonicalInvitationId },
      select: { id: true, eventId: true, name: true },
    }),
  ]);
  if (!dup || !canonical) throw new Error("Invitation not found");
  if (dup.eventId !== canonical.eventId) {
    throw new Error("Duplicates must belong to the same event.");
  }

  // Never merge unrelated parties by name resemblance alone — archive only.
  await setInvitationLifecycle({
    eventId: dup.eventId,
    invitationId: dup.id,
    actorUserId: input.actorUserId,
    action: "ARCHIVE",
    reason: input.reason,
  });

  await createAuditLog({
    userId: input.actorUserId,
    action: "UPDATE",
    entity: "admission_identity",
    entityId: dup.id,
    details: {
      kind: "duplicate_archived",
      eventId: dup.eventId,
      invitationId: dup.id,
      partyId: dup.id,
      canonicalInvitationId: canonical.id,
      reason: input.reason,
      preservedCanonical: canonical.name,
      archivedName: dup.name,
    },
  });

  return { archivedId: dup.id, canonicalId: canonical.id };
}

export async function markNotDuplicate(input: {
  leftInvitationId: string;
  rightInvitationId: string;
  actorUserId: string;
  eventId: string;
}) {
  await createAuditLog({
    userId: input.actorUserId,
    action: "UPDATE",
    entity: "admission_identity",
    entityId: input.leftInvitationId,
    details: {
      kind: "not_duplicate",
      eventId: input.eventId,
      leftInvitationId: input.leftInvitationId,
      rightInvitationId: input.rightInvitationId,
      partyIds: [input.leftInvitationId, input.rightInvitationId],
    },
  });
  return { ok: true as const };
}
