import type { GuestPartyType } from "@prisma/client";

/**
 * Name intelligence for bulk guest import.
 *
 * Turns the way people actually write a guest list — "Mr & Mrs Mensah",
 * "Kofi Boateng +1", "The Asante Family", "Ushers Team (8)" — into a party
 * type and, where it is unambiguous, an allowance.
 *
 * The hard rule: a suggestion is never silently authoritative. FAMILY and
 * GROUP have no knowable head count from the name alone, so they come back
 * with `allowanceConfirmed: false` and the organiser must confirm before the
 * gate will honour more than one head.
 */

/** Honorifics and Ghanaian/other traditional titles, stripped for matching. */
const TITLES = [
  "mr", "mrs", "ms", "miss", "mstr", "master", "dr", "prof", "professor",
  "rev", "reverend", "pastor", "bishop", "apostle", "prophet", "prophetess",
  "evangelist", "elder", "deacon", "deaconess", "imam", "sheikh",
  "alhaji", "hajia", "hajj", "nana", "naa", "nii", "togbe", "torgbe", "togbui",
  "osabarima", "obaahemaa", "okyeame", "chief", "hon", "honourable", "honorable",
  "sir", "madam", "lady", "eng", "engr", "arch", "surv", "barr", "capt",
  "col", "gen", "maj", "lt", "sgt", "amb", "ambassador", "justice", "auntie",
  "aunty", "uncle", "papa", "maame", "opanyin",
];

const TITLE_SET = new Set(TITLES);

const COUPLE_JOINERS = /\s*(?:&|\+(?=\s*(?:mrs|mr|ms|dr|miss))|\band\b|\/)\s*/i;

const FAMILY_WORDS = /\b(family|families|household|home|fam)\b/i;
const GROUP_WORDS =
  /\b(group|team|crew|company|ltd|limited|plc|enterprise|enterprises|association|club|society|choir|committee|department|dept|staff|ushers?|delegation|chapter|union|congregation|guests?\s+of|friends\s+of|colleagues|coworkers|table)\b/i;

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

export interface NameAnalysis {
  /** Display name, whitespace-normalised. Kept verbatim otherwise. */
  displayName: string;
  partyType: GuestPartyType;
  /** Heads this invitation should admit. */
  partySize: number;
  /**
   * False when the size is a floor rather than a fact — FAMILY/GROUP without
   * an explicit count. Callers must make the organiser confirm.
   */
  allowanceConfirmed: boolean;
  /** Individually named members parsed out of the name, when present. */
  memberNames: string[];
  /** True when the count came from the text (e.g. "+2", "(6)"). */
  explicitCount: boolean;
}

/** Collapse whitespace and trim stray list punctuation. */
export function cleanName(input: string): string {
  return input
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;|\-–—.]+/, "")
    .replace(/[\s,;|]+$/, "")
    .trim();
}

/** Strip diacritics so "Adjeí" and "Adjei" compare equal. */
export function foldDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Remove leading honorifics ("Mr.", "Nana", "Dr") from a name fragment. */
export function stripTitles(input: string): string {
  let rest = input.trim();
  // Loop: "Rev. Dr. Kwame" sheds both.
  for (let i = 0; i < 4; i++) {
    const match = /^([A-Za-z]+)\.?\s+(.*)$/.exec(rest);
    if (!match) break;
    if (!TITLE_SET.has(match[1].toLowerCase())) break;
    rest = match[2].trim();
  }
  return rest || input.trim();
}

/**
 * Comparison key for duplicate detection: case-, accent-, title- and
 * punctuation-insensitive, with tokens sorted so "Kofi Mensah" and
 * "Mensah Kofi" collide. Collisions surface for review — never a silent merge.
 */
export function nameKey(input: string): string {
  const base = foldDiacritics(stripTitles(cleanName(input)))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "";
  return base.split(" ").filter(Boolean).sort().join(" ");
}

/** Strict key: same normalisation, original token order. */
export function orderedNameKey(input: string): string {
  return foldDiacritics(stripTitles(cleanName(input)))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface CountExtraction {
  text: string;
  /** Extra heads beyond the primary guest, e.g. "+2" → 2. */
  additional: number;
  /** Absolute total, e.g. "(6)" → 6. */
  total: number | null;
}

/** Pull a trailing head count out of the name and return the name without it. */
function extractCount(input: string): CountExtraction {
  let text = input;
  let additional = 0;
  let total: number | null = null;

  // "+1", "+ 2 guests", "plus one", "plus 3"
  const plusDigit = /\s*\+\s*(\d{1,2})\s*(?:guests?|pax|people|persons?)?\s*$/i.exec(text);
  if (plusDigit) {
    additional = Number(plusDigit[1]);
    text = text.slice(0, plusDigit.index);
  } else {
    const plusWord = /\s*(?:\+|\band\b|&|\bplus\b)\s*(one|two|three|four|five|six|1|2|3|4|5|6)\s*(?:guests?|pax|people|persons?)\s*$/i.exec(text);
    if (plusWord) {
      const token = plusWord[1].toLowerCase();
      additional = WORD_NUMBERS[token] ?? Number(token) ?? 0;
      text = text.slice(0, plusWord.index);
    } else if (/\s*(?:\+|&|\band\b)\s*(?:a\s+)?guest\s*$/i.test(text)) {
      additional = 1;
      text = text.replace(/\s*(?:\+|&|\band\b)\s*(?:a\s+)?guest\s*$/i, "");
    }
  }

  // "(6)", "[6]", "x6", "- 6 pax", "6 pax"
  const bracketed = /\s*[([{]\s*(\d{1,3})\s*(?:guests?|pax|people|persons?|seats?)?\s*[)\]}]\s*$/i.exec(text);
  if (bracketed) {
    total = Number(bracketed[1]);
    text = text.slice(0, bracketed.index);
  } else {
    const suffix = /\s*(?:[-–—:]\s*)?(?:x\s*)?(\d{1,3})\s*(?:guests?|pax|people|persons?|seats?)\s*$/i.exec(text);
    if (suffix) {
      total = Number(suffix[1]);
      text = text.slice(0, suffix.index);
    } else {
      const xCount = /\s*[x×]\s*(\d{1,3})\s*$/i.exec(text);
      if (xCount) {
        total = Number(xCount[1]);
        text = text.slice(0, xCount.index);
      }
    }
  }

  return { text: cleanName(text), additional, total };
}

/** Split a couple-ish name into its two sides, if it is one. */
function splitCouple(text: string): [string, string] | null {
  // Only split on the first joiner: "Kofi & Ama & Yaw" is a group, not a couple.
  const match = COUPLE_JOINERS.exec(text);
  if (!match || match.index === 0) return null;

  const left = text.slice(0, match.index).trim();
  const right = text.slice(match.index + match[0].length).trim();
  if (!left || !right) return null;

  // A second joiner means three or more parties — handled as a group.
  if (COUPLE_JOINERS.test(right)) return null;
  return [left, right];
}

/** Give a bare first name the surname of its partner: "Kofi & Ama Mensah". */
function shareSurname(left: string, right: string): [string, string] {
  const leftTokens = stripTitles(left).split(" ").filter(Boolean);
  const rightTokens = stripTitles(right).split(" ").filter(Boolean);
  if (leftTokens.length === 1 && rightTokens.length >= 2) {
    return [`${leftTokens[0]} ${rightTokens[rightTokens.length - 1]}`, rightTokens.join(" ")];
  }
  return [leftTokens.join(" ") || left, rightTokens.join(" ") || right];
}

/**
 * Analyse one guest-list line into a party type and allowance.
 *
 * @param defaultPartySize allowance used for a plain individual
 */
export function analyseName(input: string, defaultPartySize = 1): NameAnalysis {
  const displayName = cleanName(input);
  const base: NameAnalysis = {
    displayName,
    partyType: "INDIVIDUAL",
    partySize: Math.max(1, defaultPartySize),
    allowanceConfirmed: true,
    memberNames: [],
    explicitCount: false,
  };
  if (!displayName) return base;

  const { text, additional, total } = extractCount(displayName);
  const working = text || displayName;

  // ── Group: an organisation, team or "table of N" ──
  if (GROUP_WORDS.test(working)) {
    return {
      ...base,
      partyType: "GROUP",
      partySize: total ?? Math.max(1, additional + 1),
      // Only an explicit count makes a group allowance trustworthy.
      allowanceConfirmed: total != null,
      explicitCount: total != null || additional > 0,
    };
  }

  // ── Family: "The Mensah Family", "Ofori Household" ──
  if (FAMILY_WORDS.test(working)) {
    return {
      ...base,
      partyType: "FAMILY",
      partySize: total ?? Math.max(2, additional + 1),
      allowanceConfirmed: total != null,
      explicitCount: total != null,
    };
  }

  // ── Couple: "Mr & Mrs Mensah", "Kofi and Ama Boateng" ──
  const couple = splitCouple(working);
  if (couple) {
    const [rawLeft, rawRight] = couple;
    const leftIsTitleOnly = TITLE_SET.has(rawLeft.replace(/\./g, "").trim().toLowerCase());
    const rightIsTitleOnly = TITLE_SET.has(rawRight.replace(/\./g, "").trim().toLowerCase());

    if (leftIsTitleOnly && !rightIsTitleOnly) {
      // "Mr & Mrs Mensah" — one printed name, two heads, no member names.
      return {
        ...base,
        partyType: "COUPLE",
        partySize: Math.max(2, total ?? 2 + additional),
        allowanceConfirmed: true,
        memberNames: [],
        explicitCount: total != null || additional > 0,
      };
    }

    if (!leftIsTitleOnly && !rightIsTitleOnly) {
      const [leftName, rightName] = shareSurname(rawLeft, rawRight);
      return {
        ...base,
        partyType: "COUPLE",
        partySize: Math.max(2, total ?? 2 + additional),
        allowanceConfirmed: true,
        memberNames: [leftName, rightName],
        explicitCount: total != null || additional > 0,
      };
    }
  }

  // ── Individual with guests: "Kofi Boateng +1" ──
  if (additional > 0) {
    return {
      ...base,
      partyType: "PLUS_GUEST",
      partySize: Math.max(2, total ?? 1 + additional),
      allowanceConfirmed: true,
      memberNames: [],
      explicitCount: true,
    };
  }

  // ── Individual with an explicit count: "Kofi Boateng (3)" ──
  if (total != null && total > 1) {
    return {
      ...base,
      partyType: "PLUS_GUEST",
      partySize: total,
      allowanceConfirmed: true,
      explicitCount: true,
    };
  }

  return base;
}

/** Split a "members" cell into individual names. */
export function parseMemberNames(input: string | null | undefined): string[] {
  if (!input?.trim()) return [];
  return input
    .split(/[;,/]|\s+&\s+|\s+\band\b\s+/i)
    .map((part) => cleanName(part))
    .filter((part) => part.length > 0)
    .slice(0, 50);
}

const PARTY_TYPE_ALIASES: Record<string, GuestPartyType> = {
  individual: "INDIVIDUAL",
  single: "INDIVIDUAL",
  solo: "INDIVIDUAL",
  one: "INDIVIDUAL",
  couple: "COUPLE",
  pair: "COUPLE",
  two: "COUPLE",
  "plus one": "PLUS_GUEST",
  plusone: "PLUS_GUEST",
  "plus guest": "PLUS_GUEST",
  "+1": "PLUS_GUEST",
  guest: "PLUS_GUEST",
  family: "FAMILY",
  household: "FAMILY",
  group: "GROUP",
  team: "GROUP",
  table: "GROUP",
  organisation: "GROUP",
  organization: "GROUP",
  company: "GROUP",
};

/** Read an explicit type column, if the organiser supplied one. */
export function parsePartyType(input: string | null | undefined): GuestPartyType | null {
  const key = input?.trim().toLowerCase();
  if (!key) return null;
  return PARTY_TYPE_ALIASES[key] ?? null;
}

/** Types whose allowance is meaningless until an organiser confirms it. */
export function requiresConfirmedAllowance(type: GuestPartyType): boolean {
  return type === "FAMILY" || type === "GROUP";
}
