import { inflateRawSync } from "node:zlib";
import type { ParsedTable } from "./types";
import { looksLikeHeaderRow } from "./table-parse";

/**
 * Minimal, dependency-free XLSX reader.
 *
 * An .xlsx is a ZIP of XML parts. Reading the handful we need (shared strings
 * plus the first worksheet) is a few hundred lines, and keeping it in-tree
 * avoids pulling a large spreadsheet library — with its own parser surface —
 * into a path that accepts organiser uploads. Runs server-side only: the file
 * is posted to the API and parsed in Node, so nothing lands in the client bundle.
 *
 * Deliberately out of scope: formulas (the cached value is used), styles, and
 * date serial conversion. Guest lists are text; a cell that is genuinely a
 * date is surfaced as its raw value for the organiser to see in the preview.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const MAX_ENTRIES = 512;

interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

export class XlsxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XlsxParseError";
  }
}

/** Locate the End Of Central Directory record, scanning back over any comment. */
function findEndOfCentralDirectory(buf: Buffer): number {
  const minOffset = Math.max(0, buf.length - 0xffff - 22);
  for (let i = buf.length - 22; i >= minOffset; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) return i;
  }
  throw new XlsxParseError("Not a valid .xlsx file (no ZIP directory found).");
}

function readCentralDirectory(buf: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(buf);
  const entryCount = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);

  const entries: ZipEntry[] = [];
  for (let i = 0; i < entryCount && i < MAX_ENTRIES; i++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== CENTRAL_SIGNATURE) break;

    const compressionMethod = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const uncompressedSize = buf.readUInt32LE(offset + 24);
    const nameLength = buf.readUInt16LE(offset + 28);
    const extraLength = buf.readUInt16LE(offset + 30);
    const commentLength = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString("utf8", offset + 46, offset + 46 + nameLength);

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function readEntry(buf: Buffer, entry: ZipEntry): string {
  const lho = entry.localHeaderOffset;
  if (lho + 30 > buf.length) throw new XlsxParseError("Corrupt .xlsx: truncated entry.");

  const nameLength = buf.readUInt16LE(lho + 26);
  const extraLength = buf.readUInt16LE(lho + 28);
  const start = lho + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (end > buf.length) throw new XlsxParseError("Corrupt .xlsx: entry runs past end of file.");

  const slice = buf.subarray(start, end);
  if (entry.compressionMethod === 0) return slice.toString("utf8");
  if (entry.compressionMethod === 8) return inflateRawSync(slice).toString("utf8");
  throw new XlsxParseError(
    `Unsupported compression in .xlsx (method ${entry.compressionMethod}). Re-save the file from Excel or Google Sheets.`
  );
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

export function decodeXmlText(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith("#")) {
      const code = parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

/** Concatenate every `<t>` run inside one shared-string item. */
function extractTextRuns(xml: string): string {
  let out = "";
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) out += decodeXmlText(match[1] ?? "");
  return out;
}

export function parseSharedStrings(xml: string): string[] {
  const items: string[] = [];
  const re = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>|<si(?:\s[^>]*)?\/>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) items.push(extractTextRuns(match[1] ?? ""));
  return items;
}

/** "AB12" → 27 (zero-based column index). */
export function columnIndexFromRef(ref: string): number {
  let index = 0;
  for (const ch of ref) {
    const code = ch.charCodeAt(0);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  return Math.max(0, index - 1);
}

/** Turn one worksheet's XML into a rectangular grid of strings. */
export function parseWorksheet(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  const rowRe = /<row(?:\s[^>]*)?>([\s\S]*?)<\/row>|<row(?:\s[^>]*)?\/>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRe.exec(xml)) !== null) {
    const body = rowMatch[1] ?? "";
    const cells: string[] = [];

    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(body)) !== null) {
      const attrs = cellMatch[1] ?? "";
      const content = cellMatch[2] ?? "";

      const refMatch = /\br="([A-Z]+)\d+"/.exec(attrs);
      const columnIndex = refMatch ? columnIndexFromRef(refMatch[1]) : cells.length;
      const typeMatch = /\bt="([^"]+)"/.exec(attrs);
      const type = typeMatch?.[1] ?? "n";

      let value = "";
      if (type === "inlineStr") {
        value = extractTextRuns(content);
      } else {
        const vMatch = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(content);
        const raw = vMatch ? decodeXmlText(vMatch[1]) : "";
        if (type === "s") {
          const index = Number(raw);
          value = Number.isInteger(index) ? (sharedStrings[index] ?? "") : "";
        } else if (type === "b") {
          value = raw === "1" ? "TRUE" : raw === "0" ? "FALSE" : raw;
        } else if (type === "e") {
          // A cell holding #REF!/#N/A carries no guest data — treat as blank.
          value = "";
        } else {
          value = raw;
        }
      }

      while (cells.length < columnIndex) cells.push("");
      cells[columnIndex] = value.trim();
    }

    rows.push(cells);
  }

  return rows;
}

/** Resolve the first worksheet part, honouring workbook order when available. */
function resolveFirstSheetPath(entries: ZipEntry[], buf: Buffer): string {
  const byName = new Map(entries.map((e) => [e.name, e]));
  const workbook = byName.get("xl/workbook.xml");
  const rels = byName.get("xl/_rels/workbook.xml.rels");

  if (workbook && rels) {
    const sheetMatch = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(readEntry(buf, workbook));
    if (sheetMatch) {
      const relsXml = readEntry(buf, rels);
      const relRe = new RegExp(`<Relationship\\b[^>]*Id="${sheetMatch[1]}"[^>]*>`);
      const rel = relRe.exec(relsXml)?.[0];
      const target = rel ? /Target="([^"]+)"/.exec(rel)?.[1] : undefined;
      if (target) {
        const normalized = target.startsWith("/")
          ? target.slice(1)
          : target.startsWith("xl/")
            ? target
            : `xl/${target.replace(/^\.\//, "")}`;
        if (byName.has(normalized)) return normalized;
      }
    }
  }

  if (byName.has("xl/worksheets/sheet1.xml")) return "xl/worksheets/sheet1.xml";

  const anySheet = entries
    .filter((e) => /^xl\/worksheets\/[^/]+\.xml$/.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }))[0];
  if (anySheet) return anySheet.name;

  throw new XlsxParseError("This .xlsx has no worksheets.");
}

/** Read the first worksheet of an .xlsx into a header-aware table. */
export function parseXlsx(buffer: Buffer): ParsedTable {
  const entries = readCentralDirectory(buffer);
  if (entries.length === 0) {
    throw new XlsxParseError("Not a valid .xlsx file (empty archive).");
  }

  const byName = new Map(entries.map((e) => [e.name, e]));
  const sharedEntry = byName.get("xl/sharedStrings.xml");
  const sharedStrings = sharedEntry ? parseSharedStrings(readEntry(buffer, sharedEntry)) : [];

  const sheetPath = resolveFirstSheetPath(entries, buffer);
  const grid = parseWorksheet(readEntry(buffer, byName.get(sheetPath)!), sharedStrings);

  const nonEmpty = grid.filter((r) => r.some((c) => c.trim().length > 0));
  if (nonEmpty.length === 0) return { headers: null, rows: [], columnCount: 0 };

  const hasHeader = looksLikeHeaderRow(nonEmpty[0], nonEmpty[1]);
  const headers = hasHeader ? nonEmpty[0].map((c) => c.trim()) : null;
  const body = hasHeader ? nonEmpty.slice(1) : nonEmpty;

  const columnCount = Math.max(headers?.length ?? 0, ...body.map((r) => r.length), 1);
  const rows = body.map((r) => {
    const padded = r.slice(0, columnCount);
    while (padded.length < columnCount) padded.push("");
    return padded;
  });

  return { headers, rows, columnCount };
}

/** True when the bytes start with the ZIP local-file signature ("PK\x03\x04"). */
export function looksLikeXlsx(buffer: Buffer): boolean {
  return (
    buffer.length > 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  );
}
