import type { GuestPartyType } from "@prisma/client";
import {
  ImportField,
  RowIssueCode,
  type ColumnMapping,
  type ImportOptions,
  type NormalizedRow,
  type RowIssue,
} from "./types";
import type { ParsedTable } from "./types";
import { normalizeEmail, normalizePhone } from "./contact";
import {
  analyseName,
  cleanName,
  parseMemberNames,
  parsePartyType,
  requiresConfirmedAllowance,
} from "./name";
import { sanitizeImportedCell } from "./csv-safety";

/**
 * Mapping + normalisation: source cells → reviewable rows.
 *
 * Only a missing or unusable name makes a row INVALID. Everything else — a
 * malformed email, an implausible phone, an unconfirmed family allowance —
 * downgrades to NEEDS_REVIEW so the guest is never lost, just questioned.
 */

const NAME_MAX_LENGTH = 200;
const HEADER_LOOKALIKES = new Set([
  "name", "names", "guest", "guests", "guest name", "full name", "fullname",
  "invitee", "attendee", "email", "phone", "n/a", "na", "-", "--", "tbd", "tba",
  "unknown", "test",
]);

function cell(row: string[], mapping: ColumnMapping, field: ImportField): string {
  for (const [index, mapped] of Object.entries(mapping)) {
    if (mapped === field) return (row[Number(index)] ?? "").trim();
  }
  return "";
}

function parsePositiveInt(value: string): number | null {
  const match = /^\s*(\d{1,4})\s*$/.exec(value);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Map, sanitise and validate a single source row. */
export function normalizeRow(
  row: string[],
  rowIndex: number,
  mapping: ColumnMapping,
  options: ImportOptions
): NormalizedRow {
  const issues: RowIssue[] = [];
  const raw = [...row];

  // ── Name (the only required field) ──
  const rawName = cell(row, mapping, ImportField.NAME);
  const sanitizedName = sanitizeImportedCell(rawName);
  if (sanitizedName.stripped && rawName.trim()) {
    issues.push({
      code: RowIssueCode.FORMULA_STRIPPED,
      severity: "warning",
      field: ImportField.NAME,
      message: "A leading spreadsheet formula character was removed from this name.",
    });
  }

  let name = cleanName(sanitizedName.value);
  if (name.length > NAME_MAX_LENGTH) {
    name = name.slice(0, NAME_MAX_LENGTH).trim();
    issues.push({
      code: RowIssueCode.NAME_TRUNCATED,
      severity: "warning",
      field: ImportField.NAME,
      message: `Name shortened to ${NAME_MAX_LENGTH} characters.`,
    });
  }

  let invalid = false;
  if (!name) {
    issues.push({
      code: RowIssueCode.MISSING_NAME,
      severity: "error",
      field: ImportField.NAME,
      message: "A guest name is required. Add a name or remove this row.",
    });
    invalid = true;
  } else if (name.replace(/[^A-Za-z0-9]/g, "").length < 2) {
    issues.push({
      code: RowIssueCode.NAME_TOO_SHORT,
      severity: "error",
      field: ImportField.NAME,
      message: "This name is too short to print on an invitation.",
    });
    invalid = true;
  } else if (HEADER_LOOKALIKES.has(name.toLowerCase())) {
    issues.push({
      code: RowIssueCode.NAME_LOOKS_LIKE_HEADER,
      severity: "warning",
      field: ImportField.NAME,
      message: "This looks like a column heading rather than a guest.",
    });
  }

  // ── Party type & allowance ──
  const analysis = analyseName(name, options.defaultPartySize);
  const explicitType = parsePartyType(cell(row, mapping, ImportField.PARTY_TYPE));
  const partyType: GuestPartyType = explicitType ?? analysis.partyType;

  const explicitSizeCell = cell(row, mapping, ImportField.PARTY_SIZE);
  const explicitSize = explicitSizeCell ? parsePositiveInt(explicitSizeCell) : null;
  if (explicitSizeCell && explicitSize == null) {
    issues.push({
      code: RowIssueCode.PARTY_SIZE_INVALID,
      severity: "warning",
      field: ImportField.PARTY_SIZE,
      message: `"${explicitSizeCell}" is not a whole number — using ${analysis.partySize} instead.`,
    });
  }

  const memberNames = parseMemberNames(cell(row, mapping, ImportField.MEMBER_NAMES));
  const combinedMembers = memberNames.length > 0 ? memberNames : analysis.memberNames;
  const tagLabels = parseMemberNames(cell(row, mapping, ImportField.TAGS)).slice(0, 10);

  let partySize = explicitSize ?? Math.max(analysis.partySize, combinedMembers.length || 1);
  let allowanceConfirmed = explicitSize != null || analysis.allowanceConfirmed;

  if (partySize > options.maxPartySize) {
    issues.push({
      code: RowIssueCode.PARTY_SIZE_CAPPED,
      severity: "warning",
      field: ImportField.PARTY_SIZE,
      message: `Party allowance capped at ${options.maxPartySize}. Raise the limit in import settings if this is right.`,
    });
    partySize = options.maxPartySize;
    allowanceConfirmed = false;
  }
  partySize = Math.max(1, partySize);

  if (requiresConfirmedAllowance(partyType) && !allowanceConfirmed) {
    issues.push({
      code: RowIssueCode.ALLOWANCE_NEEDS_CONFIRMATION,
      severity: "warning",
      field: ImportField.PARTY_SIZE,
      message:
        partyType === "FAMILY"
          ? "Confirm how many people this family invitation admits."
          : "Confirm how many people this group invitation admits.",
    });
  } else if (!explicitType && partyType !== "INDIVIDUAL") {
    issues.push({
      code: RowIssueCode.TYPE_SUGGESTED,
      severity: "info",
      field: ImportField.PARTY_TYPE,
      message: `Detected as ${partyType.toLowerCase().replace("_", " ")} admitting ${partySize}.`,
    });
  }

  // ── Optional contact ──
  const emailResult = options.validateEmails
    ? normalizeEmail(cell(row, mapping, ImportField.EMAIL))
    : { value: cell(row, mapping, ImportField.EMAIL).trim().toLowerCase() || null, invalid: false };
  if (emailResult.invalid) {
    issues.push({
      code: RowIssueCode.INVALID_EMAIL,
      severity: "warning",
      field: ImportField.EMAIL,
      message: "This email address does not look valid — the invitation will not be emailed.",
    });
  }

  const phoneResult = normalizePhone(
    cell(row, mapping, ImportField.PHONE),
    options.normalizeGhanaPhones
  );
  if (phoneResult.invalid) {
    issues.push({
      code: RowIssueCode.INVALID_PHONE,
      severity: "warning",
      field: ImportField.PHONE,
      message: "This phone number does not look valid — SMS and WhatsApp will be skipped.",
    });
  } else if (phoneResult.normalized) {
    issues.push({
      code: RowIssueCode.PHONE_NORMALISED,
      severity: "info",
      field: ImportField.PHONE,
      message: `Normalised to ${phoneResult.value}.`,
    });
  }

  const sanitizedText = (field: ImportField): string | null => {
    const value = cell(row, mapping, field);
    if (!value) return null;
    const { value: safe } = sanitizeImportedCell(value);
    return safe.trim() || null;
  };

  const hasBlockingIssue = invalid;
  const hasWarning = issues.some((i) => i.severity === "warning");

  return {
    rowIndex,
    raw,
    name,
    email: emailResult.value,
    phone: phoneResult.value,
    rawPhone: phoneResult.raw,
    partyType,
    partySize,
    memberNames: combinedMembers,
    tagLabels,
    groupName: sanitizedText(ImportField.GROUP_NAME),
    tableNumber: sanitizedText(ImportField.TABLE_NUMBER),
    seatLabel: sanitizedText(ImportField.SEAT_LABEL),
    notes: sanitizedText(ImportField.NOTES),
    status: hasBlockingIssue ? "INVALID" : hasWarning ? "NEEDS_REVIEW" : "READY",
    decision: hasBlockingIssue ? "SKIP" : "CREATE",
    issues,
    duplicateOfRowIndex: null,
    duplicateOfGuestId: null,
    duplicateOfInvitationId: null,
  };
}

export function normalizeRows(
  table: ParsedTable,
  mapping: ColumnMapping,
  options: ImportOptions
): NormalizedRow[] {
  return table.rows.map((row, index) => normalizeRow(row, index, mapping, options));
}
