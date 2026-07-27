import { ImportField, type ColumnMapping, type ParsedTable } from "./types";
import { normalizeGhanaPhone, normalizeEmail } from "./contact";
import { parsePartyType } from "./name";

/**
 * Smart column detection.
 *
 * Two independent signals are combined: what the header says, and what the
 * data underneath actually looks like. Content wins where they disagree,
 * because a column headed "Contact" holding email addresses is an email
 * column no matter what it is called — and because pasted lists often have no
 * header at all.
 *
 * Every result is a *suggestion*. The mapping UI shows it, the organiser
 * confirms it, and only the confirmed mapping is ever imported.
 */

interface HeaderRule {
  field: ImportField;
  /** Exact header matches (normalised) — strongest signal. */
  exact: string[];
  /** Substring matches — weaker. */
  contains: string[];
}

const HEADER_RULES: HeaderRule[] = [
  {
    field: ImportField.NAME,
    exact: ["name", "guest", "guests", "guest name", "full name", "fullname", "invitee", "invitation name", "invited", "attendee", "person", "names"],
    contains: ["guest name", "full name", "invitee", "recipient", "name"],
  },
  {
    field: ImportField.EMAIL,
    exact: ["email", "e-mail", "email address", "mail", "e mail"],
    contains: ["email", "e-mail"],
  },
  {
    field: ImportField.PHONE,
    exact: ["phone", "phone number", "mobile", "mobile number", "tel", "telephone", "whatsapp", "msisdn", "cell", "contact number"],
    contains: ["phone", "mobile", "whatsapp", "tel", "cell", "msisdn"],
  },
  {
    field: ImportField.PARTY_SIZE,
    exact: ["party size", "party", "pax", "seats", "allowance", "guests allowed", "headcount", "head count", "no of guests", "number of guests", "plus ones", "plus one", "size", "qty", "quantity"],
    contains: ["party size", "pax", "allowance", "head count", "headcount", "plus one", "no. of guest", "seats"],
  },
  {
    field: ImportField.PARTY_TYPE,
    exact: ["type", "invitation type", "guest type", "category", "party type"],
    contains: ["invite type", "guest type", "party type"],
  },
  {
    field: ImportField.MEMBER_NAMES,
    exact: ["members", "member names", "party members", "accompanying", "companions", "attendees"],
    contains: ["member", "companion", "accompany"],
  },
  {
    field: ImportField.GROUP_NAME,
    exact: ["group", "group name", "side", "family group", "organisation", "organization", "company"],
    contains: ["group", "organisation", "organization"],
  },
  {
    field: ImportField.TABLE_NUMBER,
    exact: ["table", "table number", "table no", "table #"],
    contains: ["table"],
  },
  {
    field: ImportField.SEAT_LABEL,
    exact: ["seat", "seat label", "seat number", "seat no", "chair"],
    contains: ["seat"],
  },
  {
    field: ImportField.NOTES,
    exact: ["notes", "note", "remarks", "comment", "comments", "dietary", "special requests"],
    contains: ["note", "remark", "comment", "dietary"],
  },
];

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/[^a-z0-9\s#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Header-only score for one column, 0 when nothing matches. */
export function scoreHeader(header: string): { field: ImportField; score: number } | null {
  const normalized = normalizeHeader(header);
  if (!normalized) return null;

  for (const rule of HEADER_RULES) {
    if (rule.exact.includes(normalized)) return { field: rule.field, score: 100 };
  }
  for (const rule of HEADER_RULES) {
    if (rule.contains.some((needle) => normalized.includes(needle))) {
      return { field: rule.field, score: 60 };
    }
  }
  return null;
}

/** Content-only score, from a sample of the column's non-empty values. */
export function scoreContent(values: string[]): { field: ImportField; score: number } | null {
  const sample = values.map((v) => v.trim()).filter(Boolean).slice(0, 50);
  if (sample.length === 0) return null;

  const ratio = (predicate: (v: string) => boolean) =>
    sample.filter(predicate).length / sample.length;

  const emailRatio = ratio((v) => !normalizeEmail(v).invalid && v.includes("@"));
  if (emailRatio >= 0.6) return { field: ImportField.EMAIL, score: Math.round(70 + 30 * emailRatio) };

  const phoneRatio = ratio((v) => {
    const digits = v.replace(/\D+/g, "");
    if (digits.length < 7 || digits.length > 15) return false;
    // Mostly digits and phone punctuation — not a name that happens to have a number.
    return /^[\s+()\-.\d]+$/.test(v) && !normalizeGhanaPhone(v).invalid;
  });
  if (phoneRatio >= 0.6) return { field: ImportField.PHONE, score: Math.round(70 + 30 * phoneRatio) };

  const smallIntRatio = ratio((v) => /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 30);
  if (smallIntRatio >= 0.8) return { field: ImportField.PARTY_SIZE, score: 55 };

  const typeRatio = ratio((v) => parsePartyType(v) != null);
  if (typeRatio >= 0.7) return { field: ImportField.PARTY_TYPE, score: 65 };

  // Two-to-four word text with letters and no @ or long digit runs → a name.
  const nameRatio = ratio((v) => {
    if (v.includes("@") || /\d{4,}/.test(v)) return false;
    const words = v.split(/\s+/).filter(Boolean);
    return words.length >= 1 && words.length <= 8 && /[A-Za-z]{2,}/.test(v);
  });
  if (nameRatio >= 0.7) return { field: ImportField.NAME, score: 45 };

  return null;
}

export interface ColumnSuggestion {
  index: number;
  header: string | null;
  field: ImportField;
  confidence: number;
  sample: string[];
}

/**
 * Suggest a mapping for every column.
 *
 * Each field is claimed by at most one column (the highest scorer), so a sheet
 * with both "Name" and "Nickname" cannot map two columns onto `name` and
 * silently drop one. Losers fall back to `ignore` — except an unclaimed name
 * column, which is the one field an import cannot proceed without.
 */
export function suggestColumnMapping(table: ParsedTable): ColumnSuggestion[] {
  const columnCount = table.columnCount;
  const candidates: { index: number; field: ImportField; score: number }[] = [];

  for (let index = 0; index < columnCount; index++) {
    const header = table.headers?.[index] ?? null;
    const values = table.rows.map((r) => r[index] ?? "");

    const headerGuess = header ? scoreHeader(header) : null;
    const contentGuess = scoreContent(values);

    if (headerGuess && contentGuess && headerGuess.field !== contentGuess.field) {
      // Trust content when it is confident; a header can be a leftover label.
      const winner = contentGuess.score >= 70 ? contentGuess : headerGuess;
      candidates.push({ index, ...winner });
    } else if (headerGuess) {
      candidates.push({
        index,
        field: headerGuess.field,
        score: headerGuess.score + (contentGuess?.field === headerGuess.field ? 20 : 0),
      });
    } else if (contentGuess) {
      candidates.push({ index, ...contentGuess });
    }
  }

  const claimed = new Map<ImportField, number>();
  for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
    const existing = claimed.get(candidate.field);
    if (existing == null) claimed.set(candidate.field, candidate.index);
  }

  const byIndex = new Map<number, { field: ImportField; score: number }>();
  for (const [field, index] of claimed) {
    const candidate = candidates.find((c) => c.index === index && c.field === field);
    byIndex.set(index, { field, score: candidate?.score ?? 0 });
  }

  // No column won `name`: fall back to the leftmost text-bearing column, so a
  // single-column paste of bare names always imports.
  if (!claimed.has(ImportField.NAME)) {
    for (let index = 0; index < columnCount; index++) {
      if (byIndex.has(index)) continue;
      const values = table.rows.map((r) => (r[index] ?? "").trim()).filter(Boolean);
      if (values.length === 0) continue;
      if (values.some((v) => /[A-Za-z]{2,}/.test(v))) {
        byIndex.set(index, { field: ImportField.NAME, score: 30 });
        break;
      }
    }
  }

  return Array.from({ length: columnCount }, (_, index) => {
    const resolved = byIndex.get(index);
    return {
      index,
      header: table.headers?.[index] ?? null,
      field: resolved?.field ?? ImportField.IGNORE,
      confidence: resolved?.score ?? 0,
      sample: table.rows
        .slice(0, 3)
        .map((r) => (r[index] ?? "").trim())
        .filter(Boolean),
    };
  });
}

export function mappingFromSuggestions(suggestions: ColumnSuggestion[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const suggestion of suggestions) mapping[suggestion.index] = suggestion.field;
  return mapping;
}

/** Reject a mapping that cannot produce guests, or that double-books a field. */
export function validateMapping(mapping: ColumnMapping): { valid: boolean; error?: string } {
  const fields = Object.values(mapping).filter((f) => f !== ImportField.IGNORE);
  if (!fields.includes(ImportField.NAME)) {
    return { valid: false, error: "Map one column to the guest name — it is the only required field." };
  }
  const seen = new Set<ImportField>();
  for (const field of fields) {
    if (seen.has(field)) {
      return { valid: false, error: `Two columns are mapped to "${field}". Each field can take only one column.` };
    }
    seen.add(field);
  }
  return { valid: true };
}
