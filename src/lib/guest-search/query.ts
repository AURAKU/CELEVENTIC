import { cleanName, foldDiacritics, stripTitles } from "@/lib/guest-import/name";

/**
 * Smart Guest Search — query understanding and ranking.
 *
 * Pure: no Prisma, no network, no clock. The organiser types one box and means
 * any of five different things — a name, a phone number, an email, an
 * admission code, or a table — so the query is classified first and the
 * database is only asked for what the query could plausibly match.
 *
 * Ranking happens here rather than in SQL because SQLite cannot express
 * "surname prefix beats a mid-word substring", and because a pure scorer is
 * the part that must never regress silently.
 */

/** What a typed query could be. A query can be several at once ("233" is both). */
export type QueryKind = "name" | "code" | "phone" | "email" | "table";

/** Where a result matched. Drives the "why did this show up" line on the card. */
export type MatchField =
  | "name"
  | "member"
  | "email"
  | "phone"
  | "code"
  | "manualCode"
  | "table"
  | "notes";

export interface ParsedQuery {
  /** Exactly what the organiser typed, trimmed only. */
  raw: string;
  /** Whitespace-collapsed, accent-folded, lowercased. */
  normalized: string;
  /** Accent-folded, title-stripped name tokens. Used for AND-of-OR matching. */
  tokens: string[];
  /** Digits only, when the query looks like a phone number. */
  phoneDigits: string | null;
  /** A 4- or 6-digit admission code, when the query is exactly that. */
  code: string | null;
  /** Lowercased address, when the query looks like an email. */
  email: string | null;
  /** Table identifier from "table 5", "tbl 5", "T5" or a bare number. */
  tableNumber: string | null;
  kinds: QueryKind[];
  isEmpty: boolean;
}

/** Longest query we will act on — beyond this it is a paste, not a search. */
export const MAX_QUERY_LENGTH = 120;

/** Shortest query that may hit the database. One letter matches everything. */
export const MIN_QUERY_LENGTH = 2;

/** Hard ceiling on candidate rows pulled back for in-memory ranking. */
export const CANDIDATE_LIMIT = 300;

/** Default page size for typeahead. */
export const TYPEAHEAD_LIMIT = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TABLE_RE = /^(?:table|tbl|tab|t)[\s.#-]*([a-z0-9][a-z0-9-]{0,11})$/i;

/**
 * Normalise a name for comparison: accent-folded, lowercased, punctuation
 * reduced to single spaces.
 *
 * Derived on read rather than stored, so no schema column can drift out of
 * date behind a guest an organiser renamed.
 */
export function searchKeyFor(input: string | null | undefined): string {
  if (!input) return "";
  return foldDiacritics(cleanName(input))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Same folding, with honorifics removed, so "Mr Kofi" is found by "kofi". */
export function searchKeyWithoutTitles(input: string | null | undefined): string {
  if (!input) return "";
  return searchKeyFor(stripTitles(cleanName(input)));
}

/** Digits of a phone number, ignoring spaces, dashes and a leading +. */
export function phoneDigits(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/\D+/g, "");
}

/**
 * The comparable tail of a phone number.
 *
 * Organisers type "0244123456" for a guest stored as "+233244123456". Both
 * share the last nine digits, so that suffix — not the whole string — is what
 * a phone search compares.
 */
export const PHONE_SUFFIX_LENGTH = 9;

export function phoneSuffix(input: string | null | undefined): string {
  const digits = phoneDigits(input);
  return digits.length <= PHONE_SUFFIX_LENGTH
    ? digits
    : digits.slice(-PHONE_SUFFIX_LENGTH);
}

export function parseSearchQuery(raw: string): ParsedQuery {
  const trimmed = (raw ?? "").slice(0, MAX_QUERY_LENGTH).trim();
  const normalized = searchKeyFor(trimmed);

  const empty: ParsedQuery = {
    raw: trimmed,
    normalized,
    tokens: [],
    phoneDigits: null,
    code: null,
    email: null,
    tableNumber: null,
    kinds: [],
    isEmpty: true,
  };

  if (trimmed.length < MIN_QUERY_LENGTH) return empty;

  const kinds: QueryKind[] = [];

  const email = EMAIL_RE.test(trimmed) ? trimmed.toLowerCase() : null;
  if (email) kinds.push("email");

  const digits = phoneDigits(trimmed);
  const digitsOnly = /^[\s+()\d.-]+$/.test(trimmed) && digits.length > 0;

  // A bare 4- or 6-digit run is an admission code — that is the shape the gate
  // prints. It stays a possible phone fragment too; both are searched.
  const code = digitsOnly && (digits.length === 4 || digits.length === 6) ? digits : null;
  if (code) kinds.push("code");

  // Six digits is the shortest thing worth treating as a phone fragment;
  // anything shorter is a code or a table and would match half the list.
  const phone = digitsOnly && digits.length >= 6 ? digits : null;
  if (phone) kinds.push("phone");

  const tableMatch = TABLE_RE.exec(trimmed);
  const tableNumber = tableMatch
    ? tableMatch[1].toUpperCase()
    : digitsOnly && digits.length <= 3
      ? digits
      : null;
  if (tableNumber) kinds.push("table");

  const tokens = searchKeyWithoutTitles(trimmed).split(" ").filter(Boolean);
  if (tokens.length > 0 && !digitsOnly) kinds.push("name");

  return {
    raw: trimmed,
    normalized,
    tokens,
    phoneDigits: phone,
    code,
    email,
    tableNumber,
    kinds: kinds.length > 0 ? kinds : ["name"],
    isEmpty: false,
  };
}

/** A row reduced to just what ranking needs. Built by the search service. */
export interface RankableCandidate {
  id: string;
  /** Invitation / primary guest display name. */
  name: string;
  /** Names of the other people on this invitation. */
  memberNames?: string[];
  email?: string | null;
  phone?: string | null;
  /** Guest Entry Pass admission code. */
  code?: string | null;
  /** Legacy 4-digit gate code on the guest row. */
  manualCode?: string | null;
  tableNumber?: string | null;
  notes?: string | null;
  /** Recency tiebreaker. */
  updatedAt?: Date | number | null;
}

export interface RankedMatch {
  score: number;
  field: MatchField;
  /** Human explanation for the card: "matched table 12". */
  reason: string;
}

// Score bands. An exact credential always outranks any name match, because a
// typed code is unambiguous and a name never is.
const SCORE = {
  exactCode: 1000,
  exactEmail: 960,
  exactPhone: 940,
  phoneSuffix: 900,
  exactName: 860,
  namePrefix: 780,
  allTokensPrefix: 700,
  allTokensPresent: 620,
  memberName: 540,
  table: 480,
  partialContains: 360,
  notes: 200,
} as const;

function tokenList(value: string | null | undefined): string[] {
  return searchKeyWithoutTitles(value).split(" ").filter(Boolean);
}

/**
 * Score one candidate against a parsed query.
 *
 * Returns null when nothing matched, so the caller can drop the row rather
 * than show an unexplainable result.
 */
export function scoreCandidate(query: ParsedQuery, candidate: RankableCandidate): RankedMatch | null {
  if (query.isEmpty) return null;

  // ── Credentials first: unambiguous, so they short-circuit ──
  if (query.code) {
    if (candidate.code && phoneDigits(candidate.code) === query.code) {
      return { score: SCORE.exactCode, field: "code", reason: `Admission code ${candidate.code}` };
    }
    if (candidate.manualCode && phoneDigits(candidate.manualCode) === query.code) {
      return { score: SCORE.exactCode - 5, field: "manualCode", reason: `Gate code ${candidate.manualCode}` };
    }
  }

  if (query.email && candidate.email) {
    const stored = candidate.email.toLowerCase();
    if (stored === query.email) {
      return { score: SCORE.exactEmail, field: "email", reason: candidate.email };
    }
    if (stored.includes(query.email)) {
      return { score: SCORE.partialContains, field: "email", reason: candidate.email };
    }
  }

  if (query.phoneDigits && candidate.phone) {
    const stored = phoneDigits(candidate.phone);
    if (stored === query.phoneDigits) {
      return { score: SCORE.exactPhone, field: "phone", reason: candidate.phone };
    }
    const querySuffix = phoneSuffix(query.phoneDigits);
    if (querySuffix.length >= 6 && phoneSuffix(stored) === querySuffix) {
      return { score: SCORE.phoneSuffix, field: "phone", reason: candidate.phone };
    }
    if (stored.includes(query.phoneDigits)) {
      return { score: SCORE.partialContains, field: "phone", reason: candidate.phone };
    }
  }

  // ── Name ──
  if (query.tokens.length > 0) {
    const nameKeyed = searchKeyWithoutTitles(candidate.name);
    const queryKey = query.tokens.join(" ");

    if (nameKeyed === queryKey) {
      return { score: SCORE.exactName, field: "name", reason: candidate.name };
    }
    if (nameKeyed.startsWith(queryKey)) {
      return { score: SCORE.namePrefix, field: "name", reason: candidate.name };
    }

    const nameTokens = tokenList(candidate.name);
    // Every typed token must find a home, so "obuah kofi" finds "Mr Kofi
    // Obuah" but "kofi mensah" does not.
    const everyTokenPrefixes = query.tokens.every((t) =>
      nameTokens.some((nt) => nt.startsWith(t))
    );
    if (everyTokenPrefixes) {
      const exactTokenHits = query.tokens.filter((t) => nameTokens.includes(t)).length;
      return {
        score:
          exactTokenHits === query.tokens.length
            ? SCORE.allTokensPresent + 60
            : SCORE.allTokensPrefix,
        field: "name",
        reason: candidate.name,
      };
    }

    for (const member of candidate.memberNames ?? []) {
      const memberTokens = tokenList(member);
      if (query.tokens.every((t) => memberTokens.some((mt) => mt.startsWith(t)))) {
        return { score: SCORE.memberName, field: "member", reason: `In this party: ${member}` };
      }
    }

    if (nameKeyed.includes(queryKey)) {
      return { score: SCORE.partialContains, field: "name", reason: candidate.name };
    }
  }

  // ── Table ──
  if (query.tableNumber && candidate.tableNumber) {
    if (candidate.tableNumber.toUpperCase() === query.tableNumber) {
      return { score: SCORE.table, field: "table", reason: `Table ${candidate.tableNumber}` };
    }
  }

  if (query.tokens.length > 0 && candidate.notes) {
    const notesKey = searchKeyFor(candidate.notes);
    if (query.tokens.every((t) => notesKey.includes(t))) {
      return { score: SCORE.notes, field: "notes", reason: "Matched a note" };
    }
  }

  return null;
}

export interface RankedCandidate<T extends RankableCandidate> {
  candidate: T;
  match: RankedMatch;
}

function recencyOf(value: Date | number | null | undefined): number {
  if (value == null) return 0;
  return value instanceof Date ? value.getTime() : value;
}

/**
 * Score, drop non-matches, and order. Ties break on recency then name so the
 * list is stable between keystrokes — a result must not jump under the cursor.
 */
export function rankCandidates<T extends RankableCandidate>(
  query: ParsedQuery,
  candidates: T[],
  limit?: number
): RankedCandidate<T>[] {
  const ranked: RankedCandidate<T>[] = [];
  for (const candidate of candidates) {
    const match = scoreCandidate(query, candidate);
    if (match) ranked.push({ candidate, match });
  }

  ranked.sort((a, b) => {
    if (b.match.score !== a.match.score) return b.match.score - a.match.score;
    const recency = recencyOf(b.candidate.updatedAt) - recencyOf(a.candidate.updatedAt);
    if (recency !== 0) return recency;
    return a.candidate.name.localeCompare(b.candidate.name);
  });

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}

/**
 * Character ranges to embolden in a typeahead row.
 *
 * Computed against the *original* string (accents and titles intact) so the
 * highlight lines up with what the organiser is looking at, even though
 * matching happened on the folded form.
 */
export function highlightRanges(text: string, query: ParsedQuery): [number, number][] {
  if (query.isEmpty || !text) return [];
  const haystack = foldDiacritics(text).toLowerCase();
  const needles = query.tokens.length > 0 ? query.tokens : [query.normalized];

  const ranges: [number, number][] = [];
  for (const needle of needles) {
    if (!needle) continue;
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(needle, from);
      if (at === -1) break;
      // Word-initial only: highlighting "an" inside "Ananse" mid-word is noise.
      const boundary = at === 0 || !/[a-z0-9]/.test(haystack[at - 1]);
      if (boundary) ranges.push([at, at + needle.length]);
      from = at + needle.length;
    }
  }

  return mergeRanges(ranges);
}

function mergeRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i][0] <= last[1]) {
      last[1] = Math.max(last[1], sorted[i][1]);
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}
