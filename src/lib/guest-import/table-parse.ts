import type { ParsedTable } from "./types";

/**
 * Delimited-text parsing for bulk guest import.
 *
 * RFC 4180 quoting with the real-world tolerances a guest list needs:
 * a UTF-8 BOM from Excel, CRLF or CR line endings, an unterminated final
 * quote, and semicolon/tab/pipe separators (a Ghanaian organiser exporting
 * from a locale-set Excel gets semicolons, and a spreadsheet copy-paste gets
 * tabs). The delimiter is sniffed rather than assumed so "Mensah, Kofi" in a
 * tab-pasted list is not silently split into two guests.
 */

const CANDIDATE_DELIMITERS = [",", ";", "\t", "|"] as const;

export type Delimiter = (typeof CANDIDATE_DELIMITERS)[number];

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Pick the delimiter that yields the most *consistent* column count across the
 * first sample of lines. Consistency beats raw frequency: a list of full names
 * containing "Nana Ama, Osei" would otherwise crown the comma on count alone.
 */
export function sniffDelimiter(text: string, sampleLines = 20): Delimiter {
  const lines = stripBom(text)
    .split(/\r\n|\r|\n/)
    .filter((l) => l.trim().length > 0)
    .slice(0, sampleLines);

  if (lines.length === 0) return ",";

  let best: { delimiter: Delimiter; score: number } = { delimiter: ",", score: -1 };

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const counts = lines.map((line) => splitLineRespectingQuotes(line, delimiter).length);
    const max = Math.max(...counts);
    if (max < 2) continue;

    const modal = counts.filter((c) => c === max).length / counts.length;
    // Reward both "splits into several columns" and "splits the same way every
    // time"; the second term breaks ties toward the structurally real one.
    const score = max * modal * modal;
    if (score > best.score) best = { delimiter, score };
  }

  return best.score > 0 ? best.delimiter : ",";
}

/** Fast, quote-aware split used only for sniffing. */
function splitLineRespectingQuotes(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(field);
      field = "";
    } else field += ch;
  }
  out.push(field);
  return out;
}

/** Full RFC 4180 parse, including quoted fields that span line breaks. */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const source = stripBom(text);
  const sep = delimiter ?? sniffDelimiter(source);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldWasQuoted = false;

  const pushField = () => {
    // A quoted field keeps its inner whitespace verbatim; an unquoted one is
    // trimmed, because spreadsheet exports pad columns generously.
    row.push(fieldWasQuoted ? field : field.trim());
    field = "";
    fieldWasQuoted = false;
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];

    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }

    if (ch === '"' && field.length === 0) {
      inQuotes = true;
      fieldWasQuoted = true;
      continue;
    }

    if (ch === sep) {
      pushField();
      continue;
    }

    if (ch === "\r") {
      // Swallow CRLF as one break; a lone CR (classic Mac export) also ends the row.
      if (source[i + 1] === "\n") i++;
      pushRow();
      continue;
    }

    if (ch === "\n") {
      pushRow();
      continue;
    }

    field += ch;
  }

  // Trailing content (or a file that simply does not end in a newline).
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

const HEADER_HINTS = [
  "name",
  "guest",
  "invitee",
  "invitation",
  "full name",
  "fullname",
  "email",
  "e-mail",
  "mail",
  "phone",
  "mobile",
  "tel",
  "contact",
  "whatsapp",
  "party",
  "pax",
  "seats",
  "allowance",
  "plus",
  "table",
  "seat",
  "group",
  "category",
  "type",
  "notes",
  "remarks",
  "title",
];

/**
 * Decide whether row 0 is a header.
 *
 * A header is short, non-numeric, has no duplicate blanks, and — decisively —
 * either matches known field words or looks nothing like the rows beneath it.
 * Getting this wrong costs a real guest, so ambiguity resolves to "no header"
 * and the mapping UI asks the organiser.
 */
export function looksLikeHeaderRow(row: string[], nextRow?: string[]): boolean {
  const cells = row.map((c) => c.trim().toLowerCase()).filter(Boolean);
  if (cells.length === 0) return false;

  const hintHits = cells.filter((c) =>
    HEADER_HINTS.some((h) => c === h || c.includes(h))
  ).length;
  if (hintHits === 0) return false;

  // A cell that carries data (an email, a digit run, a long free-text value)
  // disqualifies the row no matter how many hint words sit beside it.
  const looksLikeData = cells.some(
    (c) => c.includes("@") || /\d{4,}/.test(c) || c.length > 40
  );
  if (looksLikeData) return false;

  // Majority-hint headers are unambiguous.
  if (hintHits / cells.length >= 0.5) return true;

  // Otherwise require the next row to look materially different (i.e. carry data).
  if (!nextRow) return false;
  const nextCells = nextRow.map((c) => c.trim().toLowerCase()).filter(Boolean);
  return nextCells.some((c) => c.includes("@") || /\d{3,}/.test(c));
}

/** Parse delimited text into a header-aware table with rectangular rows. */
export function parseTable(text: string, delimiter?: string): ParsedTable {
  const sep = delimiter ?? sniffDelimiter(text);
  const raw = parseDelimited(text, sep);
  if (raw.length === 0) return { headers: null, rows: [], columnCount: 0, delimiter: sep };

  const hasHeader = looksLikeHeaderRow(raw[0], raw[1]);
  const headers = hasHeader ? raw[0].map((c) => c.trim()) : null;
  const body = hasHeader ? raw.slice(1) : raw;

  const columnCount = Math.max(headers?.length ?? 0, ...body.map((r) => r.length), 1);
  const rows = body.map((r) => {
    const padded = r.slice(0, columnCount);
    while (padded.length < columnCount) padded.push("");
    return padded;
  });

  return { headers, rows, columnCount, delimiter: sep };
}

/** Fragment separators inside a single pasted line, WhatsApp dumps included. */
const LINE_FRAGMENT_SEPARATOR = /\s*(?:[,;|\t]|:|\s[-–—]\s)\s*/;

/** An addr-spec, not a name that happens to contain an "at". */
const LINE_EMAIL = /^[^\s@,;<>()[\]\\]+@[^\s@,;<>()[\]\\]+\.[A-Za-z]{2,}$/;

/**
 * A dialable number and nothing else. The digit floor keeps "+1" and "(8)" —
 * which mean "plus one guest" and "a party of eight" — out of the phone column.
 */
function looksLikePhoneFragment(value: string): boolean {
  if (!/^[+\s()\-.\d]+$/.test(value)) return false;
  const digits = value.replace(/\D+/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Pull an email and a phone out of one pasted line, if it carries them.
 *
 * Returns `null` when the line is only a name, so the overwhelmingly common
 * paste — bare names — keeps its single-column shape. Fragments that are
 * neither an email nor a phone are rejoined as the name, which is what keeps
 * "Mensah, Kofi" one guest called "Mensah, Kofi" rather than a surname and an
 * orphaned first name.
 */
function splitLineContacts(
  line: string
): { name: string; email: string; phone: string } | null {
  const parts = line.split(LINE_FRAGMENT_SEPARATOR).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const nameParts: string[] = [];
  let email = "";
  let phone = "";

  for (const part of parts) {
    if (!email && LINE_EMAIL.test(part)) email = part.toLowerCase();
    else if (!phone && looksLikePhoneFragment(part)) phone = part;
    else nameParts.push(part);
  }

  if (!email && !phone) return null;
  return { name: nameParts.join(", "), email, phone };
}

/**
 * One-guest-per-line paste.
 *
 * Blank lines are skipped. A line is kept whole unless it carries an email or
 * a phone number, because a delimiter inside a name is far more common than a
 * delimited table pasted without one: "Kofi Mensah, +2 guests" must stay one
 * invitation, while "Kwabena Osei, kwabena@example.com, 0244123456" is plainly
 * a guest and their contact details.
 */
export function parseLines(text: string): ParsedTable {
  const lines = stripBom(text)
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const split = lines.map((line) => splitLineContacts(line));
  if (split.every((s) => s == null)) {
    return { headers: null, rows: lines.map((l) => [l]), columnCount: 1 };
  }

  const rows = lines.map((line, index) => {
    const contact = split[index];
    return contact ? [contact.name, contact.email, contact.phone] : [line, "", ""];
  });

  // Headers stay null: the paste had none, and inventing them would send the
  // organiser to the column-matching step for a list they simply typed out.
  return { headers: null, rows, columnCount: 3 };
}
