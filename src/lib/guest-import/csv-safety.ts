/**
 * CSV injection defence.
 *
 * A guest called `=cmd|'/c calc'!A1` is not a guest — it is a payload aimed at
 * whoever opens the organiser's exported list in Excel or Sheets, which will
 * happily evaluate a leading `=`, `+`, `-`, `@`, tab or carriage return as a
 * formula. Both directions are covered:
 *
 *  - `sanitizeImportedCell` strips the trigger on the way *in*, so the stored
 *    guest name is inert everywhere it is later rendered or re-exported.
 *  - `escapeCsvValue` prefixes a single quote on the way *out*, the standard
 *    OWASP mitigation, and quotes anything containing a delimiter.
 */

const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

/** True when a spreadsheet would treat this value as a formula. */
export function isFormulaLike(value: string): boolean {
  if (!value) return false;
  return FORMULA_TRIGGERS.some((trigger) => value.startsWith(trigger));
}

/**
 * Strip formula triggers from an imported cell.
 *
 * Repeats until stable so `==@=name` cannot survive a single pass, and keeps a
 * genuine negative number intact (`-2` in a party-size column is data, not an
 * attack) by only stripping when a letter, quote or pipe follows the trigger.
 */
export function sanitizeImportedCell(value: string): { value: string; stripped: boolean } {
  let result = value;
  let stripped = false;

  for (let i = 0; i < 8; i++) {
    if (!isFormulaLike(result)) break;
    const head = result[0];
    if ((head === "-" || head === "+") && /^[+-]?\d/.test(result)) break;
    result = result.slice(1).replace(/^\s+/, "");
    stripped = true;
  }

  // Embedded control characters break CSV round-trips and terminal output.
  const cleaned = result.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (cleaned !== result) stripped = true;

  return { value: cleaned, stripped };
}

/** Quote and neutralise one value for a CSV the organiser will download. */
export function escapeCsvValue(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  if (text === "") return "";

  const guarded = isFormulaLike(text) ? `'${text}` : text;
  if (/[",;\n\r\t]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

/** Build a CSV document with a UTF-8 BOM so Excel reads accents correctly. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const body = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
  return `\ufeff${body}\r\n`;
}
