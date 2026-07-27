import type { GuestImportSource } from "@prisma/client";
import { MAX_IMPORT_ROWS, type ParsedTable } from "./types";
import { parseLines, parseTable, sniffDelimiter } from "./table-parse";
import { looksLikeXlsx, parseXlsx, XlsxParseError } from "./xlsx";

/**
 * One entry point for every way an organiser can hand us a guest list.
 *
 * Format is detected from the bytes, not the file extension, so a `.csv` that
 * is really an Excel export (or the reverse — a common outcome of "Save As")
 * still parses instead of importing one row of binary noise.
 */

export class ImportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportParseError";
  }
}

export interface ParseResult extends ParsedTable {
  source: GuestImportSource;
  /** True when the row cap trimmed the list. */
  truncated: boolean;
}

function capRows(table: ParsedTable, source: GuestImportSource): ParseResult {
  const truncated = table.rows.length > MAX_IMPORT_ROWS;
  return {
    ...table,
    rows: truncated ? table.rows.slice(0, MAX_IMPORT_ROWS) : table.rows,
    source,
    truncated,
  };
}

/** Parse pasted text — one name per line, or a delimited/tab-pasted table. */
export function parsePastedText(text: string): ParseResult {
  if (!text.trim()) throw new ImportParseError("Paste at least one guest name.");

  const delimiter = sniffDelimiter(text);
  const table = parseTable(text, delimiter);

  // A single column means it was really a name-per-line paste; re-parse that
  // way so quoting rules never split "Mensah, Kofi" into two guests.
  if (table.columnCount <= 1) {
    const lines = parseLines(text);
    return capRows(lines, "PASTE_LINES");
  }

  return capRows(table, delimiter === "\t" ? "PASTE_TABLE" : "PASTE_TABLE");
}

/** Parse an uploaded file by sniffing its bytes. */
export function parseUploadedFile(buffer: Buffer, fileName?: string): ParseResult {
  if (buffer.length === 0) throw new ImportParseError("That file is empty.");

  if (looksLikeXlsx(buffer)) {
    try {
      return capRows(parseXlsx(buffer), "XLSX");
    } catch (error) {
      if (error instanceof XlsxParseError) throw new ImportParseError(error.message);
      throw new ImportParseError(
        "That spreadsheet could not be read. Re-save it as .xlsx or .csv and try again."
      );
    }
  }

  // Reject formats we cannot read rather than importing mojibake.
  const lower = fileName?.toLowerCase() ?? "";
  if (lower.endsWith(".xls")) {
    throw new ImportParseError(
      "Legacy .xls files are not supported. Open it and save as .xlsx or .csv."
    );
  }
  if (lower.endsWith(".numbers") || lower.endsWith(".ods") || lower.endsWith(".pdf")) {
    throw new ImportParseError("Export this file to .csv or .xlsx and upload it again.");
  }

  const text = buffer.toString("utf8");
  // A binary file decoded as UTF-8 is full of replacement characters.
  const replacementRatio = (text.match(/\uFFFD/g)?.length ?? 0) / Math.max(1, text.length);
  if (replacementRatio > 0.02) {
    throw new ImportParseError(
      "That file is not readable as text. Upload a .csv or .xlsx guest list."
    );
  }

  const table = parseTable(text);
  if (table.rows.length === 0) throw new ImportParseError("No guest rows found in that file.");
  return capRows(table, "CSV");
}

/** Parse manually-entered rows from the in-app editor. */
export function parseManualRows(
  rows: { name: string; email?: string; phone?: string; partySize?: number | string; notes?: string }[]
): ParseResult {
  const headers = ["Name", "Email", "Phone", "Party size", "Notes"];
  const body = rows.map((r) => [
    r.name ?? "",
    r.email ?? "",
    r.phone ?? "",
    r.partySize == null ? "" : String(r.partySize),
    r.notes ?? "",
  ]);
  return capRows(
    { headers, rows: body, columnCount: headers.length },
    "MANUAL"
  );
}
