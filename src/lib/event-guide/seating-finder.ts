/**
 * Privacy-safe seating finder.
 *
 * Generalises `/api/event-seat/verify` from code-only to code-or-name while
 * keeping its two hard guarantees:
 *
 *  1. A lookup resolves to exactly one party, or to nothing. There is no code
 *     path that returns a list of guests, and no path that returns another
 *     party's seat.
 *  2. Party isolation — members are filtered to the matched party's own
 *     `invitationId`, so a mislinked guest row can never leak across parties.
 *
 * Pure module. The Prisma reads live in the service; everything decidable
 * without a database is decided here so it can be tested exhaustively.
 */

import { normalizeAdmissionCode } from "@/lib/admission/pass-code";
import { pickSeatingAssignment } from "@/lib/seating/assignment-pick";
import type { GuideSeatingMatch, GuideSeatingOutcome } from "./types";

export const SEATING_RATE_LIMIT = { attempts: 12, windowSeconds: 60 } as const;
export const SEATING_MIN_QUERY = { ADMISSION_CODE: 4, GUEST_NAME: 3 } as const;
export const SEATING_MAX_MATCHES = 5;

export type SeatingMode = "ADMISSION_CODE" | "GUEST_NAME";

export function effectiveMinQuery(mode: SeatingMode, configured: number | null | undefined): number {
  const floor = SEATING_MIN_QUERY[mode];
  if (typeof configured !== "number" || !Number.isFinite(configured)) return floor;
  return Math.min(24, Math.max(floor, Math.trunc(configured)));
}

export function effectiveMaxMatches(configured: number | null | undefined): number {
  if (typeof configured !== "number" || !Number.isFinite(configured)) return 3;
  return Math.min(SEATING_MAX_MATCHES, Math.max(1, Math.trunc(configured)));
}

/**
 * Normalise a name for matching: case-folded, accent-stripped, punctuation
 * removed, whitespace collapsed. Used for both live search and the offline
 * pack's hashed index so the two behave identically.
 */
export function normalizeNameKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeQuery(mode: SeatingMode, raw: string): string {
  return mode === "ADMISSION_CODE" ? normalizeAdmissionCode(raw) : normalizeNameKey(raw);
}

/** Rejects short input before any database read — cheap and non-enumerable. */
export function validateQueryLength(
  mode: SeatingMode,
  query: string,
  configuredMin: number | null | undefined
): { ok: true } | { ok: false; outcome: Extract<GuideSeatingOutcome, { status: "query_too_short" }> } {
  const min = effectiveMinQuery(mode, configuredMin);
  if (query.length < min) {
    return { ok: false, outcome: { status: "query_too_short", minQueryLength: min } };
  }
  return { ok: true };
}

export interface CandidateGuest {
  id: string;
  name: string;
  invitationId: string | null;
  /** Unnamed guests travelling with this person. */
  plusOnes: number;
  seatingAssignments: Array<{
    tableNumber: string | null;
    seatLabel: string | null;
    zone: string | null;
    seatingPlan: { planType: string | null } | null;
  }>;
}

export interface CandidateParty {
  invitationId: string;
  partyName: string;
  guests: CandidateGuest[];
}

/**
 * Score a party against a name query. Exact key match beats a full-token
 * match, which beats a prefix match. Anything weaker does not match at all —
 * fuzzy matching on a public endpoint is an enumeration oracle.
 */
export function scorePartyNameMatch(party: CandidateParty, query: string): number {
  const tokens = query.split(" ").filter(Boolean);
  if (tokens.length === 0) return 0;

  let best = 0;
  const haystacks = [normalizeNameKey(party.partyName), ...party.guests.map((g) => normalizeNameKey(g.name))];

  for (const hay of haystacks) {
    if (!hay) continue;
    if (hay === query) {
      best = Math.max(best, 100);
      continue;
    }
    const hayTokens = hay.split(" ").filter(Boolean);
    const allPresent = tokens.every((t) => hayTokens.includes(t));
    if (allPresent) {
      best = Math.max(best, tokens.length > 1 ? 80 : 60);
      continue;
    }
    const allPrefixed = tokens.every((t) => hayTokens.some((h) => h.startsWith(t)));
    if (allPrefixed && query.length >= 4) {
      best = Math.max(best, tokens.length > 1 ? 50 : 30);
    }
  }

  return best;
}

/**
 * Build the guest-visible result for one party.
 *
 * Assignments are read from the party's primary guest, and members are filtered
 * to this party's own invitation — the same isolation rule as
 * `/api/event-seat/verify`.
 */
export function buildSeatingMatch(party: CandidateParty): GuideSeatingMatch {
  const partyGuests = party.guests.filter(
    (g) => !g.invitationId || g.invitationId === party.invitationId
  );
  const primary = partyGuests[0];
  const assignments =
    partyGuests.find((g) => g.seatingAssignments.length > 0)?.seatingAssignments ?? [];
  const reception = pickSeatingAssignment(assignments, "RECEPTION");
  const ceremony = pickSeatingAssignment(assignments, "CEREMONY");

  return {
    partyName: party.partyName.trim() || primary?.name?.trim() || "Guest",
    tableNumber: reception?.tableNumber ?? null,
    seatLabel: reception?.seatLabel ?? null,
    zone: reception?.zone ?? null,
    ceremonyRowLabel: ceremony?.tableNumber ?? null,
    ceremonySeatLabel: ceremony?.seatLabel ?? null,
    partyMembers: partyGuests.map((g) => g.name.trim()).filter((name) => name.length > 0),
    plusOnes: partyGuests.reduce((total, g) => total + Math.max(0, g.plusOnes), 0),
  };
}

/**
 * Pick a single winner from scored candidates.
 *
 * A tie at the top is reported as ambiguous with a count only — never with the
 * candidate names, which would turn the finder into a guest-list oracle.
 */
export function selectSeatingOutcome(
  parties: CandidateParty[],
  query: string,
  maxMatches: number
): GuideSeatingOutcome {
  const scored = parties
    .map((party) => ({ party, score: scorePartyNameMatch(party, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, maxMatches));

  if (scored.length === 0) return { status: "no_match" };

  const top = scored[0]!;
  const tied = scored.filter((row) => row.score === top.score);
  if (tied.length > 1) {
    return { status: "ambiguous", matchCount: tied.length };
  }

  return { status: "ok", match: buildSeatingMatch(top.party) };
}

export const SEATING_OUTCOME_COPY: Record<GuideSeatingOutcome["status"], string> = {
  ok: "",
  query_too_short: "Please enter a little more so we can find you.",
  no_match: "We could not find that. Please check the spelling, or ask a member of the host team.",
  ambiguous:
    "More than one guest matches that. Please add a surname so we show the right table.",
  disabled: "Seat lookup is not available for this celebration.",
  rate_limited: "That is a lot of tries. Please wait a moment and try again.",
};
