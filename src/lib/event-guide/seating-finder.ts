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
import { pickSeatingAssignment, splitSeatingAssignments } from "@/lib/seating/assignment-pick";
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

  // `pickSeatingAssignment` falls back to the reception row when no ceremony
  // plan exists, which would print a guest's dinner table as their ceremony
  // row. A missing stage must read as missing, so ceremony is matched strictly.
  const { ceremony } = splitSeatingAssignments(assignments);
  const reception =
    pickSeatingAssignment(
      assignments.filter((row) => row.seatingPlan?.planType !== "CEREMONY"),
      "RECEPTION"
    ) ?? null;

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

/**
 * Typeahead, without turning the finder into a guest list.
 *
 * A guest types `kofi`, is told "we could not find that", and gives up — when
 * the list has them as `Kofi Mensah-Boateng`. Suggestions fix that, and they
 * are the one feature on this endpoint that could plausibly leak a guest list,
 * so the rules are narrow and all of them are enforced on the server:
 *
 *  - **Name mode only.** Someone typing an admission code is never offered
 *    names. There is no query in code mode that returns a suggestion.
 *  - **Nothing new is revealed.** A suggestion is the party label a successful
 *    lookup would already have shown, and nothing else — no seat, no table, no
 *    member list, no code, no contact detail. The shape returned is a string.
 *  - **Prefix-anchored, never fuzzy.** Every token typed must begin a token of
 *    the name. Fuzzy matching on a public endpoint is an enumeration oracle.
 *  - **Bounded.** Minimum query length before any read, at most five back,
 *    de-duplicated, and rate limited per token and client.
 */
export const SEATING_SUGGESTION_LIMIT = 5;

/** Looser than a lookup — a typeahead fires per word, not per attempt. */
export const SEATING_SUGGESTION_RATE_LIMIT = { attempts: 40, windowSeconds: 60 } as const;

/** Bounded scan: a keystroke must never cost a full guest-list read. */
export const SUGGESTION_SCAN_LIMIT = 60;

/** The label a lookup would show for this party, and nothing beyond it. */
export function partyLabel(party: CandidateParty): string {
  return party.partyName.trim() || party.guests[0]?.name?.trim() || "";
}

/** Every token typed begins a token of this name. */
function prefixScore(party: CandidateParty, tokens: string[]): number {
  const haystacks = [
    normalizeNameKey(party.partyName),
    ...party.guests.map((guest) => normalizeNameKey(guest.name)),
  ];

  let best = 0;
  for (const hay of haystacks) {
    if (!hay) continue;
    const hayTokens = hay.split(" ").filter(Boolean);
    if (!tokens.every((token) => hayTokens.some((word) => word.startsWith(token)))) continue;
    // A name that starts with what was typed is what the guest is reaching
    // for; a middle-name hit is still offered, just lower.
    best = Math.max(best, hay.startsWith(tokens[0]!) ? 2 : 1);
  }
  return best;
}

/**
 * The names to offer under the input.
 *
 * Returns party labels only, sorted by how directly they answer what was
 * typed and then alphabetically so the list is stable while a guest keeps
 * typing.
 */
export function suggestPartyLabels(
  parties: CandidateParty[],
  query: string,
  limit: number = SEATING_SUGGESTION_LIMIT
): string[] {
  const tokens = query.split(" ").filter(Boolean);
  if (tokens.length === 0) return [];

  const scored: Array<{ label: string; score: number }> = [];
  for (const party of parties) {
    const label = partyLabel(party);
    if (!label) continue;
    const score = prefixScore(party, tokens);
    if (score > 0) scored.push({ label, score });
  }

  scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of scored) {
    const key = normalizeNameKey(row.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row.label);
    if (out.length >= Math.max(1, limit)) break;
  }
  return out;
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
