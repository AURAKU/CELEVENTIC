import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppUrlFromEnv } from "@/lib/app-url";
import {
  CANDIDATE_LIMIT,
  parseSearchQuery,
  rankCandidates,
  type ParsedQuery,
  type RankableCandidate,
} from "@/lib/guest-search/query";
import type { SearchResponse, SearchResultCard } from "@/lib/guest-search/types";

/**
 * Smart Guest Search.
 *
 * Two stages, because SQLite can filter fast but cannot rank, and cannot fold
 * accents:
 *
 *  1. **Narrow.** A bounded `LIKE` query over the fields the parsed query could
 *     plausibly match. Cheap, and on a normal event it returns everything.
 *  2. **Widen.** If stage one came back thin *and* the query looks like a name,
 *     pull the event's most recent invitations up to the same ceiling and rank
 *     those in memory. This is what makes "Adjei" find "Adjeí" without a
 *     denormalised search column that could drift out of date behind a rename.
 *
 * Both stages are capped at `CANDIDATE_LIMIT`, so the cost of a search is
 * bounded regardless of how large the guest list is.
 */

/** Result rows returned to the caller by default. */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Below this many hits, stage two runs. */
const WIDEN_THRESHOLD = 3;

export interface SearchOptions {
  eventId: string;
  query: string;
  limit?: number;
  /** Include archived invitations. Off by default — archive means "hidden". */
  includeArchived?: boolean;
  /** Include unnamed general-admission passes. Off by default. */
  includeGeneralPasses?: boolean;
}

const invitationSelect = {
  id: true,
  name: true,
  status: true,
  admissionAllowance: true,
  admittedCount: true,
  isGeneralPass: true,
  archivedAt: true,
  uniqueLink: true,
  createdAt: true,
  updatedAt: true,
  guests: {
    where: { archivedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      manualCode: true,
      plusOnes: true,
      status: true,
      partyType: true,
      notes: true,
      qrToken: true,
      seatingAssignment: { select: { tableNumber: true, seatLabel: true } },
    },
  },
  guestPasses: {
    where: { status: { notIn: ["REISSUED"] } },
    orderBy: { tokenVersion: "desc" },
    take: 1,
    select: { code: true, status: true, partySize: true, admittedCount: true },
  },
} satisfies Prisma.InvitationSelect;

type InvitationRow = Prisma.InvitationGetPayload<{ select: typeof invitationSelect }>;

/** Build the stage-one `WHERE`: only the fields this query could match. */
function buildWhere(
  query: ParsedQuery,
  options: SearchOptions
): Prisma.InvitationWhereInput {
  const or: Prisma.InvitationWhereInput[] = [];

  if (query.tokens.length > 0) {
    // Every typed token must appear somewhere in the invitation name, so
    // "kofi obuah" and "obuah kofi" both land on "Mr Kofi Obuah" while
    // "kofi mensah" does not.
    or.push({ AND: query.tokens.map((token) => ({ name: { contains: token } })) });
    or.push({
      guests: {
        some: { AND: query.tokens.map((token) => ({ name: { contains: token } })) },
      },
    });
    or.push({ guests: { some: { notes: { contains: query.tokens.join(" ") } } } });
  }

  if (query.email) {
    or.push({ guests: { some: { email: { contains: query.email } } } });
  }

  if (query.phoneDigits) {
    // Stored numbers carry spaces, dashes and country codes, so the whole
    // typed string rarely appears verbatim. The last nine digits do.
    const suffix = query.phoneDigits.slice(-9);
    or.push({ guests: { some: { phone: { contains: suffix } } } });
    or.push({ guests: { some: { phone: { contains: query.phoneDigits } } } });
  }

  if (query.code) {
    or.push({ guestPasses: { some: { code: query.code } } });
    or.push({ guests: { some: { manualCode: query.code } } });
  }

  if (query.tableNumber) {
    or.push({
      guests: { some: { seatingAssignment: { tableNumber: query.tableNumber } } },
    });
  }

  const where: Prisma.InvitationWhereInput = {
    eventId: options.eventId,
    ...(options.includeArchived ? {} : { archivedAt: null }),
    ...(options.includeGeneralPasses ? {} : { isGeneralPass: false }),
  };

  if (or.length > 0) where.OR = or;
  return where;
}

function toCandidate(row: InvitationRow): RankableCandidate & { row: InvitationRow } {
  const primary = row.guests[0] ?? null;
  const seating = row.guests.find((g) => g.seatingAssignment)?.seatingAssignment ?? null;

  return {
    row,
    id: row.id,
    name: row.name,
    memberNames: row.guests.map((g) => g.name),
    email: primary?.email ?? row.guests.find((g) => g.email)?.email ?? null,
    phone: primary?.phone ?? row.guests.find((g) => g.phone)?.phone ?? null,
    code: row.guestPasses[0]?.code ?? null,
    manualCode: primary?.manualCode ?? row.guests.find((g) => g.manualCode)?.manualCode ?? null,
    tableNumber: seating?.tableNumber ?? null,
    notes: row.guests.find((g) => g.notes)?.notes ?? null,
    updatedAt: row.updatedAt,
  };
}

/** Heads this invitation admits: stored override, else guests + plus-ones. */
function derivePartySize(row: InvitationRow): number {
  if (typeof row.admissionAllowance === "number" && row.admissionAllowance > 0) {
    return row.admissionAllowance;
  }
  const pass = row.guestPasses[0];
  if (pass && pass.partySize > 0) return pass.partySize;
  const derived = row.guests.reduce((sum, g) => sum + 1 + Math.max(0, g.plusOnes ?? 0), 0);
  return Math.max(1, derived);
}

function toCard(
  row: InvitationRow,
  match: { score: number; field: SearchResultCard["matchedField"]; reason: string },
  appUrl: string
): SearchResultCard {
  const primary = row.guests[0] ?? null;
  const seating = row.guests.find((g) => g.seatingAssignment)?.seatingAssignment ?? null;
  const pass = row.guestPasses[0] ?? null;

  // A personal link carries the guest token so the invitation greets them by
  // name and the place card resolves to the right person.
  const invitePath = primary?.qrToken
    ? `/invite/${row.uniqueLink}?guest=${primary.qrToken}`
    : `/invite/${row.uniqueLink}`;

  return {
    invitationId: row.id,
    guestId: primary?.id ?? null,
    name: row.name,
    status: row.status,
    guestStatus: primary?.status ?? null,
    partyType: primary?.partyType ?? "INDIVIDUAL",
    partySize: derivePartySize(row),
    admittedCount: pass?.admittedCount ?? row.admittedCount,
    email: primary?.email ?? row.guests.find((g) => g.email)?.email ?? null,
    phone: primary?.phone ?? row.guests.find((g) => g.phone)?.phone ?? null,
    admissionCode: pass?.code ?? null,
    manualCode: primary?.manualCode ?? null,
    tableNumber: seating?.tableNumber ?? null,
    seatLabel: seating?.seatLabel ?? null,
    members: row.guests.map((g) => ({
      id: g.id,
      name: g.name,
      admitted: g.status === "CHECKED_IN",
    })),
    inviteUrl: `${appUrl}${invitePath}`,
    invitePath,
    isGeneralPass: row.isGeneralPass,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    passRevoked: pass?.status === "REVOKED",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    matchedField: match.field,
    matchReason: match.reason,
    score: match.score,
  };
}

/**
 * Search one event's invitations.
 *
 * Always scoped to a single event: an admission code is only unique within an
 * event, and cross-event results would let a workspace member with access to
 * one event enumerate another.
 */
export async function searchGuests(options: SearchOptions): Promise<SearchResponse> {
  const startedAt = Date.now();
  const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
  const query = parseSearchQuery(options.query);

  if (query.isEmpty) {
    return { query: query.raw, results: [], total: 0, truncated: false, tookMs: 0 };
  }

  const appUrl = getAppUrlFromEnv();
  const baseWhere: Prisma.InvitationWhereInput = {
    eventId: options.eventId,
    ...(options.includeArchived ? {} : { archivedAt: null }),
    ...(options.includeGeneralPasses ? {} : { isGeneralPass: false }),
  };

  // ── Stage one: narrow ──
  const narrow = await prisma.invitation.findMany({
    where: buildWhere(query, options),
    select: invitationSelect,
    orderBy: { updatedAt: "desc" },
    take: CANDIDATE_LIMIT,
  });

  const byId = new Map<string, InvitationRow>(narrow.map((row) => [row.id, row]));
  let ranked = rankCandidates(query, narrow.map(toCandidate));
  let truncated = narrow.length >= CANDIDATE_LIMIT;

  // ── Stage two: widen for accents and near-misses ──
  if (ranked.length < WIDEN_THRESHOLD && query.tokens.length > 0) {
    const widened = await prisma.invitation.findMany({
      where: baseWhere,
      select: invitationSelect,
      orderBy: { updatedAt: "desc" },
      take: CANDIDATE_LIMIT,
    });
    for (const row of widened) byId.set(row.id, row);
    truncated = truncated || widened.length >= CANDIDATE_LIMIT;
    ranked = rankCandidates(
      query,
      Array.from(byId.values()).map(toCandidate)
    );
  }

  const results = ranked
    .slice(0, limit)
    .map(({ candidate, match }) => toCard(candidate.row, match, appUrl));

  return {
    query: query.raw,
    results,
    total: ranked.length,
    truncated,
    tookMs: Date.now() - startedAt,
  };
}

/**
 * Load one invitation as a result card.
 *
 * Used straight after a quick create so the new invitation appears in the
 * results list without waiting for a re-query — and so "create then find" is
 * one continuous flow rather than two disconnected screens.
 */
export async function getResultCard(
  eventId: string,
  invitationId: string
): Promise<SearchResultCard | null> {
  const row = await prisma.invitation.findFirst({
    where: { id: invitationId, eventId },
    select: invitationSelect,
  });
  if (!row) return null;

  return toCard(
    row,
    { score: 0, field: "name", reason: row.name },
    getAppUrlFromEnv()
  );
}
