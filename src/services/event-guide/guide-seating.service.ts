import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeAdmissionCode } from "@/lib/admission/pass-code";
import {
  SEATING_RATE_LIMIT,
  buildSeatingMatch,
  effectiveMaxMatches,
  normalizeQuery,
  selectSeatingOutcome,
  validateQueryLength,
  type CandidateParty,
  type SeatingMode,
} from "@/lib/event-guide/seating-finder";
import type { GuideSeatingOutcome } from "@/lib/event-guide/types";

/**
 * How many parties we are willing to load for a name search.
 *
 * A name query is scored in memory, so this bounds the work per request. It is
 * generous enough for real events and small enough that the endpoint cannot be
 * used to walk a large guest list — and the scorer only ever returns one party
 * regardless of how many were loaded.
 */
const NAME_SEARCH_SCAN_LIMIT = 400;

const GUEST_SELECT = {
  id: true,
  name: true,
  invitationId: true,
  plusOnes: true,
  seatingAssignments: {
    select: {
      tableNumber: true,
      seatLabel: true,
      zone: true,
      seatingPlan: { select: { planType: true } },
    },
  },
} as const;

export class GuideSeatingService {
  /**
   * Look up one party's seat.
   *
   * Rate limited per token + client before any database read, so a scripted
   * attempt to enumerate codes is throttled rather than merely unsuccessful.
   */
  async find(input: {
    eventId: string;
    publicToken: string;
    clientKey: string;
    mode: SeatingMode;
    rawQuery: string;
    minQueryLength: number;
    maxMatches: number;
    enabled: boolean;
  }): Promise<GuideSeatingOutcome> {
    if (!input.enabled) return { status: "disabled" };

    const query = normalizeQuery(input.mode, input.rawQuery);
    const lengthCheck = validateQueryLength(input.mode, query, input.minQueryLength);
    if (!lengthCheck.ok) return lengthCheck.outcome;

    const limit = await rateLimit(
      `event-guide:seating:${input.publicToken}:${input.clientKey}`,
      SEATING_RATE_LIMIT.attempts,
      SEATING_RATE_LIMIT.windowSeconds
    );
    if (!limit.success) {
      return {
        status: "rate_limited",
        retryAfterSeconds: Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000)),
      };
    }

    return input.mode === "ADMISSION_CODE"
      ? this.findByCode(input.eventId, query)
      : this.findByName(input.eventId, query, effectiveMaxMatches(input.maxMatches));
  }

  /**
   * Code mode: an exact, event-scoped `GuestPass.code`.
   *
   * Mirrors `/api/event-seat/verify` — the pass identifies exactly one
   * invitation party, and members are filtered to that party's own invitation.
   */
  private async findByCode(eventId: string, code: string): Promise<GuideSeatingOutcome> {
    const digits = normalizeAdmissionCode(code);
    if (!digits) return { status: "no_match" };

    const pass = await prisma.guestPass.findFirst({
      where: { eventId, code: digits },
      select: {
        invitationId: true,
        displayName: true,
        invitation: {
          select: {
            name: true,
            guests: { where: { archivedAt: null }, select: GUEST_SELECT },
          },
        },
      },
    });

    if (!pass) return { status: "no_match" };

    const party: CandidateParty = {
      invitationId: pass.invitationId,
      partyName: pass.invitation.name?.trim() || pass.displayName?.trim() || "Guest",
      guests: pass.invitation.guests.map((guest) => ({
        id: guest.id,
        name: guest.name,
        invitationId: guest.invitationId,
        plusOnes: guest.plusOnes,
        seatingAssignments: guest.seatingAssignments,
      })),
    };

    return { status: "ok", match: buildSeatingMatch(party) };
  }

  /**
   * Name mode: opt-in per event.
   *
   * Candidates are narrowed in SQL by the query's longest token so we are not
   * scanning the whole list, then scored in memory. A tie returns "ambiguous"
   * with a count — never the candidates themselves.
   */
  private async findByName(
    eventId: string,
    query: string,
    maxMatches: number
  ): Promise<GuideSeatingOutcome> {
    const tokens = query.split(" ").filter(Boolean);
    const anchor = tokens.reduce((longest, t) => (t.length > longest.length ? t : longest), "");
    if (anchor.length < 3) return { status: "no_match" };

    const invitations = await prisma.invitation.findMany({
      where: {
        eventId,
        archivedAt: null,
        isGeneralPass: false,
        OR: [
          { name: { contains: anchor } },
          { guests: { some: { archivedAt: null, name: { contains: anchor } } } },
        ],
      },
      take: NAME_SEARCH_SCAN_LIMIT,
      select: {
        id: true,
        name: true,
        guests: { where: { archivedAt: null }, select: GUEST_SELECT },
      },
    });

    const parties: CandidateParty[] = invitations.map((invitation) => ({
      invitationId: invitation.id,
      partyName: invitation.name,
      guests: invitation.guests.map((guest) => ({
        id: guest.id,
        name: guest.name,
        invitationId: guest.invitationId,
        plusOnes: guest.plusOnes,
        seatingAssignments: guest.seatingAssignments,
      })),
    }));

    return selectSeatingOutcome(parties, query, maxMatches);
  }

  /** Party rows for a Venue Offline Pack's seating index. */
  async offlineSeatingSources(eventId: string) {
    const invitations = await prisma.invitation.findMany({
      where: { eventId, archivedAt: null, isGeneralPass: false },
      select: {
        id: true,
        name: true,
        guestPasses: { select: { code: true } },
        guests: { where: { archivedAt: null }, select: GUEST_SELECT },
      },
    });

    return invitations.map((invitation) => {
      const party: CandidateParty = {
        invitationId: invitation.id,
        partyName: invitation.name,
        guests: invitation.guests.map((guest) => ({
          id: guest.id,
          name: guest.name,
          invitationId: guest.invitationId,
          plusOnes: guest.plusOnes,
          seatingAssignments: guest.seatingAssignments,
        })),
      };
      const match = buildSeatingMatch(party);

      return {
        partyName: match.partyName,
        admissionCodes: invitation.guestPasses.map((p) => p.code),
        members: match.partyMembers,
        plusOnes: match.plusOnes,
        table: match.tableNumber,
        seat: match.seatLabel,
        zone: match.zone,
        ceremonyRow: match.ceremonyRowLabel,
        ceremonySeat: match.ceremonySeatLabel,
      };
    });
  }

  /** How ready seating is for offline use, for the readiness checklist. */
  async seatingCoverage(eventId: string) {
    const [parties, assigned] = await Promise.all([
      prisma.invitation.count({ where: { eventId, archivedAt: null, isGeneralPass: false } }),
      prisma.invitation.count({
        where: {
          eventId,
          archivedAt: null,
          isGeneralPass: false,
          guests: { some: { archivedAt: null, seatingAssignments: { some: {} } } },
        },
      }),
    ]);
    return { parties, assigned, unassigned: Math.max(0, parties - assigned) };
  }
}

export const guideSeatingService = new GuideSeatingService();
